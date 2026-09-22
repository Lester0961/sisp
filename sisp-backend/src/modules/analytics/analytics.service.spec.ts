import * as ExcelJS from 'exceljs';
import { AnalyticsService } from './analytics.service';

const access: any = { assertCanReadStudent: jest.fn().mockResolvedValue(undefined) };

describe('AnalyticsService enrollment exports', () => {
  it('exports the dashboard enrollment aggregates with the student detail sheet', async () => {
    const prisma: any = {
      studentProfile: {
        groupBy: jest.fn().mockResolvedValue([
          { programId: 'program-1', _count: { id: 2 } },
        ]),
        count: jest.fn().mockResolvedValue(2),
        findMany: jest.fn().mockResolvedValue([]),
      },
      program: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'program-1', name: 'Bachelor of Science in Computing' },
        ]),
      },
    };
    const service = new AnalyticsService(prisma, access);

    const buffer = await service.exportEnrollmentExcel();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);

    const summary = workbook.getWorksheet('Program Summary');
    expect(summary?.getRow(1).values).toEqual([, 'Program', 'Student Profiles']);
    expect(summary?.getRow(2).values).toEqual([
      ,
      'Bachelor of Science in Computing',
      2,
    ]);
    expect(summary?.getRow(3).values).toEqual([, 'Total Student Profiles', 2]);
    expect(workbook.getWorksheet('Student Details')).toBeDefined();
    expect(prisma.studentProfile.groupBy).toHaveBeenCalledWith({
      by: ['programId'],
      _count: { id: true },
    });
    expect(prisma.studentProfile.count).toHaveBeenCalledTimes(1);
  });
});

describe('AnalyticsService chatbot analytics', () => {
  it('reports real escalation counts without inventing rates when there are no logs', async () => {
    const prisma: any = {
      chatLog: {
        count: jest.fn().mockResolvedValue(0),
        groupBy: jest.fn().mockResolvedValue([
          { intent: 'enrollment_inquiry', _count: { id: 1 }, _avg: { confidence: null } },
        ]),
      },
      escalationQueue: {
        count: jest.fn((args: any) => Promise.resolve(args?.where?.status === 'resolved' ? 3 : 5)),
      },
    };
    const service = new AnalyticsService(prisma, access);

    await expect(service.getChatbotAnalytics()).resolves.toEqual({
      totalLogs: 0,
      escalatedCount: 5,
      escalationsResolved: 3,
      escalationRate: null,
      escalationResolutionRate: 0.6,
      intentDistribution: [{ intent: 'enrollment_inquiry', count: 1, avgConfidence: null }],
    });
  });
});

describe('AnalyticsService finance summary', () => {
  it('derives tuition totals from the ledger tables', async () => {
    const prisma: any = {
      studentSemester: { aggregate: jest.fn().mockResolvedValue({ _sum: { amountDue: 10000 } }) },
      paymentTransaction: {
        aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 6500.555 } }),
        count: jest.fn().mockResolvedValue(2),
      },
      accountBalance: { aggregate: jest.fn().mockResolvedValue({ _sum: { balance: 3500 } }) },
      documentRequest: { aggregate: jest.fn().mockResolvedValue({ _sum: { fee: 800 } }) },
    };
    const service = new AnalyticsService(prisma, access);

    await expect(service.getFinanceSummary()).resolves.toEqual({
      totalAssessed: 10000,
      totalCollected: 6500.56,
      outstandingBalance: 3500,
      paymentsAwaitingVerification: 2,
      documentFeesCollected: 800,
    });
  });
});

describe('AnalyticsService grade export visibility parity', () => {
  it('counts published grade records without inventing a pass/fail threshold', async () => {
    const prisma: any = {
      grade: {
        findMany: jest.fn().mockResolvedValue([
          { finalGrade: 2.25 },
          { finalGrade: null },
        ]),
      },
    };
    const service = new AnalyticsService(prisma, access);

    await expect(service.getPublishedGradeCount()).resolves.toEqual({
      publishedGradeCount: 1,
      gradeDistribution: [
        { band: '1.00–1.49', count: 0 },
        { band: '1.50–1.99', count: 0 },
        { band: '2.00–2.49', count: 1 },
        { band: '2.50–2.99', count: 0 },
        { band: '3.00–3.49', count: 0 },
        { band: '3.50–5.00', count: 0 },
      ],
    });
    expect(prisma.grade.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { isVisible: true },
    }));
  });

  it('removes unpublished marks from student grade export data while retaining enrollment rows', async () => {
    const student = {
      id: 'student-1',
      user: { firstName: 'Test', lastName: 'Student', email: 'student@example.test' },
      program: { name: 'Computing', code: 'BSCS' },
      enrollments: [
        { course: { code: 'CS1', title: 'Published course' }, grade: { isVisible: true, finalGrade: 88 } },
        { course: { code: 'CS2', title: 'Unpublished course' }, grade: { isVisible: false, finalGrade: 99 } },
        { course: { code: 'CS3', title: 'Pending course' }, grade: null },
      ],
    };
    const prisma: any = {
      studentProfile: { findUnique: jest.fn().mockResolvedValue(student) },
    };
    const service = new AnalyticsService(prisma, access);

    const reportStudent = await service.getGradeReportStudent('student-1');

    expect(reportStudent.enrollments.map((row: any) => row.grade)).toEqual([
      { isVisible: true, finalGrade: 88 }, null, null,
    ]);
    expect(prisma.studentProfile.findUnique).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'student-1' },
      include: expect.objectContaining({ enrollments: expect.objectContaining({ include: { course: true, grade: true } }) }),
    }));
  });

  it('builds the PDF from the shared visibility-filtered student report', async () => {
    const prisma: any = { studentProfile: { findUnique: jest.fn() } };
    const service = new AnalyticsService(prisma, access);
    const reportStudent: any = {
      studentNumber: 'RMC-1', yearLevel: '1',
      user: { firstName: 'Test', lastName: 'Student', email: 'student@example.test' },
      program: { name: 'Computing', code: 'BSCS' },
      enrollments: [{ course: { code: 'CS1', title: 'Computing' }, grade: null }],
    };
    const reportSpy = jest.spyOn(service, 'getGradeReportStudent').mockResolvedValue(reportStudent);

    const pdf = await service.exportGradesPdf('student-1');

    expect(reportSpy).toHaveBeenCalledWith('student-1', undefined);
    expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
    reportSpy.mockRestore();
  });

  it('scopes dean/faculty transcript access through the shared record check', async () => {
    const prisma: any = { studentProfile: { findUnique: jest.fn() } };
    const service = new AnalyticsService(prisma, access);
    const denied = jest.fn().mockRejectedValueOnce(new Error('You are not authorized'));
    (service as any).studentAccess = { assertCanReadStudent: denied };

    await expect(
      service.getGradeReportStudent('student-1', { sub: 'dean-1', role: 'dean' }),
    ).rejects.toThrow('You are not authorized');
    expect(prisma.studentProfile.findUnique).not.toHaveBeenCalled();
  });

  it('lets the registrar read without a scoping lookup', async () => {
    const prisma: any = { studentProfile: { findUnique: jest.fn().mockResolvedValue(null) } };
    const service = new AnalyticsService(prisma, access);
    access.assertCanReadStudent.mockClear();

    await expect(
      service.getGradeReportStudent('student-1', { sub: 'reg-1', role: 'registrar' }),
    ).rejects.toThrow(/not found/i);
    expect(access.assertCanReadStudent).not.toHaveBeenCalled();
  });
});
