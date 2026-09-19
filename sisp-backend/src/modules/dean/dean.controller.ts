import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { DeanService } from './dean.service';
import { CreateConcernDto, UpdateConcernDto } from './dto/concern.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@Controller('dean')
@Roles('dean')
export class DeanController {
  constructor(private readonly deanService: DeanService) {}

  @Get('advisees')
  async getAdvisees(@CurrentUser() user: JwtPayload) {
    return this.deanService.getAdvisees(user.sub);
  }

  @Get('advisees/:studentProfileId')
  async getAdviseeDetail(
    @CurrentUser() user: JwtPayload,
    @Param('studentProfileId') studentProfileId: string,
  ) {
    return this.deanService.getAdviseeDetail(user.sub, studentProfileId);
  }

  @Get('concerns')
  async getConcerns(@CurrentUser() user: JwtPayload) {
    return this.deanService.getConcerns(user.sub);
  }

  @Post('concerns')
  async createConcern(@CurrentUser() user: JwtPayload, @Body() dto: CreateConcernDto) {
    return this.deanService.createConcern(user.sub, dto);
  }

  @Patch('concerns/:id')
  async updateConcern(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateConcernDto,
  ) {
    return this.deanService.updateConcern(user.sub, id, dto);
  }

  @Delete('concerns/:id')
  async deleteConcern(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.deanService.deleteConcern(user.sub, id);
  }
}