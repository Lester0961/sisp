import { Controller, Get, Param, Query } from '@nestjs/common';
import { AuditService } from './audit.service';
import { RequirePermissions } from '../../common/authz/require-permissions.decorator';

// Table 3.10: audit logs are visible to the System Administrator only.
@Controller('audit')
@RequirePermissions('audit.read')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('stats')
  async getStats() {
    return this.auditService.getAuditStats();
  }

  @Get('user/:userId')
  async getByUser(@Param('userId') userId: string) {
    return this.auditService.getLogsByUser(userId);
  }

  @Get('resource/:resource')
  async getByResource(@Param('resource') resource: string) {
    return this.auditService.getLogsByResource(resource);
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.auditService.getLogById(id);
  }

  @Get()
  async getAllLogs(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('userId') userId?: string,
    @Query('resource') resource?: string,
    @Query('action') action?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.auditService.getAllLogs(
      page ? Number(page) : 1,
      limit ? Number(limit) : 50,
      userId,
      resource,
      action,
      startDate,
      endDate,
    );
  }
}
