import { BadRequestException, GoneException } from '@nestjs/common';
import { AdminService } from './admin.service';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

describe('AdminService — privilege safeguards and Phase 1 account lifecycle', () => {
  let service: AdminService;

  const targetSysAdmin = {
    id: 'sys-1',
    email: 'sysadmin@rmc.edu.ph',
    isActive: true,
    role: { id: 'r-sys', name: 'sys_admin' },
  };

  const targetRegistrar = {
    id: 'reg-1',
    email: 'registrar@rmc.edu.ph',
    isActive: true,
    role: { id: 'r-reg', name: 'registrar' },
  };

  const mockPrisma: any = {
    user: {
      findUnique: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    role: { findUnique: jest.fn() },
    auditLog: { create: jest.fn().mockResolvedValue({}) },
  };
  const mockPermissions = { invalidate: jest.fn() };
  const mockSessions = { revokeAllForUser: jest.fn().mockResolvedValue(1) };

  beforeEach(() => {
    jest.clearAllMocks();
    mockSessions.revokeAllForUser.mockResolvedValue(1);
    service = new AdminService(
      mockPrisma as PrismaService,
      mockPermissions as any,
      mockSessions as any,
    );
  });

  it('prevents changing your own role', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(targetSysAdmin);
    await expect(
      service.updateUserRole('sys-1', 'dean', 'sys-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it('prevents demoting the last active system administrator', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(targetSysAdmin);
    mockPrisma.user.count.mockResolvedValue(1);
    await expect(
      service.updateUserRole('sys-1', 'dean', 'sys-2'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it('allows demoting a sysadmin when another active sysadmin exists and invalidates caches', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(targetSysAdmin);
    mockPrisma.user.count.mockResolvedValue(2);
    mockPrisma.role.findUnique.mockResolvedValue({ id: 'r-dean', name: 'dean' });
    mockPrisma.user.update.mockResolvedValue({ id: 'sys-1' });

    await service.updateUserRole('sys-1', 'dean', 'sys-2');
    expect(mockPrisma.user.update).toHaveBeenCalled();
    expect(mockPermissions.invalidate).toHaveBeenCalledWith('sys_admin');
    expect(mockPermissions.invalidate).toHaveBeenCalledWith('dean');
  });

  it('rejects unrecognized and removed roles', async () => {
    for (const roleName of ['admin_staff', 'wizard']) {
      await expect(
        service.updateUserRole('reg-1', roleName, 'sys-1'),
      ).rejects.toBeInstanceOf(BadRequestException);
    }
  });

  it('prevents deactivating the last active system administrator', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(targetSysAdmin);
    mockPrisma.user.count.mockResolvedValue(1);
    await expect(service.deactivateUser('sys-1', 'sys-2')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('prevents deactivating your own account', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(targetRegistrar);
    await expect(service.deactivateUser('reg-1', 'reg-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('revokes every active session when an account is deactivated', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(targetRegistrar);
    mockPrisma.user.update.mockResolvedValue({ id: 'reg-1' });

    await service.deactivateUser('reg-1', 'sys-1');

    expect(mockSessions.revokeAllForUser).toHaveBeenCalledWith('reg-1', 'account_deactivated');
  });

  it('archives instead of deleting and revokes sessions', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(targetRegistrar);
    mockPrisma.user.update.mockResolvedValue({ id: 'reg-1' });

    await service.archiveUser('reg-1', 'sys-1');

    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ isActive: false, archivedAt: expect.any(Date) }),
      }),
    );
    expect(mockSessions.revokeAllForUser).toHaveBeenCalledWith('reg-1', 'account_archived');
  });

  it('disables ordinary hard deletion', async () => {
    await expect(service.deleteUser('reg-1', 'sys-2')).rejects.toBeInstanceOf(GoneException);
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it('rejects invalid roles on account creation', async () => {
    await expect(
      service.createUser({ roleName: 'admin_staff' } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects creating or assigning the retired live_agent role', async () => {
    const legacyRolePayload = {
      email: 'agent@example.test',
      firstName: 'Support',
      lastName: 'Agent',
      roleName: 'live_agent',
    };

    await expect(service.createUser(legacyRolePayload as any)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(service.updateUserRole('reg-1', 'live_agent', 'sys-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(mockPrisma.user.create).not.toHaveBeenCalled();
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it('prevents reactivating a legacy live_agent account', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      ...targetRegistrar,
      role: { id: 'r-live-agent', name: 'live_agent' },
      isActive: false,
    });

    await expect(service.activateUser('agent-1', 'sys-1')).rejects.toThrow(/retired/i);
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it('rejects creating student accounts through staff provisioning', async () => {
    await expect(
      service.createUser({ roleName: 'student' } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates staff accounts with a random one-time password and forces a change at first login', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.role.findUnique.mockResolvedValue({ id: 'r-fac', name: 'faculty' });
    mockPrisma.user.create.mockImplementation(async ({ data }: any) => ({
      ...data,
      id: 'new-faculty',
      role: { name: 'faculty' },
    }));

    const result = await service.createUser({
      email: 'faculty@example.test',
      firstName: 'Test',
      lastName: 'Faculty',
      roleName: 'faculty',
    } as any);

    const createData = mockPrisma.user.create.mock.calls[0][0].data;
    expect(createData.mustChangePassword).toBe(true);
    expect(result.temporaryPassword).toMatch(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,64}$/);
    expect(result.temporaryPassword).not.toContain('Faculty');
    await expect(bcrypt.compare(result.temporaryPassword, createData.passwordHash)).resolves.toBe(true);
  });

});
