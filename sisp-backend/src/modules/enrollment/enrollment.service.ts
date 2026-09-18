import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EnrollDto } from './dto/enroll.dto';
import { UpdateEnrollmentDto } from './dto/update-enrollment.dto';
import { CreateHistoryDto } from './dto/create-history.dto';
import { requireStudentProfile } from '../../common/utils/require-student-profile';

@Injectable()
export class EnrollmentService {
  constructor(private readonly prisma: PrismaService) {}

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

    const existing = await this.prisma.enrollment.findFirst({
      where: {
        studentId: profile.id,
        courseId: dto.courseId,
        status: 'enrolled',
      },
    });

    if (existing) {
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
      const completed = await this.prisma.enrollment.findMany({
        where: { studentId: profile.id, status: 'completed' },
        select: { courseId: true },
      });
      const completedIds = new Set(completed.map((e) => e.courseId));
      const missing = prereqs.filter((p) => p.requiresId && !completedIds.has(p.requiresId));
      if (missing.length > 0) {
        throw new BadRequestException(
          `Prerequisite not met for ${course.code}: requires ${missing.map((m) => m.requiresCode).join(', ')}. Complete it first or request a dean exception.`,
        );
      }
    }

    const enrollment = await this.prisma.enrollment.create({
      data: {
        studentId: profile.id,
        courseId: dto.courseId,
        section: dto.section,
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

    return {
      data: enrollments,
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

  async updateEnrollmentStatus(id: string, dto: UpdateEnrollmentDto) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id },
      include: {
        course: { select: { code: true, title: true } },
      },
    });

    if (!enrollment) {
      throw new NotFoundException(`Enrollment with ID ${id} not found`);
    }

    // Prevent re-enrolling a dropped course directly
    if (enrollment.status === 'dropped' && dto.status === 'enrolled') {
      throw new BadRequestException(
        'Cannot re-enroll a dropped course. Submit a new enrollment instead.',
      );
    }

    const updated = await this.prisma.enrollment.update({
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

    const updated = await this.prisma.enrollment.update({
      where: { id: enrollmentId },
      data: { status: 'dropped' },
      include: {
        course: { select: { code: true, title: true } },
      },
    });

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
      orderBy: { createdAt: 'desc' },
    });

    return {
      data: history,
      total: history.length,
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
      const curriculum = await this.prisma.curriculum.findFirst({
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
        const courses = links.map((l) => l.course);
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

    const completed = await this.prisma.enrollment.findMany({
      where: {
        studentId: profile.id,
        status: 'completed',
      },
      select: {
        courseId: true,
      },
    });

    return completed.map((e) => e.courseId);
  }
}
