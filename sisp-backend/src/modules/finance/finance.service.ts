import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { requireStudentProfile } from '../../common/utils/require-student-profile';
import { assertTransition } from '../../common/utils/state-machine';
import { RecordTransactionDto, VerifyTransactionDto } from './dto/finance.dto';

/** Payment transaction transitions (P6-02): pending → verified|rejected;
 * verified → void (reversal); rejected/void are terminal. */
export const TRANSACTION_TRANSITIONS: Record<string, string[]> = {
  pending: ['verified', 'rejected'],
  verified: ['void'],
  rejected: [],
  void: [],
};

const money = (value: unknown): number => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : 0;
};

@Injectable()
export class FinanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Balance derivation (P6-02): obligations from StudentSemester records
   * minus verified PaymentTransaction amounts. Document-request fees keep
   * their own request payment trail and are not mixed into this balance.
   */
  async recalculateBalance(studentProfileId: string) {
    const [obligations, payments] = await Promise.all([
      this.prisma.studentSemester.findMany({
        where: { studentId: studentProfileId },
        select: { amountDue: true },
      }),
      this.prisma.paymentTransaction.findMany({
        where: { studentId: studentProfileId, status: 'verified' },
        select: { amount: true },
      }),
    ]);

    const totalObligations = money(
      obligations.reduce((sum, entry) => sum + money(entry.amountDue), 0),
    );
    const totalPaid = money(
      payments.reduce((sum, entry) => sum + money(entry.amount), 0),
    );
    const balance = money(Math.max(0, totalObligations - totalPaid));

    const existing = await this.prisma.accountBalance.findUnique({
      where: { studentId: studentProfileId },
    });
    if (existing) {
      await this.prisma.accountBalance.update({
        where: { studentId: studentProfileId },
        data: { balance },
      });
    } else {
      await this.prisma.accountBalance.create({
        data: { studentId: studentProfileId, balance, status: 'active' },
      });
    }

    return { totalObligations, totalPaid, balance };
  }

  private async getStudentOrThrow(studentProfileId: string) {
    const student = await this.prisma.studentProfile.findUnique({
      where: { id: studentProfileId },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
        program: { select: { code: true, name: true } },
        accountBalance: { select: { balance: true, status: true } },
      },
    });
    if (!student) {
      throw new NotFoundException(`Student profile ${studentProfileId} not found`);
    }
    return student;
  }

  private async buildSummary(studentProfileId: string) {
    const student = await this.getStudentOrThrow(studentProfileId);

    const [obligations, payments] = await Promise.all([
      this.prisma.studentSemester.findMany({
        where: { studentId: studentProfileId },
        orderBy: [{ year: 'desc' }, { semester: 'desc' }],
        include: { term: { select: { code: true, label: true, academicYear: true } } },
      }),
      this.prisma.paymentTransaction.findMany({
        where: { studentId: studentProfileId },
        orderBy: { createdAt: 'desc' },
        include: {
          academicTerm: { select: { code: true, label: true, academicYear: true } },
          verifiedBy: { select: { firstName: true, lastName: true } },
        },
      }),
    ]);

    const obligationRows = obligations.map((entry: any) => ({
      id: entry.id,
      termId: entry.termId ?? null,
      termLabel: entry.term?.label ?? null,
      academicYear: entry.term?.academicYear ?? entry.year,
      semester: entry.semester,
      amountDue: money(entry.amountDue),
      amountPaid: money(entry.amountPaid),
      isFullyPaid: Boolean(entry.isFullyPaid),
      paymentStatus: entry.paymentStatus,
    }));

    const paymentRows = payments.map((entry: any) => ({
      id: entry.id,
      amount: money(entry.amount),
      paymentMethod: entry.paymentMethod ?? null,
      referenceNumber: entry.referenceNumber ?? null,
      status: entry.status,
      paidAt: entry.paidAt,
      verifiedAt: entry.verifiedAt,
      termLabel: entry.academicTerm?.label ?? null,
      academicYear: entry.academicTerm?.academicYear ?? null,
      verifiedBy: entry.verifiedBy
        ? `${entry.verifiedBy.firstName ?? ''} ${entry.verifiedBy.lastName ?? ''}`.trim()
        : null,
      createdAt: entry.createdAt,
    }));

    const totalObligations = money(
      obligationRows.reduce((sum, entry) => sum + entry.amountDue, 0),
    );
    const totalPaid = money(
      paymentRows
        .filter((entry) => entry.status === 'verified')
        .reduce((sum, entry) => sum + entry.amount, 0),
    );
    // Always report the explainable derived balance (P6-02): obligations
    // minus verified payments. The stored AccountBalance is kept in sync by
    // recalculateBalance for enrollment gating.
    const balance = money(Math.max(0, totalObligations - totalPaid));

    return {
      student: {
        id: student.id,
        studentNumber: student.studentNumber,
        firstName: student.user?.firstName ?? null,
        lastName: student.user?.lastName ?? null,
        email: student.user?.email ?? null,
        program: student.program ?? null,
      },
      balance,
      balanceStatus: student.accountBalance?.status ?? null,
      totalObligations,
      totalPaid,
      obligations: obligationRows,
      upcomingObligations: obligationRows.filter(
        (entry) =>
          !entry.isFullyPaid &&
          entry.paymentStatus !== 'paid' &&
          entry.paymentStatus !== 'waived',
      ),
      payments: paymentRows,
    };
  }

  /** Student view of their own financial record (P6, financial.read_own). */
  async getMySummary(userId: string) {
    const profile = await requireStudentProfile(this.prisma, userId);
    return this.buildSummary(profile.id);
  }

  /** Treasury view of one student's financial record. */
  async getStudentSummary(studentProfileId: string) {
    return this.buildSummary(studentProfileId);
  }

  /** Treasury student search/select (P6). */
  async searchStudents(query?: string) {
    const trimmed = query?.trim();
    const where = trimmed
      ? {
          OR: [
            { studentNumber: { contains: trimmed, mode: 'insensitive' as const } },
            { user: { firstName: { contains: trimmed, mode: 'insensitive' as const } } },
            { user: { lastName: { contains: trimmed, mode: 'insensitive' as const } } },
            { user: { email: { contains: trimmed, mode: 'insensitive' as const } } },
          ],
        }
      : undefined;

    const students = await this.prisma.studentProfile.findMany({
      where,
      take: 25,
      orderBy: { studentNumber: 'asc' },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        program: { select: { code: true, name: true } },
        accountBalance: { select: { balance: true, status: true } },
      },
    });

    return {
      data: students.map((student: any) => ({
        id: student.id,
        studentNumber: student.studentNumber,
        firstName: student.user?.firstName ?? null,
        lastName: student.user?.lastName ?? null,
        email: student.user?.email ?? null,
        program: student.program ?? null,
        balance:
          student.accountBalance?.balance != null ? money(student.accountBalance.balance) : null,
        balanceStatus: student.accountBalance?.status ?? null,
      })),
      total: students.length,
    };
  }

  /**
   * Treasury records a payment (P6-02). Treasury is the verifying fiscal
   * role, so recorded transactions start as verified; pending transactions
   * are reserved for future student-submitted references/proofs.
   */
  async recordTransaction(actorId: string, dto: RecordTransactionDto) {
    const student = await this.getStudentOrThrow(dto.studentProfileId);

    if (dto.academicTermId) {
      const term = await this.prisma.academicTerm.findUnique({
        where: { id: dto.academicTermId },
      });
      if (!term) {
        throw new NotFoundException(`Academic term ${dto.academicTermId} not found`);
      }
    }

    const amount = money(dto.amount);
    if (amount <= 0) {
      throw new BadRequestException('Amount must be greater than zero');
    }

    const transaction = await this.prisma.paymentTransaction.create({
      data: {
        studentId: student.id,
        academicTermId: dto.academicTermId ?? null,
        amount,
        paymentMethod: dto.paymentMethod?.trim() || null,
        referenceNumber: dto.referenceNumber?.trim() || null,
        proofUrl: dto.proofUrl?.trim() || null,
        // Treasury staff encode payments on behalf of students, but every
        // entry still passes the same verification lifecycle: a recorded
        // payment is pending until a second Treasury action verifies it, so
        // balance and clearance effects only apply after verification.
        status: 'pending',
        paidAt: dto.paidAt ? new Date(dto.paidAt) : null,
      },
      include: {
        academicTerm: { select: { code: true, label: true, academicYear: true } },
        verifiedBy: { select: { firstName: true, lastName: true } },
      },
    });

    const balance = await this.recalculateBalance(student.id);

    await this.notificationsService.sendToUser(
      student.user.id,
      'Payment Recorded',
      'A payment has been recorded on your student account and is pending Treasury verification.',
    );

    return {
      message: 'Payment recorded and queued for Treasury verification',
      data: { ...transaction, amount: money(transaction.amount) },
      balance,
    };
  }

  /** Treasury verifies or rejects a pending transaction (P6-03/P6-06). */
  async verifyTransaction(actorId: string, id: string, dto: VerifyTransactionDto) {
    const transaction = await this.prisma.paymentTransaction.findUnique({
      where: { id },
      include: {
        student: { include: { user: { select: { id: true } } } },
      },
    });
    if (!transaction) {
      throw new NotFoundException(`Payment transaction ${id} not found`);
    }

    assertTransition(transaction.status, dto.decision, TRANSACTION_TRANSITIONS);

    const updated = await this.prisma.paymentTransaction.update({
      where: { id },
      data: {
        status: dto.decision,
        verifiedById: actorId,
        verifiedAt: new Date(),
        ...(dto.decision === 'verified' ? { paidAt: transaction.paidAt ?? new Date() } : {}),
      },
      include: {
        academicTerm: { select: { code: true, label: true, academicYear: true } },
        verifiedBy: { select: { firstName: true, lastName: true } },
      },
    });

    const balance = await this.recalculateBalance(transaction.studentId);
    const amount = money(transaction.amount);

    await this.notificationsService.sendToUser(
      (transaction as any).student.user.id,
      dto.decision === 'verified' ? 'Payment Verified' : 'Payment Not Verified',
      dto.decision === 'verified'
        ? 'A payment has been verified and posted to your student account.'
        : 'A payment could not be verified. Please contact the Treasury Office.',
      { email: true },
    );

    return {
      message: `Payment transaction ${dto.decision}`,
      data: { ...updated, amount: money(updated.amount) },
      balance,
    };
  }

  /** Treasury reverses a verified transaction (correction control). */
  async voidTransaction(actorId: string, id: string) {
    const transaction = await this.prisma.paymentTransaction.findUnique({
      where: { id },
    });
    if (!transaction) {
      throw new NotFoundException(`Payment transaction ${id} not found`);
    }

    assertTransition(transaction.status, 'void', TRANSACTION_TRANSITIONS);

    const updated = await this.prisma.paymentTransaction.update({
      where: { id },
      data: { status: 'void', verifiedById: actorId, verifiedAt: new Date() },
    });

    const balance = await this.recalculateBalance(transaction.studentId);

    return {
      message: 'Payment transaction voided',
      data: { ...updated, amount: money(updated.amount) },
      balance,
    };
  }
}
