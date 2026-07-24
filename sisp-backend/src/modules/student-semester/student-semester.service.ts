import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateStudentSemesterDto, UpdateStudentSemesterDto } from './dto/create-student-semester.dto';

@Injectable()
export class StudentSemesterService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateStudentSemesterDto) {
    // Verify student exists
    const student = await this.prisma.studentProfile.findUnique({
      where: { id: dto.studentId },
    });

    if (!student) {
      throw new NotFoundException(`Student profile with ID ${dto.studentId} not found`);
    }

    // Check for duplicate
    const existing = await this.prisma.studentSemester.findUnique({
      where: {
        studentId_semester_year: {
          studentId: dto.studentId,
          semester: dto.semester,
          year: dto.year,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        `Student semester record already exists for ${dto.semester} Semester ${dto.year}`,
      );
    }

    const record = await this.prisma.studentSemester.create({
      data: {
        studentId: dto.studentId,
        semester: dto.semester,
        year: dto.year,
        isFullyPaid: dto.isFullyPaid ?? false,
      },
      include: {
        student: {
          include: {
            user: { select: { email: true, firstName: true, lastName: true } },
          },
        },
      },
    });

    return {
      message: 'Student semester record created successfully',
      data: record,
    };
  }

  async update(id: string, dto: UpdateStudentSemesterDto) {
    const existing = await this.prisma.studentSemester.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Student semester record with ID ${id} not found`);
    }

    const updated = await this.prisma.studentSemester.update({
      where: { id },
      data: { isFullyPaid: dto.isFullyPaid },
      include: {
        student: {
          include: {
            user: { select: { email: true, firstName: true, lastName: true } },
          },
        },
      },
    });

    return {
      message: `Student semester record marked as ${dto.isFullyPaid ? 'fully paid' : 'not fully paid'}`,
      data: updated,
    };
  }

  async findByStudent(studentId: string) {
    const records = await this.prisma.studentSemester.findMany({
      where: { studentId },
      orderBy: [{ year: 'desc' }, { semester: 'desc' }],
      include: {
        student: {
          include: {
            user: { select: { email: true, firstName: true, lastName: true } },
          },
        },
      },
    });

    return {
      data: records,
      total: records.length,
    };
  }

  async findCurrentByStudent(studentId: string) {
    const records = await this.prisma.studentSemester.findMany({
      where: { studentId },
      orderBy: [{ year: 'desc' }, { semester: 'desc' }],
      take: 1,
    });

    return records[0] || null;
  }

  async findAll() {
    const records = await this.prisma.studentSemester.findMany({
      orderBy: [{ year: 'desc' }, { semester: 'desc' }],
      include: {
        student: {
          include: {
            user: { select: { email: true, firstName: true, lastName: true } },
          },
        },
      },
    });

    return {
      data: records,
      total: records.length,
    };
  }
}
