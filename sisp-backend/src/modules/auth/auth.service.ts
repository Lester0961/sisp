import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { MfaService } from './mfa.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mfaService: MfaService,
  ) {}

  async register(_dto: RegisterDto): Promise<void> {
    throw new ForbiddenException(
      'Public self-registration is disabled. Please contact your administrator.',
    );
  }

  async login(dto: LoginDto, ipAddress?: string) {
    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { role: true },
    });

    if (!user) {
      await this.recordLoginAudit(null, 'LOGIN_FAILURE', ipAddress);
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive) {
      await this.recordLoginAudit(user, 'LOGIN_FAILURE', ipAddress);
      throw new UnauthorizedException('Account is disabled');
    }

    // Verify password against the stored bcrypt hash. No account, email,
    // role, or environment receives a credential bypass.
    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      await this.recordLoginAudit(user, 'LOGIN_FAILURE', ipAddress);
      throw new UnauthorizedException('Invalid email or password');
    }

    const requiresMfa =
      this.configService.get<string>('MFA_ENABLED')?.trim().toLowerCase() === 'true';
    if (!requiresMfa) {
      const tokens = await this.generateTokens(user.id, user.email, user.role.name);
      await this.recordLoginAudit(user, 'LOGIN_SUCCESS', ipAddress);
      return {
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email,
          role: user.role.name,
          mustChangePassword: user.mustChangePassword,
        },
        mfaRequired: false,
        ...tokens,
      };
    }

    // Generate MFA OTP and return mfaRequired response
    await this.mfaService.generateOtp(user.id);

    // Create a short-lived MFA token (10 minutes) so the user can complete the second factor
    const mfaToken = await this.jwtService.signAsync(
      { sub: user.id, email: user.email, role: user.role.name, purpose: 'mfa' },
      {
        secret: this.getRequiredSecret('JWT_SECRET'),
        expiresIn: '10m',
      },
    );

    return {
      message: 'MFA verification required. Please enter the OTP code.',
      mfaRequired: true,
      mfaToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role.name,
        mustChangePassword: user.mustChangePassword,
      },
    };
  }

  /**
   * Verify the MFA OTP code and issue full JWT tokens on success.
   */
  async verifyMfa(mfaToken: string, otpCode: string, ipAddress?: string) {
    let payload: any;
    try {
      payload = this.jwtService.verify(mfaToken, {
        secret: this.getRequiredSecret('JWT_SECRET'),
      });
    } catch {
      await this.recordLoginAudit(null, 'LOGIN_FAILURE', ipAddress);
      throw new UnauthorizedException('Invalid or expired MFA token');
    }

    if (payload.purpose !== 'mfa') {
      await this.recordLoginAudit(null, 'LOGIN_FAILURE', ipAddress);
      throw new UnauthorizedException('Invalid token type for MFA verification');
    }

    // Verify OTP
    const isValid = this.mfaService.verifyOtp(payload.sub, otpCode);
    if (!isValid) {
      await this.recordLoginAudit(
        {
          id: typeof payload.sub === 'string' ? payload.sub : null,
          email: typeof payload.email === 'string' ? payload.email : null,
          role: { name: typeof payload.role === 'string' ? payload.role : null },
        },
        'LOGIN_FAILURE',
        ipAddress,
      );
      throw new UnauthorizedException('Invalid or expired OTP code');
    }

    // Fetch user to get fresh data
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub as string },
      include: { role: true },
    });

    if (!user || !user.isActive) {
      await this.recordLoginAudit(user, 'LOGIN_FAILURE', ipAddress);
      throw new UnauthorizedException('User not found or inactive');
    }

    // Generate full JWT tokens
    const tokens = await this.generateTokens(user.id, user.email, user.role.name);
    await this.recordLoginAudit(user, 'LOGIN_SUCCESS', ipAddress);

    return {
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        role: user.role.name,
        mustChangePassword: user.mustChangePassword,
      },
      ...tokens,
    };
  }

  private async recordLoginAudit(
    user: { id?: string | null; email?: string | null; role?: { name?: string | null } | null } | null,
    action: 'LOGIN_SUCCESS' | 'LOGIN_FAILURE',
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
      console.error('[AuthAudit] Failed to write login audit event');
    }
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub as string },
        include: { role: true },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException('User not found or inactive');
      }

      const tokens = await this.generateTokens(user.id, user.email, user.role.name);

      return {
        message: 'Token refreshed successfully',
        ...tokens,
      };
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  private getRequiredSecret(key: string): string {
    const value = this.configService.get<string>(key);
    if (!value) {
      throw new Error(`${key} is not set. Refusing to sign tokens with an insecure default.`);
    }
    return value;
  }

  private async generateTokens(
    userId: string,
    email: string,
    role: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = { sub: userId, email, role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.getRequiredSecret('JWT_SECRET'),
        expiresIn: this.configService.get<string>('JWT_EXPIRES_IN') || '1d',
      }),
      this.jwtService.signAsync(payload, {
        secret: this.getRequiredSecret('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d',
      }),
    ]);

    return { accessToken, refreshToken };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify the current password before allowing a change
    const isCurrentValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isCurrentValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Reject no-op changes
    if (currentPassword === newPassword) {
      throw new ForbiddenException('New password must be different from the current password');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        mustChangePassword: false,
      },
    });

    return { message: 'Password updated successfully' };
  }
}
