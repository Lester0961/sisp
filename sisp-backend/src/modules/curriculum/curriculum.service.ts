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
        curriculumCourses: {
          include: {
            course: true,
          },
        },
      },
    });

    if (!curriculum) {
      throw new NotFoundException("No curriculum found for student's program");
    }

    return curriculum.curriculumCourses.map((cc) => ({
      id: cc.course.id,
      code: cc.course.code,
      title: cc.course.title,
      units: cc.course.units,
      yearLevel: cc.yearLevel,
      semester: cc.semester,
    }));
  }
}
