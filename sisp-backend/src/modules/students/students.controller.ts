import { Controller, Get, Post, Patch, Param, Body } from '@nestjs/common';
import { StudentsService } from './students.service';
import { AdminCreateStudentProfileDto } from './dto/admin-create-student-profile.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { ActivateStudentAccountDto } from './dto/activate-student.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

import { Public } from '../../common/decorators/public.decorator';

@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  // Flow B: Public lookup / claim existing unactivated student record.
  // Identity is verified against the institutional admission record and the
  // student chooses their own password (Phase 1, P1-09).
  @Public()
  @Post('activate')
  async activateAccount(@Body() dto: ActivateStudentAccountDto) {
    return this.studentsService.activateAccount(
      dto.studentNumber,
      dto.dob,
      dto.email,
      dto.newPassword,
    );
  }

  // Student views their own profile
  @Get('me')
  @Roles('student')
  async getMyProfile(@CurrentUser() user: JwtPayload) {
    return this.studentsService.getMyProfile(user.sub);
  }

  // Admin creates a student profile for a user
  @Post('profile')
  @Roles('registrar', 'dean')
  async createProfile(@Body() dto: AdminCreateStudentProfileDto) {
    return this.studentsService.createProfile(dto.userId, dto);
  }

  // Admin lists all student profiles
  @Get()
  @Roles('registrar', 'dean')
  async listAll() {
    return this.studentsService.listAll();
  }

  // Admin views any student profile by profile ID
  @Get(':id')
  @Roles('registrar', 'dean')
  async getProfileById(@Param('id') id: string) {
    return this.studentsService.getProfileById(id);
  }

  // Admin updates a student profile
  @Patch(':id')
  @Roles('registrar', 'dean')
  async updateProfile(@Param('id') id: string, @Body() dto: UpdateStudentDto) {
    return this.studentsService.updateProfile(id, dto);
  }
}
