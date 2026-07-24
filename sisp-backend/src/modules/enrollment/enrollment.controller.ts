import { Controller, Get, Post, Patch, Param, Body, Query } from '@nestjs/common';
import { EnrollmentService } from './enrollment.service';
import { EnrollDto } from './dto/enroll.dto';
import { UpdateEnrollmentDto } from './dto/update-enrollment.dto';
import { CreateHistoryDto } from './dto/create-history.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@Controller('enrollments')
export class EnrollmentController {
  constructor(private readonly enrollmentService: EnrollmentService) {}

  // Get available courses for enrollment
  @Get('courses')
  @Roles('student', 'admin_staff', 'dean', 'faculty')
  async getAvailableCourses() {
    return this.enrollmentService.getAvailableCourses();
  }

  // Student views their own enrollment history
  @Get('history')
  @Roles('student')
  async getMyHistory(@CurrentUser() user: JwtPayload) {
    return this.enrollmentService.getMyHistory(user.sub);
  }

  // Student views their own enrollments
  @Get('me')
  @Roles('student')
  async getMyEnrollments(@CurrentUser() user: JwtPayload) {
    return this.enrollmentService.getMyEnrollments(user.sub);
  }

  // Student views their completed course IDs
  @Get('completed-ids')
  @Roles('student')
  async getCompletedCourseIds(@CurrentUser() user: JwtPayload) {
    return this.enrollmentService.getCompletedCourseIds(user.sub);
  }

  // Admin views all enrollments
  @Get()
  @Roles('admin_staff', 'dean', 'faculty')
  async getAllEnrollments(
    @Query('studentId') studentId?: string,
    @Query('courseId') courseId?: string,
  ) {
    return this.enrollmentService.getAllEnrollments(studentId, courseId);
  }

  // Student enrolls in a course
  @Post()
  @Roles('student')
  async enroll(@CurrentUser() user: JwtPayload, @Body() dto: EnrollDto) {
    return this.enrollmentService.enroll(user.sub, dto);
  }

  // Student drops a course
  @Patch(':id/drop')
  @Roles('student')
  async dropCourse(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.enrollmentService.dropCourse(id, user.sub);
  }

  // Admin updates enrollment status
  @Patch(':id/status')
  @Roles('admin_staff', 'dean')
  async updateStatus(@Param('id') id: string, @Body() dto: UpdateEnrollmentDto) {
    return this.enrollmentService.updateEnrollmentStatus(id, dto);
  }

  // Admin creates enrollment history record
  @Post(':studentId/history')
  @Roles('admin_staff', 'dean')
  async createHistory(@Param('studentId') studentId: string, @Body() dto: CreateHistoryDto) {
    return this.enrollmentService.createHistory(studentId, dto);
  }
}
