import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async getAllLogs(
    page = 1,
    limit = 50,
    userId?: string,
    resource?: string,
    action?: string,
    startDate?: string,
    endDate?: string,
  ) {
    if (!Number.isInteger(page) || page < 1) {
      throw new BadRequestException('page must be a positive integer');
    }
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw new BadRequestException('limit must be an integer between 1 and 100');
    }

    const where: Record<string, unknown> = {};

    if (userId) where.userId = userId;
    if (resource) where.resource = resource;
    if (action) where.action = { contains: action, mode: 'insensitive' };
    if (startDate || endDate) {
      const createdAt: { gte?: Date; lte?: Date } = {};
      if (startDate) {
        createdAt.gte = new Date(startDate);
        if (Number.isNaN(createdAt.gte.getTime())) {
          throw new BadRequestException('startDate must be a valid date');
        }
      }
      if (endDate) {
        createdAt.lte = new Date(endDate);
        if (Number.isNaN(createdAt.lte.getTime())) {
          throw new BadRequestException('endDate must be a valid date');
        }
      }
      if (createdAt.gte && createdAt.lte && createdAt.gte > createdAt.lte) {
        throw new BadRequestException('startDate must not be after endDate');
      }
      where.createdAt = createdAt;
    }

    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              email: true,
              role: { select: { name: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data: logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getLogById(id: string) {
    const log = await this.prisma.auditLog.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            email: true,
            role: { select: { name: true } },
          },
        },
      },
    });

    if (!log) {
      throw new NotFoundException(`Audit log with ID ${id} not found`);
    }

    return log;
  }

  async getLogsByUser(userId: string) {
    const logs = await this.prisma.auditLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return {
      data: logs,
      total: logs.length,
    };
  }

  async getLogsByResource(resource: string) {
    const logs = await this.prisma.auditLog.findMany({
      where: { resource },
      include: {
        user: {
          select: {
            email: true,
            role: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return {
      data: logs,
      total: logs.length,
    };
  }

  async getAuditStats() {
    const [totalLogs, uniqueUsers, recentLogs] = await Promise.all([
      this.prisma.auditLog.count(),
      this.prisma.auditLog.groupBy({
        by: ['userId'],
        _count: true,
      }),
      this.prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          user: {
            select: {
              email: true,
              role: { select: { name: true } },
            },
          },
        },
      }),
    ]);

    return {
      totalLogs,
      uniqueUsers: uniqueUsers.length,
      recentActivity: recentLogs,
    };
  }
}
