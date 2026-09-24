import { Controller, Get, Post, Patch, Param, Body } from '@nestjs/common';
import { StudentsService } from './students.service';
import { AdminCreateStudentProfileDto } from './dto/admin-create-student-profile.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermissions } from '../../common/authz/require-permissions.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';


@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  // Student views their own profile
  @Get('me')
  @Roles('student')
  async getMyProfile(@CurrentUser() user: JwtPayload) {
    return this.studentsService.getMyProfile(user.sub);
  }

  // Registrar creates a student profile for a user
  @Post('profile')
  @RequirePermissions('student_record.update')
  async createProfile(@Body() dto: AdminCreateStudentProfileDto) {
    return this.studentsService.createProfile(dto.userId, dto);
  }

  // Staff list student profiles. Registrar/sys_admin see every profile;
  // dean/faculty are scoped to advisees / assigned classes.
  @Get()
  @Roles('registrar', 'dean', 'faculty', 'sys_admin')
  async listAll(@CurrentUser() user: JwtPayload) {
    return this.studentsService.listAll({ sub: user.sub, role: user.role });
  }

  // Staff view a student profile with record-level scope enforcement.
  @Get(':id')
  @Roles('registrar', 'dean', 'faculty', 'sys_admin')
  async getProfileById(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.studentsService.getProfileById(id, { sub: user.sub, role: user.role });
  }

  // Registrar updates a student profile (student_record.update).
  @Patch(':id')
  @RequirePermissions('student_record.update')
  async updateProfile(@Param('id') id: string, @Body() dto: UpdateStudentDto) {
    return this.studentsService.updateProfile(id, dto);
  }
}
