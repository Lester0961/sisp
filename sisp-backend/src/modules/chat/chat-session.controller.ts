import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ChatSessionService } from './chat-session.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermissions } from '../../common/authz/require-permissions.decorator';
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
  @Roles('faculty', 'dean', 'registrar', 'treasury', 'sys_admin')
  @RequirePermissions('escalation.respond')
  async getSessions(
    @CurrentUser() user: JwtPayload,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.sessionService.getVisibleSessions(user.sub, user.role, status, Number(page) || 1, Number(pageSize) || 25);
  }

  @Get('assigned')
  @Roles('faculty', 'dean', 'registrar', 'treasury', 'sys_admin')
  @RequirePermissions('escalation.respond')
  async getMyAssignedSessions(@CurrentUser() user: JwtPayload) {
    return this.sessionService.getSessions(user.sub, undefined);
  }

  @Get('me')
  @Roles('student')
  async getMySessions(@CurrentUser() user: JwtPayload) {
    const profile = await this.sessionService.getStudentProfileForUser(user.sub);
    return profile ? this.sessionService.getMySessions(profile.id) : [];
  }

  @Get('attention')
  @Roles('student', 'faculty', 'dean', 'registrar', 'treasury', 'sys_admin')
  async getAttention(@CurrentUser() user: JwtPayload) {
    return this.sessionService.getAttention(user.sub, user.role);
  }

  @Patch(':id/viewed')
  @Roles('student')
  async markViewed(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.sessionService.markStudentViewed(id, user.sub);
  }

  @Get('eligible-assignees')
  @Roles('dean')
  @RequirePermissions('escalation.reassign')
  async getEligibleAssignees() {
    return this.sessionService.getEligibleAssignees();
  }

  @Post('request-human-assistance/:chatLogId')
  @Roles('student')
  async requestHumanAssistance(@CurrentUser() user: JwtPayload, @Param('chatLogId') chatLogId: string) {
    return this.sessionService.requestHumanAssistance(chatLogId, user.sub);
  }

  @Get(':id')
  @Roles('student', 'faculty', 'dean', 'registrar', 'treasury', 'sys_admin')
  async getSession(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.sessionService.getAuthorizedSession(id, user.sub, user.role);
  }

  @Get(':id/messages')
  @Roles('student', 'faculty', 'dean', 'registrar', 'treasury', 'sys_admin')
  async getMessages(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.sessionService.getMessages(id, user.sub, user.role);
  }

  @Post(':id/messages')
  @Roles('student', 'faculty', 'dean', 'registrar', 'treasury', 'sys_admin')
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
  @Roles('dean')
  @RequirePermissions('escalation.respond')
  async assignAgent(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    const session = await this.sessionService.assignAgent(id, user.sub, user.role);
    this.chatGateway.emitSessionUpdated(id, session);
    return session;
  }

  @Patch(':id/reassign')
  @Roles('dean')
  @RequirePermissions('escalation.reassign')
  async reassignAgent(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: ReassignChatSessionDto,
  ) {
    const reassignment = await this.sessionService.reassignAgent(
      id,
      user.sub,
      body.assigneeId,
      user.role,
      body.note,
    );
    if (reassignment.previousAgentId && reassignment.previousAgentId !== body.assigneeId) {
      await this.chatGateway.revokeUserFromSession(id, reassignment.previousAgentId);
    }
    this.chatGateway.emitSessionUpdated(id, reassignment.session);
    return reassignment.session;
  }

  @Patch(':id/close')
  @Roles('faculty', 'dean', 'registrar', 'treasury', 'sys_admin')
  @RequirePermissions('escalation.resolve')
  async closeSession(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() body: ChatSessionCloseDto) {
    const session = await this.sessionService.closeSession(id, user.sub, user.role, body.resolution);
    this.chatGateway.emitSessionUpdated(id, session);
    return session;
  }
}
