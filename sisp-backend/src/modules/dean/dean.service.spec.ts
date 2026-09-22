import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { DeanService } from './dean.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CurriculumService } from '../curriculum/curriculum.service';

describe('DeanService — adviser scope, standing, concerns (Phase 9)', () => {
  let service: DeanService;

  const mockPrisma: any = {
    adviserAssignment: { findMany: jest.fn() },
    studentProfile: { findUnique: jest.fn() },
    enrollment: { findMany: jest.fn() },
    advisingConcern: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockCurriculum = {
    getMyProgress: jest.fn(),
  };

  const assignedStudent = {
    id: 'sp-1',
    studentNumber: '2026-0001',
    userId: 'student-user-1',
    user: { id: 'student-user-1', firstName: 'Jane', lastName: 'Doe', email: 'jane@x.c' },
    program: { code: 'BSCS', name: 'BS CS' },
  };

  const emptyProgress = {
    curriculum: null,
    totals: {
      requiredSubjects: 0,
      requiredUnits: 0,
      completedSubjects: 0,
      completedUnits: 0,
      ongoingSubjects: 0,
      ongoingUnits: 0,
      remainingSubjects: 0,
      remainingUnits: 0,
      completionPercentage: 0,
    },
    prerequisitesMet: true,
    unmetPrerequisites: [],
    courses: [],
  };

  beforeEach(() => {
    jest.resetAllMocks();
    service = new DeanService(mockPrisma as PrismaService, mockCurriculum as unknown as CurriculumService);
  });

  it('returns advisees scoped to the adviser with progress', async () => {
    mockPrisma.adviserAssignment.findMany.mockResolvedValue([
      {
        id: 'assign-1',
        studentId: 'sp-1',
        academicYear: '2026-2027',
        academicTerm: { code: '2026-2027-T1', label: 'Term 1', academicYear: '2026-2027' },
        student: assignedStudent,
      },
    ]);
    mockCurriculum.getMyProgress.mockResolvedValue(emptyProgress);

    const result = await service.getAdvisees('dean-1');

    expect(mockPrisma.adviserAssignment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { adviserId: 'dean-1', status: 'active' } }),
    );
    expect(result.total).toBe(1);
    expect(result.data[0].student.studentNumber).toBe('2026-0001');
    expect(result.data[0].completionPercentage).toBe(0);
  });

  it('denies access to students not assigned to the adviser', async () => {
    mockPrisma.adviserAssignment.findMany.mockResolvedValue([]);

    await expect(service.getAdviseeDetail('dean-1', 'sp-9')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(mockPrisma.enrollment.findMany).not.toHaveBeenCalled();
  });

  it('builds factual standing indicators without invented labels', async () => {
    mockPrisma.adviserAssignment.findMany.mockResolvedValue([
      { id: 'assign-1', studentId: 'sp-1', adviserId: 'dean-1', status: 'active', academicTerm: null, academicYear: null },
    ]);
    mockPrisma.studentProfile.findUnique.mockResolvedValue(assignedStudent);
    mockCurriculum.getMyProgress.mockResolvedValue({
      ...emptyProgress,
      totals: { ...emptyProgress.totals, completedSubjects: 2, completionPercentage: 40 },
    });
    mockPrisma.enrollment.findMany.mockResolvedValue([
      { status: 'completed', course: { code: 'CS101', title: 'Intro', units: 3 }, term: { label: 'Term 1' }, grade: { finalGrade: 90, status: 'approved', isVisible: true } },
      { status: 'failed', course: { code: 'CS102', title: 'Data', units: 3 }, term: { label: 'Term 1' }, grade: { finalGrade: 60, status: 'approved', isVisible: true } },
      { status: 'enrolled', course: { code: 'CS103', title: 'Algo', units: 3 }, term: { label: 'Term 2' }, grade: null },
    ]);
    mockPrisma.advisingConcern.findMany.mockResolvedValue([]);

    const detail: any = await service.getAdviseeDetail('dean-1', 'sp-1');

    expect(detail.standing).toEqual({
      completedSubjects: 1,
      failedSubjects: 1,
      ongoingSubjects: 1,
      droppedSubjects: 0,
      completionPercentage: 40,
      enrollmentStatuses: ['completed', 'failed', 'enrolled'],
      recentResults: [
        { courseCode: 'CS101', courseTitle: 'Intro', term: 'Term 1', finalGrade: 90 },
        { courseCode: 'CS102', courseTitle: 'Data', term: 'Term 1', finalGrade: 60 },
      ],
    });
    expect(JSON.stringify(detail)).not.toContain('good standing');
    expect(JSON.stringify(detail)).not.toContain('probation');
  });

  it('only lists concerns of assigned advisees', async () => {
    mockPrisma.adviserAssignment.findMany.mockResolvedValue([
      { studentId: 'sp-1' },
    ]);
    mockPrisma.advisingConcern.findMany.mockResolvedValue([
      { id: 'c1', studentId: 'sp-1', category: 'Attendance', summary: 'Frequent absences', status: 'open', notes: null, resolution: null, createdAt: new Date(), resolvedAt: null, student: { user: { firstName: 'Jane', lastName: 'Doe' } } },
    ]);

    const result = await service.getConcerns('dean-1');

    expect(mockPrisma.advisingConcern.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { studentId: { in: ['sp-1'] } } }),
    );
    expect(result.total).toBe(1);
    expect(result.data[0].studentName).toBe('Jane Doe');
  });

  it('requires an assigned advisee before creating a concern', async () => {
    mockPrisma.adviserAssignment.findMany.mockResolvedValue([]);

    await expect(
      service.createConcern('dean-1', { studentProfileId: 'sp-9', category: 'X', summary: 'Y' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(mockPrisma.advisingConcern.create).not.toHaveBeenCalled();
  });

  it('creates a concern for an assigned advisee', async () => {
    mockPrisma.adviserAssignment.findMany.mockResolvedValue([
      { id: 'assign-1', studentId: 'sp-1', adviserId: 'dean-1', status: 'active' },
    ]);
    mockPrisma.studentProfile.findUnique.mockResolvedValue(assignedStudent);
    mockPrisma.advisingConcern.create.mockResolvedValue({ id: 'c1', status: 'open' });

    const result = await service.createConcern('dean-1', {
      studentProfileId: 'sp-1',
      category: 'Academic',
      summary: 'Needs remediation plan',
    });

    expect(mockPrisma.advisingConcern.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ studentId: 'sp-1', adviserId: 'dean-1', status: 'open' }),
      }),
    );
    expect(result.data.status).toBe('open');
  });

  it('enforces concern status transitions', async () => {
    mockPrisma.advisingConcern.findUnique.mockResolvedValue({
      id: 'c1',
      adviserId: 'dean-1',
      studentId: 'sp-1',
      status: 'resolved',
    });

    await expect(
      service.updateConcern('dean-1', 'c1', { status: 'in_review' } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(mockPrisma.advisingConcern.update).not.toHaveBeenCalled();
  });

  it('allows resolving a concern and stamps resolvedAt', async () => {
    mockPrisma.advisingConcern.findUnique.mockResolvedValue({
      id: 'c1',
      adviserId: 'dean-1',
      studentId: 'sp-1',
      status: 'open',
      resolvedAt: null,
    });
    mockPrisma.advisingConcern.update.mockResolvedValue({ id: 'c1', status: 'resolved' });

    await service.updateConcern('dean-1', 'c1', { status: 'resolved', resolution: 'Done' });

    expect(mockPrisma.advisingConcern.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'resolved', resolution: 'Done' }),
      }),
    );
  });
});

