import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateRequestDto } from './dto/create-request.dto';
import { UpdateRequestDto } from './dto/update-request.dto';

const STATUS_TRANSITIONS: Record<string, string[]> = {
  pending: ['under_review', 'rejected'],
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

const STATUS_MESSAGES: Record<string, string> = {
  under_review: 'is now under review',
  approved: 'has been approved',
  released: 'is ready for release/pickup',
  rejected: 'has been rejected',
};

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async createRequest(userId: string, dto: CreateRequestDto) {
    const profile = await this.prisma.studentProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException(
        'Student profile not found. Please contact admin.',
      );
    }

    const request = await this.prisma.documentRequest.create({
      data: {
        studentId: profile.id,
        type: dto.type,
        status: 'pending',
        remarks: dto.remarks,
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
      message: `Document request for '${DOCUMENT_LABELS[dto.type] ?? dto.type}' submitted successfully`,
      data: {
        ...request,
        typeLabel: DOCUMENT_LABELS[request.type] ?? request.type,
      },
    };
  }

  async getMyRequests(userId: string) {
    const profile = await this.prisma.studentProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('Student profile not found');
    }

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
            user: { select: { email: true } },
            program: { select: { code: true, name: true } },
          },
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
      throw new NotFoundException(
        `Document request with ID ${id} not found`,
      );
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
      throw new NotFoundException(
        `Document request with ID ${id} not found`,
      );
    }

    const allowedNext = STATUS_TRANSITIONS[request.status] ?? [];
    if (!allowedNext.includes(dto.status)) {
      throw new BadRequestException(
        `Cannot transition from '${request.status}' to '${dto.status}'. ` +
          `Allowed next statuses: ${allowedNext.length > 0 ? allowedNext.join(', ') : 'none (terminal status)'}`,
      );
    }

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
      const docLabel =
        DOCUMENT_LABELS[request.type] ?? request.type;
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
    const [pending, under_review, approved, released, rejected] =
      await Promise.all([
        this.prisma.documentRequest.count({
          where: { status: 'pending' },
        }),
        this.prisma.documentRequest.count({
          where: { status: 'under_review' },
        }),
        this.prisma.documentRequest.count({
          where: { status: 'approved' },
        }),
        this.prisma.documentRequest.count({
          where: { status: 'released' },
        }),
        this.prisma.documentRequest.count({
          where: { status: 'rejected' },
        }),
      ]);

    return {
      pending,
      under_review,
      approved,
      released,
      rejected,
      total:
        pending + under_review + approved + released + rejected,
    };
  }

  private getStatusStep(status: string): number {
    const steps: Record<string, number> = {
      pending: 1,
      under_review: 2,
      approved: 3,
      released: 4,
      rejected: 0,
    };
    return steps[status] ?? 0;
  }
}