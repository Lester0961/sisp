import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    throw new ForbiddenException('Public self-registration is disabled. Please contact your administrator.');
    // Check if email already exists
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('Email is already registered');
    }

    // Find the role by name
    const role = await this.prisma.role.findUnique({
      where: { name: dto.roleName },
    });

    if (!role) {
      throw new NotFoundException(`Role '${dto.roleName}' not found`);
    }

    // Hash the password
    const passwordHash = await bcrypt.hash(dto.password, 12);

    // Create the user
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        roleId: role!.id,
      },
      include: {
        role: true,
      },
    });

    if (role!.name === 'student') {
      const program = await this.prisma.program.findFirst();
      if (program) {
        await this.prisma.studentProfile.create({
          data: {
            userId: user.id,
            studentNumber: `STU-${Math.floor(10000 + Math.random() * 90000)}`,
            programId: program!.id,
            yearLevel: 1,
            accountBalance: {
              create: {
                balance: 0,
                status: 'good_standing',
              }
            }
          }
        });
      }
    }

    // Generate tokens
    const tokens = await this.generateTokens(user.id, user.email, role!.name);

    return {
      message: 'Registration successful',
      user: {
        id: user.id,
        email: user.email,
        role: role!.name,
      },
      ...tokens,
    };
  }

  async login(dto: LoginDto) {
    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { role: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is disabled');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Generate tokens
    const tokens = await this.generateTokens(
      user.id,
      user.email,
      user.role.name,
    );

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

      const tokens = await this.generateTokens(
        user.id,
        user.email,
        user.role.name,
      );

      return {
        message: 'Token refreshed successfully',
        ...tokens,
      };
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  private async generateTokens(
    userId: string,
    email: string,
    role: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = { sub: userId, email, role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_SECRET') || 'default-secret-key-replace-in-prod',
        expiresIn: this.configService.get<string>('JWT_EXPIRES_IN') || '1d',
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET') || 'default-refresh-secret-replace-in-prod',
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d',
      }),
    ]);

    return { accessToken, refreshToken };
  }

  async changePassword(userId: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
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