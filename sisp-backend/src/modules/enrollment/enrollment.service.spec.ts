import { BadRequestException, ConflictException } from '@nestjs/common';
import { EnrollmentService } from './enrollment.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

describe('EnrollmentService — ownership and automatic history (P2-04/P3-03)', () => {
  let service: EnrollmentService;

  const mockPrisma: any = {
    studentProfile: { findUnique: jest.fn() },
    curriculum: { findUnique: jest.fn(), findFirst: jest.fn() },
    curriculumCourse: { findFirst: jest.fn(), findMany: jest.fn() },
    course: { findUnique: jest.fn(), findMany: jest.fn() },
    academicTerm: { findUnique: jest.fn(), findFirst: jest.fn() },
    accountBalance: { findUnique: jest.fn() },
    coursePrerequisite: { findMany: jest.fn() },
    enrollment: { findFirst: jest.fn(), findUnique: jest.fn(), update: jest.fn(), create: jest.fn(), findMany: jest.fn() },
    enrollmentHistory: { create: jest.fn() },
    classSection: { findUnique: jest.fn() },
    adviserAssignment: { findMany: jest.fn() },
    grade: { create: jest.fn() },
    $transaction: jest.fn(async (callback: any) => callback(mockPrisma)),
  };
  const mockNotifications = { sendToUser: jest.fn() };

  const term = { id: 'term-1', code: '2026-2027-T1', academicYear: '2026-2027', termNumber: 1, status: 'planned' };
  const course = { id: 'course-1', code: 'CS 101', title: 'Intro to Computing', units: 3 };

  beforeEach(() => {
    jest.resetAllMocks();
    mockPrisma.$transaction.mockImplementation(async (callback: any) => callback(mockPrisma));
    mockPrisma.curriculum.findUnique.mockResolvedValue({ id: 'curriculum-1' });
    mockPrisma.curriculumCourse.findFirst.mockResolvedValue({ courseId: 'course-1' });
    service = new EnrollmentService(mockPrisma as PrismaService, mockNotifications as any);
  });

  it('derives the student profile from the authenticated user id', async () => {
    mockPrisma.studentProfile.findUnique.mockResolvedValue({ id: 'student-1', programId: 'program-1', curriculumId: 'curriculum-1', yearLevel: 1 });
    mockPrisma.enrollment.findMany.mockResolvedValue([]);

    await service.getMyEnrollments('user-1');

    expect(mockPrisma.studentProfile.findUnique).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
    });
    expect(mockPrisma.enrollment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { studentId: 'student-1' } }),
    );
  });

  it('scopes a Dean enrollment list to active adviser assignments', async () => {
    mockPrisma.adviserAssignment.findMany.mockResolvedValue([
      { studentId: 'assigned-1' },
      { studentId: 'assigned-2' },
    ]);
    mockPrisma.enrollment.findMany.mockResolvedValue([]);

    await service.getAllEnrollments(undefined, undefined, 'term-1', undefined, 'dean-1');

    expect(mockPrisma.adviserAssignment.findMany).toHaveBeenCalledWith({
      where: { adviserId: 'dean-1', status: 'active' },
      select: { studentId: true },
    });
    expect(mockPrisma.enrollment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { studentId: { in: ['assigned-1', 'assigned-2'] }, termId: 'term-1' },
      }),
    );
  });

  it('returns no Dean enrollment rows when the Dean has no active assignments', async () => {
    mockPrisma.adviserAssignment.findMany.mockResolvedValue([]);
    mockPrisma.enrollment.findMany.mockResolvedValue([]);

    await service.getAllEnrollments(undefined, undefined, undefined, undefined, 'dean-1');

    expect(mockPrisma.enrollment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { studentId: { in: [] } } }),
    );
  });

  it('never exposes unpublished grades through the enrollment list', async () => {
    mockPrisma.studentProfile.findUnique.mockResolvedValue({ id: 'student-1' });
    mockPrisma.enrollment.findMany.mockResolvedValue([
      {
        id: 'enrollment-visible',
        status: 'completed',
        course: { code: 'CS 101', title: 'Intro', units: 3 },
        grade: { prelim: 1.5, midterm: 1.5, finals: 1.25, finalGrade: 1.42, isVisible: true },
      },
      {
        id: 'enrollment-hidden',
        status: 'completed',
        course: { code: 'CS 102', title: 'Data Structures', units: 3 },
        grade: { prelim: 2.5, midterm: 2.75, finals: 2.5, finalGrade: 2.58, isVisible: false },
      },
    ]);

    const result: any = await service.getMyEnrollments('user-1');

    expect(result.data[0].grade.finalGrade).toBe(1.42);
    expect(result.data[1].grade).toBeNull();
  });

  it('writes automatic enrollment history when a student enrolls', async () => {
    mockPrisma.studentProfile.findUnique.mockResolvedValue({ id: 'student-1', programId: 'program-1', curriculumId: 'curriculum-1', yearLevel: 1 });
    mockPrisma.course.findUnique.mockResolvedValue(course);
    mockPrisma.academicTerm.findFirst.mockResolvedValue(term);
    mockPrisma.accountBalance.findUnique.mockResolvedValue(null);
    mockPrisma.coursePrerequisite.findMany.mockResolvedValue([]);
    mockPrisma.enrollment.findFirst.mockResolvedValue(null);
    mockPrisma.enrollment.create.mockResolvedValue({ ...course, id: 'enrollment-1' });
    mockPrisma.enrollmentHistory.create.mockResolvedValue({ id: 'history-1' });
    mockPrisma.grade.create.mockResolvedValue({ id: 'grade-1' });

    await service.enroll('user-1', { courseId: 'course-1' } as any);

    expect(mockPrisma.enrollmentHistory.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        studentId: 'student-1',
        enrollmentId: 'enrollment-1',
        courseId: 'course-1',
        academicTermId: 'term-1',
        previousStatus: null,
        status: 'enrolled',
        changedById: 'user-1',
      }),
    });
    expect(mockNotifications.sendToUser).toHaveBeenCalledWith(
      'user-1',
      'Enrollment Recorded',
      'Your course enrollment has been recorded.',
    );
  });

  it('rejects a second enrollment for the same student/course/term', async () => {
    mockPrisma.studentProfile.findUnique.mockResolvedValue({ id: 'student-1', programId: 'program-1', curriculumId: 'curriculum-1', yearLevel: 1 });
    mockPrisma.course.findUnique.mockResolvedValue(course);
    mockPrisma.academicTerm.findFirst.mockResolvedValue(term);
    mockPrisma.accountBalance.findUnique.mockResolvedValue(null);
    mockPrisma.enrollment.findFirst.mockResolvedValue({ id: 'enrollment-1', status: 'enrolled' });

    await expect(
      service.enroll('user-1', { courseId: 'course-1' } as any),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(mockPrisma.enrollment.create).not.toHaveBeenCalled();
  });

  it('reports a dropped record as a Registrar reinstatement case', async () => {
    mockPrisma.studentProfile.findUnique.mockResolvedValue({ id: 'student-1', programId: 'program-1', curriculumId: 'curriculum-1', yearLevel: 1 });
    mockPrisma.course.findUnique.mockResolvedValue(course);
    mockPrisma.academicTerm.findFirst.mockResolvedValue(term);
    mockPrisma.accountBalance.findUnique.mockResolvedValue(null);
    mockPrisma.enrollment.findFirst.mockResolvedValue({ id: 'enrollment-1', status: 'dropped' });

    await expect(
      service.enroll('user-1', { courseId: 'course-1' } as any),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('never falls back to the entire course catalog when a student has no current term', async () => {
    mockPrisma.studentProfile.findUnique.mockResolvedValue({
      id: 'student-1', programId: 'program-1', curriculumId: 'curriculum-1', yearLevel: 1,
    });
    mockPrisma.academicTerm.findFirst.mockResolvedValue(null);

    const result = await service.getAvailableCourses('user-1');

    expect(result).toMatchObject({ data: [], total: 0, scoped: true });
    expect(mockPrisma.course.findMany).not.toHaveBeenCalled();
  });

  it('lists only curriculum courses for the student year level and term', async () => {
    mockPrisma.studentProfile.findUnique.mockResolvedValue({
      id: 'student-1', programId: 'program-1', curriculumId: 'curriculum-1', yearLevel: 2,
    });
    mockPrisma.academicTerm.findFirst.mockResolvedValue(term);
    mockPrisma.curriculumCourse.findMany.mockResolvedValue([]);

    await service.getAvailableCourses('user-1');

    expect(mockPrisma.curriculumCourse.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { curriculumId: 'curriculum-1', termNumber: 1, yearLevel: 2 },
    }));
  });

  it('rejects enrollment for a course outside the assigned curriculum year and term', async () => {
    mockPrisma.studentProfile.findUnique.mockResolvedValue({
      id: 'student-1', programId: 'program-1', curriculumId: 'curriculum-1', yearLevel: 2,
    });
    mockPrisma.course.findUnique.mockResolvedValue(course);
    mockPrisma.academicTerm.findFirst.mockResolvedValue(term);
    mockPrisma.curriculumCourse.findFirst.mockResolvedValue(null);

    await expect(service.enroll('user-1', { courseId: 'course-1' } as any)).rejects.toBeInstanceOf(BadRequestException);
    expect(mockPrisma.accountBalance.findUnique).not.toHaveBeenCalled();
    expect(mockPrisma.enrollment.create).not.toHaveBeenCalled();
  });

  it('records previous/new status and actor on staff status updates', async () => {
    mockPrisma.enrollment.findUnique.mockResolvedValue({
      id: 'enrollment-1',
      studentId: 'student-1',
      courseId: 'course-1',
      termId: 'term-1',
      year: '2026-2027',
      status: 'enrolled',
      term,
      student: { userId: 'student-user-1' },
    });
    mockPrisma.enrollment.update.mockResolvedValue({ id: 'enrollment-1', status: 'completed' });
    mockPrisma.enrollmentHistory.create.mockResolvedValue({ id: 'history-2' });

    await service.updateEnrollmentStatus('enrollment-1', { status: 'completed' } as any, 'registrar-1');

    expect(mockPrisma.enrollmentHistory.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        previousStatus: 'enrolled',
        status: 'completed',
        changedById: 'registrar-1',
        academicTermId: 'term-1',
      }),
    });
    expect(mockNotifications.sendToUser).toHaveBeenCalledWith(
      'student-user-1',
      'Enrollment Updated',
      'Your enrollment status was updated in SISP.',
    );
  });

  it('keeps a committed enrollment status when notification persistence fails', async () => {
    mockPrisma.enrollment.findUnique.mockResolvedValue({
      id: 'enrollment-1',
      studentId: 'student-1',
      courseId: 'course-1',
      termId: 'term-1',
      status: 'enrolled',
      term,
      student: { userId: 'student-user-1' },
    });
    mockPrisma.enrollment.update.mockResolvedValue({ id: 'enrollment-1', status: 'completed' });
    mockPrisma.enrollmentHistory.create.mockResolvedValue({ id: 'history-2' });
    mockNotifications.sendToUser.mockRejectedValue(new Error('notification storage unavailable'));

    const result = await service.updateEnrollmentStatus(
      'enrollment-1', { status: 'completed' } as any, 'registrar-1',
    );

    expect(result.data.status).toBe('completed');
  });

  it('rejects dropping an enrollment that belongs to another student', async () => {
    mockPrisma.studentProfile.findUnique.mockResolvedValue({ id: 'student-1' });
    mockPrisma.enrollment.findUnique.mockResolvedValue({
      id: 'enrollment-9',
      studentId: 'student-2',
      status: 'enrolled',
      course: { code: 'CS 101', title: 'Intro' },
    });

    await expect(service.dropCourse('enrollment-9', 'user-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(mockPrisma.enrollment.update).not.toHaveBeenCalled();
  });

  it('maps published schedule slots and flags unpublished sections (P4-05)', async () => {
    mockPrisma.studentProfile.findUnique.mockResolvedValue({ id: 'student-1' });
    mockPrisma.enrollment.findMany.mockResolvedValue([
      {
        id: 'e1',
        section: 'A',
        course: { code: 'CS101', title: 'Intro', units: 3 },
        term: { code: '2026-2027-T1', label: 'Term 1', academicYear: '2026-2027' },
        instructor: { firstName: 'Regis', lastName: 'Faculty' },
        classSection: {
          sectionCode: 'A1',
          schedules: [
            {
              dayOfWeek: 'MWF',
              startTime: new Date('1970-01-01T08:00:00.000Z'),
              endTime: new Date('1970-01-01T09:00:00.000Z'),
              room: 'R101',
            },
          ],
        },
      },
      {
        id: 'e2',
        section: null,
        course: { code: 'CS102', title: 'Data', units: 3 },
        term: { code: '2026-2027-T1', label: 'Term 1', academicYear: '2026-2027' },
        instructor: null,
        classSection: null,
      },
    ]);

    const result = await service.getMySchedule('user-1');

    expect(result.total).toBe(2);
    expect(result.data[0]).toMatchObject({
      courseCode: 'CS101',
      section: 'A1',
      instructor: 'Regis Faculty',
      schedulePublished: true,
    });
    expect(result.data[0].schedules[0].room).toBe('R101');
    expect(result.data[1].schedulePublished).toBe(false);
    expect(result.data[1].schedules).toEqual([]);
  });

  it('writes history when a student drops their own enrollment', async () => {
    mockPrisma.studentProfile.findUnique.mockResolvedValue({ id: 'student-1', programId: 'program-1', curriculumId: 'curriculum-1', yearLevel: 1 });
    mockPrisma.enrollment.findUnique.mockResolvedValue({
      id: 'enrollment-1',
      studentId: 'student-1',
      courseId: 'course-1',
      termId: 'term-1',
      year: '2026-2027',
      status: 'enrolled',
      course: { code: 'CS 101', title: 'Intro' },
      term,
    });
    mockPrisma.enrollment.update.mockResolvedValue({ id: 'enrollment-1', status: 'dropped' });
    mockPrisma.enrollmentHistory.create.mockResolvedValue({ id: 'history-3' });

    await service.dropCourse('enrollment-1', 'user-1');

    expect(mockPrisma.enrollmentHistory.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        previousStatus: 'enrolled',
        status: 'dropped',
        changedById: 'user-1',
      }),
    });
    expect(mockNotifications.sendToUser).toHaveBeenCalledWith(
      'user-1',
      'Enrollment Updated',
      'Your enrollment status was updated in SISP.',
    );
  });

  it('blocks enrollment when a structured prerequisite is not completed (P5-03)', async () => {
    mockPrisma.studentProfile.findUnique.mockResolvedValue({ id: 'student-1', programId: 'program-1', curriculumId: 'curriculum-1', yearLevel: 1 });
    mockPrisma.course.findUnique.mockResolvedValue(course);
    mockPrisma.academicTerm.findFirst.mockResolvedValue(term);
    mockPrisma.accountBalance.findUnique.mockResolvedValue(null);
    mockPrisma.coursePrerequisite.findMany.mockResolvedValue([
      { requiresCode: 'CS 100', requiresId: 'course-0' },
    ]);
    mockPrisma.enrollment.findMany.mockResolvedValue([]); // no completed courses
    mockPrisma.enrollment.findFirst.mockResolvedValue(null);

    await expect(
      service.enroll('user-1', { courseId: 'course-1' } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(mockPrisma.enrollment.create).not.toHaveBeenCalled();
  });

  it('allows enrollment once the resolved prerequisite is completed', async () => {
    mockPrisma.studentProfile.findUnique.mockResolvedValue({ id: 'student-1', programId: 'program-1', curriculumId: 'curriculum-1', yearLevel: 1 });
    mockPrisma.course.findUnique.mockResolvedValue(course);
    mockPrisma.academicTerm.findFirst.mockResolvedValue(term);
    mockPrisma.accountBalance.findUnique.mockResolvedValue(null);
    mockPrisma.coursePrerequisite.findMany.mockResolvedValue([
      { requiresCode: 'CS 100', requiresId: 'course-0' },
    ]);
    mockPrisma.enrollment.findMany.mockResolvedValue([{ courseId: 'course-0' }]);
    mockPrisma.enrollment.findFirst.mockResolvedValue(null);
    mockPrisma.enrollment.create.mockResolvedValue({ ...course, id: 'enrollment-1' });
    mockPrisma.enrollmentHistory.create.mockResolvedValue({ id: 'history-1' });
    mockPrisma.grade.create.mockResolvedValue({ id: 'grade-1' });

    await service.enroll('user-1', { courseId: 'course-1' } as any);
    expect(mockPrisma.enrollment.create).toHaveBeenCalled();
  });

  it('rejects invalid enrollment status transitions (P5-01)', async () => {
    mockPrisma.enrollment.findUnique.mockResolvedValue({
      id: 'enrollment-1',
      studentId: 'student-1',
      courseId: 'course-1',
      status: 'completed',
      term: null,
    });

    await expect(
      service.updateEnrollmentStatus('enrollment-1', { status: 'enrolled' } as any, 'registrar-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(mockPrisma.enrollment.update).not.toHaveBeenCalled();
  });

  it('inherits the section code and faculty owner from a scheduled section (P5-07/P5-08)', async () => {
    mockPrisma.studentProfile.findUnique.mockResolvedValue({ id: 'student-1', programId: 'program-1', curriculumId: 'curriculum-1', yearLevel: 1 });
    mockPrisma.course.findUnique.mockResolvedValue(course);
    mockPrisma.academicTerm.findFirst.mockResolvedValue(term);
    mockPrisma.classSection.findUnique.mockResolvedValue({
      id: 'section-1',
      courseId: 'course-1',
      termId: 'term-1',
      sectionCode: 'A1',
      instructorId: 'faculty-1',
      status: 'active',
    });
    mockPrisma.accountBalance.findUnique.mockResolvedValue(null);
    mockPrisma.coursePrerequisite.findMany.mockResolvedValue([]);
    mockPrisma.enrollment.findFirst.mockResolvedValue(null);
    mockPrisma.enrollment.create.mockResolvedValue({ ...course, id: 'enrollment-1' });
    mockPrisma.enrollmentHistory.create.mockResolvedValue({ id: 'history-1' });
    mockPrisma.grade.create.mockResolvedValue({ id: 'grade-1' });

    await service.enroll('user-1', { courseId: 'course-1', classSectionId: 'section-1' } as any);

    expect(mockPrisma.enrollment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          classSectionId: 'section-1',
          section: 'A1',
          instructorId: 'faculty-1',
        }),
      }),
    );
  });

  it('rejects a section that belongs to a different course', async () => {
    mockPrisma.studentProfile.findUnique.mockResolvedValue({ id: 'student-1', programId: 'program-1', curriculumId: 'curriculum-1', yearLevel: 1 });
    mockPrisma.course.findUnique.mockResolvedValue(course);
    mockPrisma.academicTerm.findFirst.mockResolvedValue(term);
    mockPrisma.classSection.findUnique.mockResolvedValue({
      id: 'section-1',
      courseId: 'other-course',
      termId: 'term-1',
      sectionCode: 'B2',
      status: 'active',
    });

    await expect(
      service.enroll('user-1', { courseId: 'course-1', classSectionId: 'section-1' } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(mockPrisma.enrollment.create).not.toHaveBeenCalled();
  });
});
