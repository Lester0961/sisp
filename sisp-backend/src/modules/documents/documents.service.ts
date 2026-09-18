import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateRequestDto } from './dto/create-request.dto';
import { UpdateRequestDto } from './dto/update-request.dto';
import { CreateCatalogItemDto } from './dto/create-catalog-item.dto';
import { UpdateCatalogItemDto } from './dto/update-catalog-item.dto';
import { assertTransition } from '../../common/utils/state-machine';
import { requireStudentProfile } from '../../common/utils/require-student-profile';
import { PAYMENT_CHANNELS } from '../../common/constants/payment-channels';
import { SubmitProofDto } from './dto/submit-proof.dto';

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

  async getCatalogItems(includeInactive = false) {
    const where = includeInactive ? {} : { isActive: true };
    const catalog = await this.prisma.documentCatalogItem.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
    });
    return (catalog || [])
      .sort((a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      .map((item: any) => ({
        id: item.id,
        code: item.code,
        label: item.label,
        fee: Number(item.fee),
        feeNote: item.feeNote || null,
        tat: item.tat || '3-5 business days',
        assignedTo: item.assignedTo || 'Records Staff',
        sortOrder: item.sortOrder ?? 0,
        isActive: Boolean(item.isActive ?? true),
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      }));
  }

  async createCatalogItem(dto: CreateCatalogItemDto) {
    const existing = await this.prisma.documentCatalogItem.findFirst({
      where: { code: dto.code.trim().toLowerCase() },
    });
    if (existing) {
      throw new ConflictException(`Document catalog item with code '${dto.code}' already exists`);
    }

    const created = await this.prisma.documentCatalogItem.create({
      data: {
        code: dto.code.trim().toLowerCase(),
        label: dto.label.trim(),
        fee: dto.fee,
        feeNote: dto.feeNote?.trim() || null,
        tat: dto.tat?.trim() || '3-5 business days',
        assignedTo: dto.assignedTo?.trim() || 'Records Staff',
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
      } as any,
    });

    return {
      ...created,
      fee: Number(created.fee),
    };
  }

  async updateCatalogItem(id: string, dto: UpdateCatalogItemDto) {
    const existing = await this.prisma.documentCatalogItem.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Document catalog item not found`);
    }

    if (dto.code && dto.code.trim().toLowerCase() !== existing.code) {
      const codeDuplicate = await this.prisma.documentCatalogItem.findFirst({
        where: { code: dto.code.trim().toLowerCase() },
      });
      if (codeDuplicate && codeDuplicate.id !== id) {
        throw new ConflictException(`Document code '${dto.code}' is already used by another document`);
      }
    }

    const updated = await this.prisma.documentCatalogItem.update({
      where: { id },
      data: {
        ...(dto.code ? { code: dto.code.trim().toLowerCase() } : {}),
        ...(dto.label ? { label: dto.label.trim() } : {}),
        ...(dto.fee !== undefined ? { fee: dto.fee } : {}),
        ...(dto.feeNote !== undefined ? { feeNote: dto.feeNote?.trim() || null } : {}),
        ...(dto.tat !== undefined ? { tat: dto.tat?.trim() || '3-5 business days' } : {}),
        ...(dto.assignedTo !== undefined ? { assignedTo: dto.assignedTo?.trim() || 'Records Staff' } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      } as any,
    });

    return {
      ...updated,
      fee: Number(updated.fee),
    };
  }

  async deleteCatalogItem(id: string) {
    const existing = await this.prisma.documentCatalogItem.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Document catalog item not found`);
    }

    // Check if any request items use this catalog item
    const usedCount = await this.prisma.documentRequestItem.findMany({
      where: { catalogItemId: id },
    });

    if (usedCount && usedCount.length > 0) {
      // Soft-delete to preserve foreign keys and request integrity
      await this.prisma.documentCatalogItem.update({
        where: { id },
        data: { isActive: false },
      });
      return { message: 'Document has historical requests; deactivated from catalog', deactivated: true };
    }

    await this.prisma.documentCatalogItem.delete({
      where: { id },
    });
    return { message: 'Document catalog item deleted successfully', deleted: true };
  }

  async getDocumentFees() {
    const catalog = await this.prisma.documentCatalogItem.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
    return (catalog || [])
      .filter((item: any) => item.isActive)
      .sort((a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      .map((item: any) => ({
        id: item.id,
        code: item.code,
        type: item.code,
        label: item.label,
        fee: Number(item.fee),
        feeNote: item.feeNote || null,
        tat: item.tat || '3-5 business days',
        assignedTo: item.assignedTo || 'Records Staff',
        sortOrder: item.sortOrder ?? 0,
        isActive: true,
      }));
  }

  async createRequest(userId: string, dto: CreateRequestDto) {
    const profile = await requireStudentProfile(this.prisma, userId);
    const typeCodes = dto.items.map((item) => item.type);
    if (new Set(typeCodes).size !== typeCodes.length) {
      throw new BadRequestException('Each document type can only appear once per request');
    }

    // Regis Marie College Policy Rule: Active Undergraduates can only request TOR for Employment Purposes Only
    if (typeCodes.includes('transcript_of_records')) {
      const isGraduated = (profile as any).isGraduated || profile.yearLevel > 4;
      if (!isGraduated) {
        throw new BadRequestException(
          'Undergraduate students are only eligible for "TOR (Undergraduate - For Employment Purposes Only)". Official graduate TOR is issued only to alumni/graduates upon CHED Special Order confirmation.',
        );
      }
    }

    // Duplicate Check: Check if student already has an active pending request for any of these document types
    const activeRequests = await this.prisma.documentRequest.findMany({
      where: {
        studentId: profile.id,
        status: { in: ['awaiting_payment', 'pending', 'under_review', 'approved'] },
      },
      include: { items: true },
    });
    for (const req of activeRequests) {
      for (const item of (req as any).items || []) {
        if (typeCodes.includes(item.type)) {
          throw new ConflictException(
            `You already have an active request in progress for '${item.label || item.type}'. Duplicate requests are not permitted by Records policy.`,
          );
        }
      }
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

    // Determine staff assignment and TAT notes based on items
    const hasTor = typeCodes.some((t) => t.includes('transcript_of_records'));
    const assignedStaff = hasTor ? 'Miss Rose (TOR Evaluation)' : 'Sir Christian (Records)';
    const combinedRemarks = [
      dto.remarks,
      dto.isThirdParty
        ? `[Third-Party Request: ${dto.authorizationNotes || 'Authorized Representative'}]`
        : null,
      `[Assigned: ${assignedStaff}]`,
    ]
      .filter(Boolean)
      .join(' ');

    const request = await this.prisma.$transaction(async (transaction: any) => {
      const created = await transaction.documentRequest.create({
        data: {
          studentId: profile.id,
          type: requestItems.length === 1 ? requestItems[0].type : 'multiple_documents',
          status: 'awaiting_payment',
          remarks: combinedRemarks || dto.remarks,
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

  async getPaymentChannels() {
    return PAYMENT_CHANNELS;
  }

  async submitPaymentProof(userId: string, requestId: string, dto: SubmitProofDto) {
    const profile = await requireStudentProfile(this.prisma, userId);
    const request = await this.prisma.documentRequest.findUnique({
      where: { id: requestId },
      include: { items: true },
    });
    if (!request || (request as any).studentId !== profile.id) {
      throw new NotFoundException(`Document request with ID ${requestId} not found`);
    }
    if (request.status !== 'awaiting_payment') {
      throw new BadRequestException(
        `Proof can only be submitted while awaiting payment (current status: ${request.status})`,
      );
    }
    const updated = await this.prisma.documentRequest.update({
      where: { id: requestId },
      data: {
        paymentProofChannel: dto.channel,
        paymentProofReference: dto.reference.trim(),
        paymentProofSubmittedAt: new Date(),
      } as any,
      include: { items: true },
    });
    return {
      message:
        'Proof of payment submitted. Treasury will verify it with Ms. Arlyne Punzalan before confirming your payment.',
      data: this.serializeRequest(updated),
    };
  }

  async confirmPayment(actorId: string, requestId: string, actorRole?: string) {
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
    if (actorRole === 'student') {
      const profile = await requireStudentProfile(this.prisma, actorId);
      if ((request as any).studentId !== profile.id) {
        throw new NotFoundException(`Document request with ID ${requestId} not found`);
      }
    }
    if (request.status !== 'awaiting_payment') {
      throw new BadRequestException(`Request is not awaiting payment (current status: ${request.status})`);
    }
    assertTransition(request.status, 'pending', STATUS_TRANSITIONS);

    const isStaff = actorRole !== 'student';
    const updated = await this.prisma.documentRequest.update({
      where: { id: requestId },
      data: {
        status: 'pending',
        paymentStatus: 'paid',
        ...(isStaff
          ? { paymentConfirmedById: actorId, paymentConfirmedAt: new Date() }
          : { paymentConfirmedAt: new Date() }),
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
