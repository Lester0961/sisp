import { Module } from '@nestjs/common';
import {
  IdentityVerificationsAdminController,
  IdentityVerificationsController,
} from './identity-verifications.controller';
import { IdentityVerificationsService } from './identity-verifications.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  controllers: [IdentityVerificationsController, IdentityVerificationsAdminController],
  imports: [AuthModule],
  providers: [IdentityVerificationsService],
  exports: [IdentityVerificationsService],
})
export class IdentityVerificationsModule {}
