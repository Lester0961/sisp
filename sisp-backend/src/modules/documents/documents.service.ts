import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateRequestDto } from './dto/create-request.dto';
import { UpdateRequestDto } from './dto/update-request.dto';
import { assertTransition } from '../../common/utils/state-machine';
import { requireStudentProfile } from '../../common/utils/require-student-profile';

const STATUS_TRANSITIONS: Record<string, string[]> = {
  awaiting_payment: ['pending', 'rejected'],
  pending: ['under_review', 'approved', 'rejected'],
  under_review: ['approved', 'rejected'],
  approved: ['released'],
  released: [],
  rejected: [],
};

const DOCUMENT_LABELS: Record<string, string> = {
  transcript_of_records: 'Transcript of Records',
  certificate_of_enrollment: 'Certificate of Enrollment',
  certificate_of_good_moral: 'Certificate of Good Moral Character',
  diploma: 'Diploma',
  course_description: 'Course Description',
  authentication: 'Document Authentication',
  other: 'Other Document',
};

const DOCUMENT_FEES: Record<string, number> = {
  transcript_of_records: 200.0,
  certificate_of_enrollment: 150.0,
  certificate_of_good_moral: 100.0,
  diploma: 500.0,
  course_description: 50.0,
  authentication: 300.0,
  other: 100.0,
};

const STATUS_MESSAGES: Record<string, string> = {
  awaiting_payment: 'is awaiting payment confirmation',
  pending: 'is now pending review',
  under_review: 'is now under review',
  approved: 'has been approved',
  released: 'is ready for release/pickup',
  rejected: 'has been rejected',
};

function generatePaymentReference(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `SISP-${timestamp}-${random}`;
}

