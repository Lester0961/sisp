import { Module } from '@nestjs/common';
import {
  IdentityVerificationsAdminController,
  IdentityVerificationsController,
} from './identity-verifications.controller';
import { IdentityVerificationsService } from './identity-verifications.service';

@Module({
  controllers: [IdentityVerificationsController, IdentityVerificationsAdminController],
  providers: [IdentityVerificationsService],
  exports: [IdentityVerificationsService],
})
export class IdentityVerificationsModule {}
