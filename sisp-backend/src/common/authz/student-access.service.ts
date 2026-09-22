import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface StudentActor {
  sub: string;
  role?: string;
}

/**
 * Centralized record-level student access (Phase 1).
 *
 * Roles alone are not enough: deans and faculty must only reach students they
 * are actually responsible for. Registrar maintains institutional records and
 * sys_admin has audited support read access.
 */
@Injectable()
export class StudentAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async canReadStudent(actor: StudentActor, studentProfileId: string): Promise<boolean> {
    switch (actor.role) {
      case 'student': {
        const profile = await this.prisma.studentProfile.findUnique({
          where: { id: studentProfileId },
          select: { userId: true },
        });
        return profile?.userId === actor.sub;
      }
      case 'registrar':
      case 'sys_admin':
        return true;
      case 'dean': {
        const assignment = await this.prisma.adviserAssignment.findFirst({
          where: { adviserId: actor.sub, studentId: studentProfileId, status: 'active' },
          select: { id: true },
        });
        return Boolean(assignment);
      }
      case 'faculty': {
        const enrollment = await this.prisma.enrollment.findFirst({
          where: { studentId: studentProfileId, instructorId: actor.sub },
          select: { id: true },
        });
        return Boolean(enrollment);
      }
      default:
        return false;
    }
  }

  async assertCanReadStudent(actor: StudentActor, studentProfileId: string): Promise<void> {
    const allowed = await this.canReadStudent(actor, studentProfileId);
    if (!allowed) {
      throw new ForbiddenException('You are not authorized to access this student record');
    }
  }

  /**
   * Returns the student profile ids an actor may list, or null when the actor
   * may list every profile (registrar, sys_admin).
   */
  async accessibleStudentIds(actor: StudentActor): Promise<string[] | null> {
    if (actor.role === 'registrar' || actor.role === 'sys_admin') return null;

    if (actor.role === 'dean') {
      const assignments = await this.prisma.adviserAssignment.findMany({
        where: { adviserId: actor.sub, status: 'active' },
        select: { studentId: true },
      });
      return assignments.map((assignment) => assignment.studentId);
    }

    if (actor.role === 'faculty') {
      const enrollments = await this.prisma.enrollment.findMany({
        where: { instructorId: actor.sub },
        select: { studentId: true },
        distinct: ['studentId'],
      });
      return enrollments.map((enrollment) => enrollment.studentId);
    }

    if (actor.role === 'student') {
      const profile = await this.prisma.studentProfile.findUnique({
        where: { userId: actor.sub },
        select: { id: true },
      });
      return profile ? [profile.id] : [];
    }

    return [];
  }
}
