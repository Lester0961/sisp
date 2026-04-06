import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateGradeDto } from './dto/create-grade.dto';
import { UpdateGradeDto } from './dto/update-grade.dto';
import { BulkGradeDto } from './dto/bulk-grade.dto';

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
      prelim === null || prelim === undefined ||
      midterm === null || midterm === undefined ||
      finals === null || finals === undefined
    ) {
      return null;
    }
    // Standard formula: Prelim 30% + Midterm 30% + Finals 40%
    return parseFloat(
      (prelim * 0.3 + midterm * 0.3 + finals * 0.4).toFixed(2),
    );
  }

  async createGrade(dto: CreateGradeDto) {
    // Verify enrollment exists
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
      throw new NotFoundException(
        `Enrollment with ID ${dto.enrollmentId} not found`,
      );
    }

    // Check if grade already exists for this enrollment
    const existing = await this.prisma.grade.findUnique({
      where: { enrollmentId: dto.enrollmentId },
    });

    if (existing) {
      throw new ConflictException(
        'A grade record already exists for this enrollment. Use PATCH to update.',
      );
    }

    const finalGrade = this.computeFinalGrade(
      dto.prelim,
      dto.midterm,
      dto.finals,
    );

    const grade = await this.prisma.grade.create({
      data: {
        enrollmentId: dto.enrollmentId,
        prelim: dto.prelim,
        midterm: dto.midterm,
        finals: dto.finals,
        finalGrade,
        isVisible: dto.isVisible ?? false,
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

    // Compute new final grade using updated or existing values
    const prelim = dto.prelim ?? existing.prelim;
    const midterm = dto.midterm ?? existing.midterm;
    const finals = dto.finals ?? existing.finals;
    const finalGrade = this.computeFinalGrade(prelim, midterm, finals);

    const updated = await this.prisma.grade.update({
      where: { id },
      data: {
        ...(dto.prelim !== undefined && { prelim: dto.prelim }),
        ...(dto.midterm !== undefined && { midterm: dto.midterm }),
        ...(dto.finals !== undefined && { finals: dto.finals }),
        ...(dto.isVisible !== undefined && { isVisible: dto.isVisible }),
        finalGrade,
      },
      include: {
        enrollment: {
          include: {
            course: { select: { code: true, title: true } },
            student: {
              include: {
                user: { select: { email: true } },
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
      throw new NotFoundException(
        `No grade found for enrollment ${enrollmentId}`,
      );
    }

    return grade;
  }

  async getMyGrades(userId: string) {
    // Get student profile from userId
    const profile = await this.prisma.studentProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException(
        'Student profile not found',
      );
    }

    const grades = await this.prisma.grade.findMany({
      where: {
        enrollment: {
          studentId: profile.id,
        },
        isVisible: true,
      },
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
                user: { select: { email: true } },
              },
            },
          },
        },
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
      throw new NotFoundException(
        `Student profile with ID ${studentProfileId} not found`,
      );
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
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      data: grades,
      total: grades.length,
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