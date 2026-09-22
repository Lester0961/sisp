import { Global, Module } from '@nestjs/common';
import { PermissionService } from './permission.service';
import { StudentAccessService } from './student-access.service';

/**
 * Global authorization module (Phase 1). Exposes the permission service and
 * record-level student access checks to the global PermissionsGuard and to
 * modules that need programmatic checks.
 */
@Global()
@Module({
  providers: [PermissionService, StudentAccessService],
  exports: [PermissionService, StudentAccessService],
})
export class AuthzModule {}
