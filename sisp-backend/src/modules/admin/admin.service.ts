import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from '../users/dto/update-user.dto';
import { CANONICAL_ROLE_NAMES } from '../../common/authz/rbac';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';

const userSafeSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  roleId: true,
  isActive: true,
  mustChangePassword: true,
  createdAt: true,
  updatedAt: true,
  role: {
    select: {
      id: true,
      name: true,
    },
  },
};

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboardStats() {
    const [totalUsers, totalStudents, totalFaculty, totalRequests] = await Promise.all([
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



  async listUsers(page: number = 1, limit: number = 10, roleName?: string) {
    const skip = (page - 1) * limit;
    const where = roleName ? { role: { name: roleName } } : undefined;
    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take: limit,
        where,
        select: userSafeSelect,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { data, total };
  }

  // ── Privilege-escalation and protected-account safeguards (P2-05) ─────

  private assertCanonicalRole(roleName: string): void {
    if (!(CANONICAL_ROLE_NAMES as readonly string[]).includes(roleName)) {
      throw new BadRequestException(`Role '${roleName}' is not a recognized system role`);
    }
  }

  private async getTargetUser(userId: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
    return user;
  }

  private async assertNotLastActiveSysAdmin(target: any, nextRoleName?: string): Promise<void> {
    if (target?.role?.name !== 'sys_admin') return;
    if (nextRoleName === 'sys_admin') return;
    if (target.isActive === false) return;

    const activeSysAdmins = await this.prisma.user.count({
      where: { isActive: true, role: { name: 'sys_admin' } },
    });
    if (activeSysAdmins <= 1) {
      throw new BadRequestException(
        'The last active system administrator cannot be demoted, deactivated, or deleted.',
      );
    }
  }

  async updateUser(userId: string, dto: UpdateUserDto, actorId: string) {
    const target = await this.getTargetUser(userId);
    const isSelf = userId === actorId;
    const roleChanging =
      dto.roleName !== undefined && dto.roleName !== target.role?.name;

    if (roleChanging) {
      this.assertCanonicalRole(dto.roleName!);
      if (isSelf) {
        throw new BadRequestException('You cannot change your own role.');
      }
      await this.assertNotLastActiveSysAdmin(target, dto.roleName);
    }

    if (dto.isActive === false && target.isActive) {
      if (isSelf) {
        throw new BadRequestException('You cannot deactivate your own account.');
      }
      await this.assertNotLastActiveSysAdmin(target);
    }

    const updateData: { roleId?: string; isActive?: boolean } = {};
    if (dto.roleName !== undefined) {
      const role = await this.prisma.role.findUnique({ where: { name: dto.roleName } });
      if (!role) {
        throw new NotFoundException(`Role '${dto.roleName}' not found`);
      }
      updateData.roleId = role.id;
    }
    if (dto.isActive !== undefined) {
      updateData.isActive = dto.isActive;
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: userSafeSelect,
    });

    return { message: 'User updated successfully', data: updated };
  }

  async updateUserRole(userId: string, roleName: string, actorId: string) {
    this.assertCanonicalRole(roleName);

    const target = await this.getTargetUser(userId);

    if (userId === actorId) {
      throw new BadRequestException('You cannot change your own role.');
    }

    if (target.role?.name === roleName) {
      return this.prisma.user.findUnique({ where: { id: userId }, select: userSafeSelect });
    }

    await this.assertNotLastActiveSysAdmin(target, roleName);

    // Look up the role by name to get the actual UUID
    const role = await this.prisma.role.findUnique({
      where: { name: roleName },
    });

    if (!role) {
      throw new NotFoundException(`Role '${roleName}' not found`);
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: { roleId: role.id },
      select: userSafeSelect,
    });
  }

  async deactivateUser(userId: string, actorId: string) {
    const target = await this.getTargetUser(userId);

    if (userId === actorId) {
      throw new BadRequestException('You cannot deactivate your own account.');
    }

    await this.assertNotLastActiveSysAdmin(target);

    return this.prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
      select: userSafeSelect,
    });
  }

  async createUser(dto: CreateUserDto) {
    // Guard against invalid role states even if the DTO allow-list changes.
    this.assertCanonicalRole(dto.roleName);

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

    if (dto.roleName === 'student') {
      if (!dto.studentNumber) {
        throw new BadRequestException('Student ID number is required');
      }
      if (!dto.programId) {
        throw new BadRequestException('Select an existing academic program for the student');
      }
      const program = await this.prisma.program.findUnique({ where: { id: dto.programId } });
      if (!program) {
        throw new BadRequestException('The selected academic program was not found');
      }
    }

    if (dto.roleName === 'student' && !dto.studentNumber) {
      throw new BadRequestException('Student ID number is required');
    }

    // Generate a one-time secret with guaranteed mixed character classes.
    // It is returned only by this permission-protected create operation;
    // the account must replace it before accessing other protected routes.
    const temporaryPassword = `Aa1-${randomBytes(24).toString('hex')}`;
    const passwordHash = await bcrypt.hash(temporaryPassword, 12);

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
      await this.prisma.studentProfile.create({
        data: {
          userId: user.id,
          studentNumber: dto.studentNumber!,
          programId: dto.programId!,
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

  async deleteUser(userId: string, actorId: string) {
    if (userId === actorId) {
      throw new BadRequestException('You cannot delete your own account.');
    }

    const target = await this.getTargetUser(userId);
    if (target.role?.name === 'sys_admin') {
      throw new BadRequestException(
        'System administrator accounts cannot be deleted. Reassign the role first.',
      );
    }

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

    await this.prisma.$transaction(async (tx) => {
      // Programmatically delete all child dependencies of studentProfile first to avoid FK constraint errors!
      if (user.studentProfile) {
        const studentId = user.studentProfile.id;

        // Delete grades of student enrollments
        for (const enrollment of user.studentProfile.enrollments) {
          if (enrollment.grade) {
            await tx.grade.deleteMany({
              where: { enrollmentId: enrollment.id },
            });
          }
        }

        // Delete enrollments
        await tx.enrollment.deleteMany({
          where: { studentId },
        });

        // Delete document requests
        await tx.documentRequest.deleteMany({
          where: { studentId },
        });

        // Delete account balance
        if (user.studentProfile.accountBalance) {
          await tx.accountBalance.deleteMany({
            where: { studentId },
          });
        }

        // Delete student profile
        await tx.studentProfile.delete({
          where: { id: studentId },
        });
      }

      // Delete chat logs and escalations
      const chatLogs = await tx.chatLog.findMany({
        where: { userId },
      });
      const chatLogIds = chatLogs.map((c) => c.id);

      if (chatLogIds.length > 0) {
        await tx.escalationQueue.deleteMany({
          where: { chatId: { in: chatLogIds } },
        });
      }

      await tx.chatLog.deleteMany({
        where: { userId },
      });

      // Delete notifications
      await tx.notification.deleteMany({
        where: { userId },
      });

      // Audit logs are intentionally preserved (P3-09). The audit FK uses
      // ON DELETE SET NULL and rows carry actor email/role snapshots, so the
      // system-activity trail survives account removal.

      // Finally, hard delete the user
      await tx.user.delete({
        where: { id: userId },
      });
    });

    return { message: 'User account hard-deleted successfully' };
  }
}
