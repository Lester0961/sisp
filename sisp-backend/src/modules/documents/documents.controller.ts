import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { CreateRequestDto } from './dto/create-request.dto';
import { UpdateRequestDto } from './dto/update-request.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@Controller('requests')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  // Student views their own requests
  @Get('me')
  @Roles('student')
  async getMyRequests(@CurrentUser() user: JwtPayload) {
    return this.documentsService.getMyRequests(user.sub);
  }

  // Admin views request statistics
  @Get('stats')
  @Roles('admin_staff', 'dean')
  async getStats() {
    return this.documentsService.getRequestStats();
  }

  // Admin views all requests with optional filters
  @Get()
  @Roles('admin_staff', 'dean')
  async getAllRequests(
    @Query('status') status?: string,
    @Query('type') type?: string,
  ) {
    return this.documentsService.getAllRequests(status, type);
  }

  // Admin views a single request
  @Get(':id')
  @Roles('admin_staff', 'dean')
  async getRequestById(@Param('id') id: string) {
    return this.documentsService.getRequestById(id);
  }

  // Student submits a new document request
  @Post()
  @Roles('student')
  async createRequest(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateRequestDto,
  ) {
    return this.documentsService.createRequest(user.sub, dto);
  }

  // Admin updates request status
  @Patch(':id')
  @Roles('admin_staff', 'dean')
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateRequestDto,
  ) {
    return this.documentsService.updateRequestStatus(id, dto);
  }
}