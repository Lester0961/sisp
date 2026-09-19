import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { FinanceService } from './finance.service';
import { RecordTransactionDto, VerifyTransactionDto } from './dto/finance.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/authz/require-permissions.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

// Student financial information (P6): read-only own record.
@Controller('finance')
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Get('me/summary')
  @RequirePermissions('financial.read_own')
  async getMySummary(@CurrentUser() user: JwtPayload) {
    return this.financeService.getMySummary(user.sub);
  }
}

// Treasury / Accounting financial management (P6-01).
@Controller('finance')
@RequirePermissions('financial.manage')
export class TreasuryFinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Get('students')
  async searchStudents(@Query('query') query?: string) {
    return this.financeService.searchStudents(query);
  }

  @Get('students/:studentProfileId')
  async getStudentSummary(@Param('studentProfileId') studentProfileId: string) {
    return this.financeService.getStudentSummary(studentProfileId);
  }

  @Post('transactions')
  async recordTransaction(
    @CurrentUser() user: JwtPayload,
    @Body() dto: RecordTransactionDto,
  ) {
    return this.financeService.recordTransaction(user.sub, dto);
  }

  @Patch('transactions/:id/verify')
  async verifyTransaction(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: VerifyTransactionDto,
  ) {
    return this.financeService.verifyTransaction(user.sub, id, dto);
  }

  @Patch('transactions/:id/void')
  async voidTransaction(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.financeService.voidTransaction(user.sub, id);
  }
}
