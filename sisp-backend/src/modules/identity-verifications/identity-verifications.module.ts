import { Module } from '@nestjs/common';
import {
  IdentityVerificationsAdminController,
  IdentityVerificationsController,
} from './identity-verifications.controller';
import { IdentityVerificationsService } from './identity-verifications.service';
import { IdentityStorageService } from './identity-storage.service';

@Module({
  controllers: [IdentityVerificationsController, IdentityVerificationsAdminController],
  providers: [IdentityVerificationsService, IdentityStorageService],
  exports: [IdentityVerificationsService],
})
export class IdentityVerificationsModule {}
