import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { requireStudentProfile } from '../../common/utils/require-student-profile';
import { getCompletedCourseIdSet } from '../../common/utils/course-completion';

@Injectable()
export class CurriculumService {
  constructor(private readonly prisma: PrismaService) {}

  async getMyCurriculum(userId: string) {
    const profile = await requireStudentProfile(this.prisma, userId);

    const curriculum = await this.prisma.curriculum.findFirst({
      where: { programId: profile.programId },
      orderBy: { effectiveYear: 'desc' },
      include: {
        program: { select: { code: true, name: true } },
        curriculumCourses: {
          include: {
            course: {
              include: {
                prerequisites: { select: { requiresCode: true, isSelfReference: true, isUnresolved: true } },
              },
            },
          },
          orderBy: [{ yearLevel: 'asc' }, { termNumber: 'asc' }, { course: { code: 'asc' } }],
        },
      },
    });

    if (!curriculum) {
      throw new NotFoundException("No curriculum found for student's program");
    }

    return {
      program: curriculum.program,
      effectiveYear: curriculum.effectiveYear,
      schoolYear: (curriculum as { schoolYear?: string }).schoolYear ?? null,
      cmo: (curriculum as { cmo?: string }).cmo ?? null,
      sourceFile: (curriculum as { sourceFile?: string }).sourceFile ?? null,
      courses: curriculum.curriculumCourses.map((cc) => ({
        id: cc.course.id,
        code: cc.course.code,
        title: cc.course.title,
        units: cc.course.units,
        lecUnits: (cc.course as { lecUnits?: number }).lecUnits ?? 0,
        labUnits: (cc.course as { labUnits?: number }).labUnits ?? 0,
        subjectArea: (cc.course as { subjectArea?: string }).subjectArea ?? null,
        catNo: (cc.course as { catNo?: string }).catNo ?? null,
        prereqText: (cc.course as { prereqText?: string }).prereqText ?? null,
        prerequisites: cc.course.prerequisites ?? [],
        yearLevel: cc.yearLevel,
        semester: cc.semester,
        termNumber: cc.termNumber ?? cc.semester,
        termLabel: (cc as { termLabel?: string }).termLabel ?? null,
      })),
    };
  }

