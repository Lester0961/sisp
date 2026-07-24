import { Controller, Get, Post, Patch, Param, Body, Query } from '@nestjs/common';
import { ChatSessionService } from './chat-session.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@Controller('chat/sessions')
export class ChatSessionController {
  constructor(private readonly sessionService: ChatSessionService) {}

  @Get()
  @Roles('admin_staff', 'dean', 'live_agent')
  async getSessions(@Query('status') status?: string) {
    return this.sessionService.getSessions(undefined, status);
  }

  @Get('assigned')
  @Roles('admin_staff', 'dean', 'live_agent')
  async getMyAssignedSessions(@CurrentUser() user: JwtPayload) {
    return this.sessionService.getSessions(user.sub, undefined);
  }

  @Get('me')
  @Roles('student')
  async getMySessions(@CurrentUser() user: JwtPayload) {
    // Get student profile from user
    const profile = await this.sessionService['prisma'].studentProfile.findUnique({
      where: { userId: user.sub },
    });
    if (!profile) {
      return [];
    }
    return this.sessionService.getMySessions(profile.id);
  }

  @Get(':id')
  @Roles('student', 'admin_staff', 'dean', 'live_agent')
  async getSession(@Param('id') id: string) {
    return this.sessionService.getSessionById(id);
  }

  @Get(':id/messages')
  @Roles('student', 'admin_staff', 'dean', 'live_agent')
  async getMessages(@Param('id') id: string) {
    return this.sessionService.getMessages(id);
  }

  @Post(':id/messages')
  @Roles('student', 'admin_staff', 'dean', 'live_agent')
  async sendMessage(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: { content: string },
  ) {
    return this.sessionService.sendMessage(id, user.sub, body.content, user.role);
  }

  @Patch(':id/assign')
  @Roles('admin_staff', 'dean', 'live_agent')
  async assignAgent(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    return this.sessionService.assignAgent(id, user.sub);
  }

  @Patch(':id/close')
  @Roles('admin_staff', 'dean', 'live_agent')
  async closeSession(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    return this.sessionService.closeSession(id, user.sub);
  }
}
