import { BadRequestException } from '@nestjs/common';
import { FinanceService } from './finance.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('FinanceService (Phase 6, P6-02/P6-03)', () => {
  let service: FinanceService;

  const mockPrisma: any = {
    studentSemester: { findMany: jest.fn() },
    paymentTransaction: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    accountBalance: {
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    studentProfile: { findUnique: jest.fn(), findMany: jest.fn() },
    academicTerm: { findUnique: jest.fn() },
  };

  const mockNotifications = { sendToUser: jest.fn() };

  beforeEach(() => {
    jest.resetAllMocks();
    service = new FinanceService(mockPrisma as PrismaService, mockNotifications as any);
  });

  it('derives the balance from obligations minus verified payments', async () => {
    mockPrisma.studentSemester.findMany.mockResolvedValue([
      { amountDue: 1000 },
      { amountDue: 500.5 },
    ]);
    mockPrisma.paymentTransaction.findMany.mockResolvedValue([
      { amount: 200 },
    ]);
    mockPrisma.accountBalance.findUnique.mockResolvedValue({ id: 'bal-1', balance: 0 });

    const result = await service.recalculateBalance('sp-1');

    expect(result).toEqual({ totalObligations: 1500.5, totalPaid: 200, balance: 1300.5 });
    expect(mockPrisma.paymentTransaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { studentId: 'sp-1', status: 'verified' } }),
    );
    expect(mockPrisma.accountBalance.update).toHaveBeenCalledWith({
      where: { studentId: 'sp-1' },
      data: { balance: 1300.5 },
    });
  });

  it('creates the balance record when none exists', async () => {
    mockPrisma.studentSemester.findMany.mockResolvedValue([{ amountDue: 100 }]);
    mockPrisma.paymentTransaction.findMany.mockResolvedValue([]);
    mockPrisma.accountBalance.findUnique.mockResolvedValue(null);

    await service.recalculateBalance('sp-2');

    expect(mockPrisma.accountBalance.create).toHaveBeenCalledWith({
      data: { studentId: 'sp-2', balance: 100, status: 'active' },
    });
  });

  it('verifies a pending transaction, recalculates balance, and notifies the student', async () => {
    mockPrisma.paymentTransaction.findUnique.mockResolvedValue({
      id: 'tx-1',
      status: 'pending',
      amount: 500,
      studentId: 'sp-1',
      paidAt: null,
      student: { user: { id: 'user-1' } },
    });
    mockPrisma.paymentTransaction.update.mockResolvedValue({
      id: 'tx-1',
      status: 'verified',
      amount: 500,
      academicTerm: null,
      verifiedBy: null,
    });
    mockPrisma.studentSemester.findMany.mockResolvedValue([{ amountDue: 1000 }]);
    mockPrisma.paymentTransaction.findMany.mockResolvedValue([{ amount: 500 }]);
    mockPrisma.accountBalance.findUnique.mockResolvedValue({ id: 'bal-1' });

    const result = await service.verifyTransaction('treasury-1', 'tx-1', {
      decision: 'verified',
    });

    expect(result.data.status).toBe('verified');
    expect(mockPrisma.paymentTransaction.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'verified', verifiedById: 'treasury-1' }),
      }),
    );
    expect(mockNotifications.sendToUser).toHaveBeenCalledWith(
      'user-1',
      'Payment Verified',
      'A payment has been verified and posted to your student account.',
    );
    expect(result.balance.balance).toBe(500);
  });

  it('rejects invalid transaction transitions', async () => {
    mockPrisma.paymentTransaction.findUnique.mockResolvedValue({
      id: 'tx-1',
      status: 'verified',
      amount: 500,
      studentId: 'sp-1',
      student: { user: { id: 'user-1' } },
    });

    await expect(
      service.verifyTransaction('treasury-1', 'tx-1', { decision: 'rejected' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(mockPrisma.paymentTransaction.update).not.toHaveBeenCalled();
  });

  it('scopes the student summary to the authenticated user', async () => {
    mockPrisma.studentProfile.findUnique
      .mockResolvedValueOnce({ id: 'sp-1' }) // requireStudentProfile
      .mockResolvedValueOnce({
        id: 'sp-1',
        studentNumber: '2026-0001',
        user: { id: 'user-1', email: 'a@b.c', firstName: 'A', lastName: 'B' },
        program: { code: 'BSCS', name: 'BS CS' },
        accountBalance: { balance: 250, status: 'active' },
      });
    mockPrisma.studentSemester.findMany.mockResolvedValue([
      { id: 'obl-1', termId: null, term: null, year: '2026-2027', semester: 'T1', amountDue: 500, amountPaid: 0, isFullyPaid: false, paymentStatus: 'unpaid' },
    ]);
    mockPrisma.paymentTransaction.findMany.mockResolvedValue([
      { id: 'tx-1', amount: 250, status: 'verified', academicTerm: null, verifiedBy: null, paymentMethod: 'gcash' },
    ]);

    const summary = await service.getMySummary('user-1');

    expect(mockPrisma.studentProfile.findUnique).toHaveBeenNthCalledWith(1, {
      where: { userId: 'user-1' },
    });
    expect(summary.student.id).toBe('sp-1');
    expect(summary.balance).toBe(250);
    expect(summary.totalObligations).toBe(500);
    expect(summary.totalPaid).toBe(250);
    expect(summary.upcomingObligations).toHaveLength(1);
    expect(summary.payments).toHaveLength(1);
  });

  it('maps treasury search results with balances', async () => {
    mockPrisma.studentProfile.findMany.mockResolvedValue([
      {
        id: 'sp-1',
        studentNumber: '2026-0001',
        user: { firstName: 'A', lastName: 'B', email: 'a@b.c' },
        program: { code: 'BSCS', name: 'BS CS' },
        accountBalance: { balance: 100.25, status: 'active' },
      },
    ]);

    const result = await service.searchStudents('2026');

    expect(result.total).toBe(1);
    expect(result.data[0]).toMatchObject({ studentNumber: '2026-0001', balance: 100.25 });
  });
});
