import { Global, Module } from '@nestjs/common';
import { PermissionService } from './permission.service';

/**
 * Global authorization module (Phase 2, P2-02). Exposes PermissionService to
 * the global PermissionsGuard and to modules that need programmatic checks.
 */
@Global()
@Module({
  providers: [PermissionService],
  exports: [PermissionService],
})
export class AuthzModule {}
