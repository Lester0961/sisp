import { Injectable, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const result = await super.canActivate(context);
    if (!result) {
      return false;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (user && user.mustChangePassword) {
      const path = request.path;
      // Match exact path (with or without /api prefix) to prevent suffix-bypass
      const allowedPaths = ['/api/auth/change-password', '/auth/change-password'];
      if (!allowedPaths.includes(path)) {
        throw new ForbiddenException(
          'Password change required. You must call POST /api/auth/change-password first.',
        );
      }
    }

    return true;
  }
}
