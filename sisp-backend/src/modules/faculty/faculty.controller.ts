import { Controller, Get, Query } from '@nestjs/common';
import { FacultyService } from './faculty.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@Controller('faculty')
@Roles('faculty')
export class FacultyController {
  constructor(private readonly facultyService: FacultyService) {}

  // Assigned classes/subjects for the authenticated faculty member (P8-01).
  @Get('classes')
  async getAssignedClasses(
    @CurrentUser() user: JwtPayload,
    @Query('termId') termId?: string,
  ) {
    return this.facultyService.getAssignedClasses(user.sub, termId);
  }

  // Class roster for an assigned class (P8-02). Ownership is enforced: only
  // enrollments assigned to the authenticated faculty member are returned.
  @Get('classes/roster')
  async getClassRoster(
    @CurrentUser() user: JwtPayload,
    @Query('courseId') courseId: string,
    @Query('termId') termId?: string,
    @Query('section') section?: string,
  ) {
    return this.facultyService.getClassRoster(user.sub, courseId, termId, section);
  }
}