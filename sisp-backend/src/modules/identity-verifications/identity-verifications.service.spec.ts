import { BadRequestException, NotFoundException, PayloadTooLargeException } from '@nestjs/common';
import { IdentityVerificationsService } from './identity-verifications.service';

describe('IdentityVerificationsService (Phase 1 onboarding)', () => {
  let service: IdentityVerificationsService;

  const storage = {
    save: jest.fn().mockResolvedValue(undefined),
    createSignedUrl: jest.fn().mockResolvedValue('https://signed.example/doc'),
    isRemoteEnabled: jest.fn().mockReturnValue(true),
  };

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
    identityVerificationDocument: { create: jest.fn(), findFirst: jest.fn() },
    auditLog: { create: jest.fn().mockResolvedValue({}) },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    storage.save.mockResolvedValue(undefined);
    storage.createSignedUrl.mockResolvedValue('https://signed.example/doc');
    service = new IdentityVerificationsService(prisma, storage as any);
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
    expect(storage.save).toHaveBeenCalledWith(
      expect.stringMatching(/^ver-1\/[0-9a-f]{24}\.png$/),
      expect.any(Buffer),
      'image/png',
    );

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

  it('returns a short-lived signed link for a reviewer without exposing the object key', async () => {
    prisma.identityVerificationDocument.findFirst.mockResolvedValue({
      id: 'doc-1',
      storageObjectKey: 'ver-1/abc.png',
      originalFileName: 'id.png',
      mimeType: 'image/png',
    });

    const result: any = await service.getDocumentSignedUrl('ver-1', 'doc-1');

    expect(result.url).toBe('https://signed.example/doc');
    expect(result.expiresInSeconds).toBe(300);
    expect(JSON.stringify(result)).not.toContain('ver-1/abc.png');
  });

  it('reports metadata only when remote storage is not configured', async () => {
    prisma.identityVerificationDocument.findFirst.mockResolvedValue({
      id: 'doc-1',
      storageObjectKey: 'ver-1/abc.png',
      originalFileName: 'id.png',
      mimeType: 'image/png',
    });
    storage.createSignedUrl.mockResolvedValueOnce(null);

    const result: any = await service.getDocumentSignedUrl('ver-1', 'doc-1');

    expect(result.url).toBeNull();
    expect(result.expiresInSeconds).toBe(0);
  });
});
