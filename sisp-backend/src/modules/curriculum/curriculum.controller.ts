import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurriculumService } from './curriculum.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@Controller('curricula')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('student')
export class CurriculumController {
  constructor(private readonly curriculumService: CurriculumService) {}

  @Get('me')
  async getMyCurriculum(@CurrentUser() user: JwtPayload) {
    return this.curriculumService.getMyCurriculum(user.sub);
  }
}
