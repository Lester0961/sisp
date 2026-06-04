import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateEventStatusDto } from './dto/update-event-status.dto';

const STATUS_TRANSITIONS: Record<string, string[]> = {
  Upcoming: ['Ongoing', 'Cancelled'],
  Ongoing: ['Completed', 'Cancelled'],
  Completed: [],
  Cancelled: [],
};

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.event.findMany({
        skip,
        take: limit,
        orderBy: { startDate: 'desc' },
        include: {
          creator: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      }),
      this.prisma.event.count(),
    ]);

    return { data, total, page, limit };
  }

  async findOne(id: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: {
        creator: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    if (!event) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }

    return { data: event };
  }

  async getCategories() {
    const result = await this.prisma.event.findMany({
      select: { category: true },
      distinct: ['category'],
      where: { category: { not: null } },
    });

    const categories = result
      .map((r) => r.category)
      .filter((c): c is string => c !== null);

    return { data: categories };
  }

  async updateStatus(id: string, dto: UpdateEventStatusDto) {
    const event = await this.prisma.event.findUnique({
      where: { id },
    });

    if (!event) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }

    const allowedNext = STATUS_TRANSITIONS[event.status] ?? [];
    if (!allowedNext.includes(dto.status)) {
      throw new BadRequestException(
        `Cannot transition from '${event.status}' to '${dto.status}'. ` +
          `Allowed next statuses: ${allowedNext.length > 0 ? allowedNext.join(', ') : 'none (terminal status)'}`,
      );
    }

    const updated = await this.prisma.event.update({
      where: { id },
      data: { status: dto.status },
      include: {
        creator: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    return {
      message: `Event status updated to '${dto.status}'`,
      data: updated,
    };
  }
}
