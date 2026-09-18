import { Controller, Get, Param, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { CurriculumService } from './curriculum.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@Controller('curricula')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CurriculumController {
  constructor(private readonly curriculumService: CurriculumService) {}

  @Get('me')
  @Roles('student')
  async getMyCurriculum(@CurrentUser() user: JwtPayload) {
    return this.curriculumService.getMyCurriculum(user.sub);
  }

  @Get('programs')
  @Roles('admin_staff', 'dean', 'sys_admin', 'faculty')
  async listPrograms() {
    return this.curriculumService.listPrograms();
  }

  @Get('by-program/:code')
  @Roles('admin_staff', 'dean', 'sys_admin', 'faculty', 'student')
  async getByProgram(
    @Param('code') code: string,
    @Query('effectiveYear', new ParseIntPipe({ optional: true })) effectiveYear?: number,
  ) {
    return this.curriculumService.getByProgram(code, effectiveYear);
  }
}
