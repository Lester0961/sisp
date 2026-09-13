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

    const term = dto.termId
      ? await this.prisma.academicTerm.findUnique({ where: { id: dto.termId } })
      : null;
    if (dto.termId && !term) {
      throw new NotFoundException(`Academic term ${dto.termId} not found`);
    }
    const semester = term ? `T${term.termNumber}` : dto.semester;
    const year = term?.academicYear ?? dto.year;
    if (!semester || !year) {
      throw new ConflictException('Provide an academic term or the legacy semester and year fields.');
    }
    const isFullyPaid = dto.isFullyPaid ?? (dto.paymentStatus === 'paid' || dto.paymentStatus === 'waived');

    // Check for duplicate
    const existing = await this.prisma.studentSemester.findUnique({
      where: {
        studentId_semester_year: {
          studentId: dto.studentId,
          semester,
          year,
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
        termId: term?.id,
        semester,
        year,
        isFullyPaid,
        paymentStatus: dto.paymentStatus ?? (isFullyPaid ? 'paid' : 'unpaid'),
        amountDue: dto.amountDue,
        amountPaid: dto.amountPaid ?? 0,
        paymentReference: dto.paymentReference,
        paidAt: isFullyPaid ? new Date() : undefined,
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
      data: {
        isFullyPaid: dto.isFullyPaid,
        paymentStatus: dto.paymentStatus ?? (dto.isFullyPaid ? 'paid' : 'unpaid'),
        ...(dto.amountDue !== undefined ? { amountDue: dto.amountDue } : {}),
        ...(dto.amountPaid !== undefined ? { amountPaid: dto.amountPaid } : {}),
        ...(dto.paymentReference !== undefined ? { paymentReference: dto.paymentReference } : {}),
        paidAt: dto.isFullyPaid ? new Date() : null,
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
      message: `Student semester record marked as ${dto.isFullyPaid ? 'fully paid' : 'not fully paid'}`,
      data: updated,
    };
  }

  async findByStudent(studentId: string) {
    const records = await this.prisma.studentSemester.findMany({
      where: { studentId },
      orderBy: [{ year: 'desc' }, { semester: 'desc' }],
      include: {
        term: true,
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
        term: true,
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
