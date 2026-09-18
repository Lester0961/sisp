import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { CreateRequestDto } from './dto/create-request.dto';
import { SubmitProofDto } from './dto/submit-proof.dto';
import { UpdateRequestDto } from './dto/update-request.dto';
import { CreateCatalogItemDto } from './dto/create-catalog-item.dto';
import { UpdateCatalogItemDto } from './dto/update-catalog-item.dto';
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

  // Get document fee list / active catalog
  @Get('fees')
  @Roles('student', 'admin_staff', 'dean')
  async getFees() {
    return this.documentsService.getDocumentFees();
  }

  // Official Treasury online payment channels (public announcement data)
  @Get('payment-channels')
  @Roles('student', 'admin_staff', 'dean')
  async getPaymentChannels() {
    return this.documentsService.getPaymentChannels();
  }

  // Admin: Get all document catalog items (including inactive)
  @Get('catalog')
  @Roles('admin_staff', 'sys_admin', 'dean')
  async getCatalog(@Query('all') all?: string) {
    const includeInactive = all === 'true' || all === '1';
    return this.documentsService.getCatalogItems(includeInactive);
  }

  // Admin: Create a new document catalog item
  @Post('catalog')
  @Roles('admin_staff', 'sys_admin')
  async createCatalogItem(@Body() dto: CreateCatalogItemDto) {
    return this.documentsService.createCatalogItem(dto);
  }

  // Admin: Update a document catalog item
  @Patch('catalog/:id')
  @Roles('admin_staff', 'sys_admin')
  async updateCatalogItem(@Param('id') id: string, @Body() dto: UpdateCatalogItemDto) {
    return this.documentsService.updateCatalogItem(id, dto);
  }

  // Admin: Delete or deactivate a document catalog item
  @Delete('catalog/:id')
  @Roles('admin_staff', 'sys_admin')
  async deleteCatalogItem(@Param('id') id: string) {
    return this.documentsService.deleteCatalogItem(id);
  }

  // Admin views all requests with optional filters
  @Get()
  @Roles('admin_staff', 'dean')
  async getAllRequests(@Query('status') status?: string, @Query('type') type?: string) {
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
  async createRequest(@CurrentUser() user: JwtPayload, @Body() dto: CreateRequestDto) {
    return this.documentsService.createRequest(user.sub, dto);
  }

  // Admin confirms payment, or student marks own request as paid
  @Post(':id/confirm-payment')
  @Roles('admin_staff', 'sys_admin', 'student')
  async confirmPayment(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.documentsService.confirmPayment(user.sub, id, user.role);
  }

  // Student submits online payment proof (GCash/PNB reference) for Treasury verification
  @Post(':id/payment-proof')
  @Roles('student')
  async submitProof(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: SubmitProofDto,
  ) {
    return this.documentsService.submitPaymentProof(user.sub, id, dto);
  }

  // Admin updates request status
  @Patch(':id')
  @Roles('admin_staff', 'dean')
  async updateStatus(@Param('id') id: string, @Body() dto: UpdateRequestDto) {
    return this.documentsService.updateRequestStatus(id, dto);
  }
}