describe('DeanService — adviser assignment writer (NEXT 5)', () => {
  let service: DeanService;

  const mockPrisma: any = {
    user: { findUnique: jest.fn(), findMany: jest.fn() },
    studentProfile: { findUnique: jest.fn() },
    academicTerm: { findUnique: jest.fn() },
    adviserAssignment: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    auditLog: { create: jest.fn() },
    advisingConcern: {},
  };

  const mockCurriculum = { getMyProgress: jest.fn() };

  beforeEach(() => {
    jest.resetAllMocks();
    mockPrisma.auditLog.create.mockResolvedValue({});
    service = new DeanService(mockPrisma as PrismaService, mockCurriculum as unknown as CurriculumService);
  });

  it('creates an assignment for an active Dean advising an existing student', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'dean-1',
      isActive: true,
      role: { name: 'dean' },
    });
    mockPrisma.studentProfile.findUnique.mockResolvedValue({ id: 'sp-1' });
    mockPrisma.adviserAssignment.findFirst
      .mockResolvedValueOnce(null) // no exact existing row
      .mockResolvedValueOnce(null); // no conflicting active adviser
    mockPrisma.adviserAssignment.create.mockResolvedValue({ id: 'assign-1', status: 'active' });

    const result = await service.createAdviserAssignment('registrar-1', {
      adviserId: 'dean-1',
      studentId: 'sp-1',
    });

    expect(result.data.status).toBe('active');
    expect(mockPrisma.adviserAssignment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ adviserId: 'dean-1', studentId: 'sp-1', status: 'active' }),
      }),
    );
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'ADVISER_ASSIGNMENT_CREATED' }),
      }),
    );
  });

  it('rejects assigning a non-Dean user', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'fac-1',
      isActive: true,
      role: { name: 'faculty' },
    });
    mockPrisma.studentProfile.findUnique.mockResolvedValue({ id: 'sp-1' });

    await expect(
      service.createAdviserAssignment('registrar-1', { adviserId: 'fac-1', studentId: 'sp-1' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(mockPrisma.adviserAssignment.create).not.toHaveBeenCalled();
  });

  it('rejects a second active adviser for the same student and term', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'dean-2',
      isActive: true,
      role: { name: 'dean' },
    });
    mockPrisma.studentProfile.findUnique.mockResolvedValue({ id: 'sp-1' });
    mockPrisma.adviserAssignment.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'assign-other',
        adviser: { firstName: 'Old', lastName: 'Adviser' },
      });

    await expect(
      service.createAdviserAssignment('registrar-1', { adviserId: 'dean-2', studentId: 'sp-1' }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(mockPrisma.adviserAssignment.create).not.toHaveBeenCalled();
  });

  it('deactivates an existing assignment with an audit trail', async () => {
    mockPrisma.adviserAssignment.findUnique.mockResolvedValue({ id: 'assign-1', status: 'active' });
    mockPrisma.adviserAssignment.update.mockResolvedValue({ id: 'assign-1', status: 'inactive' });

    const result = await service.updateAdviserAssignmentStatus('registrar-1', 'assign-1', 'inactive');

    expect(result.data.status).toBe('inactive');
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'ADVISER_ASSIGNMENT_STATUS_CHANGED',
          oldValue: '"active"',
          newValue: '"inactive"',
        }),
      }),
    );
  });
});