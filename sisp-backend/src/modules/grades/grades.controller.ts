import { Controller, Get, Post, Patch, Param, Body, Query } from '@nestjs/common';
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
    @Query('status') status?: string,
  ) {
    if (status) {
      return this.gradesService.getGradesByStatus(status);
    }
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

  // Faculty updates grade components (only draft or rejected)
  @Patch(':id')
  @Roles('faculty', 'admin_staff', 'dean')
  async updateGrade(@Param('id') id: string, @Body() dto: UpdateGradeDto) {
    return this.gradesService.updateGrade(id, dto);
  }

  // Faculty submits grade to registrar
  @Post(':id/submit')
  @Roles('faculty')
  async submitGrade(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.gradesService.submitGrade(user.sub, id);
  }

  // Registrar posts grade to dean
  @Post(':id/post')
  @Roles('admin_staff')
  async postGrade(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.gradesService.postGrade(user.sub, id);
  }

  // Dean approves grade
  @Post(':id/approve')
  @Roles('dean')
  async approveGrade(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.gradesService.approveGrade(user.sub, id);
  }

  // Dean rejects grade
  @Post(':id/reject')
  @Roles('dean')
  async rejectGrade(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: { remarks: string },
  ) {
    return this.gradesService.rejectGrade(user.sub, id, body.remarks);
  }

  // Legacy toggle visibility (kept for backward compatibility but restricted)
  @Patch(':id/visibility')
  @Roles('admin_staff', 'dean')
  async toggleVisibility(@Param('id') id: string, @Body() body: { isVisible: boolean }) {
    return this.gradesService.toggleVisibility(id, body.isVisible);
  }
}
