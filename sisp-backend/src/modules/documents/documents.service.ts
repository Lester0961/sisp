import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateRequestDto } from './dto/create-request.dto';
import { UpdateRequestDto } from './dto/update-request.dto';
import { CreateCatalogItemDto } from './dto/create-catalog-item.dto';
import { UpdateCatalogItemDto } from './dto/update-catalog-item.dto';
import { assertTransition } from '../../common/utils/state-machine';
import { requireStudentProfile } from '../../common/utils/require-student-profile';
import {
  REQUEST_STATUS_MESSAGES,
  REQUEST_STATUS_TRANSITIONS,
} from '../../common/utils/request-status';
import { getPaymentChannels } from '../../common/constants/payment-channels';
import { SubmitProofDto } from './dto/submit-proof.dto';



function generatePaymentReference(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `SISP-${timestamp}-${random}`;
}

const toMinorUnits = (amount: number | string | { toString(): string }) => Math.round(Number(amount) * 100);
const fromMinorUnits = (minor: number) => minor / 100;



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
        billingBasis: item.billingBasis || (item.code === 'transcript_of_records' ? 'page' : 'copy'),
        feeNote: item.feeNote || null,
        tat: item.tat || null,
        assignedTo: item.assignedTo || null,
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
        tat: dto.tat?.trim() || null,
        assignedTo: dto.assignedTo?.trim() || null,
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
        ...(dto.tat !== undefined ? { tat: dto.tat?.trim() || null } : {}),
        ...(dto.assignedTo !== undefined ? { assignedTo: dto.assignedTo?.trim() || null } : {}),
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
        billingBasis: item.billingBasis || (item.code === 'transcript_of_records' ? 'page' : 'copy'),
        feeNote: item.feeNote || null,
        tat: item.tat || null,
        assignedTo: item.assignedTo || null,
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

    // Duplicate Check: Check if student already has an active pending request for any of these document types
    const activeRequests = await this.prisma.documentRequest.findMany({
      where: {
        studentId: profile.id,
        status: { in: ['awaiting_payment', 'awaiting_page_confirmation', 'pending', 'under_review', 'approved'] },
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
      const billingBasis = catalogItem.billingBasis || (catalogItem.code === 'transcript_of_records' ? 'page' : 'copy');
      return {
        catalogItemId: catalogItem.id,
        type: catalogItem.code,
        label: catalogItem.label,
        quantity: item.quantity,
        unitFee,
        lineTotal: billingBasis === 'page' ? 0 : fromMinorUnits(toMinorUnits(unitFee) * item.quantity),
        billingBasis,
        pageCount: null,
        remarks: item.remarks,
      };
    });
    const totalFee = fromMinorUnits(requestItems.reduce((sum, item) => sum + toMinorUnits(item.lineTotal), 0));
    const paymentReference = generatePaymentReference();
    const referenceNo = await this.generateRequestReference();

    // Determine staff assignment and TAT notes based on items
    const combinedRemarks = [
      dto.remarks,
      dto.isThirdParty
        ? `[Third-Party Request: ${dto.authorizationNotes || 'Authorized Representative'}]`
        : null,
    ]
      .filter(Boolean)
      .join(' ');

    const request = await this.prisma.$transaction(async (transaction: any) => {
      const created = await transaction.documentRequest.create({
        data: {
          studentId: profile.id,
          type: requestItems.length === 1 ? requestItems[0].type : 'multiple_documents',
          referenceNo,
          status: requestItems.some((item) => item.billingBasis === 'page') ? 'awaiting_page_confirmation' : 'awaiting_payment',
          remarks: combinedRemarks || dto.remarks,
          fee: totalFee,
          paymentStatus: 'unpaid',
          paymentReference,
          // No fabricated QR image: students pay via the official Treasury
          // channels and the reference is their payment identifier.
          qrCodeUrl: null,
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
    return getPaymentChannels();
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
    if (request.paymentProofReference) throw new ConflictException('Payment proof has already been submitted for this request');
    const duplicateProof = await this.prisma.documentRequest.findFirst({
      where: { paymentProofChannel: dto.channel, paymentProofReference: dto.reference.trim(), NOT: { id: requestId } },
      select: { id: true },
    });
    if (duplicateProof) throw new ConflictException('This payment reference was already submitted for another request');
    const savedProof = await this.prisma.documentRequest.updateMany({
      where: { id: requestId, status: 'awaiting_payment', paymentProofReference: null },
      data: {
        paymentProofChannel: dto.channel,
        paymentProofReference: dto.reference.trim(),
        paymentProofSubmittedAt: new Date(),
      } as any,
    });
    if (savedProof.count !== 1) throw new ConflictException('This request changed while proof was being submitted; refresh and retry');
    const updated = await this.prisma.documentRequest.findUniqueOrThrow({ where: { id: requestId }, include: { items: true } });
    return {
      message:
        'Proof of payment submitted. The Treasury Office will verify it before confirming your payment.',
      data: this.serializeRequest(updated),
    };
  }

  /**
   * Treasury confirms a document-request payment after verification
   * (P6-03). Students can no longer self-confirm; the route is gated by
   * `financial.manage` and the actor is always recorded.
   */
  async confirmPayment(actorId: string, requestId: string) {
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
    if (!request.paymentProofReference?.trim() || !request.paymentProofChannel) {
      throw new BadRequestException('Student payment proof must be submitted before Treasury can confirm payment');
    }
    assertTransition(request.status, 'pending', REQUEST_STATUS_TRANSITIONS);

    const updated = await this.prisma.$transaction(async (tx: any) => {
      const claimed = await tx.documentRequest.updateMany({
        where: { id: requestId, status: 'awaiting_payment', paymentStatus: 'unpaid', paymentProofReference: request.paymentProofReference },
        data: { status: 'pending', paymentStatus: 'paid', paymentConfirmedById: actorId, paymentConfirmedAt: new Date() },
      });
      if (claimed.count !== 1) throw new ConflictException('Payment status changed during verification; refresh and retry');
      const result = await tx.documentRequest.findUniqueOrThrow({
        where: { id: requestId },
        include: { items: true, student: { include: { user: { select: { id: true, email: true } } } } },
      });
      await tx.auditLog.create({ data: { userId: actorId, action: 'DOCUMENT_PAYMENT_CONFIRMED', resource: 'document_requests', resourceId: requestId, oldValue: 'unpaid', newValue: 'paid', ipAddress: null } });
      return result;
    });
    await this.notificationsService.sendToUser(
      request.student.user.id,
      'Payment Confirmed',
      'Your payment has been confirmed. Your service request is now pending review.',
      { email: true },
    ).catch(() => undefined);
    return {
      message: 'Payment confirmed. Request is now pending review.',
      data: this.serializeRequest(updated),
    };
  }

  async confirmTorQuote(actorId: string, requestId: string, pageCount: number) {
    if (!Number.isInteger(pageCount) || pageCount < 1 || pageCount > 19994) {
      throw new BadRequestException('Confirmed page count is outside the supported amount range');
    }
    const request = await this.prisma.documentRequest.findUnique({ where: { id: requestId }, include: { items: true, student: { include: { user: { select: { id: true } } } } } });
    if (!request) throw new NotFoundException(`Document request with ID ${requestId} not found`);
    if (request.status !== 'awaiting_page_confirmation') {
      throw new BadRequestException(`Request is not awaiting page confirmation (current status: ${request.status})`);
    }
    const torItems = request.items.filter((item: any) => item.billingBasis === 'page' || item.type === 'transcript_of_records');
    if (torItems.length !== 1) throw new BadRequestException('Request must contain exactly one TOR line to confirm its page count');
    const tor = torItems[0];
    const catalog = await this.prisma.documentCatalogItem.findUnique({ where: { id: tor.catalogItemId } });
    if (!catalog?.isActive) throw new BadRequestException('TOR catalog price is unavailable');
    const torTotal = fromMinorUnits(toMinorUnits(catalog.fee) * pageCount * tor.quantity);
    const finalFee = fromMinorUnits(request.items.reduce((sum: number, item: any) => sum + (item.id === tor.id ? toMinorUnits(torTotal) : toMinorUnits(item.lineTotal)), 0));
    if (finalFee > 99_999_999.99) throw new BadRequestException('Confirmed amount exceeds the supported request total');
    const result = await this.prisma.$transaction(async (tx: any) => {
      const claimed = await tx.documentRequest.updateMany({ where: { id: requestId, status: 'awaiting_page_confirmation' }, data: { status: 'awaiting_payment', fee: finalFee } });
      if (claimed.count !== 1) throw new ConflictException('TOR quote was already confirmed; refresh and retry');
      await tx.documentRequestItem.update({ where: { id: tor.id }, data: { pageCount, unitFee: catalog.fee, billingBasis: 'page', lineTotal: torTotal } });
      const updated = await tx.documentRequest.update({
        where: { id: requestId },
        data: { quoteConfirmedById: actorId, quoteConfirmedAt: new Date() },
        include: { items: { orderBy: { createdAt: 'asc' } } },
      });
      await tx.auditLog.create({ data: { userId: actorId, action: 'TOR_QUOTE_CONFIRMED', resource: 'requests', resourceId: requestId, oldValue: request.status, newValue: JSON.stringify({ status: updated.status, pageCount, fee: finalFee }), ipAddress: null } });
      return { message: 'TOR page count confirmed; the final amount is now available for payment.', data: this.serializeRequest(updated) };
    });
    await this.notificationsService.sendToUser(request.student.user.id, 'TOR fee confirmed', 'The Records Office confirmed your TOR page count. You can now review the final fee and payment instructions.').catch(() => undefined);
    return result;
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

  async getPaymentQueue() {
    return this.prisma.documentRequest.findMany({
      where: { status: 'awaiting_payment', paymentStatus: 'unpaid' },
      select: {
        id: true, studentId: true, type: true, status: true, fee: true, paymentStatus: true,
        paymentReference: true, paymentProofChannel: true, paymentProofReference: true, paymentProofSubmittedAt: true,
        createdAt: true,
        items: { select: { type: true, label: true, quantity: true, unitFee: true, lineTotal: true, pageCount: true, billingBasis: true } },
        student: { select: { studentNumber: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
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

  async updateRequestStatus(id: string, dto: UpdateRequestDto, actorId?: string) {
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
    if (request.status === 'awaiting_payment' && dto.status === 'pending') {
      throw new BadRequestException(
        'Treasury must verify submitted payment proof before this request can move to pending.',
      );
    }
    assertTransition(request.status, dto.status, REQUEST_STATUS_TRANSITIONS);

    const previousStatus = request.status;

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

    // Explicit audit record for the status change (P7-04): actor, request,
    // old status, new status, timestamp.
    await this.prisma.auditLog.create({
      data: {
        userId: actorId ?? null,
        action: 'SERVICE_REQUEST_STATUS_CHANGE',
        resource: 'requests',
        resourceId: id,
        oldValue: previousStatus,
        newValue: dto.status,
        ipAddress: null,
      },
    });

    if (REQUEST_STATUS_MESSAGES[dto.status]) {
      await this.notificationsService.sendToUser(
        request.student.user.id,
        'Document Request Update',
        `Your service request status is now ${dto.status.replaceAll('_', ' ')}.`,
        { email: true },
      );
    }
    return {
      message: `Request status updated to '${dto.status}'`,
      data: this.serializeRequest(updated),
    };
  }

  async getRequestStats() {
    const [awaiting_page_confirmation, awaiting_payment, pending, under_review, approved, released, rejected] = await Promise.all([
      this.prisma.documentRequest.count({ where: { status: 'awaiting_page_confirmation' } }),
      this.prisma.documentRequest.count({ where: { status: 'awaiting_payment' } }),
      this.prisma.documentRequest.count({ where: { status: 'pending' } }),
      this.prisma.documentRequest.count({ where: { status: 'under_review' } }),
      this.prisma.documentRequest.count({ where: { status: 'approved' } }),
      this.prisma.documentRequest.count({ where: { status: 'released' } }),
      this.prisma.documentRequest.count({ where: { status: 'rejected' } }),
    ]);
    return {
      awaiting_page_confirmation,
      awaiting_payment,
      pending,
      under_review,
      approved,
      released,
      rejected,
      total: awaiting_page_confirmation + awaiting_payment + pending + under_review + approved + released + rejected,
    };
  }

  private documentNames(request: any): string {
    if (request.items?.length) return request.items.map((item: any) => item.label).join(', ');
    return request.type.replaceAll('_', ' ');
  }

  private async generateRequestReference(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `REQ-${year}-`;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const count = await this.prisma.documentRequest.count({
        where: { referenceNo: { startsWith: prefix } },
      });
      const candidate = `${prefix}${String(count + 1 + attempt).padStart(4, '0')}`;
      const clash = await this.prisma.documentRequest.findUnique({
        where: { referenceNo: candidate },
        select: { id: true },
      });
      if (!clash) {
        return candidate;
      }
    }
    return `${prefix}${Date.now().toString(36).toUpperCase()}`;
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
      awaiting_page_confirmation: 0,
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
