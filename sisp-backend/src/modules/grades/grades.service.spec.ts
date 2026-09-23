import { Test, TestingModule } from '@nestjs/testing';
import { GradesService } from './grades.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

describe('GradesService', () => {
  let service: GradesService;

  const mockPrisma = {
    grade: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    enrollment: {
      findUnique: jest.fn(),
    },
    studentProfile: {
      findUnique: jest.fn(),
    },
    studentSemester: {
      findMany: jest.fn(),
    },
    adviserAssignment: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
  };
  const mockNotifications = { sendToUser: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GradesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationsService, useValue: mockNotifications },
      ],
    }).compile();

    service = module.get<GradesService>(GradesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('scopes Dean grade review lists to active assigned students', async () => {
    mockPrisma.adviserAssignment.findMany.mockResolvedValue([
      { studentId: 'assigned-1' },
      { studentId: 'assigned-2' },
    ]);
    mockPrisma.grade.findMany.mockResolvedValue([]);

    await service.getGradesForAdviser('dean-1', { status: 'submitted', termId: 'term-1' });

    expect(mockPrisma.grade.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: 'submitted',
          enrollment: { studentId: { in: ['assigned-1', 'assigned-2'] }, termId: 'term-1' },
        },
      }),
    );
  });

  it('denies a Dean grade decision for a student without an active adviser assignment', async () => {
    mockPrisma.grade.findUnique.mockResolvedValue({
      id: 'grade-1',
      status: 'submitted',
      enrollment: { studentId: 'unassigned-student' },
    });
    mockPrisma.adviserAssignment.findFirst.mockResolvedValue(null);

    await expect(service.postGrade('dean-1', 'grade-1')).rejects.toThrow(
      'Grade review is limited to students assigned to you.',
    );
    expect(mockPrisma.grade.update).not.toHaveBeenCalled();
  });

  it('notifies the student only when the Registrar publishes the grade', async () => {
    mockPrisma.grade.findUnique.mockResolvedValue({ id: 'grade-1', status: 'posted' });
    mockPrisma.grade.update.mockResolvedValue({
      id: 'grade-1',
      enrollment: { student: { user: { id: 'student-user-1' } } },
    });

    await service.approveGrade('registrar-1', 'grade-1');

      expect(mockNotifications.sendToUser).toHaveBeenCalledWith(
        'student-user-1',
        'Grade Published',
        'A grade has been published to your student record.',
        { email: true },
      );
  });

  it('sends a generic notice when grade visibility changes', async () => {
    mockPrisma.grade.findUnique.mockResolvedValue({
      id: 'grade-2',
      isVisible: false,
      enrollment: { student: { userId: 'student-user-2' } },
    });
    mockPrisma.grade.update.mockResolvedValue({ id: 'grade-2', isVisible: true });

    await service.toggleVisibility('grade-2', true);

    expect(mockNotifications.sendToUser).toHaveBeenCalledWith(
      'student-user-2',
      'Grade Visibility Updated',
      'Your grade visibility was updated. Visit Grades for current availability.',
    );
  });

  it('hides grades for an unpaid term while keeping paid past terms visible', async () => {
    mockPrisma.studentProfile.findUnique.mockResolvedValue({ id: 'student-profile' });
    mockPrisma.studentSemester.findMany.mockResolvedValue([
      { id: 'term-2', termId: 'term-2', semester: '2nd', year: '2025-2026', isFullyPaid: false, paymentStatus: 'partial', term: { id: 'term-2', code: '2025-2026-T2', label: 'Term 2', academicYear: '2025-2026', termNumber: 2, isCurrent: true } },
      { id: 'term-1', termId: 'term-1', semester: '1st', year: '2025-2026', isFullyPaid: true, paymentStatus: 'paid', term: { id: 'term-1', code: '2025-2026-T1', label: 'Term 1', academicYear: '2025-2026', termNumber: 1, isCurrent: false } },
    ]);
    mockPrisma.grade.findMany.mockResolvedValue([
      { id: 'grade-term-2', status: 'approved', isVisible: true, enrollment: { termId: 'term-2', semester: '2nd', year: '2025-2026', course: { units: 3 } } },
      { id: 'grade-term-1', status: 'approved', isVisible: true, enrollment: { termId: 'term-1', semester: '1st', year: '2025-2026', course: { units: 3 } } },
    ]);

    const result = await service.getMyGrades('user-id');

    expect(result.data.map((grade: any) => grade.id)).toEqual(['grade-term-1']);
    expect(result.hiddenCount).toBe(1);
    expect(result.currentTerm?.code).toBe('2025-2026-T2');
    expect(result.terms?.find((term: any) => term.id === 'term-2')?.paymentStatus).toBe('partial');
  });
});
