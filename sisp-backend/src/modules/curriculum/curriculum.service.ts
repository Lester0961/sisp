import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { requireStudentProfile } from '../../common/utils/require-student-profile';

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
