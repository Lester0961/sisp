import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateGradeDto } from './dto/create-grade.dto';
import { UpdateGradeDto } from './dto/update-grade.dto';
import { BulkGradeDto } from './dto/bulk-grade.dto';
import { requireStudentProfile } from '../../common/utils/require-student-profile';

const GRADE_STATUS_TRANSITIONS: Record<string, string[]> = {
  draft: ['submitted'],
  submitted: ['posted', 'rejected'],
  posted: ['approved', 'rejected'],
  approved: [],
  rejected: ['submitted'],
};

@Injectable()
export class GradesService {
  constructor(private readonly prisma: PrismaService) {}

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

  async createGrade(dto: CreateGradeDto) {
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

  async updateGrade(id: string, dto: UpdateGradeDto) {
    const existing = await this.prisma.grade.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Grade with ID ${id} not found`);
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
    });

    if (!grade) {
      throw new NotFoundException(`Grade with ID ${gradeId} not found`);
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
      message: 'Grade submitted to registrar for review',
      data: updated,
    };
  }

  async postGrade(registrarId: string, gradeId: string) {
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
        postedById: registrarId,
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
      message: 'Grade posted to dean for approval',
      data: updated,
    };
  }

  async approveGrade(deanId: string, gradeId: string) {
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
        approvedById: deanId,
        approvedAt: new Date(),
        isVisible: true,
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
        approvedBy: { select: { firstName: true, lastName: true, email: true } },
      },
    });

    return {
      message: 'Grade approved and published',
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
                user: { select: { email: true, firstName: true, lastName: true } },
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

  async getMyGrades(userId: string) {
    const profile = await requireStudentProfile(this.prisma, userId);

    // Get current semester to check payment
    const currentSemester = await this.prisma.studentSemester.findFirst({
      where: { studentId: profile.id },
      orderBy: [{ year: 'desc' }, { semester: 'desc' }],
    });

    // Only show approved grades where student is fully paid for the matching semester
    const whereClause: any = {
      enrollment: {
        studentId: profile.id,
      },
      status: 'approved',
    };

    // If student is not fully paid for current semester, don't show any grades
    if (!currentSemester || !currentSemester.isFullyPaid) {
      return {
        data: [],
        total: 0,
        message: 'Grades are hidden until tuition is fully paid for this semester.',
      };
    }

    const grades = await this.prisma.grade.findMany({
      where: whereClause,
      include: {
        enrollment: {
          include: {
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

    return {
      data: grades,
      total: grades.length,
    };
  }

  async getAllGrades() {
    const grades = await this.prisma.grade.findMany({
      include: {
        enrollment: {
          include: {
            course: { select: { code: true, title: true, units: true } },
            student: {
              include: {
                user: { select: { email: true, firstName: true, lastName: true } },
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
                user: { select: { email: true, firstName: true, lastName: true } },
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
    });

    if (!existing) {
      throw new NotFoundException(`Grade with ID ${id} not found`);
    }

    const updated = await this.prisma.grade.update({
      where: { id },
      data: { isVisible },
    });

    return {
      message: `Grade ${isVisible ? 'published' : 'hidden'} successfully`,
      data: updated,
    };
  }

  async bulkCreateGrades(dto: BulkGradeDto) {
    const results = [];
    const errors = [];

    for (const item of dto.grades) {
      try {
        const result = await this.createGrade(item);
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