  /**
   * Structured, server-computed curriculum progress (P4-06).
   *
   * Completion uses the enrollment status recorded in SISP (`completed` /
   * `enrolled`); no GPA threshold or academic-standing rule is invented
   * (DEC-009). The frontend displays this result without computing anything.
   */
  async getMyProgress(userId: string) {
    const profile = await requireStudentProfile(this.prisma, userId);

    const include = {
      program: { select: { code: true, name: true } },
      curriculumCourses: {
        include: {
          course: {
            include: {
              prerequisites: {
                select: {
                  requiresCode: true,
                  requiresId: true,
                  isSelfReference: true,
                  isUnresolved: true,
                },
              },
            },
          },
        },
        orderBy: [
          { yearLevel: 'asc' as const },
          { termNumber: 'asc' as const },
          { course: { code: 'asc' as const } },
        ],
      },
    };

    // Prefer the curriculum assigned to the student; fall back to the newest
    // effective curriculum for the program (P5-04 keeps versions explicit).
    const curriculum = profile.curriculumId
      ? await this.prisma.curriculum.findUnique({
          where: { id: profile.curriculumId },
          include,
        })
      : await this.prisma.curriculum.findFirst({
          where: { programId: profile.programId },
          orderBy: { effectiveYear: 'desc' },
          include,
        });

    if (!curriculum) {
      return {
        curriculum: null,
        totals: {
          requiredSubjects: 0,
          requiredUnits: 0,
          completedSubjects: 0,
          completedUnits: 0,
          ongoingSubjects: 0,
          ongoingUnits: 0,
          remainingSubjects: 0,
          remainingUnits: 0,
          completionPercentage: 0,
        },
        prerequisitesMet: true,
        unmetPrerequisites: [],
        courses: [],
      };
    }

    const [completedIds, ongoing] = await Promise.all([
      getCompletedCourseIdSet(this.prisma, profile.id),
      this.prisma.enrollment.findMany({
        where: { studentId: profile.id, status: 'enrolled' },
        select: { courseId: true },
      }),
    ]);
    const ongoingIds = new Set(ongoing.map((entry) => entry.courseId));

    const courses = curriculum.curriculumCourses.map((cc) => {
      const status = completedIds.has(cc.courseId)
        ? 'completed'
        : ongoingIds.has(cc.courseId)
          ? 'ongoing'
          : 'remaining';
      const prerequisites = (cc.course.prerequisites ?? [])
        .filter((prereq) => !prereq.isSelfReference && !prereq.isUnresolved)
        .map((prereq) => ({
          requiresCode: prereq.requiresCode,
          satisfied: prereq.requiresId ? completedIds.has(prereq.requiresId) : false,
        }));
      return {
        id: cc.course.id,
        code: cc.course.code,
        title: cc.course.title,
        units: cc.course.units,
        lecUnits: (cc.course as { lecUnits?: number }).lecUnits ?? 0,
        labUnits: (cc.course as { labUnits?: number }).labUnits ?? 0,
        prereqText: (cc.course as { prereqText?: string }).prereqText ?? null,
        yearLevel: cc.yearLevel,
        semester: cc.semester,
        termNumber: cc.termNumber ?? cc.semester,
        termLabel: (cc as { termLabel?: string }).termLabel ?? null,
        status,
        prerequisites,
      };
    });

    const sumUnits = (list: typeof courses) =>
      list.reduce((total, course) => total + course.units, 0);
    const completedCourses = courses.filter((course) => course.status === 'completed');
    const ongoingCourses = courses.filter((course) => course.status === 'ongoing');
    const remainingCourses = courses.filter((course) => course.status === 'remaining');

    const totalUnits = sumUnits(courses);
    const completedUnits = sumUnits(completedCourses);
    const completionPercentage =
      totalUnits > 0 ? Math.round((completedUnits / totalUnits) * 1000) / 10 : 0;

    const unmetPrerequisites = courses.flatMap((course) =>
      course.prerequisites
        .filter((prereq) => !prereq.satisfied)
        .map((prereq) => ({
          courseCode: course.code,
          courseTitle: course.title,
          requiresCode: prereq.requiresCode,
        })),
    );

    return {
      curriculum: {
        program: curriculum.program,
        effectiveYear: curriculum.effectiveYear,
        schoolYear: (curriculum as { schoolYear?: string }).schoolYear ?? null,
      },
      totals: {
        requiredSubjects: courses.length,
        requiredUnits: totalUnits,
        completedSubjects: completedCourses.length,
        completedUnits,
        ongoingSubjects: ongoingCourses.length,
        ongoingUnits: sumUnits(ongoingCourses),
        remainingSubjects: remainingCourses.length,
        remainingUnits: sumUnits(remainingCourses),
        completionPercentage,
      },
      prerequisitesMet: unmetPrerequisites.length === 0,
      unmetPrerequisites,
      courses,
    };
  }

  /** Registrar/admin view: list curriculum by program code + effective year. */
  async getByProgram(programCode: string, effectiveYear?: number) {
    const program = await this.prisma.program.findUnique({ where: { code: programCode } });
    if (!program) throw new NotFoundException(`Program ${programCode} not found`);
    const curriculum = await this.prisma.curriculum.findFirst({
      where: { programId: program.id, ...(effectiveYear ? { effectiveYear } : {}) },
      orderBy: { effectiveYear: 'desc' },
      include: {
        curriculumCourses: {
          include: { course: { include: { prerequisites: true } } },
          orderBy: [{ yearLevel: 'asc' }, { termNumber: 'asc' }, { course: { code: 'asc' } }],
        },
      },
    });
    if (!curriculum) throw new NotFoundException(`No curriculum for ${programCode}`);
    return curriculum;
  }

  async listPrograms() {
    return this.prisma.program.findMany({
      orderBy: { code: 'asc' },
      include: { _count: { select: { curricula: true, studentProfiles: true } } },
    });
  }
}
