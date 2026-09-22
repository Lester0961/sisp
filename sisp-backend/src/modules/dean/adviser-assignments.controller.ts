import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { DeanService } from './dean.service';
import {
  CreateAdviserAssignmentDto,
  UpdateAdviserAssignmentDto,
} from './dto/adviser-assignment.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

/**
 * Registrar-owned writer for AdviserAssignment rows. Dean/advisee scoping was
 * enforced everywhere but nothing could create assignments, so Deans had empty
 * advisee lists in production. Only Registrar (and sys_admin) may assign.
 */
@Controller('registrar/adviser-assignments')
@Roles('registrar', 'sys_admin')
export class AdviserAssignmentsController {
  constructor(private readonly deanService: DeanService) {}

  @Get('advisers')
  async getAdvisers() {
    return this.deanService.getAdviserCandidates();
  }

  @Get()
  async list(@Query('search') search?: string) {
    return this.deanService.listAdviserAssignments(search?.trim() || undefined);
  }

  @Post()
  async create(@CurrentUser() user: JwtPayload, @Body() dto: CreateAdviserAssignmentDto) {
    return this.deanService.createAdviserAssignment(user.sub, dto);
  }

  @Patch(':id')
  async updateStatus(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateAdviserAssignmentDto,
  ) {
    return this.deanService.updateAdviserAssignmentStatus(user.sub, id, dto.status);
  }
}
