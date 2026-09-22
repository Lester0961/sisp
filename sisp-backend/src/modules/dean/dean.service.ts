import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CurriculumService } from '../curriculum/curriculum.service';
import { assertTransition } from '../../common/utils/state-machine';
import { CreateConcernDto, UpdateConcernDto } from './dto/concern.dto';
import { CreateAdviserAssignmentDto } from './dto/adviser-assignment.dto';

export const CONCERN_TRANSITIONS: Record<string, string[]> = {
  open: ['in_review', 'resolved'],
  in_review: ['open', 'resolved'],
  resolved: ['open'], // reopen
};

/**
 * Dean / Academic Adviser module (Phase 9).
 *
 * - Advisees are scoped through AdviserAssignment (P9-01).
 * - Academic progress reuses the server-computed curriculum progress (P9-04).
 * - Academic standing is shown as factual indicators only (completion,
 *   failed/ongoing counts, enrollment status, recent results) — no
 *   "good standing"/"probation" labels (P9-05, DEC-009).
 * - Advising concerns replace the broken "Exceptions" workflow (P9-02/03).
 */
@Injectable()
export class DeanService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly curriculumService: CurriculumService,
  ) {}

  private async assignedStudentIds(adviserId: string): Promise<Set<string>> {
    const assignments = await this.prisma.adviserAssignment.findMany({
      where: { adviserId, status: 'active' },
      select: { studentId: true },
    });
    return new Set(assignments.map((assignment) => assignment.studentId));
  }

  private async getAssignedStudentOrThrow(adviserId: string, studentProfileId: string) {
    const ids = await this.assignedStudentIds(adviserId);
    if (!ids.has(studentProfileId)) {
      throw new NotFoundException(`Student ${studentProfileId} is not assigned to this adviser`);
    }
    const student = await this.prisma.studentProfile.findUnique({
      where: { id: studentProfileId },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        program: { select: { code: true, name: true } },
      },
    });
    if (!student) {
      throw new NotFoundException(`Student ${studentProfileId} not found`);
    }
    return student;
  }

  /** Assigned advisees with their computed progress percentage (P9-01/P9-04). */
  async getAdvisees(adviserId: string) {
    const assignments = await this.prisma.adviserAssignment.findMany({
      where: { adviserId, status: 'active' },
      orderBy: { createdAt: 'desc' },
      include: {
        student: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true } },
            program: { select: { code: true, name: true } },
          },
        },
        academicTerm: { select: { code: true, label: true, academicYear: true } },
      },
    });

    const advisees = [];
    for (const assignment of assignments) {
      const progress = await this.curriculumService.getMyProgress(
        (assignment.student as any).user.id,
      );
      advisees.push({
        assignmentId: assignment.id,
        student: {
          id: assignment.studentId,
          studentNumber: (assignment.student as any).studentNumber,
          firstName: (assignment.student as any).user?.firstName ?? null,
          lastName: (assignment.student as any).user?.lastName ?? null,
          program: (assignment.student as any).program ?? null,
        },
        term: assignment.academicTerm ?? null,
        academicYear: assignment.academicYear ?? null,
        completionPercentage: progress.totals.completionPercentage,
      });
    }

    return { data: advisees, total: advisees.length };
  }

  /** Advisee detail: profile + progress + factual standing indicators. */
  async getAdviseeDetail(adviserId: string, studentProfileId: string) {
    const student = await this.getAssignedStudentOrThrow(adviserId, studentProfileId);

    const [progress, enrollments] = await Promise.all([
      this.curriculumService.getMyProgress(student.user.id),
      this.prisma.enrollment.findMany({
        where: { studentId: studentProfileId },
        include: {
          course: { select: { code: true, title: true, units: true } },
          term: true,
          grade: { select: { finalGrade: true, status: true, isVisible: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const countByStatus = (status: string) =>
      enrollments.filter((enrollment) => enrollment.status === status).length;

    // Factual standing only (P9-05): no academic-standing labels are invented.
    const standing = {
      completedSubjects: countByStatus('completed'),
      failedSubjects: countByStatus('failed'),
      ongoingSubjects: countByStatus('enrolled'),
      droppedSubjects: countByStatus('dropped'),
      completionPercentage: progress.totals.completionPercentage,
      enrollmentStatuses: [
        ...new Set(enrollments.map((enrollment) => enrollment.status)),
      ],
      recentResults: enrollments
        .filter((enrollment) => Boolean(enrollment.grade?.isVisible))
        .slice(0, 5)
        .map((enrollment) => ({
          courseCode: enrollment.course?.code ?? null,
          courseTitle: enrollment.course?.title ?? null,
          term: enrollment.term?.label ?? null,
          finalGrade: enrollment.grade?.finalGrade ?? null,
        })),
    };

    const concerns = await this.prisma.advisingConcern.findMany({
      where: { studentId: studentProfileId },
      orderBy: { createdAt: 'desc' },
    });

    return {
      student: {
        id: student.id,
        studentNumber: (student as any).studentNumber,
        firstName: student.user?.firstName ?? null,
        lastName: student.user?.lastName ?? null,
        email: student.user?.email ?? null,
        program: (student as any).program ?? null,
      },
      progress,
      standing,
      concerns,
    };
  }

  /** Advising concerns across the adviser's assigned advisees (P9-03). */
  async getConcerns(adviserId: string) {
    const studentIds = await this.assignedStudentIds(adviserId);
    const concerns = await this.prisma.advisingConcern.findMany({
      where: { studentId: { in: [...studentIds] } },
      orderBy: { createdAt: 'desc' },
      include: {
        student: {
          include: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });
    return {
      data: concerns.map((concern: any) => ({
        id: concern.id,
        studentId: concern.studentId,
        studentName: `${concern.student?.user?.firstName ?? ''} ${concern.student?.user?.lastName ?? ''}`.trim(),
        category: concern.category,
        summary: concern.summary,
        status: concern.status,
        notes: concern.notes,
        resolution: concern.resolution,
        createdAt: concern.createdAt,
        resolvedAt: concern.resolvedAt,
      })),
      total: concerns.length,
    };
  }

  /** Create a concern for an assigned advisee (P9-03). */
  async createConcern(adviserId: string, dto: CreateConcernDto) {
    await this.getAssignedStudentOrThrow(adviserId, dto.studentProfileId);

    const concern = await this.prisma.advisingConcern.create({
      data: {
        studentId: dto.studentProfileId,
        adviserId,
        category: dto.category.trim(),
        summary: dto.summary.trim(),
        status: 'open',
      },
    });

    return { message: 'Advising concern recorded', data: concern };
  }

  /** Update/resolve a concern owned by the adviser (P9-03). */
  async updateConcern(adviserId: string, id: string, dto: UpdateConcernDto) {
    const concern = await this.prisma.advisingConcern.findUnique({ where: { id } });
    if (!concern) {
      throw new NotFoundException(`Advising concern ${id} not found`);
    }
    if (concern.adviserId !== adviserId) {
      const assigned = await this.assignedStudentIds(adviserId);
      if (!assigned.has(concern.studentId)) {
        throw new NotFoundException(`Advising concern ${id} not found`);
      }
    }

    const nextStatus = dto.status ?? concern.status;
    if (nextStatus !== concern.status) {
      assertTransition(concern.status, nextStatus, CONCERN_TRANSITIONS);
    }

    const updated = await this.prisma.advisingConcern.update({
      where: { id },
      data: {
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
        ...(dto.resolution !== undefined ? { resolution: dto.resolution } : {}),
        resolvedAt:
          nextStatus === 'resolved'
            ? (concern.resolvedAt ?? new Date())
            : nextStatus !== concern.status
              ? null
              : concern.resolvedAt,
      },
    });

    return { message: 'Advising concern updated', data: updated };
  }

  /** Remove a concern (adviser-scoped). */
  async deleteConcern(adviserId: string, id: string) {
    const concern = await this.prisma.advisingConcern.findUnique({ where: { id } });
    if (!concern) {
      throw new NotFoundException(`Advising concern ${id} not found`);
    }
    if (concern.adviserId !== adviserId) {
      throw new BadRequestException('You can only delete your own advising concerns');
    }
    await this.prisma.advisingConcern.delete({ where: { id } });
    return { message: 'Advising concern removed' };
  }

  // ---------------------------------------------------------------------------
  // Adviser assignments (Registrar-owned writer; P3-06/P9-01)
  // ---------------------------------------------------------------------------

  /** Active Dean accounts eligible to be advisers. */
  async getAdviserCandidates() {
    const advisers = await this.prisma.user.findMany({
      where: { isActive: true, role: { name: 'dean' } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        _count: { select: { adviserAssignments: { where: { status: 'active' } } } },
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });
    return { data: advisers };
  }

  async listAdviserAssignments(search?: string) {
    const assignments = await this.prisma.adviserAssignment.findMany({
      where: {
        ...(search
          ? {
              OR: [
                { student: { studentNumber: { contains: search, mode: 'insensitive' } } },
                { student: { user: { firstName: { contains: search, mode: 'insensitive' } } } },
                { student: { user: { lastName: { contains: search, mode: 'insensitive' } } } },
                { adviser: { lastName: { contains: search, mode: 'insensitive' } } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        adviser: { select: { id: true, firstName: true, lastName: true, email: true } },
        student: {
          select: {
            id: true,
            studentNumber: true,
            user: { select: { firstName: true, lastName: true, email: true } },
            program: { select: { code: true } },
          },
        },
        academicTerm: { select: { code: true, label: true, academicYear: true } },
      },
    });
    return { data: assignments };
  }

  async createAdviserAssignment(actorId: string, dto: CreateAdviserAssignmentDto) {
    const [adviser, student] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: dto.adviserId },
        include: { role: { select: { name: true } } },
      }),
      this.prisma.studentProfile.findUnique({ where: { id: dto.studentId } }),
    ]);

    if (!adviser || adviser.role?.name !== 'dean') {
      throw new BadRequestException('The selected adviser must be a Dean account.');
    }
    if (!adviser.isActive) {
      throw new BadRequestException('The selected Dean account is not active.');
    }
    if (!student) {
      throw new NotFoundException(`Student profile ${dto.studentId} not found`);
    }
    if (dto.academicTermId) {
      const term = await this.prisma.academicTerm.findUnique({
        where: { id: dto.academicTermId },
      });
      if (!term) {
        throw new NotFoundException(`Academic term ${dto.academicTermId} not found`);
      }
    }

    const termId = dto.academicTermId ?? null;
    const existing = await this.prisma.adviserAssignment.findFirst({
      where: { adviserId: dto.adviserId, studentId: dto.studentId, academicTermId: termId },
    });
    if (existing?.status === 'active') {
      throw new ConflictException(
        'This student is already assigned to the selected adviser for that term.',
      );
    }

    // One active adviser per student and term keeps scoping unambiguous.
    const conflicting = await this.prisma.adviserAssignment.findFirst({
      where: {
        studentId: dto.studentId,
        academicTermId: termId,
        status: 'active',
        NOT: { adviserId: dto.adviserId },
      },
      include: { adviser: { select: { firstName: true, lastName: true } } },
    });
    if (conflicting) {
      throw new ConflictException(
        `This student already has an active adviser (${conflicting.adviser.firstName} ${conflicting.adviser.lastName}) for that term. Deactivate the existing assignment first.`,
      );
    }

    if (existing) {
      const reactivated = await this.prisma.adviserAssignment.update({
        where: { id: existing.id },
        data: {
          status: 'active',
          academicYear: dto.academicYear?.trim() || existing.academicYear,
        },
      });
      await this.recordAdviserAudit(actorId, 'ADVISER_ASSIGNMENT_REACTIVATED', reactivated.id, 'inactive', 'active');
      return { message: 'Adviser assignment reactivated', data: reactivated };
    }

    const created = await this.prisma.adviserAssignment.create({
      data: {
        adviserId: dto.adviserId,
        studentId: dto.studentId,
        academicTermId: termId,
        academicYear: dto.academicYear?.trim() || null,
        status: 'active',
      },
      include: {
        adviser: { select: { id: true, firstName: true, lastName: true, email: true } },
        student: {
          select: {
            id: true,
            studentNumber: true,
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    await this.recordAdviserAudit(actorId, 'ADVISER_ASSIGNMENT_CREATED', created.id, null, {
      adviserId: dto.adviserId,
      studentId: dto.studentId,
      academicTermId: termId,
    });

    return { message: 'Adviser assigned', data: created };
  }

  async updateAdviserAssignmentStatus(actorId: string, id: string, status: 'active' | 'inactive') {
    const assignment = await this.prisma.adviserAssignment.findUnique({ where: { id } });
    if (!assignment) {
      throw new NotFoundException(`Adviser assignment ${id} not found`);
    }
    if (assignment.status === status) {
      return { message: `Adviser assignment is already ${status}`, data: assignment };
    }

    const updated = await this.prisma.adviserAssignment.update({
      where: { id },
      data: { status },
    });

    await this.recordAdviserAudit(actorId, 'ADVISER_ASSIGNMENT_STATUS_CHANGED', updated.id, assignment.status, status);

    return { message: `Adviser assignment ${status}`, data: updated };
  }

  private async recordAdviserAudit(
    actorId: string,
    action: string,
    resourceId: string,
    oldValue: unknown,
    newValue: unknown,
  ) {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: actorId,
          action,
          resource: 'adviser_assignments',
          resourceId,
          oldValue: oldValue === null || oldValue === undefined ? null : JSON.stringify(oldValue),
          newValue: newValue === null || newValue === undefined ? null : JSON.stringify(newValue),
        },
      });
    } catch {
      // Best-effort audit; never block the assignment workflow.
    }
  }
}