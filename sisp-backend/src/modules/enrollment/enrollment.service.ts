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

@Injectable()
export class EnrollmentService {
  constructor(private readonly prisma: PrismaService) {}

  async enroll(userId: string, dto: EnrollDto) {
    // Get student profile from userId
    const profile = await this.prisma.studentProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException(
        'Student profile not found. Please contact admin.',
      );
    }

    // Verify course exists
    const course = await this.prisma.course.findUnique({
      where: { id: dto.courseId },
    });

    if (!course) {
      throw new NotFoundException(
        `Course with ID ${dto.courseId} not found`,
      );
    }

    // Check if already enrolled in this course
    const existing = await this.prisma.enrollment.findFirst({
      where: {
        studentId: profile.id,
        courseId: dto.courseId,
        status: 'enrolled',
      },
    });

    if (existing) {
      throw new ConflictException(
        `You are already enrolled in ${course.code} - ${course.title}`,
      );
    }

    const enrollment = await this.prisma.enrollment.create({
      data: {
        studentId: profile.id,
        courseId: dto.courseId,
        section: dto.section,
        status: 'enrolled',
      },
      include: {
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
    const profile = await this.prisma.studentProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('Student profile not found');
    }

    const enrollments = await this.prisma.enrollment.findMany({
      where: { studentId: profile.id },
      include: {
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

  async getAllEnrollments(studentId?: string, courseId?: string) {
    const where: {
      studentId?: string;
      courseId?: string;
    } = {};

    if (studentId) where.studentId = studentId;
    if (courseId) where.courseId = courseId;

    const enrollments = await this.prisma.enrollment.findMany({
      where,
      include: {
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
      throw new NotFoundException(
        `Enrollment with ID ${enrollmentId} not found`,
      );
    }

    // Verify the enrollment belongs to this student
    if (enrollment.studentId !== profile.id) {
      throw new BadRequestException(
        'You can only drop your own enrollments',
      );
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

  async createHistory(
    studentProfileId: string,
    dto: CreateHistoryDto,
  ) {
    const profile = await this.prisma.studentProfile.findUnique({
      where: { id: studentProfileId },
    });

    if (!profile) {
      throw new NotFoundException(
        `Student profile with ID ${studentProfileId} not found`,
      );
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

  async getAvailableCourses() {
    const courses = await this.prisma.course.findMany({
      orderBy: { code: 'asc' },
    });

    return {
      data: courses,
      total: courses.length,
    };
  }
}