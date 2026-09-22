import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AdmissionService } from './admission.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

describe('AdmissionService — lifecycle, requirement verification, no duplicates', () => {
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
    reviewNotes: null,
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
      create: jest.fn(),
      count: jest.fn(),
    },
    admissionRequirementDefinition: {
      findUnique: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
    },
    admissionRequirementSubmission: {
      upsert: jest.fn(),
      findUnique: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    program: { findUnique: jest.fn().mockResolvedValue({ id: 'program-1' }) },
    role: { findUnique: jest.fn().mockResolvedValue({ id: 'student-role' }) },
    curriculum: { findFirst: jest.fn().mockResolvedValue({ id: 'curriculum-1' }) },
    studentProfile: { count: jest.fn(), findUnique: jest.fn().mockResolvedValue(null), create: jest.fn() },
    user: { findUnique: jest.fn(), create: jest.fn() },
    accountBalance: { create: jest.fn(), upsert: jest.fn() },
    auditLog: { create: jest.fn().mockResolvedValue({}) },
    $transaction: jest.fn(),
  };
  const mockNotifications = { sendToUser: jest.fn().mockResolvedValue(undefined) };
  const mockStorage = {
    save: jest.fn().mockResolvedValue(undefined),
    createSignedUrl: jest.fn().mockResolvedValue('https://signed.example/doc'),
    isRemoteEnabled: jest.fn().mockReturnValue(true),
  };
  const mockConfig = {
    get: jest.fn((key: string) =>
      key === 'ADMISSION_STORAGE_BUCKET' ? 'admission-requirements' : null,
    ),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.admissionRequirementDefinition.findMany.mockResolvedValue([]);
    mockPrisma.admissionRequirementSubmission.findUnique.mockResolvedValue(null);
    mockPrisma.admissionRequirementSubmission.findMany.mockResolvedValue([]);
    mockPrisma.$transaction.mockImplementation(async (callback: any) => callback(mockPrisma));
    service = new AdmissionService(
      mockPrisma as PrismaService,
      mockNotifications as any,
      mockConfig as any,
      mockStorage as any,
    );
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
  });

  it('retries application-number allocation on a concurrent collision', async () => {
    mockPrisma.admissionApplication.count.mockResolvedValue(4);
    mockPrisma.admissionApplication.create
      .mockRejectedValueOnce({ code: 'P2002' })
      .mockResolvedValueOnce({ applicationNo: 'APP-2026-0006' });

    const result: any = await service.createApplication({
      applicantType: 'freshman',
      firstName: 'Jane',
      lastName: 'Doe',
      dob: '2005-05-05',
      email: 'jane@example.com',
      mobile: '0999',
      addressLine: '1 St',
      city: 'Davao',
      province: 'Davao',
      guardianName: 'G',
      guardianRelation: 'Parent',
      guardianContact: '0999',
      emergencyName: 'E',
      emergencyRelation: 'Sibling',
      emergencyContact: '0999',
      lastSchoolName: 'School',
      programId: 'program-1',
    } as any);

    expect(result.applicationNo).toBe('APP-2026-0006');
    expect(mockPrisma.admissionApplication.create).toHaveBeenCalledTimes(2);
  });

  it('blocks approval until every required requirement is verified', async () => {
    mockPrisma.admissionApplication.findUnique.mockResolvedValue(application);
    mockPrisma.admissionRequirementDefinition.findMany.mockResolvedValue([
      { id: 'def-1', code: 'FORM_137' },
    ]);

    await expect(
      service.reviewApplication('APP-2026-0001', 'registrar-1', { status: 'approved' } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it('links an existing student profile instead of creating a duplicate', async () => {
    mockPrisma.admissionApplication.findUnique.mockResolvedValue(application);
    const existingProfile = { id: 'profile-existing', userId: 'user-1', curriculumId: 'curriculum-1', yearLevel: 2 };
    const tx: any = {
      user: {
        findUnique: jest.fn().mockResolvedValue({ id: 'user-1', studentProfile: existingProfile }),
        create: jest.fn(),
      },
      studentProfile: {
        create: jest.fn(),
        update: jest.fn().mockResolvedValue({
          ...existingProfile,
          lifecycleStatus: 'returning',
          user: { id: 'user-1' },
        }),
      },
      accountBalance: { upsert: jest.fn().mockResolvedValue({}), create: jest.fn() },
      admissionApplication: {
        update: jest.fn().mockResolvedValue({
          ...application,
          status: 'approved',
          createdStudent: { id: 'profile-existing', studentNumber: '2025-1001' },
        }),
      },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    mockPrisma.$transaction.mockImplementation((callback: any) => callback(tx));

    const result: any = await service.reviewApplication('APP-2026-0001', 'registrar-1', {
      status: 'approved',
    } as any);

    expect(tx.studentProfile.create).not.toHaveBeenCalled();
    expect(tx.studentProfile.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ lifecycleStatus: 'returning' }),
      }),
    );
    expect(result.linkedExistingProfile).toBe(true);
    expect(mockNotifications.sendToUser).toHaveBeenCalledWith(
      'user-1',
      'Admission Approved',
      'Your admission application has been approved. Activate your account to access SISP.',
    );
  });

  it('creates a new student account with a random non-disclosed password', async () => {
    mockPrisma.admissionApplication.findUnique.mockResolvedValue(application);
    const userCreate = jest.fn().mockImplementation(({ data }: any) => ({
      id: 'user-1',
      ...data,
      studentProfile: null,
    }));
    const tx: any = {
      user: { findUnique: jest.fn().mockResolvedValue(null), create: userCreate },
      studentProfile: {
        count: jest.fn().mockResolvedValue(0),
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({
          id: 'profile-1',
          studentNumber: '2026-1001',
          userId: 'user-1',
        }),
      },
      accountBalance: { create: jest.fn().mockResolvedValue({}), upsert: jest.fn() },
      admissionApplication: {
        update: jest.fn().mockResolvedValue({
          ...application,
          status: 'approved',
          createdStudent: { id: 'profile-1', studentNumber: '2026-1001' },
        }),
      },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    mockPrisma.$transaction.mockImplementation((callback: any) => callback(tx));

    const result: any = await service.reviewApplication(
      'APP-2026-0001',
      'reviewer-1',
      { status: 'approved' } as any,
    );

    const createdData = userCreate.mock.calls[0][0].data;
    expect(createdData.mustChangePassword).toBe(true);
    expect(bcrypt.compareSync('local-demo-only', createdData.passwordHash)).toBe(false);
    expect(JSON.stringify(result)).not.toContain('passwordHash');
  });

  it('rejects requirement submission with a mismatched email', async () => {
    mockPrisma.admissionApplication.findUnique.mockResolvedValue(application);
    await expect(
      service.submitRequirement('APP-2026-0001', {
        email: 'attacker@example.com',
        definitionId: 'def-1',
        fileName: 'file.pdf',
        mimeType: 'application/pdf',
        contentBase64: 'AAAA',
      } as any),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(mockPrisma.admissionRequirementSubmission.upsert).not.toHaveBeenCalled();
  });

  it('never silently overwrites a verified requirement', async () => {
    mockPrisma.admissionApplication.findUnique.mockResolvedValue(application);
    mockPrisma.admissionRequirementDefinition.findUnique.mockResolvedValue({
      id: 'def-1',
      code: 'FORM_137',
      isActive: true,
      applicantType: null,
    });
    mockPrisma.admissionRequirementSubmission.findUnique.mockResolvedValue({
      id: 'sub-1',
      applicationId: 'app-1',
      definitionId: 'def-1',
      status: 'verified',
    });

    await expect(
      service.submitRequirement('APP-2026-0001', {
        email: 'jane.doe@example.com',
        definitionId: 'def-1',
        fileName: 'file.pdf',
        mimeType: 'application/pdf',
        contentBase64: 'AAAA',
      } as any),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(mockStorage.save).not.toHaveBeenCalled();
  });

  it('stores a secure upload and hides the object key from the response', async () => {
    mockPrisma.admissionApplication.findUnique.mockResolvedValue(application);
    mockPrisma.admissionRequirementDefinition.findUnique.mockResolvedValue({
      id: 'def-1',
      code: 'FORM_137',
      isActive: true,
      applicantType: null,
    });
    mockPrisma.admissionRequirementSubmission.upsert.mockResolvedValue({
      id: 'sub-1',
      definitionId: 'def-1',
      fileName: 'form.pdf',
      fileSize: 4,
      mimeType: 'application/pdf',
      status: 'submitted',
      reviewNotes: null,
      storageObjectKey: 'app-1/form_137-abc.pdf',
      fileUrl: '',
    });

    const result: any = await service.submitRequirement('APP-2026-0001', {
      email: 'jane.doe@example.com',
      definitionId: 'def-1',
      fileName: 'form.pdf',
      mimeType: 'application/pdf',
      contentBase64: Buffer.from('test').toString('base64'),
    } as any);

    expect(mockStorage.save).toHaveBeenCalledWith(
      'admission-requirements',
      expect.stringMatching(/^app-1\/form_137-[0-9a-f]{24}\.pdf$/),
      expect.any(Buffer),
      'application/pdf',
    );
    expect(JSON.stringify(result)).not.toContain('storageObjectKey');
    expect(JSON.stringify(result)).not.toContain('form_137-abc');
  });

  it('records requirement review decisions with an audit trail', async () => {
    mockPrisma.admissionApplication.findUnique.mockResolvedValue(application);
    mockPrisma.admissionRequirementSubmission.findFirst.mockResolvedValue({
      id: 'sub-1',
      status: 'submitted',
      reviewNotes: null,
    });
    mockPrisma.admissionRequirementSubmission.update.mockResolvedValue({
      id: 'sub-1',
      definitionId: 'def-1',
      fileName: 'form.pdf',
      fileSize: 4,
      mimeType: 'application/pdf',
      status: 'verified',
      reviewNotes: null,
      reviewedAt: new Date(),
      storageObjectKey: 'private/key',
      updatedAt: new Date(),
    });

    const result: any = await service.reviewRequirement('APP-2026-0001', 'sub-1', 'registrar-1', {
      status: 'verified',
    } as any);

    expect(result.status).toBe('verified');
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'ADMISSION_REQUIREMENT_VERIFIED',
          oldValue: 'submitted',
          newValue: 'verified',
        }),
      }),
    );
    expect(JSON.stringify(result)).not.toContain('private/key');
  });
});
