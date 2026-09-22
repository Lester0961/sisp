import { BadRequestException, Injectable, NotFoundException, PayloadTooLargeException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import * as path from 'node:path';
import { PrismaService } from '../../prisma/prisma.service';
import { ObjectStorageService } from '../../common/storage/object-storage.service';
import { CreateIdentityVerificationDto } from './dto/create-identity-verification.dto';
import { ReviewIdentityVerificationDto } from './dto/review-identity-verification.dto';
import { UploadVerificationDocumentDto } from './dto/upload-verification-document.dto';

const ALLOWED_MIME = ['application/pdf', 'image/jpeg', 'image/png'];
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const REVIEW_DECISIONS = ['under_review', 'approved', 'rejected', 'needs_info'];

/**
 * Returning/alumni identity verification (Phase 1).
 *
 * A public applicant submits historical identity details; staff review and
 * approve the linkage to an existing StudentProfile. Uploaded IDs are stored
 * privately (object key only, never a public URL) and are returned to staff as
 * metadata; document bytes are only reachable through short-lived signed URLs
 * created by the backend.
 */
@Injectable()
export class IdentityVerificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly storage: ObjectStorageService,
  ) {}

  private bucket(): string {
    return this.config.get<string>('IDENTITY_STORAGE_BUCKET')?.trim() || 'identity-documents';
  }

  async create(dto: CreateIdentityVerificationDto) {
    if (!['returning', 'alumni'].includes(dto.verificationType)) {
      throw new BadRequestException('verificationType must be returning or alumni');
    }
    const email = dto.applicantEmail.trim().toLowerCase();

    let matchedStudentProfileId: string | null = null;
    if (dto.claimedStudentNumber) {
      const profile = await this.prisma.studentProfile.findUnique({
        where: { studentNumber: dto.claimedStudentNumber.trim() },
        select: { id: true },
      });
      // A student-number match is only a CANDIDATE; staff must approve linkage.
      matchedStudentProfileId = profile?.id ?? null;
    }

    const verification = await this.prisma.studentIdentityVerification.create({
      data: {
        applicantEmail: email,
        verificationType: dto.verificationType,
        claimedStudentNumber: dto.claimedStudentNumber?.trim() ?? null,
        claimedFirstName: dto.claimedFirstName.trim(),
        claimedMiddleName: dto.claimedMiddleName?.trim() ?? null,
        claimedLastName: dto.claimedLastName.trim(),
        previousName: dto.previousName?.trim() ?? null,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
        status: 'submitted',
        matchedStudentProfileId,
      },
      select: { id: true, status: true, verificationType: true, submittedAt: true },
    });

    return {
      ...verification,
      matchedExistingRecord: Boolean(matchedStudentProfileId),
      message:
        'Identity verification submitted. The Registrar will review your details and the uploaded ID.',
    };
  }

  async getPublicStatus(id: string, email: string) {
    const verification = await this.prisma.studentIdentityVerification.findFirst({
      where: { id, applicantEmail: email.trim().toLowerCase() },
      select: {
        id: true,
        status: true,
        verificationType: true,
        claimedFirstName: true,
        claimedLastName: true,
        remarks: true,
        submittedAt: true,
        reviewedAt: true,
        matchedStudentProfileId: true,
      },
    });
    if (!verification) throw new NotFoundException('Verification record not found');
    return {
      ...verification,
      matchedExistingRecord: Boolean(verification.matchedStudentProfileId),
      matchedStudentProfileId: undefined,
    };
  }

  async uploadDocument(id: string, dto: UploadVerificationDocumentDto) {
    const verification = await this.prisma.studentIdentityVerification.findUnique({
      where: { id },
    });
    if (!verification) throw new NotFoundException('Verification record not found');
    if (!['submitted', 'needs_info'].includes(verification.status)) {
      throw new BadRequestException('This verification is no longer accepting documents');
    }
    if (!ALLOWED_MIME.includes(dto.mimeType)) {
      throw new BadRequestException('Only PDF, JPEG, or PNG identification documents are accepted');
    }
    const content = Buffer.from(dto.contentBase64, 'base64');
    if (content.length === 0) throw new BadRequestException('The uploaded file is empty');
    if (content.length > MAX_FILE_BYTES) {
      throw new PayloadTooLargeException('Identification documents must be 5 MB or smaller');
    }

    const objectKey = this.buildObjectKey(id, dto.originalFileName);
    await this.storage.save(this.bucket(), objectKey, content, dto.mimeType);

    const document = await this.prisma.identityVerificationDocument.create({
      data: {
        verificationId: id,
        documentType: dto.documentType.trim(),
        storageObjectKey: objectKey,
        originalFileName: dto.originalFileName.trim(),
        mimeType: dto.mimeType,
        fileSize: content.length,
      },
      select: {
        id: true,
        documentType: true,
        originalFileName: true,
        mimeType: true,
        fileSize: true,
        uploadedAt: true,
        reviewStatus: true,
      },
    });

    return { message: 'Identification document uploaded for review', document };
  }

  /**
   * Short-lived signed link so a reviewer can open the uploaded ID. When the
   * local fallback storage is active (development), url is null and only
   * metadata is returned.
   */
  async getDocumentSignedUrl(verificationId: string, documentId: string) {
    const document = await this.prisma.identityVerificationDocument.findFirst({
      where: { id: documentId, verificationId },
    });
    if (!document) throw new NotFoundException('Identification document not found');
    const url = await this.storage.createSignedUrl(this.bucket(), document.storageObjectKey, 300);
    return {
      documentId: document.id,
      fileName: document.originalFileName,
      mimeType: document.mimeType,
      url,
      expiresInSeconds: url ? 300 : 0,
    };
  }

  async listForReview(status?: string) {
    const records = await this.prisma.studentIdentityVerification.findMany({
      where: status ? { status } : undefined,
      orderBy: { submittedAt: 'desc' },
      include: {
        documents: {
          select: {
            id: true,
            documentType: true,
            originalFileName: true,
            mimeType: true,
            fileSize: true,
            uploadedAt: true,
            reviewStatus: true,
          },
        },
        matchedStudentProfile: {
          select: {
            id: true,
            studentNumber: true,
            lifecycleStatus: true,
            user: { select: { firstName: true, lastName: true, email: true } },
          },
        },
      },
    });
    return { data: records, total: records.length };
  }

  async review(id: string, reviewerId: string, dto: ReviewIdentityVerificationDto) {
    if (!REVIEW_DECISIONS.includes(dto.decision)) {
      throw new BadRequestException('decision must be under_review, approved, rejected, or needs_info');
    }
    const verification = await this.prisma.studentIdentityVerification.findUnique({
      where: { id },
    });
    if (!verification) throw new NotFoundException('Verification record not found');
    if (['approved', 'rejected'].includes(verification.status)) {
      throw new BadRequestException('This verification has already been finalized');
    }

    let matchedStudentProfileId = verification.matchedStudentProfileId;
    if (dto.matchedStudentProfileId !== undefined) {
      matchedStudentProfileId = dto.matchedStudentProfileId || null;
    }
    if (dto.decision === 'approved' && matchedStudentProfileId) {
      const profile = await this.prisma.studentProfile.findUnique({
        where: { id: matchedStudentProfileId },
        select: { id: true },
      });
      if (!profile) throw new BadRequestException('The matched student record was not found');
    }

    const isFinal = dto.decision === 'approved' || dto.decision === 'rejected';
    const updated = await this.prisma.studentIdentityVerification.update({
      where: { id },
      data: {
        status: dto.decision,
        remarks: dto.remarks ?? verification.remarks,
        matchedStudentProfileId,
        ...(isFinal
          ? { reviewedAt: new Date(), reviewedByUserId: reviewerId }
          : {}),
      },
      select: {
        id: true,
        status: true,
        remarks: true,
        matchedStudentProfileId: true,
        reviewedAt: true,
      },
    });

    if (dto.decision === 'approved' && matchedStudentProfileId) {
      await this.prisma.studentProfile.update({
        where: { id: matchedStudentProfileId },
        data: { lifecycleStatus: verification.verificationType === 'alumni' ? 'alumni' : 'returning' },
      });
    }

    await this.prisma.auditLog.create({
      data: {
        userId: reviewerId,
        action: `IDENTITY_VERIFICATION_${dto.decision.toUpperCase()}`,
        resource: 'student_identity_verifications',
        resourceId: id,
        oldValue: verification.status,
        newValue: JSON.stringify({ status: dto.decision, matchedStudentProfileId }),
      },
    });

    return { message: `Verification marked ${dto.decision}.`, data: updated };
  }

  private buildObjectKey(verificationId: string, originalFileName: string): string {
    const extension = path.extname(originalFileName).toLowerCase().replace(/[^.a-z0-9]/g, '') || '.bin';
    const digest = createHash('sha256').update(`${verificationId}:${originalFileName}:${Date.now()}`).digest('hex').slice(0, 24);
    return `${verificationId}/${digest}${extension}`;
  }
}
