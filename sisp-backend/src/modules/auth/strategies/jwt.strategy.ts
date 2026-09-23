import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import { SessionService } from '../session.service';
import { RETIRED_ROLE_NAMES } from '../../../common/authz/rbac';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  sid?: string;
  purpose?: string;
  mustChangePassword?: boolean;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly sessionService: SessionService,
  ) {
    const secret = configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET is not set. Refusing to start with an insecure default.');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    // Only access tokens may authenticate protected routes. MFA challenge
    // credentials are database records, never JWTs, and are rejected here.
    if (payload.purpose !== 'access') {
      throw new UnauthorizedException('Invalid token purpose');
    }
    if (!payload.sid) {
      throw new UnauthorizedException('Invalid session token');
    }
    await this.sessionService.assertActive(payload.sid, payload.sub);

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { role: true },
    });

    if (
      !user ||
      !user.isActive ||
      (RETIRED_ROLE_NAMES as readonly string[]).includes(user.role?.name ?? '')
    ) {
      throw new UnauthorizedException('User not found or inactive');
    }

    // Authorization uses the current database role, not the (possibly
    // stale) role claim from the token. Role changes and deactivation apply
    // on the next request (Phase 2, P2-04/P2-08).
    return {
      sub: payload.sub,
      email: payload.email,
      role: user.role?.name ?? payload.role,
      sid: payload.sid,
      purpose: 'access',
      mustChangePassword: user.mustChangePassword,
    };
  }
}
