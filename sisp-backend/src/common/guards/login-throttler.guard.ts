import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { getRateLimitConfig } from '../config/rate-limit.config';

@Injectable()
export class LoginThrottlerGuard implements CanActivate {
  private static attempts = new Map<string, { count: number; resetTime: number }>();

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    // Safety check - we only throttle POST /api/auth/login
    if (request.path !== '/api/auth/login' && request.path !== '/auth/login') {
      return true;
    }

    // Attempt to parse client IP
    const ip =
      request.ip || request.headers['x-forwarded-for'] || request.socket.remoteAddress || 'unknown';

    const { loginLimit, loginTtlMs } = getRateLimitConfig();

    const now = Date.now();
    const record = LoginThrottlerGuard.attempts.get(ip);

    if (record) {
      if (now > record.resetTime) {
        LoginThrottlerGuard.attempts.set(ip, { count: 1, resetTime: now + loginTtlMs });
        return true;
      }

      if (record.count >= loginLimit) {
        throw new HttpException(
          'Too many login attempts. Please try again in a minute.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      record.count++;
    } else {
      LoginThrottlerGuard.attempts.set(ip, { count: 1, resetTime: now + loginTtlMs });
    }

    return true;
  }
}
