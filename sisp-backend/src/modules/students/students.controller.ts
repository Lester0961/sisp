import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
} from '@nestjs/common';
import { StudentsService } from './students.service';
import { CreateStudentProfileDto } from './dto/create-student-profile.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
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

  // Admin creates a student profile for a user
  @Post('profile')
  @Roles('admin_staff', 'dean')
  async createProfile(
    @Body() dto: CreateStudentProfileDto & { userId: string },
  ) {
    return this.studentsService.createProfile(dto.userId, dto);
  }

  // Admin lists all student profiles
  @Get()
  @Roles('admin_staff', 'dean', 'faculty')
  async listAll() {
    return this.studentsService.listAll();
  }

  // Admin views any student profile by profile ID
  @Get(':id')
  @Roles('admin_staff', 'dean', 'faculty')
  async getProfileById(@Param('id') id: string) {
    return this.studentsService.getProfileById(id);
  }

  // Admin updates a student profile
  @Patch(':id')
  @Roles('admin_staff', 'dean')
  async updateProfile(
    @Param('id') id: string,
    @Body() dto: UpdateStudentDto,
  ) {
    return this.studentsService.updateProfile(id, dto);
  }
}