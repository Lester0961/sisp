import { Injectable, NotFoundException, ConflictException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateGradeDto } from './dto/create-grade.dto';
import { UpdateGradeDto } from './dto/update-grade.dto';
import { BulkGradeDto } from './dto/bulk-grade.dto';
import { requireStudentProfile } from '../../common/utils/require-student-profile';
import { NotificationsService } from '../notifications/notifications.service';

const GRADE_STATUS_TRANSITIONS: Record<string, string[]> = {
  draft: ['submitted'],
  submitted: ['posted', 'rejected'],
  posted: ['approved', 'rejected'],
  approved: [],
  rejected: ['submitted'],
};

@Injectable()
export class GradesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // Compute final grade from components
  private computeFinalGrade(
    prelim?: number | null,
    midterm?: number | null,
    finals?: number | null,
  ): number | null {
    if (
      prelim === null ||
      prelim === undefined ||
      midterm === null ||
      midterm === undefined ||
      finals === null ||
      finals === undefined
    ) {
      return null;
    }
    return parseFloat((prelim * 0.3 + midterm * 0.3 + finals * 0.4).toFixed(2));
  }

  private assertTransition(current: string, next: string) {
    const allowed = GRADE_STATUS_TRANSITIONS[current] || [];
    if (!allowed.includes(next)) {
      throw new BadRequestException(
        `Invalid status transition: cannot move from "${current}" to "${next}". Allowed: ${allowed.join(', ') || 'none'}.`,
      );
    }
  }

  async createGrade(facultyId: string, dto: CreateGradeDto) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: dto.enrollmentId },
      include: {
        student: {
          include: {
            user: { select: { email: true } },
          },
        },
        course: { select: { code: true, title: true } },
      },
    });

    if (!enrollment) {
      throw new NotFoundException(`Enrollment with ID ${dto.enrollmentId} not found`);
    }

    if (enrollment.instructorId !== facultyId) {
      throw new ForbiddenException('You can only encode grades for students assigned to you.');
    }

    const existing = await this.prisma.grade.findUnique({
      where: { enrollmentId: dto.enrollmentId },
    });

    if (existing) {
      throw new ConflictException(
        'A grade record already exists for this enrollment. Use PATCH to update.',
      );
    }

    const finalGrade = this.computeFinalGrade(dto.prelim, dto.midterm, dto.finals);

    const grade = await this.prisma.grade.create({
      data: {
        enrollmentId: dto.enrollmentId,
        prelim: dto.prelim,
        midterm: dto.midterm,
        finals: dto.finals,
        finalGrade,
        isVisible: false,
        status: 'draft',
      },
      include: {
        enrollment: {
          include: {
            student: {
              include: {
                user: { select: { email: true } },
              },
            },
            course: { select: { code: true, title: true } },
          },
        },
      },
    });

    return {
      message: 'Grade created successfully',
      data: grade,
    };
  }

  async updateGrade(facultyId: string, id: string, dto: UpdateGradeDto) {
    const existing = await this.prisma.grade.findUnique({
      where: { id },
      include: { enrollment: { select: { instructorId: true } } },
    });

    if (!existing) {
      throw new NotFoundException(`Grade with ID ${id} not found`);
    }

    if (existing.enrollment?.instructorId !== facultyId) {
      throw new ForbiddenException('You can only edit grades for students assigned to you.');
    }

    // Only allow editing if status is draft or rejected
    if (!['draft', 'rejected'].includes(existing.status)) {
      throw new BadRequestException(
        `Cannot edit grade that is already ${existing.status}. Only draft or rejected grades can be modified.`,
      );
    }

    const prelim = dto.prelim !== undefined ? dto.prelim : existing.prelim;
    const midterm = dto.midterm !== undefined ? dto.midterm : existing.midterm;
    const finals = dto.finals !== undefined ? dto.finals : existing.finals;
    const finalGrade = this.computeFinalGrade(prelim, midterm, finals);

    const updated = await this.prisma.grade.update({
      where: { id },
      data: {
        ...(dto.prelim !== undefined && { prelim: dto.prelim }),
        ...(dto.midterm !== undefined && { midterm: dto.midterm }),
        ...(dto.finals !== undefined && { finals: dto.finals }),
        finalGrade,
      },
      include: {
        enrollment: {
          include: {
            course: { select: { code: true, title: true } },
            student: {
              include: {
                user: { select: { email: true, firstName: true, lastName: true } },
              },
            },
          },
        },
      },
    });

    return {
      message: 'Grade updated successfully',
      data: updated,
    };
  }

  async submitGrade(facultyId: string, gradeId: string) {
    const grade = await this.prisma.grade.findUnique({
      where: { id: gradeId },
      include: { enrollment: { select: { instructorId: true } } },
    });

    if (!grade) {
      throw new NotFoundException(`Grade with ID ${gradeId} not found`);
    }

    if (grade.enrollment?.instructorId !== facultyId) {
      throw new ForbiddenException('You can only submit grades for students assigned to you.');
    }

    this.assertTransition(grade.status, 'submitted');

    const updated = await this.prisma.grade.update({
      where: { id: gradeId },
      data: {
        status: 'submitted',
        submittedById: facultyId,
        submittedAt: new Date(),
        // Clear any previous rejection info
        rejectedById: null,
        rejectedAt: null,
        rejectedRemarks: null,
      },
      include: {
        enrollment: {
          include: {
            course: { select: { code: true, title: true } },
            student: {
              include: {
                user: { select: { email: true, firstName: true, lastName: true } },
              },
            },
          },
        },
        submittedBy: { select: { firstName: true, lastName: true, email: true } },
      },
    });

    return {
      message: 'Grade submitted to the dean for approval',
      data: updated,
    };
  }

  async postGrade(deanId: string, gradeId: string) {
    const grade = await this.prisma.grade.findUnique({
      where: { id: gradeId },
    });

    if (!grade) {
      throw new NotFoundException(`Grade with ID ${gradeId} not found`);
    }

    this.assertTransition(grade.status, 'posted');

    const updated = await this.prisma.grade.update({
      where: { id: gradeId },
      data: {
        status: 'posted',
        postedById: deanId,
        postedAt: new Date(),
      },
      include: {
        enrollment: {
          include: {
            course: { select: { code: true, title: true } },
            student: {
              include: {
                user: { select: { email: true, firstName: true, lastName: true } },
              },
            },
          },
        },
        submittedBy: { select: { firstName: true, lastName: true, email: true } },
        postedBy: { select: { firstName: true, lastName: true, email: true } },
      },
    });

    return {
      message: 'Grade approved by the dean and queued for registrar publication',
      data: updated,
    };
  }

  async approveGrade(registrarId: string, gradeId: string) {
    const grade = await this.prisma.grade.findUnique({
      where: { id: gradeId },
    });

    if (!grade) {
      throw new NotFoundException(`Grade with ID ${gradeId} not found`);
    }

    this.assertTransition(grade.status, 'approved');

    const updated = await this.prisma.grade.update({
      where: { id: gradeId },
      data: {
        status: 'approved',
        approvedById: registrarId,
        approvedAt: new Date(),
        isVisible: true,
      },
      include: {
        enrollment: {
          include: {
            course: { select: { code: true, title: true } },
            student: {
              include: {
                user: { select: { id: true, email: true, firstName: true, lastName: true } },
              },
            },
          },
        },
        submittedBy: { select: { firstName: true, lastName: true, email: true } },
        postedBy: { select: { firstName: true, lastName: true, email: true } },
        approvedBy: { select: { firstName: true, lastName: true, email: true } },
      },
    });

    await this.notificationsService.sendToUser(
      updated.enrollment.student.user.id,
      'Grade Published',
      'A grade has been published to your student record.',
    );

    return {
      message: 'Grade published by the registrar',
      data: updated,
    };
  }

  async rejectGrade(deanId: string, gradeId: string, remarks: string) {
    const grade = await this.prisma.grade.findUnique({
      where: { id: gradeId },
    });

    if (!grade) {
      throw new NotFoundException(`Grade with ID ${gradeId} not found`);
    }

    this.assertTransition(grade.status, 'rejected');

    const updated = await this.prisma.grade.update({
      where: { id: gradeId },
      data: {
        status: 'rejected',
        rejectedById: deanId,
        rejectedAt: new Date(),
        rejectedRemarks: remarks,
        isVisible: false,
      },
      include: {
        enrollment: {
          include: {
            course: { select: { code: true, title: true } },
            student: {
              include: {
                user: { select: { email: true, firstName: true, lastName: true } },
              },
            },
          },
        },
        rejectedBy: { select: { firstName: true, lastName: true, email: true } },
      },
    });

    return {
      message: 'Grade rejected and returned to faculty',
      data: updated,
    };
  }

  async getGradesByStatus(status: string) {
    const grades = await this.prisma.grade.findMany({
      where: { status },
      include: {
        enrollment: {
          include: {
            course: { select: { code: true, title: true, units: true } },
            student: {
              include: {
                user: { select: { id: true, email: true, firstName: true, lastName: true } },
              },
            },
          },
        },
        submittedBy: { select: { firstName: true, lastName: true, email: true } },
        postedBy: { select: { firstName: true, lastName: true, email: true } },
        approvedBy: { select: { firstName: true, lastName: true, email: true } },
        rejectedBy: { select: { firstName: true, lastName: true, email: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return {
      data: grades,
      total: grades.length,
    };
  }

  async getGradesByEnrollment(enrollmentId: string) {
    const grade = await this.prisma.grade.findUnique({
      where: { enrollmentId },
      include: {
        enrollment: {
          include: {
            course: { select: { code: true, title: true, units: true } },
          },
        },
      },
    });

    if (!grade) {
      throw new NotFoundException(`No grade found for enrollment ${enrollmentId}`);
    }

    return grade;
  }

  async getMyGrades(userId: string, termId?: string) {
    const profile = await requireStudentProfile(this.prisma, userId);

    const semesters = await this.prisma.studentSemester.findMany({
      where: { studentId: profile.id },
      orderBy: [{ year: 'desc' }, { semester: 'desc' }],
      include: { term: true },
    });

    const semesterRank: Record<string, number> = { '1st': 1, '2nd': 2, summer: 3 };
    semesters.sort((left: any, right: any) => {
      const yearCompare = String(right.year).localeCompare(String(left.year));
      if (yearCompare !== 0) return yearCompare;
      return (semesterRank[String(right.semester).toLowerCase()] ?? 0)
        - (semesterRank[String(left.semester).toLowerCase()] ?? 0);
    });

    const paymentByTerm = new Map<string, boolean>();
    semesters.forEach((semester: any) => {
      if (semester.termId) paymentByTerm.set(`term:${semester.termId}`, Boolean(semester.isFullyPaid));
      paymentByTerm.set(`legacy:${semester.semester}|${semester.year}`, Boolean(semester.isFullyPaid));
    });
    const latestSemester = semesters[0];
    const whereClause: any = {
      enrollment: {
        studentId: profile.id,
        ...(termId ? { termId } : {}),
      },
      status: 'approved',
      isVisible: true,
    };

    const grades = await this.prisma.grade.findMany({
      where: whereClause,
      include: {
        enrollment: {
          include: {
            term: true,
            course: {
              select: {
                code: true,
                title: true,
                units: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const visibleGrades = grades.filter((grade: any) => {
      const termId = grade.enrollment?.termId;
      const semester = grade.enrollment?.semester;
      const year = grade.enrollment?.year;
      if (termId && paymentByTerm.has(`term:${termId}`)) {
        return paymentByTerm.get(`term:${termId}`) === true;
      }
      if (semester && year && paymentByTerm.has(`legacy:${semester}|${year}`)) {
        return paymentByTerm.get(`legacy:${semester}|${year}`) === true;
      }
      return latestSemester?.isFullyPaid === true;
    });
    const hiddenCount = grades.length - visibleGrades.length;

    return {
      data: visibleGrades,
      total: visibleGrades.length,
      hiddenCount,
      terms: semesters.map((semester: any) => ({
        id: semester.termId ?? `${semester.semester}|${semester.year}`,
        code: semester.term?.code ?? `${semester.year}-${semester.semester}`,
        label: semester.term?.label ?? semester.semester,
        academicYear: semester.term?.academicYear ?? semester.year,
        termNumber: semester.term?.termNumber ?? semesterRank[String(semester.semester).toLowerCase()] ?? 1,
        isCurrent: Boolean(semester.term?.isCurrent),
        isFullyPaid: Boolean(semester.isFullyPaid),
        paymentStatus: semester.paymentStatus ?? (semester.isFullyPaid ? 'paid' : 'unpaid'),
      })),
      currentTerm: latestSemester
        ? {
            id: latestSemester.termId ?? `${latestSemester.semester}|${latestSemester.year}`,
            code: latestSemester.term?.code ?? `${latestSemester.year}-${latestSemester.semester}`,
            label: latestSemester.term?.label ?? latestSemester.semester,
            academicYear: latestSemester.term?.academicYear ?? latestSemester.year,
            termNumber: latestSemester.term?.termNumber ?? semesterRank[String(latestSemester.semester).toLowerCase()] ?? 1,
            isFullyPaid: Boolean(latestSemester.isFullyPaid),
            paymentStatus: latestSemester.paymentStatus ?? (latestSemester.isFullyPaid ? 'paid' : 'unpaid'),
          }
        : null,
      message: hiddenCount > 0
        ? 'Some current-semester grades are hidden until that semester is fully paid. Paid past-semester grades remain available.'
        : undefined,
    };
  }

  async getGradesByInstructor(instructorId: string, status?: string, termId?: string) {
    return this.getAllGrades({
      ...(status ? { status } : {}),
      enrollment: { instructorId, ...(termId ? { termId } : {}) },
    });
  }

  async getAllGrades(where: any = {}) {
    const grades = await this.prisma.grade.findMany({
      where,
      include: {
        enrollment: {
          include: {
            term: true,
            instructor: { select: { id: true, email: true, firstName: true, lastName: true } },
            course: { select: { code: true, title: true, units: true } },
            student: {
              include: {
                user: { select: { id: true, email: true, firstName: true, lastName: true } },
              },
            },
          },
        },
        submittedBy: { select: { firstName: true, lastName: true, email: true } },
        postedBy: { select: { firstName: true, lastName: true, email: true } },
        approvedBy: { select: { firstName: true, lastName: true, email: true } },
        rejectedBy: { select: { firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      data: grades,
      total: grades.length,
    };
  }

  async getGradesByStudent(studentProfileId: string) {
    const profile = await this.prisma.studentProfile.findUnique({
      where: { id: studentProfileId },
    });

    if (!profile) {
      throw new NotFoundException(`Student profile with ID ${studentProfileId} not found`);
    }

    const grades = await this.prisma.grade.findMany({
      where: {
        enrollment: {
          studentId: studentProfileId,
        },
      },
      include: {
        enrollment: {
          include: {
            course: { select: { code: true, title: true, units: true } },
            student: {
              include: {
                user: { select: { id: true, email: true, firstName: true, lastName: true } },
              },
            },
          },
        },
        submittedBy: { select: { firstName: true, lastName: true, email: true } },
        postedBy: { select: { firstName: true, lastName: true, email: true } },
        approvedBy: { select: { firstName: true, lastName: true, email: true } },
        rejectedBy: { select: { firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      data: grades,
      total: grades.length,
    };
  }

  async toggleVisibility(id: string, isVisible: boolean) {
    const existing = await this.prisma.grade.findUnique({
      where: { id },
      include: { enrollment: { include: { student: { select: { userId: true } } } } },
    });

    if (!existing) {
      throw new NotFoundException(`Grade with ID ${id} not found`);
    }

    const updated = await this.prisma.grade.update({
      where: { id },
      data: { isVisible },
    });

    if (existing.isVisible !== isVisible && existing.enrollment?.student?.userId) {
      await this.notificationsService.sendToUser(
        existing.enrollment.student.userId,
        'Grade Visibility Updated',
        'Your grade visibility was updated. Visit Grades for current availability.',
      );
    }

    return {
      message: `Grade ${isVisible ? 'published' : 'hidden'} successfully`,
      data: updated,
    };
  }

  async bulkCreateGrades(facultyId: string, dto: BulkGradeDto) {
    const results = [];
    const errors = [];

    for (const item of dto.grades) {
      try {
        const result = await this.createGrade(facultyId, item);
        results.push(result.data);
      } catch (error: unknown) {
        const err = error as { message: string };
        errors.push({
          enrollmentId: item.enrollmentId,
          error: err.message,
        });
      }
    }

    return {
      message: `Bulk grade encoding complete. ${results.length} succeeded, ${errors.length} failed.`,
      data: results,
      errors,
    };
  }
}
