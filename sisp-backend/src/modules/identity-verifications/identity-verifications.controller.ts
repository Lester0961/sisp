import { Body, Controller, Get, Param, Patch, Post, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { IdentityVerificationsService } from './identity-verifications.service';
import { CreateIdentityVerificationDto } from './dto/create-identity-verification.dto';
import { ReviewIdentityVerificationDto } from './dto/review-identity-verification.dto';
import { UploadVerificationDocumentDto } from './dto/upload-verification-document.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/authz/require-permissions.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@Controller('identity-verifications')
export class IdentityVerificationsController {
  constructor(private readonly service: IdentityVerificationsService) {}

  @Public()
  @Throttle({ default: { ttl: 15 * 60_000, limit: 3 } })
  @Post()
  async create(@Body() dto: CreateIdentityVerificationDto) {
    return this.service.create(dto);
  }

  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Get(':id/status')
  async status(@Param('id') id: string, @Query('email') email: string) {
    return this.service.getPublicStatus(id, email ?? '');
  }

  @Public()
  @Throttle({ default: { ttl: 15 * 60_000, limit: 10 } })
  @Post(':id/documents')
  async uploadDocument(@Param('id') id: string, @Body() dto: UploadVerificationDocumentDto) {
    return this.service.uploadDocument(id, dto);
  }
}

@Controller('admin/identity-verifications')
export class IdentityVerificationsAdminController {
  constructor(private readonly service: IdentityVerificationsService) {}

  @Get()
  @RequirePermissions('student_record.update')
  async list(@Query('status') status?: string) {
    return this.service.listForReview(status);
  }

  @Get('student-candidates')
  @RequirePermissions('student_record.update')
  async studentCandidates(@Query('query') query = '') {
    return this.service.searchStudentRecords(query);
  }

  @Patch(':id/review')
  @RequirePermissions('student_record.update')
  async review(
    @Param('id') id: string,
    @Body() dto: ReviewIdentityVerificationDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.review(id, user.sub, dto);
  }

  @Get(':id/documents/:documentId/url')
  @RequirePermissions('student_record.update')
  async documentUrl(@Param('id') id: string, @Param('documentId') documentId: string) {
    return this.service.getDocumentSignedUrl(id, documentId);
  }

  @Get(':id/documents/:documentId/file')
  @RequirePermissions('student_record.update')
  async documentFile(
    @Param('id') id: string,
    @Param('documentId') documentId: string,
    @Res() response: Response,
  ) {
    const asset = await this.service.getDocumentReviewAsset(id, documentId);
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
