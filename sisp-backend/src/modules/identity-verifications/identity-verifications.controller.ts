import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
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

  @Patch(':id/review')
  @RequirePermissions('student_record.update')
  async review(
    @Param('id') id: string,
    @Body() dto: ReviewIdentityVerificationDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.review(id, user.sub, dto);
  }
}
