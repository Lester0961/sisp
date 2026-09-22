import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomInt } from 'node:crypto';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService, escapeHtml } from './mail.service';

export const MFA_PURPOSES = ['login', 'sensitive_account_recovery', 'alumni_identity_confirmation'] as const;
export type MfaPurpose = (typeof MFA_PURPOSES)[number];

const DEFAULT_MFA_ROLES = ['sys_admin', 'dean', 'registrar', 'treasury'];
const RESEND_COOLDOWN_MS = 60_000;

/**
 * Database-backed MFA challenges (Phase 1): hashed OTP at rest, single use,
 * attempt-limited, and safe across multiple backend instances. Challenge IDs
 * are random UUIDs; no challenge credential is ever a JWT.
 */
@Injectable()
export class MfaService {
  private readonly logger = new Logger(MfaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly mail: MailService,
  ) {}

  requiredRoles(): string[] {
    const configured = (this.config.get<string>('MFA_REQUIRED_ROLES') ?? DEFAULT_MFA_ROLES.join(',')).trim();
    if (!configured || configured.toLowerCase() === 'none') return [];
    return configured
      .split(',')
      .map((role) => role.trim().toLowerCase())
      .filter(Boolean);
  }

  isRequiredForRole(role?: string | null): boolean {
    if (!role) return false;
    return this.requiredRoles().includes(role.toLowerCase());
  }

  private otpTtlMs(): number {
    const seconds = Number(this.config.get<string>('MFA_OTP_TTL_SECONDS') || 300);
    return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : 300_000;
  }

  private maxAttempts(): number {
    const attempts = Number(this.config.get<string>('MFA_MAX_ATTEMPTS') || 5);
    return Number.isFinite(attempts) && attempts > 0 ? Math.floor(attempts) : 5;
  }

  async createChallenge(userId: string, purpose: MfaPurpose = 'login', ipAddress?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Account is not available');
    }

    // Invalidate any earlier open challenge for the same purpose.
    await this.prisma.mfaChallenge.updateMany({
      where: { userId, purpose, consumedAt: null },
      data: { consumedAt: new Date() },
    });

    // Full 000000-999999 range (previous implementation never issued 999999).
    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    const otpHash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + this.otpTtlMs());
    const challenge = await this.prisma.mfaChallenge.create({
      data: {
        userId,
        purpose,
        otpHash,
        expiresAt,
        maxAttempts: this.maxAttempts(),
        ipAddress: ipAddress?.slice(0, 64) ?? null,
      },
    });

    await this.sendOtpEmail(user, code);

    return {
      challengeId: challenge.id,
      expiresAt,
      maskedEmail: maskEmail(user.email),
      userId: user.id,
    };
  }

  async resend(challengeId: string, ipAddress?: string) {
    const challenge = await this.prisma.mfaChallenge.findUnique({ where: { id: challengeId } });
    if (!challenge || challenge.consumedAt || challenge.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('Challenge expired; sign in again');
    }
    const age = Date.now() - challenge.createdAt.getTime();
    if (age < RESEND_COOLDOWN_MS) {
      throw new HttpException(
        {
          message: 'Please wait before requesting another code.',
          retryAfterSeconds: Math.ceil((RESEND_COOLDOWN_MS - age) / 1000),
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return this.createChallenge(challenge.userId, challenge.purpose as MfaPurpose, ipAddress);
  }

  async verifyChallenge(challengeId: string, code: string): Promise<{ userId: string; purpose: string }> {
    const challenge = await this.prisma.mfaChallenge.findUnique({ where: { id: challengeId } });
    if (!challenge || challenge.consumedAt || challenge.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('Invalid or expired OTP code');
    }
    if (challenge.attemptCount >= challenge.maxAttempts) {
      await this.prisma.mfaChallenge.updateMany({
        where: { id: challengeId, consumedAt: null },
        data: { consumedAt: new Date() },
      });
      throw new UnauthorizedException('Invalid or expired OTP code');
    }

    const valid = await bcrypt.compare(code, challenge.otpHash);
    if (!valid) {
      const attempts = challenge.attemptCount + 1;
      await this.prisma.mfaChallenge.update({
        where: { id: challengeId },
        data: {
          attemptCount: attempts,
          ...(attempts >= challenge.maxAttempts ? { consumedAt: new Date() } : {}),
        },
      });
      throw new UnauthorizedException('Invalid or expired OTP code');
    }

    await this.prisma.mfaChallenge.update({
      where: { id: challengeId },
      data: { consumedAt: new Date() },
    });
    return { userId: challenge.userId, purpose: challenge.purpose };
  }

  private async sendOtpEmail(
    user: { email: string; firstName?: string | null; lastName?: string | null },
    code: string,
  ): Promise<void> {
    if (!this.mail.isConfigured()) {
      throw new ServiceUnavailableException('MFA email delivery is not configured.');
    }
    const recipientName =
      [user.firstName, user.lastName].filter(Boolean).join(' ') || 'there';
    const safeRecipientName = escapeHtml(recipientName);
    const safeCode = escapeHtml(code);
    const minutes = Math.round(this.otpTtlMs() / 60_000);

    const html = `
      <html>
        <body style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e0e0e0; border-radius: 8px; padding: 30px;">
            <h2 style="color: #1e3a8a; margin-top: 0;">Multi-Factor Authentication (MFA)</h2>
            <p>Hello <strong>${safeRecipientName}</strong>,</p>
            <p>Use this 6-digit One-Time Password to complete your SISP sign-in:</p>
            <div style="background-color: #f3f4f6; border-radius: 6px; padding: 15px; text-align: center; margin: 25px 0;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #111827;">${safeCode}</span>
            </div>
            <p style="color: #4b5563;">This code is valid for <strong>${minutes} minutes</strong>. If you did not request this, secure your account immediately.</p>
            <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 25px 0;" />
            <p style="font-size: 12px; color: #9ca3af; text-align: center; margin-bottom: 0;">This is an automated system message. Please do not reply directly to this email.</p>
          </div>
        </body>
      </html>`;

    await this.mail.send(
      user.email,
      recipientName,
      'Your SISP verification code',
      html,
      `Hello ${recipientName}, your SISP verification code is ${code}. It expires in ${minutes} minutes.`,
    );
  }
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${'*'.repeat(Math.max(1, local.length - visible.length))}@${domain}`;
}
