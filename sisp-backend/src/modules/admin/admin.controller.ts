// Admin controller mapping secure administrative routes
import { Controller, Get, Patch, Post, Param, Body, Query, Delete } from '@nestjs/common';
import { AdminService } from './admin.service';
import { UsersService } from '../users/users.service';
import { UpdateUserDto } from '../users/dto/update-user.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermissions } from '../../common/authz/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@Controller('admin')
@Roles('registrar', 'treasury', 'dean', 'sys_admin')
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

  // ── User management (sys_admin only — Table 3.10) ────────
  @Get('users')
  @RequirePermissions('user.manage')
  async listUsers(@Query('page') page?: string, @Query('limit') limit?: string, @Query('role') roleName?: string) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.adminService.listUsers(pageNum, limitNum, roleName);
  }

  @Get('users/:id')
  @RequirePermissions('user.manage')
  async getUser(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Patch('users/:id')
  @RequirePermissions('user.manage')
  async updateUser(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() actor: JwtPayload,
  ) {
    return this.adminService.updateUser(id, dto, actor.sub);
  }

  @Patch('users/:id/role')
  @RequirePermissions('role.manage')
  async updateUserRole(
    @Param('id') id: string,
    @Body('roleName') roleName: string,
    @CurrentUser() actor: JwtPayload,
  ) {
    return this.adminService.updateUserRole(id, roleName, actor.sub);
  }

  @Patch('users/:id/deactivate')
  @RequirePermissions('user.manage')
  async deactivateUser(@Param('id') id: string, @CurrentUser() actor: JwtPayload) {
    return this.adminService.deactivateUser(id, actor.sub);
  }

  @Post('users/:id/activate')
  @RequirePermissions('user.manage')
  async activateUser(@Param('id') id: string, @CurrentUser() actor: JwtPayload) {
    return this.adminService.activateUser(id, actor.sub);
  }

  @Post('users/:id/archive')
  @RequirePermissions('user.manage')
  async archiveUser(@Param('id') id: string, @CurrentUser() actor: JwtPayload) {
    return this.adminService.archiveUser(id, actor.sub);
  }

  @Post('users/:id/revoke-sessions')
  @RequirePermissions('user.manage')
  async revokeSessions(@Param('id') id: string, @CurrentUser() actor: JwtPayload) {
    return this.adminService.revokeSessions(id, actor.sub);
  }

  @Post('users/create')
  @RequirePermissions('user.manage')
  async createUser(@Body() dto: CreateUserDto) {
    return this.adminService.createUser(dto);
  }

  @Delete('users/:id')
  @RequirePermissions('user.manage')
  async deleteUser(@Param('id') id: string, @CurrentUser() actor: JwtPayload) {
    return this.adminService.deleteUser(id, actor.sub);
  }

  }
