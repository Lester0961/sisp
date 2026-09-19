import { NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AdmissionService } from './admission.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

describe('AdmissionService — public route hardening (Phase 1, P1-09)', () => {
  let service: AdmissionService;

  const application = {
    id: 'app-1',
    applicationNo: 'APP-2026-0001',
    status: 'submitted',
    applicantType: 'freshman',
    firstName: 'Jane',
    middleName: null,
    lastName: 'Doe',
    email: 'jane.doe@example.com',
    programId: 'program-1',
    dob: new Date('2005-05-05T00:00:00.000Z'),
    createdAt: new Date(),
    updatedAt: new Date(),
    program: { id: 'program-1', code: 'BSCS', name: 'BS Computer Science' },
    requirements: [],
    createdStudent: { id: 'profile-1', studentNumber: '2026-1001' },
  };

  const mockPrisma: any = {
    admissionApplication: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    admissionRequirementDefinition: {
      findUnique: jest.fn(),
    },
    admissionRequirementSubmission: {
      upsert: jest.fn(),
    },
    role: { findUnique: jest.fn() },
    curriculum: { findFirst: jest.fn() },
    studentProfile: { count: jest.fn(), findUnique: jest.fn(), create: jest.fn() },
    user: { findUnique: jest.fn(), create: jest.fn() },
    accountBalance: { create: jest.fn() },
    $transaction: jest.fn(),
  };
  const mockNotifications = { sendToUser: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AdmissionService(mockPrisma as PrismaService, mockNotifications as any);
  });

  it('does not reveal whether an unknown application number exists', async () => {
    mockPrisma.admissionApplication.findUnique.mockResolvedValue(null);
    await expect(
      service.getPublicApplicationStatus('APP-2026-9999', 'nobody@example.com'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects status lookup with a mismatched application email', async () => {
    mockPrisma.admissionApplication.findUnique.mockResolvedValue(application);
    await expect(
      service.getPublicApplicationStatus('APP-2026-0001', 'attacker@example.com'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns only applicant-safe fields and never a user/password hash', async () => {
    mockPrisma.admissionApplication.findUnique.mockResolvedValue(application);
    const result: any = await service.getPublicApplicationStatus(
      'APP-2026-0001',
      'JANE.DOE@example.com',
    );

    expect(result.applicationNo).toBe('APP-2026-0001');
    expect(result.studentNumber).toBe('2026-1001');
    expect(result.createdStudent).toBeUndefined();
    expect(JSON.stringify(result)).not.toContain('passwordHash');
    expect(JSON.stringify(result)).not.toContain('password_hash');
  });

  it('sends a minimal admission-approved notification to the created account owner', async () => {
    mockPrisma.admissionApplication.findUnique.mockResolvedValue(application);
    mockPrisma.role.findUnique.mockResolvedValue({ id: 'student-role' });
    mockPrisma.curriculum.findFirst.mockResolvedValue({ id: 'curriculum-1' });
    mockPrisma.studentProfile.count.mockResolvedValue(0);
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1' });
    mockPrisma.studentProfile.findUnique.mockResolvedValue({ userId: 'user-1' });
    mockPrisma.$transaction.mockImplementation(async (callback: any) => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1' });
      mockPrisma.studentProfile.create.mockResolvedValue({ id: 'profile-1' });
      mockPrisma.accountBalance.create.mockResolvedValue({ id: 'balance-1' });
      mockPrisma.admissionApplication.update.mockResolvedValue({
        id: 'app-1', createdStudentId: 'profile-1', status: 'approved',
      });
      return callback(mockPrisma);
    });

    await service.reviewApplication('APP-2026-0001', 'registrar-1', {
      status: 'approved',
    } as any);

    expect(mockNotifications.sendToUser).toHaveBeenCalledWith(
      'user-1',
      'Admission Approved',
      'Your admission application has been approved. Activate your account to access SISP.',
    );
  });

  it('rejects requirement submission with a mismatched email', async () => {
    mockPrisma.admissionApplication.findUnique.mockResolvedValue(application);
    await expect(
      service.submitRequirement('APP-2026-0001', {
        email: 'attacker@example.com',
        definitionId: 'def-1',
        fileUrl: 'https://example.com/file.pdf',
        fileName: 'file.pdf',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(mockPrisma.admissionRequirementSubmission.upsert).not.toHaveBeenCalled();
  });

  it('approval creates the account with a random non-disclosed password', async () => {
    mockPrisma.admissionApplication.findUnique.mockResolvedValue(application);
    mockPrisma.role.findUnique.mockResolvedValue({ id: 'role-id-student', name: 'student' });
    mockPrisma.curriculum.findFirst.mockResolvedValue({ id: 'curriculum-1' });
    mockPrisma.studentProfile.count.mockResolvedValue(0);

    const userCreate = jest.fn().mockImplementation(({ data }: any) => ({
      id: 'user-1',
      ...data,
    }));
    const tx = {
      user: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: userCreate,
      },
      studentProfile: {
        create: jest.fn().mockResolvedValue({
          id: 'profile-1',
          studentNumber: '2026-1001',
          user: { id: 'user-1' },
        }),
      },
      accountBalance: { create: jest.fn().mockResolvedValue({}) },
      admissionApplication: {
        update: jest.fn().mockResolvedValue({
          ...application,
          status: 'approved',
          createdStudent: { id: 'profile-1', studentNumber: '2026-1001' },
        }),
      },
    };
    mockPrisma.$transaction.mockImplementation((callback: any) => callback(tx));

    const result: any = await service.reviewApplication(
      'APP-2026-0001',
      'reviewer-1',
      { status: 'approved' } as any,
    );

    const createdData = userCreate.mock.calls[0][0].data;
    expect(createdData.mustChangePassword).toBe(true);
    expect(bcrypt.compareSync('RmcStudent2026!', createdData.passwordHash)).toBe(false);
    expect(bcrypt.compareSync('local-demo-only', createdData.passwordHash)).toBe(false);
    expect(JSON.stringify(result)).not.toContain('passwordHash');
  });
});
