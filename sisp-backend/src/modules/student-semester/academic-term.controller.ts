import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { AcademicTermService } from './academic-term.service';
import { CreateAcademicTermDto, UpdateAcademicTermDto } from './dto/academic-term.dto';

@Controller('academic-terms')
export class AcademicTermController {
  constructor(private readonly service: AcademicTermService) {}

  @Get()
  @Roles('student', 'faculty', 'dean', 'admin_staff', 'sys_admin')
  async findAll() {
    return this.service.findAll();
  }

  @Get('current')
  @Roles('student', 'faculty', 'dean', 'admin_staff', 'sys_admin')
  async findCurrent() {
    return this.service.findCurrent();
  }

  @Post()
  @Roles('admin_staff', 'sys_admin')
  async create(@Body() dto: CreateAcademicTermDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles('admin_staff', 'sys_admin')
  async update(@Param('id') id: string, @Body() dto: UpdateAcademicTermDto) {
    return this.service.update(id, dto);
  }
}
