import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { StudentSemesterService } from './student-semester.service';
import { CreateStudentSemesterDto, UpdateStudentSemesterDto } from './dto/create-student-semester.dto';

@Controller('student-terms')
export class StudentTermController {
  constructor(private readonly service: StudentSemesterService) {}

  @Post()
  @Roles('admin_staff', 'sys_admin')
  async create(@Body() dto: CreateStudentSemesterDto) {
    return this.service.create(dto);
  }

  @Patch(':id/payment')
  @Roles('admin_staff', 'sys_admin')
  async updatePayment(@Param('id') id: string, @Body() dto: UpdateStudentSemesterDto) {
    return this.service.update(id, dto);
  }

  @Get()
  @Roles('admin_staff', 'sys_admin', 'dean')
  async findAll(@Query('studentId') studentId?: string) {
    return studentId ? this.service.findByStudent(studentId) : this.service.findAll();
  }

  @Get('me')
  @Roles('student')
  async findMyTerms(@CurrentUser() user: JwtPayload) {
    const profile = await this.service['prisma'].studentProfile.findUnique({ where: { userId: user.sub } });
    if (!profile) return { data: [], total: 0 };
    return this.service.findByStudent(profile.id);
  }
}
