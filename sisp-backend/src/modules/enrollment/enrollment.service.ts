import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EnrollDto } from './dto/enroll.dto';
import { UpdateEnrollmentDto } from './dto/update-enrollment.dto';
import { CreateHistoryDto } from './dto/create-history.dto';
import { requireStudentProfile } from '../../common/utils/require-student-profile';
import { assertTransition } from '../../common/utils/state-machine';
import {
  ENROLLMENT_TRANSITIONS,
  getCompletedCourseIdSet,
} from '../../common/utils/course-completion';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class EnrollmentService {
  private readonly logger = new Logger(EnrollmentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async enroll(userId: string, dto: EnrollDto) {
    // Get student profile from userId
    const profile = await requireStudentProfile(this.prisma, userId);

    // Verify course exists
    const course = await this.prisma.course.findUnique({
      where: { id: dto.courseId },
    });

    if (!course) {
      throw new NotFoundException(`Course with ID ${dto.courseId} not found`);
    }

    const term = dto.termId
      ? await this.prisma.academicTerm.findUnique({ where: { id: dto.termId } })
      : await this.prisma.academicTerm.findFirst({ where: { isCurrent: true } });
    if (dto.termId && !term) {
      throw new NotFoundException(`Academic term ${dto.termId} not found`);
    }

    // Optional scheduled section (P5-07). A section must belong to the same
    // course and term and be active; the faculty owner is inherited from the
    // section (P5-08) instead of maintaining a separate assignment list.
    let classSection: any = null;
    if (dto.classSectionId) {
      classSection = await this.prisma.classSection.findUnique({
        where: { id: dto.classSectionId },
      });
      if (!classSection) {
        throw new NotFoundException(`Class section ${dto.classSectionId} not found`);
      }
      if (classSection.courseId !== dto.courseId) {
        throw new BadRequestException('The selected section does not belong to this course.');
      }
      if (term?.id && classSection.termId !== term.id) {
        throw new BadRequestException('The selected section does not belong to the active term.');
      }
      if (classSection.status !== 'active') {
        throw new BadRequestException('The selected section is no longer active.');
      }
    }

    // 1. Treasury Clearance Rule: Check if student has an existing outstanding balance before enrolling
    const accountBalance = await this.prisma.accountBalance.findUnique({
      where: { studentId: profile.id },
    });
    if (accountBalance && Number(accountBalance.balance) > 0) {
      throw new BadRequestException(
        `Enrollment blocked: You have an outstanding balance of ₱${Number(accountBalance.balance).toLocaleString('en-PH', { minimumFractionDigits: 2 })}. Please clear your balance with the Treasury before enrolling.`,
      );
    }

    // 2. Late Enrollment Policy Rule: If term is already active, student must accept the late enrollment risk waiver
    if (term?.status === 'active' && !dto.riskAcknowledged) {
      throw new BadRequestException(
        'Classes for this term are already ongoing. Per Regis Marie College Registrar policy, late enrollees must accept the academic risk waiver ("Student Will Take the Risk") before enrolling.',
      );
    }

    // One enrollment identity per student/course/term (P3-02). When a
    // dropped record exists, reinstatement is a Registrar action rather than
    // a second row (the DB unique index also enforces this).
    const existing = term?.id
      ? await this.prisma.enrollment.findFirst({
          where: {
            studentId: profile.id,
            courseId: dto.courseId,
            termId: term.id,
          },
        })
      : await this.prisma.enrollment.findFirst({
          where: {
            studentId: profile.id,
            courseId: dto.courseId,
            status: 'enrolled',
          },
        });

    if (existing) {
      if (existing.status === 'dropped') {
        throw new ConflictException(
          `A dropped enrollment record already exists for ${course.code} - ${course.title}. Please contact the Registrar to reinstate it.`,
        );
      }
      throw new ConflictException(`You are already enrolled in ${course.code} - ${course.title}`);
    }

    // 3. Prerequisite check (VERIFIED curricula): block unless each required
    // course is completed. Self-references and unresolved codes (§10 anomalies)
    // never block — they are recorded as warnings.
    const prereqs = await this.prisma.coursePrerequisite.findMany({
      where: { courseId: dto.courseId, isSelfReference: false, isUnresolved: false },
      select: { requiresCode: true, requiresId: true },
    });
    if (prereqs.length > 0) {
      // Single completion helper (P5-05): structured prerequisite data is
      // authoritative; the client cannot bypass this by editing requests.
      const completedIds = await getCompletedCourseIdSet(this.prisma, profile.id);
      const missing = prereqs.filter((p) => p.requiresId && !completedIds.has(p.requiresId));
      if (missing.length > 0) {
        throw new BadRequestException(
          `Prerequisite not met for ${course.code}: requires ${missing.map((m) => m.requiresCode).join(', ')}. Complete it first or request a dean exception.`,
        );
      }
    }

    let enrollment;
    try {
      enrollment = await this.prisma.$transaction(async (tx: any) => {
        const created = await tx.enrollment.create({
          data: {
            studentId: profile.id,
            courseId: dto.courseId,
            section: dto.section ?? classSection?.sectionCode ?? undefined,
            classSectionId: classSection?.id ?? undefined,
            instructorId: classSection?.instructorId ?? undefined,
            status: 'enrolled',
            termId: term?.id,
            semester: term ? `T${term.termNumber}` : undefined,
            year: term?.academicYear,
          },
          include: {
            term: true,
            course: {
              select: {
                code: true,
                title: true,
                units: true,
              },
            },
            student: {
              select: {
                studentNumber: true,
                user: {
                  select: { email: true },
                },
              },
            },
          },
        });

        // Automatic enrollment history (P3-03): written in the same
        // transaction as the state change.
        await tx.enrollmentHistory.create({
          data: {
            studentId: profile.id,
            enrollmentId: created.id,
            courseId: dto.courseId,
            academicTermId: term?.id ?? null,
            academicYear: term?.academicYear ?? null,
            term: term ? term.code : 'unassigned',
            previousStatus: null,
            status: 'enrolled',
            changedById: userId,
          },
        });

        return created;
      });
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new ConflictException(
          'An enrollment record already exists for this course and term.',
        );
      }
      throw error;
    }

    // Auto-create a default Grade record for this enrollment so the student immediately appears in the grade evaluation matrix
    try {
      await this.prisma.grade.create({
        data: {
          enrollmentId: enrollment.id,
          prelim: null,
          midterm: null,
          finals: null,
          finalGrade: null,
          isVisible: false,
        },
      });
    } catch (gradeErr) {
      console.error('Failed to auto-create grade record on enrollment:', gradeErr);
      // Non-blocking catch to ensure enrollment success still completes
    }

    await this.notifyStatusEvent(
      userId,
      'Enrollment Recorded',
      'Your course enrollment has been recorded.',
    );

    return {
      message: `Successfully enrolled in ${course.code} - ${course.title}`,
      data: enrollment,
    };
  }

  async getMyEnrollments(userId: string) {
    const profile = await requireStudentProfile(this.prisma, userId);

    const enrollments = await this.prisma.enrollment.findMany({
      where: { studentId: profile.id },
      include: {
        term: true,
        course: {
          select: {
            code: true,
            title: true,
            units: true,
          },
        },
        grade: {
          select: {
            prelim: true,
            midterm: true,
            finals: true,
            finalGrade: true,
            isVisible: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalUnits = enrollments
      .filter((e) => e.status === 'enrolled')
      .reduce((sum, e) => sum + e.course.units, 0);

    // Grade publication gate: unpublished (isVisible=false) marks must never
    // leave the backend through a non-grade endpoint.
    const data = enrollments.map((enrollment) => {
      if (enrollment.grade && enrollment.grade.isVisible) return enrollment;
      return { ...enrollment, grade: null };
    });

    return {
      data,
      total: enrollments.length,
      totalUnits,
    };
  }

  async getAllEnrollments(studentId?: string, courseId?: string, termId?: string, instructorId?: string) {
    const where: {
      studentId?: string;
      courseId?: string;
      termId?: string;
      instructorId?: string;
    } = {};

    if (studentId) where.studentId = studentId;
    if (courseId) where.courseId = courseId;
    if (termId) where.termId = termId;
    if (instructorId) where.instructorId = instructorId;

    const enrollments = await this.prisma.enrollment.findMany({
      where,
      include: {
        term: true,
        course: {
          select: {
            code: true,
            title: true,
            units: true,
          },
        },
        student: {
          include: {
            user: {
              select: { email: true },
            },
          },
        },
        instructor: { select: { id: true, email: true, firstName: true, lastName: true } },
        grade: {
          select: {
            finalGrade: true,
            isVisible: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      data: enrollments,
      total: enrollments.length,
    };
  }

  async updateEnrollmentStatus(id: string, dto: UpdateEnrollmentDto, actorId?: string) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id },
      include: {
        course: { select: { code: true, title: true } },
        term: true,
        student: { select: { userId: true } },
      },
    });

    if (!enrollment) {
      throw new NotFoundException(`Enrollment with ID ${id} not found`);
    }

    // Enforced state machine (P5-01): enrolled → completed|failed|dropped,
    // dropped → enrolled (Registrar reinstatement). Completed/failed are
    // terminal for the term; a retake is a new term enrollment.
    assertTransition(enrollment.status, dto.status, ENROLLMENT_TRANSITIONS);

    const previousStatus = enrollment.status;

    // Status change and its immutable history event share one transaction
    // (P5-06).
    const updated = await this.prisma.$transaction(async (tx: any) => {
      const result = await tx.enrollment.update({
        where: { id },
        data: { status: dto.status },
        include: {
          course: {
            select: { code: true, title: true, units: true },
          },
          student: {
            include: {
              user: { select: { email: true } },
            },
          },
        },
      });

      await tx.enrollmentHistory.create({
        data: {
          studentId: enrollment.studentId,
          enrollmentId: enrollment.id,
          courseId: enrollment.courseId,
          academicTermId: enrollment.termId ?? null,
          academicYear: enrollment.year ?? null,
          term: enrollment.term?.code ?? enrollment.year ?? 'unassigned',
          previousStatus,
          status: dto.status,
          changedById: actorId ?? null,
        },
      });

      return result;
    });

    await this.notifyStatusEvent(
      enrollment.student.userId,
      'Enrollment Updated',
      'Your enrollment status was updated in SISP.',
    );

    return {
      message: `Enrollment status updated to '${dto.status}'`,
      data: updated,
    };
  }

  async assignInstructor(id: string, instructorId: string) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id },
      include: { course: { select: { code: true, title: true } } },
    });
    if (!enrollment) throw new NotFoundException(`Enrollment with ID ${id} not found`);

    const instructor = await this.prisma.user.findUnique({
      where: { id: instructorId },
      include: { role: true },
    });
    if (!instructor || instructor.role?.name !== 'faculty') {
      throw new BadRequestException('The selected instructor must be an active faculty account.');
    }
    if (!instructor.isActive) {
      throw new BadRequestException('The selected faculty account is inactive.');
    }

    const updated = await this.prisma.enrollment.update({
      where: { id },
      data: { instructorId },
      include: {
        term: true,
        course: { select: { code: true, title: true, units: true } },
        instructor: { select: { id: true, email: true, firstName: true, lastName: true } },
        student: { include: { user: { select: { email: true, firstName: true, lastName: true } } } },
      },
    });

    return { message: 'Faculty assignment updated successfully', data: updated };
  }

  /** Active faculty accounts eligible for class assignments (registrar scope). */
  async getEligibleInstructors() {
    return this.prisma.user.findMany({
      where: { isActive: true, role: { name: 'faculty' } },
      select: { id: true, firstName: true, lastName: true, email: true },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });
  }

  async dropCourse(enrollmentId: string, userId: string) {
    const profile = await this.prisma.studentProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('Student profile not found');
    }

    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        course: { select: { code: true, title: true } },
        term: true,
      },
    });

    if (!enrollment) {
      throw new NotFoundException(`Enrollment with ID ${enrollmentId} not found`);
    }

    // Verify the enrollment belongs to this student
    if (enrollment.studentId !== profile.id) {
      throw new BadRequestException('You can only drop your own enrollments');
    }

    if (enrollment.status === 'dropped') {
      throw new ConflictException('This course is already dropped');
    }

    const previousStatus = enrollment.status;

    assertTransition(enrollment.status, 'dropped', ENROLLMENT_TRANSITIONS);

    // Drop and its history event share one transaction (P5-06).
    const updated = await this.prisma.$transaction(async (tx: any) => {
      const result = await tx.enrollment.update({
        where: { id: enrollmentId },
        data: { status: 'dropped' },
        include: {
          course: { select: { code: true, title: true } },
        },
      });

      await tx.enrollmentHistory.create({
        data: {
          studentId: enrollment.studentId,
          enrollmentId: enrollment.id,
          courseId: enrollment.courseId,
          academicTermId: enrollment.termId ?? null,
          academicYear: enrollment.year ?? null,
          term: enrollment.term?.code ?? enrollment.year ?? 'unassigned',
          previousStatus,
          status: 'dropped',
          changedById: userId,
        },
      });

      return result;
    });

    await this.notifyStatusEvent(
      userId,
      'Enrollment Updated',
      'Your enrollment status was updated in SISP.',
    );

    return {
      message: `Successfully dropped ${enrollment.course.code} - ${enrollment.course.title}`,
      data: updated,
    };
  }

  async getMyHistory(userId: string) {
    const profile = await this.prisma.studentProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('Student profile not found');
    }

    const history = await this.prisma.enrollmentHistory.findMany({
      where: { studentId: profile.id },
      include: {
        course: { select: { code: true, title: true } },
        academicTerm: { select: { code: true, label: true } },
        changedBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      data: history,
      total: history.length,
    };
  }

  private async notifyStatusEvent(userId: string, title: string, message: string) {
    try {
      await this.notificationsService.sendToUser(userId, title, message);
    } catch {
      this.logger.warn('Enrollment status changed, but its notification could not be persisted.');
    }
  }

  /**
   * Student schedule view (P4-05). Schedule day/time/room values come from
   * `ClassSection`/`ClassSchedule` records only; entries without a published
   * section keep their course + section text and report
   * `schedulePublished: false` instead of inventing values (DEC-010).
   */
  async getMySchedule(userId: string) {
    const profile = await requireStudentProfile(this.prisma, userId);

    const enrollments = await this.prisma.enrollment.findMany({
      where: { studentId: profile.id, status: 'enrolled' },
      include: {
        course: { select: { code: true, title: true, units: true } },
        term: true,
        instructor: { select: { firstName: true, lastName: true } },
        classSection: {
          select: {
            sectionCode: true,
            schedules: {
              orderBy: { dayOfWeek: 'asc' },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      data: enrollments.map((enrollment: any) => ({
        id: enrollment.id,
        courseCode: enrollment.course?.code ?? null,
        courseTitle: enrollment.course?.title ?? null,
        units: enrollment.course?.units ?? 0,
        section: enrollment.classSection?.sectionCode ?? enrollment.section ?? null,
        instructor: enrollment.instructor
          ? `${enrollment.instructor.firstName ?? ''} ${enrollment.instructor.lastName ?? ''}`.trim()
          : null,
        term: enrollment.term
          ? {
              code: enrollment.term.code,
              label: enrollment.term.label,
              academicYear: enrollment.term.academicYear,
            }
          : null,
        schedulePublished: Boolean(enrollment.classSection?.schedules?.length),
        schedules: (enrollment.classSection?.schedules ?? []).map((slot: any) => ({
          dayOfWeek: slot.dayOfWeek,
          startTime: slot.startTime,
          endTime: slot.endTime,
          room: slot.room ?? null,
        })),
      })),
      total: enrollments.length,
    };
  }

  async createHistory(studentProfileId: string, dto: CreateHistoryDto) {
    const profile = await this.prisma.studentProfile.findUnique({
      where: { id: studentProfileId },
    });

    if (!profile) {
      throw new NotFoundException(`Student profile with ID ${studentProfileId} not found`);
    }

    const history = await this.prisma.enrollmentHistory.create({
      data: {
        studentId: studentProfileId,
        term: dto.term,
        status: dto.status,
      },
    });

    return {
      message: 'Enrollment history record created',
      data: history,
    };
  }

  async getAvailableCourses(userId?: string, termId?: string) {
    // Program-aware listing: when a student calls, return only their
    // curriculum's courses for the current (or requested) term, newest first.
    // Admin/faculty calls without userId keep the legacy full listing.
    if (userId) {
      const profile = await requireStudentProfile(this.prisma, userId);
      const term = termId
        ? await this.prisma.academicTerm.findUnique({ where: { id: termId } })
        : await this.prisma.academicTerm.findFirst({ where: { isCurrent: true } });
      // Use the curriculum assigned to the student when present; fall back to
      // the newest effective curriculum for the program (P5-04).
      const curriculum = profile.curriculumId
        ? await this.prisma.curriculum.findUnique({
            where: { id: profile.curriculumId },
            select: { id: true },
          })
        : await this.prisma.curriculum.findFirst({
            where: { programId: profile.programId },
            orderBy: { effectiveYear: 'desc' },
            select: { id: true },
          });
      if (curriculum && term) {
        const links = await this.prisma.curriculumCourse.findMany({
          where: { curriculumId: curriculum.id, termNumber: term.termNumber },
          include: { course: { include: { prerequisites: { select: { requiresCode: true } } } } },
          orderBy: { course: { code: 'asc' } },
        });
        const courses = links.map((link) => ({
          ...link.course,
          units: link.sourceUnits,
          lecUnits: link.sourceLecUnits,
          labUnits: link.sourceLabUnits,
        }));
        return { data: courses, total: courses.length, term: term.code, scoped: true };
      }
    }
    const courses = await this.prisma.course.findMany({
      orderBy: { code: 'asc' },
    });

    return {
      data: courses,
      total: courses.length,
    };
  }

  async getCompletedCourseIds(userId: string): Promise<string[]> {
    const profile = await requireStudentProfile(this.prisma, userId);
    const completedIds = await getCompletedCourseIdSet(this.prisma, profile.id);
    return [...completedIds];
  }
}
