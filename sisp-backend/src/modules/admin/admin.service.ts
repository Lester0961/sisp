import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboardStats() {
    const [totalUsers, totalStudents, totalFaculty, totalRequests] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.user.count({
          where: { role: { name: 'student' } },
        }),
        this.prisma.user.count({
          where: { role: { name: 'faculty' } },
        }),
        this.prisma.documentRequest.count(),
      ]);

    return {
      totalUsers,
      totalStudents,
      totalFaculty,
      totalRequests,
    };
  }

  async approveException(
    exceptionId: string,
    decision: 'approved' | 'rejected',
    adminId: string,
  ) {
    // Find the document request (exceptions are tracked as document requests)
    const request = await this.prisma.documentRequest.findUnique({
      where: { id: exceptionId },
    });

    if (!request) {
      return { message: 'Exception request not found' };
    }

    const updated = await this.prisma.documentRequest.update({
      where: { id: exceptionId },
      data: {
        status: decision,
      },
    });

    return {
      message: `Exception ${decision} successfully`,
      data: updated,
    };
  }

  async listUsers(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take: limit,
        include: {
          role: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.user.count(),
    ]);

    return { data, total };
  }

  async updateUserRole(userId: string, roleId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { roleId },
      include: { role: true },
    });
  }

  async deactivateUser(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
      include: { role: true },
    });
  }
}