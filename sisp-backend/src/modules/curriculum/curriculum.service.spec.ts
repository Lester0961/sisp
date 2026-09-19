import { CurriculumService } from './curriculum.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('CurriculumService — server-computed progress (P4-06)', () => {
  let service: CurriculumService;

  const mockPrisma: any = {
    studentProfile: { findUnique: jest.fn() },
    curriculum: { findUnique: jest.fn(), findFirst: jest.fn() },
    enrollment: { findMany: jest.fn() },
  };

  const course = (id: string, code: string, prerequisites: any[] = []) => ({
    id,
    code,
    title: `${code} title`,
    units: 3,
    lecUnits: 3,
    labUnits: 0,
    prereqText: null,
    prerequisites,
  });

  const curriculum = {
    id: 'cur-1',
    effectiveYear: 2024,
    schoolYear: '2024-2025',
    program: { code: 'BSCS', name: 'BS Computer Science' },
    curriculumCourses: [
      { courseId: 'c1', yearLevel: 1, semester: 1, termNumber: 1, course: course('c1', 'CS101') },
      {
        courseId: 'c2',
        yearLevel: 1,
        semester: 1,
        termNumber: 1,
        course: course('c2', 'CS102', [
          { requiresCode: 'CS101', requiresId: 'c1', isSelfReference: false, isUnresolved: false },
        ]),
      },
      { courseId: 'c3', yearLevel: 1, semester: 2, termNumber: 2, course: course('c3', 'CS103') },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CurriculumService(mockPrisma as PrismaService);
  });

  it("reads the student's assigned curriculum before the newest program curriculum", async () => {
    mockPrisma.studentProfile.findUnique.mockResolvedValue({
      id: 'sp-1',
      programId: 'prog-1',
      curriculumId: 'cur-1',
    });
    mockPrisma.curriculum.findUnique.mockResolvedValue(curriculum);
    mockPrisma.enrollment.findMany
      .mockResolvedValueOnce([{ courseId: 'c1' }])
      .mockResolvedValueOnce([{ courseId: 'c2' }]);

    const result = await service.getMyProgress('user-1');

    expect(mockPrisma.curriculum.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'cur-1' } }),
    );
    expect(mockPrisma.curriculum.findFirst).not.toHaveBeenCalled();
    expect(result.totals).toEqual({
      requiredSubjects: 3,
      requiredUnits: 9,
      completedSubjects: 1,
      completedUnits: 3,
      ongoingSubjects: 1,
      ongoingUnits: 3,
      remainingSubjects: 1,
      remainingUnits: 3,
      completionPercentage: 33.3,
    });
    expect(result.prerequisitesMet).toBe(true);
    expect(result.courses.map((entry) => [entry.code, entry.status])).toEqual([
      ['CS101', 'completed'],
      ['CS102', 'ongoing'],
      ['CS103', 'remaining'],
    ]);
  });

  it('reports unmet prerequisites from real curriculum + enrollment data', async () => {
    mockPrisma.studentProfile.findUnique.mockResolvedValue({
      id: 'sp-1',
      programId: 'prog-1',
      curriculumId: null,
    });
    mockPrisma.curriculum.findFirst.mockResolvedValue(curriculum);
    mockPrisma.enrollment.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ courseId: 'c2' }]);

    const result = await service.getMyProgress('user-1');

    expect(result.prerequisitesMet).toBe(false);
    expect(result.unmetPrerequisites).toEqual([
      { courseCode: 'CS102', courseTitle: 'CS102 title', requiresCode: 'CS101' },
    ]);
    expect(result.totals.completedUnits).toBe(0);
    expect(result.totals.completionPercentage).toBe(0);
  });

  it('returns an empty progress result (not an error) when no curriculum exists', async () => {
    mockPrisma.studentProfile.findUnique.mockResolvedValue({
      id: 'sp-1',
      programId: 'prog-1',
      curriculumId: null,
    });
    mockPrisma.curriculum.findFirst.mockResolvedValue(null);

    const result = await service.getMyProgress('user-1');

    expect(result.curriculum).toBeNull();
    expect(result.courses).toEqual([]);
    expect(result.totals.requiredSubjects).toBe(0);
    expect(mockPrisma.enrollment.findMany).not.toHaveBeenCalled();
  });
});
