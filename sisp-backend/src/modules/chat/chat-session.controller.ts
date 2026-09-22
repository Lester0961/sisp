import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ChatSessionService } from './chat-session.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { ChatSessionMessageDto } from './dto/chat-session-message.dto';
import { ChatSessionCloseDto } from './dto/chat-session-close.dto';
import { ReassignChatSessionDto } from './dto/reassign-chat-session.dto';
import { ChatGateway } from './chat.gateway';

@Controller('chat/sessions')
export class ChatSessionController {
  constructor(
    private readonly sessionService: ChatSessionService,
    private readonly chatGateway: ChatGateway,
  ) {}

  @Get()
  @Roles('registrar', 'dean', 'live_agent')
  async getSessions(
    @CurrentUser() user: JwtPayload,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.sessionService.getVisibleSessions(user.sub, user.role, status, Number(page) || 1, Number(pageSize) || 25);
  }

  @Get('assigned')
  @Roles('registrar', 'dean', 'live_agent')
  async getMyAssignedSessions(@CurrentUser() user: JwtPayload) {
    return this.sessionService.getSessions(user.sub, undefined);
  }

  @Get('me')
  @Roles('student')
  async getMySessions(@CurrentUser() user: JwtPayload) {
    const profile = await this.sessionService.getStudentProfileForUser(user.sub);
    return profile ? this.sessionService.getMySessions(profile.id) : [];
  }

  @Get('eligible-assignees')
  @Roles('registrar', 'dean')
  async getEligibleAssignees() {
    return this.sessionService.getEligibleAssignees();
  }

  @Post('request-human-assistance/:chatLogId')
  @Roles('student')
  async requestHumanAssistance(@CurrentUser() user: JwtPayload, @Param('chatLogId') chatLogId: string) {
    return this.sessionService.requestHumanAssistance(chatLogId, user.sub);
  }

  @Get(':id')
  @Roles('student', 'registrar', 'dean', 'live_agent')
  async getSession(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.sessionService.getAuthorizedSession(id, user.sub, user.role);
  }

  @Get(':id/messages')
  @Roles('student', 'registrar', 'dean', 'live_agent')
  async getMessages(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.sessionService.getMessages(id, user.sub, user.role);
  }

  @Post(':id/messages')
  @Roles('student', 'registrar', 'dean', 'live_agent')
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
  @Roles('registrar', 'dean', 'live_agent')
  async assignAgent(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    const session = await this.sessionService.assignAgent(id, user.sub, user.role);
    this.chatGateway.emitSessionUpdated(id, session);
    return session;
  }

  @Patch(':id/reassign')
  @Roles('registrar', 'dean')
  async reassignAgent(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: ReassignChatSessionDto,
  ) {
    const reassignment = await this.sessionService.reassignAgent(id, user.sub, body.assigneeId, user.role);
    if (reassignment.previousAgentId && reassignment.previousAgentId !== body.assigneeId) {
      await this.chatGateway.revokeUserFromSession(id, reassignment.previousAgentId);
    }
    this.chatGateway.emitSessionUpdated(id, reassignment.session);
    return reassignment.session;
  }

  @Patch(':id/close')
  @Roles('registrar', 'dean', 'live_agent')
  async closeSession(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() body: ChatSessionCloseDto) {
    const session = await this.sessionService.closeSession(id, user.sub, user.role, body.resolution);
    this.chatGateway.emitSessionUpdated(id, session);
    return session;
  }
}
