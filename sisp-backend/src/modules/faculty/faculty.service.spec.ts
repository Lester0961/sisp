import { NotFoundException } from '@nestjs/common';
import { FacultyService } from './faculty.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('FacultyService — assignment-scoped access (P8-01/P8-02)', () => {
  let service: FacultyService;

  const mockPrisma: any = {
    enrollment: { findMany: jest.fn() },
  };

  const assignment = (overrides: any = {}) => ({
    id: 'enrollment-1',
    courseId: 'course-1',
    termId: 'term-1',
    instructorId: 'faculty-1',
    status: 'enrolled',
    section: 'A',
    course: { id: 'course-1', code: 'CS 301', title: 'HCI', units: 3 },
    term: { id: 'term-1', code: '2026-2027-T1', label: 'Term 1', academicYear: '2026-2027' },
    classSection: { id: 'section-1', sectionCode: 'A1' },
    student: {
      id: 'student-1',
      studentNumber: '2026-0001',
      user: { firstName: 'Jane', lastName: 'Doe' },
    },
    grade: { finalGrade: 90.5, status: 'approved', isVisible: true },
    ...overrides,
  });

  beforeEach(() => {
    jest.resetAllMocks();
    service = new FacultyService(mockPrisma as PrismaService);
  });

  it('returns only the faculty member assigned classes with student counts', async () => {
    mockPrisma.enrollment.findMany.mockResolvedValue([
      assignment(),
      assignment({ id: 'enrollment-2', student: { id: 'student-2', studentNumber: '2026-0002', user: { firstName: 'John', lastName: 'Roe' } } }),
      assignment({ id: 'enrollment-3', courseId: 'course-2', course: { id: 'course-2', code: 'CS 302', title: 'Data', units: 3 }, section: 'B', classSection: { id: 'section-2', sectionCode: 'B1' } }),
    ]);

    const result = await service.getAssignedClasses('faculty-1');

    expect(result.total).toBe(2);
    const [first, second] = result.data;
    expect(first).toMatchObject({ courseId: 'course-1', section: 'A1', studentCount: 2 });
    expect(second).toMatchObject({ courseId: 'course-2', section: 'B1', studentCount: 1 });
    expect(JSON.stringify(result.data)).not.toContain('email');
    expect(JSON.stringify(result.data)).not.toContain('studentNumber');
  });

  it('enforces term scoping on assigned classes', async () => {
    mockPrisma.enrollment.findMany.mockResolvedValue([assignment()]);

    await service.getAssignedClasses('faculty-1', 'term-1');

    expect(mockPrisma.enrollment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { instructorId: 'faculty-1', status: 'enrolled', termId: 'term-1' },
      }),
    );
  });

  it('returns the roster for an assigned class with minimal student PII', async () => {
    mockPrisma.enrollment.findMany.mockResolvedValue([
      assignment(),
      assignment({ id: 'enrollment-2', student: { id: 'student-2', studentNumber: '2026-0002', user: { firstName: 'John', lastName: 'Roe' } } }),
    ]);

    const result = await service.getClassRoster('faculty-1', 'course-1', 'term-1', 'A1');

    expect(result.total).toBe(2);
    expect(result.students[0].name).toBe('Jane Doe'); // sorted by last name
    expect(result.students[1].name).toBe('John Roe');
    expect(result.students[0].finalGrade).toBe(90.5);
    expect(JSON.stringify(result.students)).not.toContain('email');
    expect(result.class).toMatchObject({ section: 'A1', schedulePublished: false });
  });

  it('denies rosters for classes the faculty member is not assigned to', async () => {
    mockPrisma.enrollment.findMany.mockResolvedValue([]);

    await expect(
      service.getClassRoster('faculty-1', 'course-99'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});