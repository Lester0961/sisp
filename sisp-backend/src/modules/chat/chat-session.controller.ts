import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ChatSessionService } from './chat-session.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { ChatSessionMessageDto } from './dto/chat-session-message.dto';
import { ChatGateway } from './chat.gateway';

@Controller('chat/sessions')
export class ChatSessionController {
  constructor(
    private readonly sessionService: ChatSessionService,
    private readonly chatGateway: ChatGateway,
  ) {}

  @Get()
  @Roles('admin_staff', 'dean', 'live_agent')
  async getSessions(@CurrentUser() user: JwtPayload, @Query('status') status?: string) {
    return this.sessionService.getVisibleSessions(user.sub, user.role, status);
  }

  @Get('assigned')
  @Roles('admin_staff', 'dean', 'live_agent')
  async getMyAssignedSessions(@CurrentUser() user: JwtPayload) {
    return this.sessionService.getSessions(user.sub, undefined);
  }

  @Get('me')
  @Roles('student')
  async getMySessions(@CurrentUser() user: JwtPayload) {
    const profile = await this.sessionService.getStudentProfileForUser(user.sub);
    return profile ? this.sessionService.getMySessions(profile.id) : [];
  }

  @Get(':id')
  @Roles('student', 'admin_staff', 'dean', 'live_agent')
  async getSession(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.sessionService.getAuthorizedSession(id, user.sub, user.role);
  }

  @Get(':id/messages')
  @Roles('student', 'admin_staff', 'dean', 'live_agent')
  async getMessages(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.sessionService.getMessages(id, user.sub, user.role);
  }

  @Post(':id/messages')
  @Roles('student', 'admin_staff', 'dean', 'live_agent')
  async sendMessage(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: ChatSessionMessageDto,
  ) {
    const message = await this.sessionService.sendMessage(id, user.sub, body.content, user.role);
    this.chatGateway.emitMessage(id, message);
    return message;
  }

  @Patch(':id/assign')
  @Roles('admin_staff', 'dean', 'live_agent')
  async assignAgent(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    const session = await this.sessionService.assignAgent(id, user.sub, user.role);
    this.chatGateway.emitSessionUpdated(id, session);
    return session;
  }

  @Patch(':id/close')
  @Roles('admin_staff', 'dean', 'live_agent')
  async closeSession(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    const session = await this.sessionService.closeSession(id, user.sub, user.role);
    this.chatGateway.emitSessionUpdated(id, session);
    return session;
  }
}
