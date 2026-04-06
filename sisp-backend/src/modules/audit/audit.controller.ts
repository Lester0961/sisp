import {
  Controller,
  Get,
  Param,
  Query,
} from '@nestjs/common';
import { AuditService } from './audit.service';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('audit')
@Roles('admin_staff', 'dean')
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
  ) {
    return this.auditService.getAllLogs(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 50,
      userId,
      resource,
    );
  }
}