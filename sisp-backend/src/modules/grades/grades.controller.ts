import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { GradesService } from './grades.service';
import { CreateGradeDto } from './dto/create-grade.dto';
import { UpdateGradeDto } from './dto/update-grade.dto';
import { BulkGradeDto } from './dto/bulk-grade.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@Controller('grades')
export class GradesController {
  constructor(private readonly gradesService: GradesService) {}

  // Student views their own visible grades
  @Get('me')
  @Roles('student')
  async getMyGrades(@CurrentUser() user: JwtPayload) {
    return this.gradesService.getMyGrades(user.sub);
  }

  // Faculty/Admin views all grades
  @Get()
  @Roles('faculty', 'admin_staff', 'dean')
  async getAllGrades(
    @Query('studentId') studentId?: string,
    @Query('enrollmentId') enrollmentId?: string,
  ) {
    if (enrollmentId) {
      return this.gradesService.getGradesByEnrollment(enrollmentId);
    }
    if (studentId) {
      return this.gradesService.getGradesByStudent(studentId);
    }
    return this.gradesService.getAllGrades();
  }

  // Faculty encodes a grade for an enrollment
  @Post()
  @Roles('faculty', 'admin_staff', 'dean')
  async createGrade(@Body() dto: CreateGradeDto) {
    return this.gradesService.createGrade(dto);
  }

  // Faculty bulk encodes grades
  @Post('bulk')
  @Roles('faculty', 'admin_staff', 'dean')
  async bulkCreateGrades(@Body() dto: BulkGradeDto) {
    return this.gradesService.bulkCreateGrades(dto);
  }

  // Faculty updates grade components
  @Patch(':id')
  @Roles('faculty', 'admin_staff', 'dean')
  async updateGrade(
    @Param('id') id: string,
    @Body() dto: UpdateGradeDto,
  ) {
    return this.gradesService.updateGrade(id, dto);
  }

  // Faculty toggles grade visibility for students
  @Patch(':id/visibility')
  @Roles('faculty', 'admin_staff', 'dean')
  async toggleVisibility(
    @Param('id') id: string,
    @Body() body: { isVisible: boolean },
  ) {
    return this.gradesService.toggleVisibility(id, body.isVisible);
  }
}