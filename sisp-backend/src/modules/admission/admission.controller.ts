import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { AdmissionService } from './admission.service';
import {
  CreateAdmissionApplicationDto,
  ReviewAdmissionApplicationDto,
  ReviewAdmissionRequirementDto,
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

  // Public: Submit a new admission application (rate-limited against spam)
  @Public()
  @Throttle({ default: { ttl: 15 * 60_000, limit: 5 } })
  @Post('apply')
  async createApplication(@Body() dto: CreateAdmissionApplicationDto) {
    return this.admissionService.createApplication(dto);
  }

  // Public/Applicant: Check application status by Application Number + email
  // proof. The recorded application email is the applicant's verification
  // factor; unmatched requests receive the same "not found" response.
  @Public()
  @Get('status/:applicationNo')
  async getApplicationStatus(
    @Param('applicationNo') applicationNo: string,
    @Query('email') email?: string,
  ) {
    if (!email) {
      throw new BadRequestException(
        'The email address used in the application is required to view its status.',
      );
    }
    return this.admissionService.getPublicApplicationStatus(applicationNo, email);
  }

  // Public/Applicant: Submit the enrollment/down-payment receipt (base64, 10 MB cap)
  @Public()
  @Throttle({ default: { ttl: 15 * 60_000, limit: 20 } })
  @Post('status/:applicationNo/requirements')
  async submitRequirement(
    @Param('applicationNo') applicationNo: string,
    @Body() dto: SubmitRequirementDto,
  ) {
    return this.admissionService.submitRequirement(applicationNo, dto);
  }

  // Admin / Admission Staff: List applications
  @Get('applications')
  @Roles('registrar', 'sys_admin', 'dean')
  async listApplications(
    @Query('status') status?: string,
    @Query('programId') programId?: string,
    @Query('applicantType') applicantType?: string,
  ) {
    return this.admissionService.listApplications(status, programId, applicantType);
  }

  // Admin / Admission Staff: Review & Approve/Reject application
  @Patch('applications/:applicationNo/review')
  @Roles('registrar', 'sys_admin', 'dean')
  async reviewApplication(
    @CurrentUser() user: JwtPayload,
    @Param('applicationNo') applicationNo: string,
    @Body() dto: ReviewAdmissionApplicationDto,
  ) {
    return this.admissionService.reviewApplication(applicationNo, user.sub, dto);
  }

  // Admin / Admission Staff: Verify or reject an uploaded requirement
  @Patch('applications/:applicationNo/requirements/:submissionId/review')
  @Roles('registrar', 'sys_admin', 'dean')
  async reviewRequirement(
    @CurrentUser() user: JwtPayload,
    @Param('applicationNo') applicationNo: string,
    @Param('submissionId') submissionId: string,
    @Body() dto: ReviewAdmissionRequirementDto,
  ) {
    return this.admissionService.reviewRequirement(
      applicationNo,
      submissionId,
      user.sub,
      dto,
    );
  }

  @Get('applications/:applicationNo/requirements/:submissionId/file')
  @Roles('registrar', 'sys_admin', 'dean')
  async requirementFile(
    @Param('applicationNo') applicationNo: string,
    @Param('submissionId') submissionId: string,
    @Res() response: Response,
  ) {
    const asset = await this.admissionService.getRequirementReviewAsset(applicationNo, submissionId);
    if (asset.url) return response.redirect(302, asset.url);
    const filename = asset.fileName.replace(/[\\/\r\n"]+/g, '_');
    response.setHeader('Cache-Control', 'private, no-store');
    response.setHeader('Content-Type', ['application/pdf', 'image/jpeg', 'image/png'].includes(asset.mimeType)
      ? asset.mimeType
      : 'application/octet-stream');
    response.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    if (!asset.content) return response.sendStatus(404);
    return response.send(asset.content);
  }
}
