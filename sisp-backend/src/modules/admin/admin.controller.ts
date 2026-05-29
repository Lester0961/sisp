// Admin controller mapping secure administrative routes
import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Body,
  Query,
  Delete,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { UsersService } from '../users/users.service';
import { UpdateUserDto } from '../users/dto/update-user.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@Controller('admin')
@Roles('admin_staff', 'dean', 'faculty')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly usersService: UsersService,
  ) {}

  // ── Dashboard stats ──────────────────────────────────────
  @Get('dashboard/stats')
  async getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  // ── User management (FIX #2 — routes under /admin prefix) ──
  @Get('users')
  @Roles('admin_staff')
  async listUsers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.adminService.listUsers(pageNum, limitNum);
  }

  @Get('users/:id')
  async getUser(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Patch('users/:id')
  async updateUser(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.updateById(id, dto);
  }

  @Patch('users/:id/role')
  @Roles('admin_staff')
  async updateUserRole(
    @Param('id') id: string,
    @Body('roleName') roleName: string,
  ) {
    return this.adminService.updateUserRole(id, roleName);
  }

  @Patch('users/:id/deactivate')
  @Roles('admin_staff')
  async deactivateUser(@Param('id') id: string) {
    return this.adminService.deactivateUser(id);
  }

  @Post('users/create')
  @Roles('admin_staff')
  async createUser(@Body() dto: CreateUserDto) {
    return this.adminService.createUser(dto);
  }

  @Delete('users/:id')
  @Roles('admin_staff')
  async deleteUser(@Param('id') id: string) {
    return this.adminService.deleteUser(id);
  }

  // ── Dean exception approval (FIX #9) ─────────────────────
  @Post('dean/approve-exception')
  @Roles('dean', 'admin_staff')
  async approveException(
    @Body()
    body: {
      exceptionId: string;
      decision: 'approved' | 'rejected';
    },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.adminService.approveException(
      body.exceptionId,
      body.decision,
      user.sub,
    );
  }
}