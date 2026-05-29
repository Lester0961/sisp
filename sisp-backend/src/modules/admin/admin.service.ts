import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcryptjs';

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

  async createUser(dto: CreateUserDto) {
    // Check if email already exists
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('Email is already registered');
    }

    // Find the role by name
    const role = await this.prisma.role.findUnique({
      where: { name: dto.roleName },
    });

    if (!role) {
      throw new NotFoundException(`Role '${dto.roleName}' not found`);
    }

    let temporaryPassword = '';
    let passwordHash = '';

    if (dto.roleName === 'student') {
      if (!dto.studentNumber) {
        throw new BadRequestException('Student ID number is required');
      }
      // Surname then last 4 digits of student number
      const surnameClean = dto.lastName.trim().replace(/\s+/g, '');
      const studentNumClean = dto.studentNumber.trim();
      const last4 = studentNumClean.substring(studentNumClean.length - 4);
      temporaryPassword = `${surnameClean}${last4}`;
    } else {
      if (!dto.temporaryPassword) {
        throw new BadRequestException('Temporary password is required for staff accounts');
      }
      temporaryPassword = dto.temporaryPassword;
    }

    passwordHash = await bcrypt.hash(temporaryPassword, 12);

    // Create the user
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        roleId: role.id,
        isActive: true,
        mustChangePassword: true,
      },
      include: {
        role: true,
      },
    });

    // Create student profile if student
    if (dto.roleName === 'student') {
      const programId = dto.programId || (await this.prisma.program.findFirst())?.id;
      if (!programId) {
        throw new BadRequestException('No program ID found in database to associate student with');
      }
      await this.prisma.studentProfile.create({
        data: {
          userId: user.id,
          studentNumber: dto.studentNumber!,
          programId,
          yearLevel: 1,
          accountBalance: {
            create: {
              balance: 0,
              status: 'good_standing',
            },
          },
        },
      });
    }

    return {
      message: 'Account created successfully',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role.name,
      },
      temporaryPassword,
    };
  }

  async deleteUser(userId: string) {
    // 1. Programmatic cascade delete
    // Find if the user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        studentProfile: {
          include: {
            accountBalance: true,
            enrollments: {
              include: {
                grade: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Programmatically delete all child dependencies of studentProfile first to avoid FK constraint errors!
    if (user.studentProfile) {
      const studentId = user.studentProfile.id;

      // Delete grades of student enrollments
      for (const enrollment of user.studentProfile.enrollments) {
        if (enrollment.grade) {
          await this.prisma.grade.deleteMany({
            where: { enrollmentId: enrollment.id },
          });
        }
      }

      // Delete enrollments
      await this.prisma.enrollment.deleteMany({
        where: { studentId },
      });

      // Delete document requests
      await this.prisma.documentRequest.deleteMany({
        where: { studentId },
      });

      // Delete account balance
      if (user.studentProfile.accountBalance) {
        await this.prisma.accountBalance.deleteMany({
          where: { studentId },
        });
      }

      // Delete student profile
      await this.prisma.studentProfile.delete({
        where: { id: studentId },
      });
    }

    // Delete chat logs and escalations
    const chatLogs = await this.prisma.chatLog.findMany({
      where: { userId },
    });
    const chatLogIds = chatLogs.map((c) => c.id);

    if (chatLogIds.length > 0) {
      await this.prisma.escalationQueue.deleteMany({
        where: { chatId: { in: chatLogIds } },
      });
    }

    await this.prisma.chatLog.deleteMany({
      where: { userId },
    });

    // Delete notifications
    await this.prisma.notification.deleteMany({
      where: { userId },
    });

    // Delete audit logs
    await this.prisma.auditLog.deleteMany({
      where: { userId },
    });

    // Finally, hard delete the user
    await this.prisma.user.delete({
      where: { id: userId },
    });

    return { message: 'User account hard-deleted successfully' };
  }
}