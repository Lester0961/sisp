import { BadRequestException } from '@nestjs/common';
import { AdminService } from './admin.service';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

describe('AdminService — privilege safeguards (Phase 2, P2-05)', () => {
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
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AdminService(mockPrisma as PrismaService);
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

  it('allows demoting a sysadmin when another active sysadmin exists', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(targetSysAdmin);
    mockPrisma.user.count.mockResolvedValue(2);
    mockPrisma.role.findUnique.mockResolvedValue({ id: 'r-dean', name: 'dean' });
    mockPrisma.user.update.mockResolvedValue({ id: 'sys-1' });

    await service.updateUserRole('sys-1', 'dean', 'sys-2');
    expect(mockPrisma.user.update).toHaveBeenCalled();
  });

  it('rejects unrecognized roles', async () => {
    await expect(
      service.updateUserRole('reg-1', 'admin_staff', 'sys-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
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

  it('protects system administrator accounts from hard deletion', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(targetSysAdmin);
    await expect(service.deleteUser('sys-1', 'sys-2')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('prevents deleting your own account', async () => {
    await expect(service.deleteUser('reg-1', 'reg-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects invalid roles on account creation', async () => {
    await expect(
      service.createUser({ roleName: 'admin_staff' } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates accounts with a random one-time password and forces a change at first login', async () => {
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

  it('preserves audit logs when a user is deleted (P3-09)', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      ...targetRegistrar,
      studentProfile: null,
    });

    const auditDeleteMany = jest.fn();
    const tx = {
      grade: { deleteMany: jest.fn() },
      enrollment: { deleteMany: jest.fn() },
      documentRequest: { deleteMany: jest.fn() },
      accountBalance: { deleteMany: jest.fn() },
      studentProfile: { delete: jest.fn() },
      chatLog: { findMany: jest.fn().mockResolvedValue([]), deleteMany: jest.fn() },
      escalationQueue: { deleteMany: jest.fn() },
      notification: { deleteMany: jest.fn() },
      auditLog: { deleteMany: auditDeleteMany },
      user: { delete: jest.fn() },
    };
    mockPrisma.$transaction = jest.fn(async (callback: any) => callback(tx));

    await service.deleteUser('reg-1', 'sys-1');

    expect(auditDeleteMany).not.toHaveBeenCalled();
    expect(tx.user.delete).toHaveBeenCalledWith({ where: { id: 'reg-1' } });
  });
});
