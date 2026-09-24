import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { ObjectStorageService } from '../../common/storage/object-storage.service';
import { AuthService } from '../auth/auth.service';
import { MailService, escapeHtml } from '../auth/mail.service';
import {
  CreateAdmissionApplicationDto,
  ReviewAdmissionApplicationDto,
  ReviewAdmissionRequirementDto,
  SubmitRequirementDto,
} from './dto/admission.dto';
import { NotificationsService } from '../notifications/notifications.service';

const ALLOWED_REQUIREMENT_MIME = ['application/pdf', 'image/jpeg', 'image/png'];
const MAX_REQUIREMENT_BYTES = 10 * 1024 * 1024;
const ADMISSION_RECEIPT_CODE = 'ENROLLMENT_RECEIPT';
const CLOSED_APPLICATION_STATUSES = ['approved', 'rejected', 'withdrawn'];

@Injectable()
export class AdmissionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly config: ConfigService,
    private readonly storage: ObjectStorageService,
    private readonly authService: AuthService,
    private readonly mailService: MailService,
  ) {}

  private bucket(): string {
    return this.config.get<string>('ADMISSION_STORAGE_BUCKET')?.trim() || 'admission-requirements';
  }

  async getRequirementDefinitions(applicantType?: string) {
    const definitions = await this.prisma.admissionRequirementDefinition.findMany({
      where: {
        isActive: true,
        isRequired: true,
        code: ADMISSION_RECEIPT_CODE,
        ...(applicantType
          ? {
              OR: [{ applicantType: null }, { applicantType }],
            }
          : {}),
      },
      orderBy: { sortOrder: 'asc' },
    });
    return definitions;
  }

  async createApplication(dto: CreateAdmissionApplicationDto) {
    // Check program exists
    const program = await this.prisma.program.findUnique({
      where: { id: dto.programId },
    });
    if (!program) {
      throw new NotFoundException(`Program with ID ${dto.programId} not found.`);
    }

    const currentYear = new Date().getFullYear();
    const buildData = (applicationNo: string) => ({
      applicationNo,
      applicantType: dto.applicantType,
      status: 'submitted',
      firstName: dto.firstName,
      middleName: dto.middleName,
      lastName: dto.lastName,
      suffix: dto.suffix,
      dob: new Date(`${dto.dob}T00:00:00.000Z`),
      sex: dto.sex,
      nationality: dto.nationality || 'Filipino',
      email: dto.email,
      mobile: dto.mobile,
      addressLine: dto.addressLine,
      city: dto.city,
      province: dto.province,
      postalCode: dto.postalCode,
      guardianName: dto.guardianName,
      guardianRelation: dto.guardianRelation,
      guardianContact: dto.guardianContact,
      emergencyName: dto.emergencyName,
      emergencyRelation: dto.emergencyRelation,
      emergencyContact: dto.emergencyContact,
      lastSchoolName: dto.lastSchoolName,
      lastSchoolType: dto.lastSchoolType,
      yearGraduated: dto.yearGraduated,
      previousProgram: dto.previousProgram,
      strandTrack: dto.strandTrack,
      programId: dto.programId,
    });

    // The unique application number is the source of truth; retry on the rare
    // concurrent-submission collision instead of trusting a count snapshot.
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const count = await this.prisma.admissionApplication.count();
      const applicationNo = `APP-${currentYear}-${String(count + 1 + attempt).padStart(4, '0')}`;
      try {
        const application = await this.prisma.admissionApplication.create({
          data: buildData(applicationNo),
          include: {
            program: true,
            requirements: {
              include: { definition: true },
            },
          },
        });
        const emailNotificationSent = await this.sendApplicantEmail(
          application.email,
          `${application.firstName} ${application.lastName}`.trim(),
          'SISP admission application received',
          `<p>Your admission application <strong>${escapeHtml(application.applicationNo)}</strong> was received.</p><p>Upload your enrollment or down-payment receipt in the application page, then keep the reference number to track Registrar review.</p>`,
          `Your admission application ${application.applicationNo} was received. Upload your enrollment or down-payment receipt, then keep the reference number to track Registrar review.`,
        );
        return { ...application, emailNotificationSent };
      } catch (error: any) {
        if (error?.code === 'P2002') continue;
        throw error;
      }
    }
    throw new ConflictException(
      'Could not allocate an application number right now. Please submit again.',
    );
  }

  /**
   * Internal lookup. Never includes the created user account or credentials —
   * only the student profile number, which the applicant needs.
   */
  async getApplicationByNo(applicationNo: string) {
    const application = await this.prisma.admissionApplication.findUnique({
      where: { applicationNo },
      include: {
        program: {
          include: { curricula: true },
        },
        requirements: {
          include: { definition: true },
        },
        createdStudent: {
          select: { id: true, studentNumber: true },
        },
      },
    });
    if (!application) {
      throw new NotFoundException(`Application ${applicationNo} not found.`);
    }
    return application;
  }

  /**
   * Public status lookup (Phase 1, P1-09). Returns only applicant-relevant
   * fields and requires the application email as proof. Unknown application
   * numbers and mismatched proofs return the same message so the endpoint
   * cannot be used to enumerate applications.
   */
  async getPublicApplicationStatus(applicationNo: string, email: string) {
    const application = await this.prisma.admissionApplication.findUnique({
      where: { applicationNo },
      include: {
        program: { select: { id: true, code: true, name: true } },
        requirements: {
          select: {
            status: true,
            reviewNotes: true,
            definition: {
              select: { code: true, title: true, isRequired: true },
            },
          },
        },
        createdStudent: { select: { studentNumber: true } },
      },
    });

    if (!application || !this.emailMatches(application.email, email)) {
      throw new NotFoundException(`Application ${applicationNo} not found.`);
    }

    return {
      applicationNo: application.applicationNo,
      status: application.status,
      applicantType: application.applicantType,
      firstName: application.firstName,
      middleName: application.middleName,
      lastName: application.lastName,
      email: application.email,
      program: application.program,
      requirements: application.requirements,
      reviewNotes: application.reviewNotes,
      studentNumber: application.createdStudent?.studentNumber ?? null,
      createdAt: application.createdAt,
      updatedAt: application.updatedAt,
    };
  }

  private emailMatches(recorded: string, provided?: string): boolean {
    if (!provided) return false;
    return recorded.trim().toLowerCase() === provided.trim().toLowerCase();
  }

  async submitRequirement(applicationNo: string, dto: SubmitRequirementDto) {
    const application = await this.getApplicationByNo(applicationNo);

    if (!this.emailMatches(application.email, dto.email)) {
      throw new NotFoundException(`Application ${applicationNo} not found.`);
    }
    if (CLOSED_APPLICATION_STATUSES.includes(application.status)) {
      throw new BadRequestException('This application is closed and no longer accepts documents.');
    }

    const definition = await this.prisma.admissionRequirementDefinition.findUnique({
      where: { id: dto.definitionId },
    });
    if (!definition || !definition.isActive) {
      throw new NotFoundException(`Requirement definition ${dto.definitionId} not found.`);
    }
    if (definition.code !== ADMISSION_RECEIPT_CODE) {
      throw new BadRequestException('New student applications accept only the enrollment or down-payment receipt.');
    }
    if (definition.applicantType && definition.applicantType !== application.applicantType) {
      throw new BadRequestException('This requirement does not apply to the selected applicant type.');
    }

    const existing = await this.prisma.admissionRequirementSubmission.findUnique({
      where: {
        applicationId_definitionId: {
          applicationId: application.id,
          definitionId: definition.id,
        },
      },
    });
    // A verified document is final; only a fresh rejection/resubmission
    // request may replace it, and never silently.
    if (existing?.status === 'verified') {
      throw new ConflictException('This requirement has already been verified by the Registrar.');
    }

    if (!ALLOWED_REQUIREMENT_MIME.includes(dto.mimeType)) {
      throw new BadRequestException('Only PDF, JPEG, or PNG requirement documents are accepted');
    }
    const content = Buffer.from(dto.contentBase64, 'base64');
    if (content.length === 0) {
      throw new BadRequestException('The uploaded file is empty');
    }
    if (content.length > MAX_REQUIREMENT_BYTES) {
      throw new PayloadTooLargeException('The receipt must be 10 MB or smaller');
    }

    const extension = (dto.fileName.split('.').pop() || 'bin').toLowerCase().replace(/[^.a-z0-9]/g, '');
    const digest = createHash('sha256')
      .update(`${application.id}:${definition.id}:${Date.now()}`)
      .digest('hex')
      .slice(0, 24);
    const objectKey = `${application.id}/${definition.code.toLowerCase()}-${digest}.${extension}`;
    await this.storage.save(this.bucket(), objectKey, content, dto.mimeType);

    const submission = await this.prisma.admissionRequirementSubmission.upsert({
      where: {
        applicationId_definitionId: {
          applicationId: application.id,
          definitionId: definition.id,
        },
      },
      update: {
        storageObjectKey: objectKey,
        fileUrl: '',
        fileName: dto.fileName,
        fileSize: content.length,
        mimeType: dto.mimeType,
        status: 'submitted',
        reviewNotes: null,
        reviewedAt: null,
        reviewedByUserId: null,
      },
      create: {
        applicationId: application.id,
        definitionId: definition.id,
        storageObjectKey: objectKey,
        fileUrl: '',
        fileName: dto.fileName,
        fileSize: content.length,
        mimeType: dto.mimeType,
        status: 'submitted',
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: null,
        actorEmail: application.email,
        action: 'ADMISSION_REQUIREMENT_SUBMITTED',
        resource: 'admission_requirements',
        resourceId: submission.id,
        oldValue: existing?.status ?? null,
        newValue: 'submitted',
      },
    });

    return this.safeSubmission(submission);
  }

  async listApplications(status?: string, programId?: string, applicantType?: string) {
    return this.prisma.admissionApplication.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(programId ? { programId } : {}),
        ...(applicantType ? { applicantType } : {}),
      },
      include: {
        program: true,
        requirements: {
          include: { definition: true },
        },
        createdStudent: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async reviewRequirement(
    applicationNo: string,
    submissionId: string,
    reviewerId: string,
    dto: ReviewAdmissionRequirementDto,
  ) {
    const application = await this.getApplicationByNo(applicationNo);
    const submission = await this.prisma.admissionRequirementSubmission.findFirst({
      where: { id: submissionId, applicationId: application.id },
    });
    if (!submission) {
      throw new NotFoundException('Requirement submission not found.');
    }
    if (submission.status === dto.status) {
      return this.safeSubmission(submission);
    }

    const updated = await this.prisma.admissionRequirementSubmission.update({
      where: { id: submission.id },
      data: {
        status: dto.status,
        reviewNotes: dto.reviewNotes ?? submission.reviewNotes,
        reviewedByUserId: reviewerId,
        reviewedAt: new Date(),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: reviewerId,
        action: `ADMISSION_REQUIREMENT_${dto.status.toUpperCase()}`,
        resource: 'admission_requirements',
        resourceId: submission.id,
        oldValue: submission.status,
        newValue: dto.status,
      },
    });

    const statusMessage = dto.status === 'verified'
      ? 'Your enrollment/down-payment receipt was verified.'
      : dto.status === 'resubmission_required'
        ? `Please upload a replacement receipt. ${dto.reviewNotes ?? ''}`.trim()
        : `Your receipt was not accepted. ${dto.reviewNotes ?? ''}`.trim();
    const emailNotificationSent = await this.sendApplicantEmail(
      application.email,
      `${application.firstName} ${application.lastName}`.trim(),
      'SISP receipt review update',
      `<p>${escapeHtml(statusMessage)}</p><p>Application reference: <strong>${escapeHtml(application.applicationNo)}</strong></p>`,
      `${statusMessage} Application reference: ${application.applicationNo}`,
    );

    return { ...this.safeSubmission(updated), emailNotificationSent };
  }

  async reviewApplication(
    applicationNo: string,
    reviewerId: string,
    dto: ReviewAdmissionApplicationDto,
  ) {
    const application = await this.getApplicationByNo(applicationNo);

    if (CLOSED_APPLICATION_STATUSES.includes(application.status)) {
      throw new ConflictException(`Application ${applicationNo} is already ${application.status}.`);
    }

    // If approved, perform atomic conversion into User + StudentProfile.
    if (dto.status === 'approved') {
      const missing = await this.missingRequiredRequirements(application);
      if (missing.length > 0) {
        throw new BadRequestException(
          `Cannot approve until these required requirements are verified: ${missing
            .map((requirement) => requirement.code)
            .join(', ')}`,
        );
      }
      const approved = await this.approveApplicationAndCreateStudent(application, reviewerId, dto);
      const emailNotificationSent = approved.linkedExistingProfile
        ? await this.sendApplicantEmail(
            application.email,
            `${application.firstName} ${application.lastName}`.trim(),
            'SISP admission application approved',
            `<p>Your admission application <strong>${escapeHtml(application.applicationNo)}</strong> was approved. Your existing student account and record were linked.</p><p>Sign in to SISP with your current account credentials. If you cannot access the account, contact the Registrar.</p>`,
            `Your admission application ${application.applicationNo} was approved and linked to your existing student record. Sign in with your current credentials or contact the Registrar if you cannot access your account.`,
          )
        : await this.authService.issueStudentActivationLink(
            approved.activationUserId,
            application.email,
            'student_activation',
          ).catch(() => false);
      const { activationUserId, ...safeApproved } = approved;
      return { ...safeApproved, emailNotificationSent };
    }

    const updated = await this.prisma.admissionApplication.update({
      where: { id: application.id },
      data: {
        status: dto.status,
        reviewNotes: dto.reviewNotes ?? application.reviewNotes,
        reviewedById: reviewerId,
        reviewedAt: new Date(),
      },
      include: {
        program: true,
        requirements: { include: { definition: true } },
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: reviewerId,
        action: 'ADMISSION_APPLICATION_REVIEW',
        resource: 'admission_applications',
        resourceId: application.id,
        oldValue: application.status,
        newValue: dto.status,
      },
    });

    const emailNotificationSent = await this.sendApplicantEmail(
      application.email,
      `${application.firstName} ${application.lastName}`.trim(),
      `SISP admission application ${dto.status.replace(/_/g, ' ')}`,
      `<p>Your admission application <strong>${escapeHtml(application.applicationNo)}</strong> is now ${escapeHtml(dto.status.replace(/_/g, ' '))}.</p>${dto.reviewNotes ? `<p>Registrar notes: ${escapeHtml(dto.reviewNotes)}</p>` : ''}`,
      `Your admission application ${application.applicationNo} is now ${dto.status.replace(/_/g, ' ')}.${dto.reviewNotes ? ` Registrar notes: ${dto.reviewNotes}` : ''}`,
    );
    return { ...updated, emailNotificationSent };
  }

  private async missingRequiredRequirements(application: {
    id: string;
    applicantType: string;
  }): Promise<Array<{ id: string; code: string }>> {
    const receipt = await this.prisma.admissionRequirementDefinition.findUnique({
      where: { code: ADMISSION_RECEIPT_CODE },
      select: { id: true, code: true, isActive: true, isRequired: true },
    });
    if (!receipt?.isActive || !receipt.isRequired) {
      return [{ id: ADMISSION_RECEIPT_CODE, code: ADMISSION_RECEIPT_CODE }];
    }

    const verified = await this.prisma.admissionRequirementSubmission.findFirst({
      where: { applicationId: application.id, definitionId: receipt.id, status: 'verified' },
      select: { id: true },
    });
    return verified ? [] : [{ id: receipt.id, code: receipt.code }];
  }

  private async approveApplicationAndCreateStudent(
    application: any,
    reviewerId: string,
    dto: ReviewAdmissionApplicationDto,
  ) {
    // 1. Resolve student role
    const studentRole = await this.prisma.role.findUnique({
      where: { name: 'student' },
    });
    const roleId = studentRole?.id ?? 'role-id-student';

    // 2. Resolve Curriculum version for the program
    let curriculumId = dto.curriculumId;
    if (!curriculumId) {
      const defaultCurriculum = await this.prisma.curriculum.findFirst({
        where: { programId: application.programId },
        orderBy: { effectiveYear: 'desc' },
      });
      curriculumId = defaultCurriculum?.id;
    }

    // Pre-activation placeholder credential: cryptographically random and
    // never disclosed to anyone. The applicant sets their own password
    // through a one-time email token, which verifies access to this
    // admission record. No public or hard-coded default password is used.
    const preActivationPassword = randomBytes(32).toString('hex');
    const passwordHash = await bcrypt.hash(preActivationPassword, 12);
    const currentYear = new Date().getFullYear();

    // Create or LINK the account atomically. A person with an existing
    // StudentProfile is never duplicated: the existing record is reactivated
    // as `returning` and reused for the application.
    const result = await this.prisma.$transaction(async (tx) => {
      let user = await tx.user.findUnique({
        where: { email: application.email },
        include: { studentProfile: true, role: true },
      });
      if (!user) {
        user = await tx.user.create({
          data: {
            email: application.email,
            passwordHash,
            firstName: application.firstName,
            lastName: application.lastName,
            roleId,
            mustChangePassword: true,
          },
          include: { studentProfile: true, role: true },
        });
      } else if (user.role?.name && user.role.name !== 'student') {
        throw new ConflictException('This email is already assigned to a non-student account. Resolve the account with the Registrar before approval.');
      }

      let linkedExistingProfile = Boolean(user.studentProfile);
      let studentProfile = user.studentProfile ?? null;

      if (studentProfile) {
        studentProfile = await tx.studentProfile.update({
          where: { id: studentProfile.id },
          data: {
            programId: application.programId,
            ...(curriculumId ? { curriculumId } : {}),
            lifecycleStatus: 'returning',
          },
          include: { user: true, program: true, curriculum: true },
        });
        await tx.accountBalance.upsert({
          where: { studentId: studentProfile.id },
          update: {},
          create: { studentId: studentProfile.id, balance: 0.0, status: 'active' },
        });
      } else {
        const studentNumber = await this.allocateStudentNumber(tx, currentYear);
        studentProfile = await tx.studentProfile.create({
          data: {
            userId: user.id,
            studentNumber,
            programId: application.programId,
            curriculumId,
            yearLevel: 1,
            lifecycleStatus: 'active',
          },
          include: { user: true, program: true, curriculum: true },
        });
        await tx.accountBalance.create({
          data: { studentId: studentProfile.id, balance: 0.0, status: 'active' },
        });
        linkedExistingProfile = false;
      }

      const updatedApp = await tx.admissionApplication.update({
        where: { id: application.id },
        data: {
          status: 'approved',
          reviewNotes: dto.reviewNotes ?? application.reviewNotes,
          createdStudentId: studentProfile.id,
          reviewedById: reviewerId,
          reviewedAt: new Date(),
        },
        include: {
          program: true,
          createdStudent: {
            select: {
              id: true,
              studentNumber: true,
              curriculumId: true,
              yearLevel: true,
              programId: true,
              lifecycleStatus: true,
            },
          },
        },
      });

      await tx.auditLog.create({
        data: {
          userId: reviewerId,
          action: 'ADMISSION_APPLICATION_APPROVED',
          resource: 'admission_applications',
          resourceId: application.id,
          oldValue: application.status,
          newValue: JSON.stringify({
            status: 'approved',
            createdStudentId: studentProfile.id,
            linkedExistingProfile,
          }),
        },
      });

      return { updatedApp, studentProfile, linkedExistingProfile };
    });

    await this.notificationsService
      .sendToUser(
        result.studentProfile.userId,
        'Admission Approved',
        'Your admission application has been approved. Check your email for password setup instructions, or sign in if you already have an account.',
        { email: false },
      )
      .catch(() => undefined);

    return {
      ...result.updatedApp,
      linkedExistingProfile: result.linkedExistingProfile,
      curriculumId: result.studentProfile.curriculumId ?? null,
      yearLevel: result.studentProfile.yearLevel,
      activationUserId: result.studentProfile.userId,
    };
  }

  async getRequirementReviewAsset(applicationNo: string, submissionId: string) {
    const application = await this.getApplicationByNo(applicationNo);
    const submission = await this.prisma.admissionRequirementSubmission.findFirst({
      where: { id: submissionId, applicationId: application.id },
      select: { storageObjectKey: true, fileName: true, mimeType: true },
    });
    if (!submission?.storageObjectKey) throw new NotFoundException('Uploaded receipt was not found.');
    const asset = await this.storage.getReviewObject(this.bucket(), submission.storageObjectKey, 300);
    return { ...asset, fileName: submission.fileName, mimeType: submission.mimeType || 'application/octet-stream' };
  }

  private async sendApplicantEmail(
    email: string,
    name: string,
    subject: string,
    html: string,
    text: string,
  ): Promise<boolean> {
    if (!this.mailService.isConfigured()) return false;
    try {
      await this.mailService.send(email, name || 'Student applicant', subject, html, text);
      return true;
    } catch {
      return false;
    }
  }

  private async allocateStudentNumber(tx: any, currentYear: number): Promise<string> {
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const count = await tx.studentProfile.count();
      const candidate = `${currentYear}-${String(1001 + count + attempt).padStart(4, '0')}`;
      const clash = await tx.studentProfile.findUnique({
        where: { studentNumber: candidate },
        select: { id: true },
      });
      if (!clash) return candidate;
    }
    throw new ConflictException('Could not allocate a student number. Please retry.');
  }

  /** Public/staff responses never include private object keys or URLs. */
  private safeSubmission(submission: {
    id: string;
    definitionId: string;
    fileName: string;
    fileSize: number | null;
    mimeType: string | null;
    status: string;
    reviewNotes: string | null;
    reviewedAt?: Date | null;
    updatedAt?: Date;
  }) {
    return {
      id: submission.id,
      definitionId: submission.definitionId,
      fileName: submission.fileName,
      fileSize: submission.fileSize,
      mimeType: submission.mimeType,
      status: submission.status,
      reviewNotes: submission.reviewNotes,
      reviewedAt: submission.reviewedAt ?? null,
      updatedAt: submission.updatedAt,
    };
  }
}
