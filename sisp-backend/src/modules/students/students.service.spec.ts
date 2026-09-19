import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { StudentsService } from './students.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('StudentsService — activation hardening (Phase 1, P1-09)', () => {
  let service: StudentsService;

  const mockPrisma: any = {
    studentProfile: { findUnique: jest.fn() },
    user: { update: jest.fn() },
  };

  const baseProfile = {
    id: 'profile-1',
    userId: 'user-1',
    studentNumber: '2026-1001',
    user: {
      id: 'user-1',
      email: 'jane@example.com',
      isActive: true,
      mustChangePassword: true,
    },
    admissionApplication: {
      dob: new Date('2005-05-05T00:00:00.000Z'),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new StudentsService(mockPrisma as PrismaService);
  });

  it('loads the profile for the authenticated user id only (P4-02)', async () => {
    mockPrisma.studentProfile.findUnique.mockResolvedValue({ id: 'profile-1' });
    await service.getMyProfile('user-1');
    expect(mockPrisma.studentProfile.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user-1' } }),
    );
  });

  it('refuses activation when no Registrar-verified admission record exists', async () => {
    mockPrisma.studentProfile.findUnique.mockResolvedValue({
      ...baseProfile,
      admissionApplication: null,
    });
    await expect(
      service.activateAccount('2026-1001', '2005-05-05', 'jane@example.com', 'NewPassword1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it('rejects a date of birth that does not match institutional records', async () => {
    mockPrisma.studentProfile.findUnique.mockResolvedValue(baseProfile);
    await expect(
      service.activateAccount('2026-1001', '2004-01-01', 'jane@example.com', 'NewPassword1'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it('does not allow re-activating an already active account', async () => {
    mockPrisma.studentProfile.findUnique.mockResolvedValue({
      ...baseProfile,
      user: { ...baseProfile.user, mustChangePassword: false, isActive: true },
    });
    await expect(
      service.activateAccount('2026-1001', '2005-05-05', 'jane@example.com', 'NewPassword1'),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('sets the student-chosen password and never returns plaintext credentials', async () => {
    mockPrisma.studentProfile.findUnique.mockResolvedValue(baseProfile);
    mockPrisma.user.update.mockResolvedValue({ id: 'user-1' });

    const result: any = await service.activateAccount(
      '2026-1001',
      '2005-05-05',
      'jane@example.com',
      'NewPassword1',
    );

    const updateData = mockPrisma.user.update.mock.calls[0][0].data;
    expect(updateData.mustChangePassword).toBe(false);
    expect(bcrypt.compareSync('NewPassword1', updateData.passwordHash)).toBe(true);
    expect(updateData.passwordHash).not.toBe('NewPassword1');
    expect(result.temporaryPassword).toBeUndefined();
    expect(JSON.stringify(result)).not.toContain('passwordHash');
    expect(JSON.stringify(result)).not.toContain('RmcActivate2026');
  });
});