function generateQrCodeUrl(reference: string): string {
  // Placeholder QR code using a placeholder image service
  // In production, this would be a real QR code generation service
  return `https://placehold.co/300x300/1e3a8a/FFFFFF/png?text=InstaPay+QR%0A${encodeURIComponent(reference)}`;
}

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  getDocumentFees() {
    return Object.entries(DOCUMENT_FEES).map(([type, fee]) => ({
      type,
      label: DOCUMENT_LABELS[type] ?? type,
      fee,
    }));
  }

  async createRequest(userId: string, dto: CreateRequestDto) {
    const profile = await requireStudentProfile(this.prisma, userId);

    const fee = DOCUMENT_FEES[dto.type] ?? 0;
    const paymentReference = generatePaymentReference();
    const qrCodeUrl = generateQrCodeUrl(paymentReference);

    const request = await this.prisma.documentRequest.create({
      data: {
        studentId: profile.id,
        type: dto.type,
        status: 'awaiting_payment',
        remarks: dto.remarks,
        fee,
        paymentStatus: 'unpaid',
        paymentReference,
        qrCodeUrl,
      },
      include: {
        student: {
          include: {
            user: { select: { email: true } },
          },
        },
      },
    });

    return {
      message: `Document request for '${DOCUMENT_LABELS[dto.type] ?? dto.type}' submitted. Please complete payment to proceed.`,
      data: {
        ...request,
        typeLabel: DOCUMENT_LABELS[request.type] ?? request.type,
      },
    };
  }

  async confirmPayment(adminId: string, requestId: string) {
    const request = await this.prisma.documentRequest.findUnique({
      where: { id: requestId },
      include: {
        student: {
          include: {
            user: { select: { id: true, email: true } },
          },
        },
      },
    });

    if (!request) {
      throw new NotFoundException(`Document request with ID ${requestId} not found`);
    }

    if (request.status !== 'awaiting_payment') {
      throw new NotFoundException(`Request is not awaiting payment (current status: ${request.status})`);
    }

    assertTransition(request.status, 'pending', STATUS_TRANSITIONS);

    const updated = await this.prisma.documentRequest.update({
      where: { id: requestId },
      data: {
        status: 'pending',
        paymentStatus: 'paid',
        paymentConfirmedById: adminId,
        paymentConfirmedAt: new Date(),
      },
      include: {
        student: {
          include: {
            user: { select: { id: true, email: true } },
          },
        },
      },
    });

    // Send notification to the student
    const docLabel = DOCUMENT_LABELS[request.type] ?? request.type;
    await this.notificationsService.sendToUser(
      request.student.user.id,
      'Payment Confirmed',
      `Your payment for ${docLabel} has been confirmed. Your request is now pending review.`,
    );

    return {
      message: 'Payment confirmed. Request is now pending review.',
      data: {
        ...updated,
        typeLabel: DOCUMENT_LABELS[updated.type] ?? updated.type,
        statusStep: this.getStatusStep(updated.status),
      },
    };
  }

  async getMyRequests(userId: string) {
    const profile = await requireStudentProfile(this.prisma, userId);

    const requests = await this.prisma.documentRequest.findMany({
      where: { studentId: profile.id },
      orderBy: { createdAt: 'desc' },
    });

    return {
      data: requests.map((r) => ({
        ...r,
        typeLabel: DOCUMENT_LABELS[r.type] ?? r.type,
        statusStep: this.getStatusStep(r.status),
      })),
      total: requests.length,
    };
  }

  async getAllRequests(status?: string, type?: string) {
    const where: {
      status?: string;
      type?: string;
    } = {};

    if (status) where.status = status;
    if (type) where.type = type;

    const requests = await this.prisma.documentRequest.findMany({
      where,
      include: {
        student: {
          include: {
            user: { select: { email: true, firstName: true, lastName: true } },
            program: { select: { code: true, name: true } },
          },
        },
        paymentConfirmedBy: {
          select: { firstName: true, lastName: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      data: requests.map((r) => ({
        ...r,
        typeLabel: DOCUMENT_LABELS[r.type] ?? r.type,
        statusStep: this.getStatusStep(r.status),
      })),
      total: requests.length,
    };
  }

  async getRequestById(id: string) {
    const request = await this.prisma.documentRequest.findUnique({
      where: { id },
      include: {
        student: {
          include: {
            user: { select: { email: true } },
            program: { select: { code: true, name: true } },
          },
        },
      },
    });

    if (!request) {
      throw new NotFoundException(`Document request with ID ${id} not found`);
    }

    return {
      ...request,
      typeLabel: DOCUMENT_LABELS[request.type] ?? request.type,
      statusStep: this.getStatusStep(request.status),
    };
  }

  async updateRequestStatus(id: string, dto: UpdateRequestDto) {
    const request = await this.prisma.documentRequest.findUnique({
      where: { id },
      include: {
        student: {
          include: {
            user: { select: { id: true, email: true } },
          },
        },
      },
    });

    if (!request) {
      throw new NotFoundException(`Document request with ID ${id} not found`);
    }

    assertTransition(request.status, dto.status, STATUS_TRANSITIONS);

    const updated = await this.prisma.documentRequest.update({
      where: { id },
      data: {
        status: dto.status,
        ...(dto.remarks !== undefined && { remarks: dto.remarks }),
      },
      include: {
        student: {
          include: {
            user: { select: { id: true, email: true } },
          },
        },
      },
    });

    // Send notification to the student
    const statusMessage = STATUS_MESSAGES[dto.status];
    if (statusMessage) {
      const docLabel = DOCUMENT_LABELS[request.type] ?? request.type;
      await this.notificationsService.sendToUser(
        request.student.user.id,
        'Document Request Update',
        `Your request for ${docLabel} ${statusMessage}.${dto.remarks ? ` Remarks: ${dto.remarks}` : ''}`,
      );
    }

    return {
      message: `Request status updated to '${dto.status}'`,
      data: {
        ...updated,
        typeLabel: DOCUMENT_LABELS[updated.type] ?? updated.type,
        statusStep: this.getStatusStep(updated.status),
      },
    };
  }

  async getRequestStats() {
    const [awaiting_payment, pending, under_review, approved, released, rejected] = await Promise.all([
      this.prisma.documentRequest.count({ where: { status: 'awaiting_payment' } }),
      this.prisma.documentRequest.count({ where: { status: 'pending' } }),
      this.prisma.documentRequest.count({ where: { status: 'under_review' } }),
      this.prisma.documentRequest.count({ where: { status: 'approved' } }),
      this.prisma.documentRequest.count({ where: { status: 'released' } }),
      this.prisma.documentRequest.count({ where: { status: 'rejected' } }),
    ]);

    return {
      awaiting_payment,
      pending,
      under_review,
      approved,
      released,
      rejected,
      total: awaiting_payment + pending + under_review + approved + released + rejected,
    };
  }

  private getStatusStep(status: string): number {
    const steps: Record<string, number> = {
      awaiting_payment: 0,
      pending: 1,
      under_review: 2,
      approved: 3,
      released: 4,
      rejected: 0,
    };
    return steps[status] ?? 0;
  }
}
