import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { MfaService } from './mfa.service';

describe('AuthService', () => {
  let service: AuthService;

  const mockMfa = {
    generateOtp: jest.fn(),
    verifyOtp: jest.fn(),
  };

  const mockPrisma = {
    auditLog: { create: jest.fn() },
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    role: {
      findUnique: jest.fn(),
    },
  };

  const mockJwt = {
    verify: jest.fn(),
    signAsync: jest.fn().mockResolvedValue('signed-token'),
  };

  const mockConfig = {
    get: jest.fn((key: string): string | null => {
      if (key === 'JWT_SECRET') return 'secret';
      if (key === 'JWT_EXPIRES_IN') return '15m';
      if (key === 'JWT_REFRESH_SECRET') return 'refresh_secret';
      if (key === 'JWT_REFRESH_EXPIRES_IN') return '7d';
      if (key === 'MFA_ENABLED') return 'false';
      return null;
    }),
  };

  // Cheap bcrypt hashes for unit tests (cost 4 keeps the suite fast).
  const realPasswordHash = bcrypt.hashSync('CorrectPassword1', 4);
  const demoPasswordHash = bcrypt.hashSync('local-demo-only', 4);

  const sysadminUser = {
    id: 'mock-sysadmin-id',
    email: 'sysadmin@rmc.edu.ph',
    passwordHash: realPasswordHash,
    isActive: true,
    mustChangePassword: false,
    role: { name: 'sys_admin' },
  };

  const studentUser = {
    id: 'mock-student-id',
    email: 'student@rmc.edu.ph',
    passwordHash: demoPasswordHash,
    isActive: true,
    mustChangePassword: false,
    role: { name: 'student' },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockJwt.signAsync.mockResolvedValue('signed-token');
    mockConfig.get.mockImplementation((key: string) => {
      if (key === 'JWT_SECRET') return 'secret';
      if (key === 'JWT_EXPIRES_IN') return '15m';
      if (key === 'JWT_REFRESH_SECRET') return 'refresh_secret';
      if (key === 'JWT_REFRESH_EXPIRES_IN') return '7d';
      if (key === 'MFA_ENABLED') return 'false';
      return null;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
        { provide: ConfigService, useValue: mockConfig },
        { provide: MfaService, useValue: mockMfa },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('authenticates a valid password against the stored hash', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(studentUser);
    const result: any = await service.login({
      email: studentUser.email,
      password: 'local-demo-only',
    }, '192.0.2.10');
    expect(result.mfaRequired).toBe(false);
    expect(result.user.role).toBe('student');
    expect(result.accessToken).toBe('signed-token');
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: studentUser.id,
        actorEmail: studentUser.email,
        actorRole: 'student',
        action: 'LOGIN_SUCCESS',
        resource: 'auth',
        ipAddress: '192.0.2.10',
      }),
    });
  });

  it('audits an unknown-account failure without storing the attempted email or password', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    await expect(service.login({
      email: 'unknown@rmc.edu.ph',
      password: 'NeverStoreThisPassword',
    }, '192.0.2.11')).rejects.toBeInstanceOf(UnauthorizedException);

    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        userId: null,
        actorEmail: null,
        actorRole: null,
        action: 'LOGIN_FAILURE',
        resource: 'auth',
        resourceId: null,
        ipAddress: '192.0.2.11',
      },
    });
    expect(JSON.stringify(mockPrisma.auditLog.create.mock.calls)).not.toContain('NeverStoreThisPassword');
    expect(JSON.stringify(mockPrisma.auditLog.create.mock.calls)).not.toContain('unknown@rmc.edu.ph');
  });

  it('rejects the removed local compatibility alias', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(studentUser);
    await expect(
      service.login({ email: studentUser.email, password: 'password123' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: studentUser.id,
        action: 'LOGIN_FAILURE',
        resource: 'auth',
      }),
    });
  });

  it('rejects the removed sysadmin backdoor credential', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(sysadminUser);
    await expect(
      service.login({ email: sysadminUser.email, password: 'local-demo-only' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('blocks inactive accounts', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ ...studentUser, isActive: false });
    await expect(
      service.login({ email: studentUser.email, password: 'local-demo-only' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('does not bypass MFA for sysadmin when MFA is enabled', async () => {
    mockConfig.get.mockImplementation((key: string) => {
      if (key === 'JWT_SECRET') return 'secret';
      if (key === 'JWT_REFRESH_SECRET') return 'refresh_secret';
      if (key === 'MFA_ENABLED') return 'true';
      return null;
    });
    mockMfa.generateOtp.mockResolvedValue(undefined);
    mockPrisma.user.findUnique.mockResolvedValue(sysadminUser);

    const result: any = await service.login({
      email: sysadminUser.email,
      password: 'CorrectPassword1',
    });
    expect(result.mfaRequired).toBe(true);
    expect(result.accessToken).toBeUndefined();
    expect(mockMfa.generateOtp).toHaveBeenCalledWith(sysadminUser.id);
  });
});
