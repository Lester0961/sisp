import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy (Phase 1 token separation)', () => {
  const config = {
    get: jest.fn((key: string) => (key === 'JWT_SECRET' ? 'secret' : null)),
  } as any;
  const sessionService = { assertActive: jest.fn() } as any;
  const prisma = { user: { findUnique: jest.fn() } } as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects an MFA challenge token presented as a Bearer access token', async () => {
    const strategy = new JwtStrategy(config, prisma, sessionService);

    await expect(
      strategy.validate({ sub: 'u1', email: 'e@rmc.edu.ph', role: 'dean', purpose: 'mfa' } as any),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(sessionService.assertActive).not.toHaveBeenCalled();
  });

  it('rejects tokens without a session id', async () => {
    const strategy = new JwtStrategy(config, prisma, sessionService);
    await expect(
      strategy.validate({ sub: 'u1', email: 'e', role: 'dean', purpose: 'access' } as any),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects revoked or expired sessions', async () => {
    sessionService.assertActive.mockRejectedValue(
      new UnauthorizedException('Session is no longer active'),
    );
    const strategy = new JwtStrategy(config, prisma, sessionService);

    await expect(
      strategy.validate({ sub: 'u1', email: 'e', role: 'dean', sid: 's1', purpose: 'access' } as any),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('accepts an access token with an active session and uses the database role', async () => {
    sessionService.assertActive.mockResolvedValue(undefined);
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      isActive: true,
      mustChangePassword: false,
      role: { name: 'registrar' },
    });
    const strategy = new JwtStrategy(config, prisma, sessionService);

    const result = await strategy.validate({
      sub: 'u1',
      email: 'e',
      role: 'dean',
      sid: 's1',
      purpose: 'access',
    } as any);

    expect(result.role).toBe('registrar');
    expect(result.sid).toBe('s1');
  });
});
