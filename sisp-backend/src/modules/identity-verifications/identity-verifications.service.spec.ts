import { BadRequestException, NotFoundException, PayloadTooLargeException } from '@nestjs/common';
import { IdentityVerificationsService } from './identity-verifications.service';

describe('IdentityVerificationsService (Phase 1 onboarding)', () => {
  let service: IdentityVerificationsService;
  let storageDir: string;

  const verification = {
    id: 'ver-1',
    applicantEmail: 'alumni@example.test',
    verificationType: 'alumni',
    status: 'submitted',
    remarks: null,
    matchedStudentProfileId: 'profile-1',
  };

  const prisma: any = {
    studentProfile: {
      findUnique: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
    },
    studentIdentityVerification: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    identityVerificationDocument: { create: jest.fn() },
    auditLog: { create: jest.fn().mockResolvedValue({}) },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    storageDir = require('node:path').join(
      require('node:os').tmpdir(),
      `sisp-identity-test-${Date.now()}`,
    );
    const config: any = {
      get: jest.fn((key: string) => (key === 'IDENTITY_STORAGE_DIR' ? storageDir : null)),
    };
    service = new IdentityVerificationsService(prisma, config);
  });

  it('marks a student-number match as a candidate, not an approval', async () => {
    prisma.studentProfile.findUnique.mockResolvedValue({ id: 'profile-1' });
    prisma.studentIdentityVerification.create.mockImplementation(async ({ data }: any) => ({
      id: 'ver-1',
      status: data.status,
      verificationType: data.verificationType,
      submittedAt: new Date(),
    }));

    const result: any = await service.create({
      verificationType: 'returning',
      applicantEmail: 'Student@Example.test',
      claimedStudentNumber: '2024-1001',
      claimedFirstName: 'Test',
      claimedLastName: 'Student',
    });

    expect(result.matchedExistingRecord).toBe(true);
    expect(prisma.studentProfile.update).not.toHaveBeenCalled();
    const createData = prisma.studentIdentityVerification.create.mock.calls[0][0].data;
    expect(createData.applicantEmail).toBe('student@example.test');
    expect(createData.status).toBe('submitted');
  });

  it('rejects invalid verification types', async () => {
    await expect(
      service.create({
        verificationType: 'employee' as any,
        applicantEmail: 'x@example.test',
        claimedFirstName: 'X',
        claimedLastName: 'Y',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('finalizes review, links the profile, and sets the lifecycle status', async () => {
    prisma.studentIdentityVerification.findUnique.mockResolvedValue(verification);
    prisma.studentIdentityVerification.update.mockResolvedValue({
      id: 'ver-1',
      status: 'approved',
      matchedStudentProfileId: 'profile-1',
      reviewedAt: new Date(),
    });

    await service.review('ver-1', 'registrar-1', { decision: 'approved' });

    expect(prisma.studentProfile.update).toHaveBeenCalledWith({
      where: { id: 'profile-1' },
      data: { lifecycleStatus: 'alumni' },
    });
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'IDENTITY_VERIFICATION_APPROVED' }),
      }),
    );
  });

  it('refuses to change an already finalized verification', async () => {
    prisma.studentIdentityVerification.findUnique.mockResolvedValue({
      ...verification,
      status: 'approved',
    });

    await expect(
      service.review('ver-1', 'registrar-1', { decision: 'rejected' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a missing verification record for status lookup', async () => {
    prisma.studentIdentityVerification.findFirst.mockResolvedValue(null);
    await expect(service.getPublicStatus('ver-1', 'ghost@example.test')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('accepts a small PNG ID but rejects an unsupported type and oversized files', async () => {
    prisma.studentIdentityVerification.findUnique.mockResolvedValue(verification);
    prisma.identityVerificationDocument.create.mockResolvedValue({ id: 'doc-1' });
    const tinyPng = Buffer.from('89504e470d0a1a0a', 'hex').toString('base64');

    await expect(
      service.uploadDocument('ver-1', {
        documentType: 'school_id',
        originalFileName: 'id.png',
        mimeType: 'image/png',
        contentBase64: tinyPng,
      }),
    ).resolves.toEqual(expect.objectContaining({ message: expect.stringContaining('uploaded') }));

    await expect(
      service.uploadDocument('ver-1', {
        documentType: 'school_id',
        originalFileName: 'id.exe',
        mimeType: 'application/x-msdownload',
        contentBase64: tinyPng,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    const oversized = Buffer.alloc(6 * 1024 * 1024, 1).toString('base64');
    await expect(
      service.uploadDocument('ver-1', {
        documentType: 'school_id',
        originalFileName: 'big.png',
        mimeType: 'image/png',
        contentBase64: oversized,
      }),
    ).rejects.toBeInstanceOf(PayloadTooLargeException);
  });
});
