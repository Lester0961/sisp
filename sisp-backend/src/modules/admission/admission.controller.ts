import { Controller, Get, Post, Patch, Param, Body, Query } from '@nestjs/common';
import { AdmissionService } from './admission.service';
import {
  CreateAdmissionApplicationDto,
  ReviewAdmissionApplicationDto,
  SubmitRequirementDto,
} from './dto/admission.dto';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@Controller('admission')
export class AdmissionController {
  constructor(private readonly admissionService: AdmissionService) {}

  // Public: Get admission requirement definitions
  @Public()
  @Get('requirements/definitions')
  async getRequirementDefinitions(@Query('applicantType') applicantType?: string) {
    return this.admissionService.getRequirementDefinitions(applicantType);
  }

  // Public: Submit a new admission application
  @Public()
  @Post('apply')
  async createApplication(@Body() dto: CreateAdmissionApplicationDto) {
    return this.admissionService.createApplication(dto);
  }

  // Public/Applicant: Check application status by Application Number
  @Public()
  @Get('status/:applicationNo')
  async getApplicationStatus(@Param('applicationNo') applicationNo: string) {
    return this.admissionService.getApplicationByNo(applicationNo);
  }

  // Public/Applicant: Submit required document for an application
  @Public()
  @Post('status/:applicationNo/requirements')
  async submitRequirement(
    @Param('applicationNo') applicationNo: string,
    @Body() dto: SubmitRequirementDto,
  ) {
    return this.admissionService.submitRequirement(applicationNo, dto);
  }

  // Admin / Admission Staff: List applications
  @Get('applications')
  @Roles('admin_staff', 'sys_admin', 'dean')
  async listApplications(
    @Query('status') status?: string,
    @Query('programId') programId?: string,
    @Query('applicantType') applicantType?: string,
  ) {
    return this.admissionService.listApplications(status, programId, applicantType);
  }

  // Admin / Admission Staff: Review & Approve/Reject application
  @Patch('applications/:applicationNo/review')
  @Roles('admin_staff', 'sys_admin', 'dean')
  async reviewApplication(
    @CurrentUser() user: JwtPayload,
    @Param('applicationNo') applicationNo: string,
    @Body() dto: ReviewAdmissionApplicationDto,
  ) {
    return this.admissionService.reviewApplication(applicationNo, user.sub, dto);
  }
}
