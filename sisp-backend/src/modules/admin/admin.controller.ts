import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Body,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { UsersService } from '../users/users.service';
import { UpdateUserDto } from '../users/dto/update-user.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@Controller('admin')
@Roles('admin_staff', 'dean')
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
  async listUsers() {
    return this.usersService.listAll();
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