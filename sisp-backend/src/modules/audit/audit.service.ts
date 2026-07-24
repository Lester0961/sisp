import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async getAllLogs(page = 1, limit = 50, userId?: string, resource?: string) {
    const skip = (page - 1) * limit;

    const where: {
      userId?: string;
      resource?: string;
    } = {};

    if (userId) where.userId = userId;
    if (resource) where.resource = resource;

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
