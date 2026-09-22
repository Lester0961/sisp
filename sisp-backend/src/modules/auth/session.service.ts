import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Server-side refresh sessions (Phase 1).
 *
 * The refresh credential is an opaque random token; only its SHA-256 hash is
 * stored. Every refresh rotates the credential. Reuse of an already-rotated
 * token revokes the whole token family (stolen-token response).
 */
@Injectable()
export class SessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  static hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private refreshTtlMs(): number {
    const days = Number(this.config.get<string>('JWT_REFRESH_EXPIRES_IN_DAYS') || 7);
    return (Number.isFinite(days) && days > 0 ? days : 7) * 24 * 60 * 60 * 1000;
  }

  private newRefreshToken(): string {
    return randomBytes(48).toString('base64url');
  }

  async createSession(userId: string, ipAddress?: string, userAgent?: string) {
    const refreshToken = this.newRefreshToken();
    const session = await this.prisma.authSession.create({
      data: {
        userId,
        refreshTokenHash: SessionService.hashToken(refreshToken),
        tokenFamilyId: randomBytes(16).toString('hex'),
        expiresAt: new Date(Date.now() + this.refreshTtlMs()),
        ipAddress: ipAddress?.slice(0, 64) ?? null,
        userAgent: userAgent?.slice(0, 255) ?? null,
      },
    });
    return { sessionId: session.id, refreshToken };
  }

  async rotate(refreshToken: string, ipAddress?: string, userAgent?: string) {
    const session = await this.prisma.authSession.findUnique({
      where: { refreshTokenHash: SessionService.hashToken(refreshToken) },
    });
    if (!session) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
    if (session.revokedAt || session.expiresAt.getTime() <= Date.now()) {
      // A rotated/revoked token being replayed is a strong theft signal.
      await this.revokeFamily(session.tokenFamilyId, 'reuse_detected');
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const nextToken = this.newRefreshToken();
    let nextSessionId = '';
    await this.prisma.$transaction(async (tx: any) => {
      const rotated = await tx.authSession.updateMany({
        where: { id: session.id, revokedAt: null },
        data: { revokedAt: new Date(), revokeReason: 'rotated', lastUsedAt: new Date() },
      });
      if (rotated.count !== 1) {
        throw new UnauthorizedException('Invalid or expired refresh token');
      }
      const next = await tx.authSession.create({
        data: {
          userId: session.userId,
          refreshTokenHash: SessionService.hashToken(nextToken),
          tokenFamilyId: session.tokenFamilyId,
          expiresAt: new Date(Date.now() + this.refreshTtlMs()),
          ipAddress: ipAddress?.slice(0, 64) ?? null,
          userAgent: userAgent?.slice(0, 255) ?? null,
        },
      });
      nextSessionId = next.id;
    });

    return { userId: session.userId, sessionId: nextSessionId, refreshToken: nextToken };
  }

  async assertActive(sessionId: string, userId: string): Promise<void> {
    const session = await this.prisma.authSession.findUnique({ where: { id: sessionId } });
    if (
      !session ||
      session.userId !== userId ||
      session.revokedAt ||
      session.expiresAt.getTime() <= Date.now()
    ) {
      throw new UnauthorizedException('Session is no longer active');
    }
  }

  async revoke(sessionId: string, reason: string): Promise<void> {
    await this.prisma.authSession.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt: new Date(), revokeReason: reason },
    });
  }

  async revokeAllForUser(userId: string, reason: string, exceptSessionId?: string): Promise<number> {
    const where: Record<string, unknown> = { userId, revokedAt: null };
    if (exceptSessionId) where.id = { not: exceptSessionId };
    const result = await this.prisma.authSession.updateMany({
      where,
      data: { revokedAt: new Date(), revokeReason: reason },
    });
    return result.count;
  }

  async revokeFamily(tokenFamilyId: string, reason: string): Promise<void> {
    await this.prisma.authSession.updateMany({
      where: { tokenFamilyId, revokedAt: null },
      data: { revokedAt: new Date(), revokeReason: reason },
    });
  }

  async listActive(userId: string) {
    return this.prisma.authSession.findMany({
      where: { userId, revokedAt: null },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        createdAt: true,
        lastUsedAt: true,
        expiresAt: true,
        ipAddress: true,
        userAgent: true,
      },
    });
  }
}
