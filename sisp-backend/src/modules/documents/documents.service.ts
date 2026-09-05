import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
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

const STATUS_MESSAGES: Record<string, string> = {
  awaiting_payment: 'is awaiting payment confirmation',
  pending: 'is now pending review',
  under_review: 'is now under review',
  approved: 'has been approved',
  released: 'is ready for release or pickup',
  rejected: 'has been rejected',
};

function generatePaymentReference(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `SISP-${timestamp}-${random}`;
}

function generateQrCodeUrl(reference: string): string {
  return `https://placehold.co/300x300/1e3a8a/FFFFFF/png?text=InstaPay+QR%0A${encodeURIComponent(reference)}`;
}

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async getDocumentFees() {
    const catalog = await this.prisma.documentCatalogItem.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
    return catalog
      .filter((item: any) => item.isActive)
      .sort((a: any, b: any) => a.sortOrder - b.sortOrder)
      .map((item: any) => ({
        type: item.code,
        label: item.label,
        fee: Number(item.fee),
      }));
  }

  async createRequest(userId: string, dto: CreateRequestDto) {
    const profile = await requireStudentProfile(this.prisma, userId);
    const typeCodes = dto.items.map((item) => item.type);
    if (new Set(typeCodes).size !== typeCodes.length) {
      throw new BadRequestException('Each document type can only appear once per request');
    }

    const catalog = await this.prisma.documentCatalogItem.findMany({
      where: { code: { in: typeCodes }, isActive: true },
    });
    const catalogByCode = new Map(
      catalog.filter((item: any) => item.isActive).map((item: any) => [item.code, item]),
    );
    const missingType = typeCodes.find((type) => !catalogByCode.has(type));
    if (missingType) {
      throw new BadRequestException(`Document type '${missingType}' is not available`);
    }

    const requestItems = dto.items.map((item) => {
      const catalogItem: any = catalogByCode.get(item.type);
      const unitFee = Number(catalogItem.fee);
      return {
        catalogItemId: catalogItem.id,
        type: catalogItem.code,
        label: catalogItem.label,
        quantity: item.quantity,
        unitFee,
        lineTotal: unitFee * item.quantity,
        remarks: item.remarks,
      };
    });
    const totalFee = requestItems.reduce((sum, item) => sum + item.lineTotal, 0);
    const paymentReference = generatePaymentReference();

    const request = await this.prisma.$transaction(async (transaction: any) => {
      const created = await transaction.documentRequest.create({
        data: {
          studentId: profile.id,
          type: requestItems.length === 1 ? requestItems[0].type : 'multiple_documents',
          status: 'awaiting_payment',
          remarks: dto.remarks,
          fee: totalFee,
          paymentStatus: 'unpaid',
          paymentReference,
          qrCodeUrl: generateQrCodeUrl(paymentReference),
        },
      });
      await transaction.documentRequestItem.createMany({
        data: requestItems.map((item) => ({ ...item, requestId: created.id })),
      });
      return transaction.documentRequest.findUniqueOrThrow({
        where: { id: created.id },
        include: {
          items: { orderBy: { createdAt: 'asc' } },
          student: { include: { user: { select: { email: true } } } },
        },
      });
    });

    return {
      message: `${requestItems.length} document type${requestItems.length === 1 ? '' : 's'} submitted. Please complete the combined payment to proceed.`,
      data: this.serializeRequest(request),
    };
  }

  async confirmPayment(adminId: string, requestId: string) {
    const request = await this.prisma.documentRequest.findUnique({
      where: { id: requestId },
      include: {
        items: true,
        student: { include: { user: { select: { id: true, email: true } } } },
      },
    });
    if (!request) {
      throw new NotFoundException(`Document request with ID ${requestId} not found`);
    }
    if (request.status !== 'awaiting_payment') {
      throw new BadRequestException(`Request is not awaiting payment (current status: ${request.status})`);
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
        items: true,
        student: { include: { user: { select: { id: true, email: true } } } },
      },
    });
    await this.notificationsService.sendToUser(
      request.student.user.id,
      'Payment Confirmed',
      `Your combined payment for ${this.documentNames(request)} has been confirmed. Your request is now pending review.`,
    );
    return {
      message: 'Payment confirmed. Request is now pending review.',
      data: this.serializeRequest(updated),
    };
  }

  async getMyRequests(userId: string) {
    const profile = await requireStudentProfile(this.prisma, userId);
    const requests = await this.prisma.documentRequest.findMany({
      where: { studentId: profile.id },
      include: { items: { orderBy: { createdAt: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
    return {
      data: requests.map((request: any) => this.serializeRequest(request)),
      total: requests.length,
    };
  }

  async getAllRequests(status?: string, type?: string) {
    const requests = await this.prisma.documentRequest.findMany({
      where: status ? { status } : undefined,
      include: {
        items: { orderBy: { createdAt: 'asc' } },
        student: {
          include: {
            user: { select: { email: true, firstName: true, lastName: true } },
            program: { select: { code: true, name: true } },
          },
        },
        paymentConfirmedBy: { select: { firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    const filtered = type
      ? requests.filter((request: any) => request.items.some((item: any) => item.type === type))
      : requests;
    return {
      data: filtered.map((request: any) => this.serializeRequest(request)),
      total: filtered.length,
    };
  }

  async getRequestById(id: string) {
    const request = await this.prisma.documentRequest.findUnique({
      where: { id },
      include: {
        items: { orderBy: { createdAt: 'asc' } },
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
    return this.serializeRequest(request);
  }

  async updateRequestStatus(id: string, dto: UpdateRequestDto) {
    const request = await this.prisma.documentRequest.findUnique({
      where: { id },
      include: {
        items: true,
        student: { include: { user: { select: { id: true, email: true } } } },
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
        items: true,
        student: { include: { user: { select: { id: true, email: true } } } },
      },
    });
    const statusMessage = STATUS_MESSAGES[dto.status];
    if (statusMessage) {
      await this.notificationsService.sendToUser(
        request.student.user.id,
        'Document Request Update',
        `Your request for ${this.documentNames(request)} ${statusMessage}.${dto.remarks ? ` Remarks: ${dto.remarks}` : ''}`,
      );
    }
    return {
      message: `Request status updated to '${dto.status}'`,
      data: this.serializeRequest(updated),
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

  private documentNames(request: any): string {
    if (request.items?.length) return request.items.map((item: any) => item.label).join(', ');
    return request.type.replaceAll('_', ' ');
  }

  private serializeRequest(request: any) {
    const items = Array.isArray(request.items)
      ? request.items.map((item: any) => ({
          ...item,
          unitFee: Number(item.unitFee),
          lineTotal: Number(item.lineTotal),
        }))
      : [];
    const typeLabel =
      items.length === 1
        ? items[0].label
        : items.length > 1
          ? `${items.length} document types`
          : request.type.replaceAll('_', ' ');
    return {
      ...request,
      fee: Number(request.fee),
      items,
      typeLabel,
      documentNames: items.map((item: any) => item.label).join(', ') || typeLabel,
      totalQuantity: items.reduce((sum: number, item: any) => sum + item.quantity, 0) || 1,
      statusStep: this.getStatusStep(request.status),
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
