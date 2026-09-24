import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { PermissionService } from '../../common/authz/permission.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { MailService } from './mail.service';
import { MfaService } from './mfa.service';
import { SessionService } from './session.service';
import { PASSWORD_PATTERN } from '../../common/utils/password-policy';
import { RETIRED_ROLE_NAMES } from '../../common/authz/rbac';

const PASSWORD_RESET_TTL_MS = 30 * 60 * 1000;

interface AuthUser {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  passwordHash?: string;
  isActive?: boolean;
  mustChangePassword?: boolean;
  role: { name: string };
}

interface AuditActor {
  id?: string | null;
  email?: string | null;
  role?: { name?: string | null } | null;
}

/**
 * Phase 1 authentication service.
 *
 * - Access tokens are short-lived JWTs with `purpose: "access"` + session id.
 * - Refresh credentials are opaque, rotated, server-side sessions.
 * - MFA uses database-backed, hashed, single-use challenges (never a JWT).
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mfaService: MfaService,
    private readonly sessionService: SessionService,
    private readonly permissionService: PermissionService,
    private readonly mailService: MailService,
  ) {}

  async register(_dto: RegisterDto): Promise<void> {
    throw new ForbiddenException(
      'Public self-registration is disabled. Please contact your administrator.',
    );
  }

  async login(dto: LoginDto, ipAddress?: string, userAgent?: string) {
    // Emails are stored lowercase; normalize so mobile auto-capitalization
    // ("Student.local@...") or stray spaces never cause false "invalid" errors.
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { role: true },
    });

    if (!user) {
      await this.recordAudit(null, 'LOGIN_FAILURE', ipAddress);
      throw new UnauthorizedException('Invalid email or password');
    }
    if (!user.isActive) {
      await this.recordAudit(user, 'LOGIN_FAILURE', ipAddress);
      throw new UnauthorizedException('Account is disabled');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      await this.recordAudit(user, 'LOGIN_FAILURE', ipAddress);
      throw new UnauthorizedException('Invalid email or password');
    }

    if ((RETIRED_ROLE_NAMES as readonly string[]).includes(user.role.name)) {
      await this.recordAudit(user, 'LOGIN_FAILURE', ipAddress);
      throw new UnauthorizedException('Invalid email or password');
    }

    if (this.mfaService.isRequiredForRole(user.role.name)) {
      const challenge = await this.mfaService.createChallenge(user.id, 'login', ipAddress);
      await this.recordAudit(user, 'LOGIN_MFA_CHALLENGE', ipAddress);
      return {
        mfaRequired: true as const,
        challengeId: challenge.challengeId,
        expiresAt: challenge.expiresAt,
        maskedEmail: challenge.maskedEmail,
        user: this.publicUser(user),
      };
    }

    const session = await this.createAuthenticatedSession(user, ipAddress, userAgent);
    await this.recordAudit(user, 'LOGIN_SUCCESS', ipAddress);
    return { mfaRequired: false as const, ...session };
  }

  async verifyMfa(challengeId: string, otpCode: string, ipAddress?: string, userAgent?: string) {
    let verified: { userId: string; purpose: string };
    try {
      verified = await this.mfaService.verifyChallenge(challengeId, otpCode);
    } catch (error) {
      await this.recordAudit(null, 'MFA_FAILURE', ipAddress);
      throw error;
    }

    if (verified.purpose !== 'login') {
      throw new UnauthorizedException('Invalid challenge purpose');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: verified.userId },
      include: { role: true },
    });
    if (!user || !user.isActive || (RETIRED_ROLE_NAMES as readonly string[]).includes(user.role?.name ?? '')) {
      await this.recordAudit(user, 'LOGIN_FAILURE', ipAddress);
      throw new UnauthorizedException('User not found or inactive');
    }

    const session = await this.createAuthenticatedSession(user, ipAddress, userAgent);
    await this.recordAudit(user, 'LOGIN_SUCCESS', ipAddress);
    return session;
  }

  async resendMfa(challengeId: string, ipAddress?: string) {
    const challenge = await this.mfaService.resend(challengeId, ipAddress);
    return {
      challengeId: challenge.challengeId,
      expiresAt: challenge.expiresAt,
      maskedEmail: challenge.maskedEmail,
    };
  }

  async refresh(refreshToken: string, ipAddress?: string, userAgent?: string) {
    const rotated = await this.sessionService.rotate(refreshToken, ipAddress, userAgent);
    const user = await this.prisma.user.findUnique({
      where: { id: rotated.userId },
      include: { role: true },
    });
    if (!user || !user.isActive || (RETIRED_ROLE_NAMES as readonly string[]).includes(user.role?.name ?? '')) {
      await this.sessionService.revokeAllForUser(rotated.userId, 'account_inactive');
      throw new UnauthorizedException('User not found or inactive');
    }
    const accessToken = await this.signAccessToken(user, rotated.sessionId);
    const permissions = await this.permissionService.getPermissionsForRole(user.role.name);
    return {
      refreshToken: rotated.refreshToken,
      accessToken,
      user: this.publicUser(user),
      permissions: [...permissions],
    };
  }

  async logout(userId: string, sessionId?: string) {
    if (sessionId) {
      await this.sessionService.revoke(sessionId, 'logout');
    }
    await this.recordAudit({ id: userId }, 'LOGOUT');
    return { message: 'Signed out' };
  }

  async logoutAll(userId: string) {
    const revoked = await this.sessionService.revokeAllForUser(userId, 'logout_all');
    await this.recordAudit({ id: userId }, 'LOGOUT_ALL');
    return { message: 'Signed out of all sessions', revoked };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });
    if (!user || !user.isActive || (RETIRED_ROLE_NAMES as readonly string[]).includes(user.role?.name ?? '')) {
      throw new UnauthorizedException('User not found or inactive');
    }
    const permissions = await this.permissionService.getPermissionsForRole(user.role.name);
    const activeSessions = await this.sessionService.listActive(userId);
    return { user: this.publicUser(user), permissions: [...permissions], activeSessions };
  }

  async changePassword(
    userId: string,
    sessionId: string | undefined,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const isCurrentValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isCurrentValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }
    if (currentPassword === newPassword) {
      throw new ForbiddenException('New password must be different from the current password');
    }
    this.assertPasswordPolicy(newPassword);

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash, mustChangePassword: false },
    });

    const otherSessionsRevoked = await this.sessionService.revokeAllForUser(
      userId,
      'password_change',
      sessionId,
    );
    await this.recordAudit(user, 'PASSWORD_CHANGED');

    return { message: 'Password updated successfully', otherSessionsRevoked };
  }

  async forgotPassword(emailInput: string, ipAddress?: string) {
    const email = emailInput.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });
    // Always the same response: never reveal whether the email exists.
    const message = 'If the account exists, a password reset link has been sent.';
    if (!user || !user.isActive) return { message };

    const token = randomBytes(48).toString('base64url');
    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: createHash('sha256').update(token).digest('hex'),
        purpose: 'password_reset',
        expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
        requestedIp: ipAddress?.slice(0, 64) ?? null,
      },
    });
    await this.recordAudit(user, 'PASSWORD_RESET_REQUEST', ipAddress);

    if (this.mailService.isConfigured()) {
      const base = (this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3002').replace(/\/$/, '');
      const link = `${base}/reset-password?token=${token}`;
      try {
        await this.mailService.send(
          user.email,
          [user.firstName, user.lastName].filter(Boolean).join(' ') || 'there',
          'Reset your SISP password',
          `<p>Use the link below to reset your SISP password. It expires in 30 minutes.</p><p><a href="${link}">Reset password</a></p><p>If you did not request this, you can ignore this email.</p>`,
          `Reset your SISP password (valid 30 minutes): ${link}`,
        );
      } catch {
        this.logger.warn('Password reset email could not be delivered');
      }
    }
    return { message };
  }

  async resetPassword(token: string, newPassword: string) {
    this.assertPasswordPolicy(newPassword);
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash: createHash('sha256').update(token).digest('hex') },
    });
    if (
      !record ||
      (record.purpose && record.purpose !== 'password_reset') ||
      record.consumedAt ||
      record.expiresAt.getTime() <= Date.now()
    ) {
      throw new UnauthorizedException('Invalid or expired reset link');
    }
    const user = await this.prisma.user.findUnique({ where: { id: record.userId } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid or expired reset link');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, mustChangePassword: false },
    });
    await this.prisma.passwordResetToken.updateMany({
      where: { id: record.id, consumedAt: null },
      data: { consumedAt: new Date() },
    });
    await this.sessionService.revokeAllForUser(user.id, 'password_reset');
    await this.recordAudit(user, 'PASSWORD_RESET');
    return { message: 'Password has been reset. Sign in with your new password.' };
  }

  /**
   * Issue a short-lived, single-use password setup link for a Registrar-approved
   * student account. The raw token is emailed once and never persisted or logged.
   */
  async issueStudentActivationLink(
    userId: string,
    recipientEmail: string,
    purpose: 'student_activation' | 'student_reactivation',
  ): Promise<boolean> {
    const email = recipientEmail.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });
    if (!user || user.role?.name !== 'student') {
      throw new UnauthorizedException('Only a student account can be activated.');
    }

    if (purpose === 'student_reactivation') {
      const emailOwner = await this.prisma.user.findUnique({ where: { email } });
      if (emailOwner && emailOwner.id !== userId) {
        throw new ConflictException('That email address is already linked to another account.');
      }
    }

    // Do not mint a token that cannot be delivered. The staff review result
    // remains saved, and the caller reports that email needs configuration.
    if (!this.mailService.isConfigured()) return false;

    const token = randomBytes(48).toString('base64url');
    const tokenRecord = await this.prisma.passwordResetToken.create({
      data: {
        userId,
        tokenHash: createHash('sha256').update(token).digest('hex'),
        purpose,
        targetEmail: purpose === 'student_reactivation' ? email : null,
        expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
      },
    });

    const base = (this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3002').replace(/\/$/, '');
    const link = `${base}/activate?token=${encodeURIComponent(token)}`;
    const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || 'Student';
    try {
      await this.mailService.send(
        email,
        name,
        'Set up your SISP student account',
        `<p>The Registrar approved your student account request.</p><p>Use the secure link below to set your password. This link expires in 30 minutes and can be used once.</p><p><a href="${link}">Set my password</a></p><p>After saving your password, return to SISP and sign in with it. You will not be signed in automatically.</p>`,
        `The Registrar approved your SISP student account request. Set your password using this one-time link (expires in 30 minutes): ${link}\n\nAfter saving your password, return to SISP and sign in with it.`,
      );
      return true;
    } catch (error) {
      await this.prisma.passwordResetToken.updateMany({
        where: { id: tokenRecord.id, consumedAt: null },
        data: { consumedAt: new Date() },
      }).catch(() => undefined);
      this.logger.warn('Student activation email could not be delivered');
      return false;
    }
  }

  /** Complete an emailed student activation/recovery link without creating a session. */
  async activateStudentAccount(token: string, newPassword: string) {
    this.assertPasswordPolicy(newPassword);
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const now = new Date();

    const user = await this.prisma.$transaction(async (tx) => {
      const record = await tx.passwordResetToken.findUnique({ where: { tokenHash } });
      if (
        !record ||
        !['student_activation', 'student_reactivation'].includes(record.purpose) ||
        record.consumedAt ||
        record.expiresAt.getTime() <= now.getTime()
      ) {
        throw new UnauthorizedException('This activation link is invalid or has expired.');
      }

      const account = await tx.user.findUnique({
        where: { id: record.userId },
        include: { role: true },
      });
      if (
        !account ||
        (record.purpose === 'student_activation' && !account.isActive) ||
        account.role?.name !== 'student'
      ) {
        throw new UnauthorizedException('This activation link is invalid or has expired.');
      }

      const targetEmail = record.purpose === 'student_reactivation'
        ? String(record.targetEmail || '').trim().toLowerCase()
        : '';
      if (record.purpose === 'student_reactivation' && !targetEmail) {
        throw new UnauthorizedException('This activation link is invalid or has expired.');
      }
      if (targetEmail) {
        const emailOwner = await tx.user.findUnique({ where: { email: targetEmail } });
        if (emailOwner && emailOwner.id !== account.id) {
          throw new ConflictException('That email address is already linked to another account. Contact the Registrar.');
        }
      }

      const claimed = await tx.passwordResetToken.updateMany({
        where: { id: record.id, consumedAt: null, expiresAt: { gt: now } },
        data: { consumedAt: now },
      });
      if (claimed.count !== 1) {
        throw new UnauthorizedException('This activation link is invalid or has expired.');
      }

      const passwordHash = await bcrypt.hash(newPassword, 12);
      return tx.user.update({
        where: { id: account.id },
        data: {
          passwordHash,
          mustChangePassword: false,
          ...(record.purpose === 'student_reactivation' ? { isActive: true } : {}),
          ...(targetEmail ? { email: targetEmail } : {}),
        },
        include: { role: true },
      });
    });

    await this.sessionService.revokeAllForUser(user.id, 'student_account_activation');
    await this.recordAudit(user, 'STUDENT_ACCOUNT_PASSWORD_SET');
    return { message: 'Password saved. Sign in to SISP with your new password.' };
  }

  private async createAuthenticatedSession(user: AuthUser, ipAddress?: string, userAgent?: string) {
    const { sessionId, refreshToken } = await this.sessionService.createSession(
      user.id,
      ipAddress,
      userAgent,
    );
    const accessToken = await this.signAccessToken(user, sessionId);
    const permissions = await this.permissionService.getPermissionsForRole(user.role.name);
    return { refreshToken, accessToken, user: this.publicUser(user), permissions: [...permissions] };
  }

  private async signAccessToken(user: AuthUser, sessionId: string): Promise<string> {
    return this.jwtService.signAsync(
      {
        sub: user.id,
        email: user.email,
        role: user.role.name,
        sid: sessionId,
        purpose: 'access',
      },
      {
        secret: this.getRequiredSecret('JWT_SECRET'),
        expiresIn: this.configService.get<string>('JWT_EXPIRES_IN') || '15m',
      },
    );
  }

  private publicUser(user: AuthUser) {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName ?? null,
      lastName: user.lastName ?? null,
      role: user.role.name,
      mustChangePassword: Boolean(user.mustChangePassword),
    };
  }

  private assertPasswordPolicy(password: string): void {
    if (password.length < 8 || password.length > 64 || !PASSWORD_PATTERN.test(password)) {
      throw new ForbiddenException(
        'Password must be 8-64 characters and contain at least one uppercase letter, one lowercase letter, and one number',
      );
    }
  }

  private getRequiredSecret(key: string): string {
    const value = this.configService.get<string>(key);
    if (!value) {
      throw new Error(`${key} is not set. Refusing to sign tokens with an insecure default.`);
    }
    return value;
  }

  private async recordAudit(
    user: AuditActor | null,
    action: string,
    ipAddress?: string,
  ): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: user?.id ?? null,
          actorEmail: user?.email ?? null,
          actorRole: user?.role?.name ?? null,
          action,
          resource: 'auth',
          resourceId: null,
          ipAddress: ipAddress?.slice(0, 64) ?? null,
        },
      });
    } catch {
      // Keep authentication behavior independent of best-effort audit storage.
      this.logger.warn('Failed to write auth audit event');
    }
  }
}
