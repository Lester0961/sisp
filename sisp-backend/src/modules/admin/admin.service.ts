import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  GoneException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PermissionService } from '../../common/authz/permission.service';
import { SessionService } from '../auth/session.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from '../users/dto/update-user.dto';
import { CANONICAL_ROLE_NAMES } from '../../common/authz/rbac';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';

const STAFF_ROLE_NAMES = ['faculty', 'dean', 'registrar', 'treasury', 'sys_admin'];

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
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissionService: PermissionService,
    private readonly sessionService: SessionService,
  ) {}

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

    const role = await this.prisma.role.findUnique({
      where: { name: roleName },
    });

    if (!role) {
      throw new NotFoundException(`Role '${roleName}' not found`);
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { roleId: role.id },
      select: userSafeSelect,
    });

    // Role changes take effect immediately for new requests; drop the cache so
    // permission checks reflect the new mapping.
    this.permissionService.invalidate(target.role?.name ?? '');
    this.permissionService.invalidate(roleName);

    return updated;
  }

  async deactivateUser(userId: string, actorId: string) {
    const target = await this.getTargetUser(userId);

    if (userId === actorId) {
      throw new BadRequestException('You cannot deactivate your own account.');
    }

    await this.assertNotLastActiveSysAdmin(target);

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
      select: userSafeSelect,
    });

    // Deactivation must end every active session immediately.
    await this.sessionService.revokeAllForUser(userId, 'account_deactivated');

    return updated;
  }

  async activateUser(userId: string) {
    const target = await this.getTargetUser(userId);
    if (target.archivedAt) {
      throw new BadRequestException(
        'This account is archived. Clear the archive flag before reactivating.',
      );
    }
    return this.prisma.user.update({
      where: { id: userId },
      data: { isActive: true },
      select: userSafeSelect,
    });
  }

  async archiveUser(userId: string, actorId: string) {
    const target = await this.getTargetUser(userId);
    if (userId === actorId) {
      throw new BadRequestException('You cannot archive your own account.');
    }
    await this.assertNotLastActiveSysAdmin(target);

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: false, archivedAt: new Date() },
      select: userSafeSelect,
    });
    await this.sessionService.revokeAllForUser(userId, 'account_archived');
    return updated;
  }

  async revokeSessions(userId: string) {
    const target = await this.getTargetUser(userId);
    if (!target) throw new NotFoundException(`User with ID ${userId} not found`);
    const revoked = await this.sessionService.revokeAllForUser(userId, 'admin_revoke');
    return { message: 'Active sessions revoked', revoked };
  }

  async createUser(dto: CreateUserDto) {
    // Guard against invalid role states even if the DTO allow-list changes.
    this.assertCanonicalRole(dto.roleName);

    // Phase 1: this endpoint provisions institutional STAFF accounts only.
    // Student accounts are created through admission approval and activation.
    if (!STAFF_ROLE_NAMES.includes(dto.roleName)) {
      throw new BadRequestException(
        'Staff accounts only. Student accounts are created through the admission and activation flow.',
      );
    }

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

  async deleteUser(_userId: string, _actorId: string) {
    // Phase 1: ordinary hard deletion is disabled. Academic, financial, chat,
    // and audit history must never be destroyed to simplify account handling;
    // use deactivate/archive instead (Gone = the endpoint no longer exists).
    throw new GoneException(
      'Account deletion is disabled. Deactivate or archive the account instead.',
    );
  }
}
