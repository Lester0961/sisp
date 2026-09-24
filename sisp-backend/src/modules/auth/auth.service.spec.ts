import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PermissionService } from '../../common/authz/permission.service';
import { MailService } from './mail.service';
import { MfaService } from './mfa.service';
import { SessionService } from './session.service';

describe('AuthService (Phase 1)', () => {
  let service: AuthService;

  const mockMfa = {
    isRequiredForRole: jest.fn().mockReturnValue(false),
    createChallenge: jest.fn(),
    verifyChallenge: jest.fn(),
    resend: jest.fn(),
  };
  const mockSessions = {
    createSession: jest.fn().mockResolvedValue({ sessionId: 'session-1', refreshToken: 'refresh-1' }),
    rotate: jest.fn(),
    assertActive: jest.fn(),
    revoke: jest.fn(),
    revokeAllForUser: jest.fn().mockResolvedValue(2),
    listActive: jest.fn().mockResolvedValue([]),
  };
  const mockPermissions = { getPermissionsForRole: jest.fn().mockResolvedValue(new Set(['student_record.read_own'])) };
  const mockMail = { isConfigured: jest.fn().mockReturnValue(true), send: jest.fn().mockResolvedValue(undefined) };

  const mockPrisma: any = {
    auditLog: { create: jest.fn() },
    user: { findUnique: jest.fn(), update: jest.fn() },
    passwordResetToken: { create: jest.fn(), findUnique: jest.fn(), updateMany: jest.fn() },
    $transaction: jest.fn(async (callback: any) => callback(mockPrisma)),
  };

  const mockJwt = {
    signAsync: jest.fn().mockResolvedValue('signed-access-token'),
  };

  const mockConfig = {
    get: jest.fn((key: string): string | null => {
      if (key === 'JWT_SECRET') return 'access-secret';
      if (key === 'JWT_EXPIRES_IN') return '15m';
      if (key === 'FRONTEND_URL') return 'http://localhost:3002';
      return null;
    }),
  };

  const passwordHash = bcrypt.hashSync('CorrectPassword1', 4);
  const studentUser = {
    id: 'student-1',
    email: 'student@rmc.edu.ph',
    firstName: 'Test',
    lastName: 'Student',
    passwordHash,
    isActive: true,
    mustChangePassword: false,
    role: { name: 'student' },
  };
  const deanUser = {
    id: 'dean-1',
    email: 'dean@rmc.edu.ph',
    firstName: 'Test',
    lastName: 'Dean',
    passwordHash,
    isActive: true,
    mustChangePassword: false,
    role: { name: 'dean' },
  };
  const retiredAgentUser = {
    ...studentUser,
    id: 'agent-1',
    email: 'agent@rmc.edu.ph',
    role: { name: 'live_agent' },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockMfa.isRequiredForRole.mockReturnValue(false);
    mockSessions.createSession.mockResolvedValue({ sessionId: 'session-1', refreshToken: 'refresh-1' });
    mockSessions.revokeAllForUser.mockResolvedValue(2);
    mockSessions.listActive.mockResolvedValue([]);
    mockPermissions.getPermissionsForRole.mockResolvedValue(new Set(['student_record.read_own']));
    mockMail.isConfigured.mockReturnValue(true);
    mockJwt.signAsync.mockResolvedValue('signed-access-token');
    mockPrisma.$transaction.mockImplementation(async (callback: any) => callback(mockPrisma));
    mockPrisma.passwordResetToken.updateMany.mockResolvedValue({ count: 1 });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
        { provide: ConfigService, useValue: mockConfig },
        { provide: MfaService, useValue: mockMfa },
        { provide: SessionService, useValue: mockSessions },
        { provide: PermissionService, useValue: mockPermissions },
        { provide: MailService, useValue: mockMail },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('authenticates a valid password and issues a server-side session', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(studentUser);

    const result: any = await service.login(
      { email: studentUser.email, password: 'CorrectPassword1' },
      '192.0.2.10',
      'jest-agent',
    );

    expect(result.mfaRequired).toBe(false);
    expect(result.accessToken).toBe('signed-access-token');
    expect(result.refreshToken).toBe('refresh-1');
    expect(result.permissions).toEqual(['student_record.read_own']);
    expect(mockSessions.createSession).toHaveBeenCalledWith('student-1', '192.0.2.10', 'jest-agent');
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: 'LOGIN_SUCCESS', resource: 'auth' }),
    });
  });

  it('audits an unknown-account failure without storing email or password', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    await expect(
      service.login({ email: 'unknown@rmc.edu.ph', password: 'NeverStoreThisPassword' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    const serialized = JSON.stringify(mockPrisma.auditLog.create.mock.calls);
    expect(serialized).not.toContain('NeverStoreThisPassword');
    expect(serialized).not.toContain('unknown@rmc.edu.ph');
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: 'LOGIN_FAILURE' }),
    });
  });

  it('rejects wrong passwords and inactive accounts', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(studentUser);
    await expect(
      service.login({ email: studentUser.email, password: 'WrongPassword1' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    mockPrisma.user.findUnique.mockResolvedValue({ ...studentUser, isActive: false });
    await expect(
      service.login({ email: studentUser.email, password: 'CorrectPassword1' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects sign-in for the retired live_agent role without creating a session', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(retiredAgentUser);

    await expect(
      service.login({ email: retiredAgentUser.email, password: 'CorrectPassword1' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(mockSessions.createSession).not.toHaveBeenCalled();
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: 'LOGIN_FAILURE', resource: 'auth' }),
    });
  });

  it('requires an MFA challenge for policy roles instead of issuing tokens', async () => {
    mockMfa.isRequiredForRole.mockReturnValue(true);
    mockMfa.createChallenge.mockResolvedValue({
      challengeId: 'challenge-1',
      expiresAt: new Date(Date.now() + 300_000),
      maskedEmail: 'te**@rmc.edu.ph',
    });
    mockPrisma.user.findUnique.mockResolvedValue(deanUser);

    const result: any = await service.login({ email: deanUser.email, password: 'CorrectPassword1' });

    expect(result.mfaRequired).toBe(true);
    expect(result.challengeId).toBe('challenge-1');
    expect(result.accessToken).toBeUndefined();
    expect(result.refreshToken).toBeUndefined();
    expect(mockSessions.createSession).not.toHaveBeenCalled();
    expect(mockMfa.createChallenge).toHaveBeenCalledWith('dean-1', 'login', undefined);
  });

  it('verifies the challenge once and only then creates a session', async () => {
    mockMfa.verifyChallenge.mockResolvedValue({ userId: 'dean-1', purpose: 'login' });
    mockPrisma.user.findUnique.mockResolvedValue(deanUser);

    const result: any = await service.verifyMfa('challenge-1', '123456', '192.0.2.9', 'jest');

    expect(result.accessToken).toBe('signed-access-token');
    expect(mockSessions.createSession).toHaveBeenCalledWith('dean-1', '192.0.2.9', 'jest');
  });

  it('rejects non-login challenge purposes', async () => {
    mockMfa.verifyChallenge.mockResolvedValue({
      userId: 'dean-1',
      purpose: 'alumni_identity_confirmation',
    });

    await expect(service.verifyMfa('challenge-1', '123456')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rotates the refresh session and reissues a short-lived access token', async () => {
    mockSessions.rotate.mockResolvedValue({ userId: 'student-1', sessionId: 'session-2', refreshToken: 'refresh-2' });
    mockPrisma.user.findUnique.mockResolvedValue(studentUser);

    const result: any = await service.refresh('refresh-1', '192.0.2.10');

    expect(mockSessions.rotate).toHaveBeenCalledWith('refresh-1', '192.0.2.10', undefined);
    expect(result.refreshToken).toBe('refresh-2');
    expect(result.accessToken).toBe('signed-access-token');
    expect(result.permissions).toEqual(['student_record.read_own']);
  });

  it('returns an array permission contract for the authenticated profile endpoint', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(studentUser);

    const result: any = await service.me('student-1');

    expect(result.permissions).toEqual(['student_record.read_own']);
    expect(Array.isArray(result.permissions)).toBe(true);
  });

  it('revokes other sessions on password change and audits the event', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(studentUser);
    mockPrisma.user.update.mockResolvedValue(studentUser);

    const result: any = await service.changePassword(
      'student-1',
      'session-1',
      'CorrectPassword1',
      'NewPassword1',
    );

    expect(result.otherSessionsRevoked).toBe(2);
    expect(mockSessions.revokeAllForUser).toHaveBeenCalledWith('student-1', 'password_change', 'session-1');
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: 'PASSWORD_CHANGED' }),
    });
  });

  it('never reveals whether a forgot-password email exists', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    const missing: any = await service.forgotPassword('ghost@rmc.edu.ph');
    mockPrisma.user.findUnique.mockResolvedValue(studentUser);
    mockPrisma.passwordResetToken.create.mockResolvedValue({ id: 'reset-1' });
    const existing: any = await service.forgotPassword('student@rmc.edu.ph');

    expect(missing.message).toEqual(existing.message);
    expect(JSON.stringify(missing)).not.toContain('reset-password');
  });

  it('rejects a consumed or expired reset token', async () => {
    mockPrisma.passwordResetToken.findUnique.mockResolvedValue({
      id: 'reset-1',
      userId: 'student-1',
      consumedAt: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
    });

    await expect(service.resetPassword('token', 'NewPassword1')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('sets the student password from an activation token without creating a login session', async () => {
    mockPrisma.passwordResetToken.findUnique.mockResolvedValue({
      id: 'activate-1',
      userId: 'student-1',
      purpose: 'student_activation',
      consumedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    });
    mockPrisma.user.findUnique.mockResolvedValue(studentUser);
    mockPrisma.user.update.mockResolvedValue(studentUser);

    await expect(service.activateStudentAccount('single-use-token', 'NewPassword1')).resolves.toEqual({
      message: 'Password saved. Sign in to SISP with your new password.',
    });
    expect(mockPrisma.passwordResetToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: 'activate-1', consumedAt: null }) }),
    );
    expect(mockPrisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'student-1' },
      data: expect.objectContaining({ mustChangePassword: false }),
    }));
    expect(mockSessions.createSession).not.toHaveBeenCalled();
    expect(mockSessions.revokeAllForUser).toHaveBeenCalledWith('student-1', 'student_account_activation');
  });

  it('emails a hashed single-use activation token without storing the raw token', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(studentUser);
    mockPrisma.passwordResetToken.create.mockResolvedValue({ id: 'activation-1' });

    await expect(service.issueStudentActivationLink(
      'student-1', 'student@example.test', 'student_activation',
    )).resolves.toBe(true);

    const tokenData = mockPrisma.passwordResetToken.create.mock.calls[0][0].data;
    expect(tokenData).toMatchObject({ userId: 'student-1', purpose: 'student_activation', targetEmail: null });
    expect(tokenData.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(mockMail.send).toHaveBeenCalledWith(
      'student@example.test',
      expect.any(String),
      expect.stringContaining('Set up your SISP student account'),
      expect.stringContaining('/activate?token='),
      expect.stringContaining('sign in with it'),
    );
  });

  it('updates a returning student email only after the one-time activation token is claimed', async () => {
    mockPrisma.passwordResetToken.findUnique.mockResolvedValue({
      id: 'reactivate-1',
      userId: 'student-1',
      purpose: 'student_reactivation',
      targetEmail: 'new@student.test',
      consumedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    });
    mockPrisma.user.findUnique
      .mockResolvedValueOnce(studentUser)
      .mockResolvedValueOnce(null);
    mockPrisma.user.update.mockResolvedValue(studentUser);

    await service.activateStudentAccount('single-use-token', 'NewPassword1');

    expect(mockPrisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ email: 'new@student.test', isActive: true }),
    }));
  });
});
