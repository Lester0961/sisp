import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'required_permissions';

/**
 * Declares action/resource permissions required for a route
 * (Phase 2, P2-03). Evaluated by PermissionsGuard after authentication.
 */
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
