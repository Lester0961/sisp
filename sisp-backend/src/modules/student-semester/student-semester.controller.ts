import { Controller, Get, Post, Patch, Param, Body, Query } from '@nestjs/common';
import { StudentSemesterService } from './student-semester.service';
import { CreateStudentSemesterDto, UpdateStudentSemesterDto } from './dto/create-student-semester.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermissions } from '../../common/authz/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@Controller('student-semesters')
export class StudentSemesterController {
  constructor(private readonly service: StudentSemesterService) {}

  @Post()
  @RequirePermissions('financial.manage')
  async create(@Body() dto: CreateStudentSemesterDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @RequirePermissions('financial.manage')
  async update(@Param('id') id: string, @Body() dto: UpdateStudentSemesterDto) {
    return this.service.update(id, dto);
  }

  @Get()
  @RequirePermissions('financial.manage')
  async findAll(@Query('studentId') studentId?: string) {
    if (studentId) {
      return this.service.findByStudent(studentId);
    }
    return this.service.findAll();
  }

  @Get('me')
  @Roles('student')
  async findMySemesters(@CurrentUser() user: JwtPayload) {
    // Need to get student profile from user
    const profile = await this.service['prisma'].studentProfile.findUnique({
      where: { userId: user.sub },
    });
    if (!profile) {
      return { data: [], total: 0 };
    }
    return this.service.findByStudent(profile.id);
  }
}
