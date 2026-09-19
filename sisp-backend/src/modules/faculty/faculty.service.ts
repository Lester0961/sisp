import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Faculty module (Phase 8). Every query is derived from the authenticated
 * faculty user's enrollment assignments (`enrollments.instructor_id`), so a
 * faculty member can only ever see their own assigned classes/students.
 * Roster responses expose minimal academic identity (student number + name +
 * grade status) and never unrelated emails (P8-02).
 */
@Injectable()
export class FacultyService {
  constructor(private readonly prisma: PrismaService) {}

  async getAssignedClasses(userId: string, termId?: string) {
    const enrollments: any[] = await this.prisma.enrollment.findMany({
      where: { instructorId: userId, status: 'enrolled', ...(termId ? { termId } : {}) },
      include: {
        course: { select: { id: true, code: true, title: true, units: true } },
        term: true,
        classSection: { select: { id: true, sectionCode: true } },
        student: { select: { id: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const groups = new Map<string, any>();
    for (const enrollment of enrollments) {
      const section = enrollment.classSection?.sectionCode ?? enrollment.section ?? 'To be assigned';
      const termCode = enrollment.term?.code ?? 'any';
      const key = `${enrollment.courseId}|${termCode}|${section}`;
      const existing = groups.get(key);
      if (existing) {
        existing.studentCount += 1;
      } else {
        groups.set(key, {
          courseId: enrollment.courseId,
          course: {
            code: enrollment.course?.code ?? null,
            title: enrollment.course?.title ?? null,
            units: enrollment.course?.units ?? 0,
          },
          term: enrollment.term
            ? {
                id: enrollment.term.id,
                code: enrollment.term.code,
                label: enrollment.term.label,
                academicYear: enrollment.term.academicYear,
              }
            : null,
          section,
          studentCount: 1,
        });
      }
    }

    return {
      data: [...groups.values()],
      total: groups.size,
    };
  }

  async getClassRoster(userId: string, courseId: string, termId?: string, section?: string) {
    const enrollments: any[] = await this.prisma.enrollment.findMany({
      where: { instructorId: userId, status: 'enrolled', courseId, ...(termId ? { termId } : {}) },
      include: {
        course: { select: { code: true, title: true, units: true } },
        term: true,
        classSection: { select: { sectionCode: true, schedules: true } },
        student: {
          select: {
            id: true,
            studentNumber: true,
            user: { select: { firstName: true, lastName: true } },
          },
        },
        grade: { select: { finalGrade: true, status: true, isVisible: true } },
      },
    });

    let filtered = enrollments;
    if (section && section !== 'To be assigned') {
      const normalized = section.trim().toLowerCase();
      filtered = enrollments.filter(
        (enrollment) =>
          (enrollment.classSection?.sectionCode ?? enrollment.section ?? '').toLowerCase() ===
          normalized,
      );
    }

    if (filtered.length === 0) {
      throw new NotFoundException('No assigned class matches these filters.');
    }

    const first = filtered[0];
    return {
      class: {
        course: {
          code: first.course?.code ?? null,
          title: first.course?.title ?? null,
          units: first.course?.units ?? 0,
        },
        term: first.term
          ? { code: first.term.code, label: first.term.label, academicYear: first.term.academicYear }
          : null,
        section: first.classSection?.sectionCode ?? first.section ?? 'To be assigned',
        schedulePublished: Boolean(first.classSection?.schedules?.length),
      },
      students: filtered
        .sort((left, right) =>
          `${left.student?.user?.lastName ?? ''} ${left.student?.user?.firstName ?? ''}`.localeCompare(
            `${right.student?.user?.lastName ?? ''} ${right.student?.user?.firstName ?? ''}`,
          ),
        )
        .map((enrollment) => ({
          studentId: enrollment.student?.id ?? null,
          studentNumber: enrollment.student?.studentNumber ?? null,
          name: `${enrollment.student?.user?.firstName ?? ''} ${enrollment.student?.user?.lastName ?? ''}`.trim(),
          enrollmentId: enrollment.id,
          finalGrade: enrollment.grade?.finalGrade ?? null,
          gradeStatus: enrollment.grade?.status ?? null,
        })),
      total: filtered.length,
    };
  }
}