import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAcademicTermDto, UpdateAcademicTermDto } from './dto/academic-term.dto';

@Injectable()
export class AcademicTermService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const terms = await this.prisma.academicTerm.findMany({
      orderBy: [{ academicYear: 'desc' }, { termNumber: 'asc' }],
    });
    return { data: terms, total: terms.length };
  }

  async findCurrent() {
    return this.prisma.academicTerm.findFirst({
      where: { isCurrent: true },
      orderBy: [{ academicYear: 'desc' }, { termNumber: 'asc' }],
    });
  }

  async create(dto: CreateAcademicTermDto) {
    if (dto.termNumber < 1 || dto.termNumber > 3) {
      throw new BadRequestException('A trisemestral academic year has term numbers 1, 2, and 3 only.');
    }

    if (dto.isCurrent) {
      await this.prisma.academicTerm.updateMany({ where: { isCurrent: true }, data: { isCurrent: false } });
    }

    const term = await this.prisma.academicTerm.create({
      data: {
        academicYear: dto.academicYear,
        termNumber: dto.termNumber,
        code: dto.code,
        label: dto.label,
        startsOn: dto.startsOn ? new Date(dto.startsOn) : undefined,
        endsOn: dto.endsOn ? new Date(dto.endsOn) : undefined,
        status: dto.status ?? 'planned',
        isCurrent: dto.isCurrent ?? false,
      },
    });

    return { message: 'Academic term created successfully', data: term };
  }

  async update(id: string, dto: UpdateAcademicTermDto) {
    const existing = await this.prisma.academicTerm.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Academic term ${id} not found`);

    if (dto.isCurrent) {
      await this.prisma.academicTerm.updateMany({ where: { isCurrent: true }, data: { isCurrent: false } });
    }

    const term = await this.prisma.academicTerm.update({
      where: { id },
      data: {
        ...(dto.label !== undefined ? { label: dto.label } : {}),
        ...(dto.startsOn !== undefined ? { startsOn: dto.startsOn ? new Date(dto.startsOn) : null } : {}),
        ...(dto.endsOn !== undefined ? { endsOn: dto.endsOn ? new Date(dto.endsOn) : null } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.isCurrent !== undefined ? { isCurrent: dto.isCurrent } : {}),
      },
    });

    return { message: 'Academic term updated successfully', data: term };
  }
}
