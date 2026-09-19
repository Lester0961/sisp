import { Controller, Get, Post, Patch, Param, Body, Query } from '@nestjs/common';
import { EnrollmentService } from './enrollment.service';
import { EnrollDto } from './dto/enroll.dto';
import { UpdateEnrollmentDto } from './dto/update-enrollment.dto';
import { CreateHistoryDto } from './dto/create-history.dto';
import { AssignInstructorDto } from './dto/assign-instructor.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermissions } from '../../common/authz/require-permissions.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@Controller('enrollments')
export class EnrollmentController {
  constructor(private readonly enrollmentService: EnrollmentService) {}

  // Get available courses for enrollment
  @Get('courses')
  @Roles('student', 'registrar', 'dean', 'faculty')
  async getAvailableCourses(@CurrentUser() user: JwtPayload, @Query('termId') termId?: string) {
    // Students get program+term scoped listing; staff keep full listing when needed.
    const role = (user as { role?: string }).role;
    if (role === 'student' || !role) return this.enrollmentService.getAvailableCourses(user.sub, termId);
    if (termId) return this.enrollmentService.getAvailableCourses(undefined, termId);
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

  // Student views their published class schedule (P4-05)
  @Get('schedule')
  @Roles('student')
  async getMySchedule(@CurrentUser() user: JwtPayload) {
    return this.enrollmentService.getMySchedule(user.sub);
  }

  // Student views their completed course IDs
  @Get('completed-ids')
  @Roles('student')
  async getCompletedCourseIds(@CurrentUser() user: JwtPayload) {
    return this.enrollmentService.getCompletedCourseIds(user.sub);
  }

  // Admin views all enrollments. Faculty are restricted to their own
  // assigned enrollments (P8-01); registrar/dean keep the full list.
  @Get()
  @Roles('registrar', 'dean', 'faculty')
  async getAllEnrollments(
    @CurrentUser() user: JwtPayload,
    @Query('studentId') studentId?: string,
    @Query('courseId') courseId?: string,
    @Query('termId') termId?: string,
    @Query('instructorId') instructorId?: string,
  ) {
    if (user.role === 'faculty') {
      return this.enrollmentService.getAllEnrollments(undefined, undefined, termId, user.sub);
    }
    return this.enrollmentService.getAllEnrollments(studentId, courseId, termId, instructorId);
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
  @RequirePermissions('enrollment.process')
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateEnrollmentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.enrollmentService.updateEnrollmentStatus(id, dto, user.sub);
  }

  // Registrar assigns the faculty owner for a term enrollment.
  @Patch(':id/instructor')
  @RequirePermissions('enrollment.process')
  async assignInstructor(@Param('id') id: string, @Body() dto: AssignInstructorDto) {
    return this.enrollmentService.assignInstructor(id, dto.instructorId);
  }

  // Admin creates enrollment history record
  @Post(':studentId/history')
  @RequirePermissions('enrollment.process')
  async createHistory(@Param('studentId') studentId: string, @Body() dto: CreateHistoryDto) {
    return this.enrollmentService.createHistory(studentId, dto);
  }
}
