import { Module } from '@nestjs/common';
import { FinanceService } from './finance.service';
import { FinanceController, TreasuryFinanceController } from './finance.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [FinanceController, TreasuryFinanceController],
  providers: [FinanceService],
  exports: [FinanceService],
})
export class FinanceModule {}
