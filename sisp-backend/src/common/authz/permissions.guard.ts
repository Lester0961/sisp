import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from './require-permissions.decorator';
import { PermissionService } from './permission.service';

/**
 * Action/resource authorization guard (Phase 2, P2-03).
 *
 * Pattern: JWT guard → identity, RolesGuard → broad area (optional), this
 * guard → action/resource, service-level checks → exact record.
 * Routes without @RequirePermissions pass through unchanged.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissionService: PermissionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const role = request?.user?.role;

    // Missing identity fails closed; the global JwtAuthGuard normally
    // rejects earlier, but this guard must never grant access without a role.
    if (!role) return false;

    return this.permissionService.hasAllPermissions(role, requiredPermissions);
  }
}
