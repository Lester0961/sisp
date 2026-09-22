import { Controller, Post, Get, Patch, Body, Param } from '@nestjs/common';
import { ChatbotService } from './chatbot.service';
import { SendMessageDto } from './dto/send-message.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermissions } from '../../common/authz/require-permissions.decorator';
import { ResolveEscalationDto } from './dto/resolve-escalation.dto';

@Controller('chat')
export class ChatbotController {
  constructor(private readonly chatbotService: ChatbotService) {}

  // Table 3.10: Academic Advisory Chat is granted to Student (aria.use).
  @Post()
  @Roles('student')
  @RequirePermissions('aria.use')
  async sendMessage(@CurrentUser() user: JwtPayload, @Body() sendMessageDto: SendMessageDto) {
    return this.chatbotService.sendMessage(user.sub, sendMessageDto);
  }

  @Get('history')
  @Roles('student')
  @RequirePermissions('aria.use')
  async getHistory(@CurrentUser() user: JwtPayload) {
    return this.chatbotService.getHistory(user.sub);
  }

  @Get('quota')
  @Roles('student')
  @RequirePermissions('aria.use')
  async getQuota(@CurrentUser() user: JwtPayload) {
    return this.chatbotService.getQuota(user.sub);
  }
}

@Controller('admin/escalations')
export class ChatbotAdminController {
  constructor(private readonly chatbotService: ChatbotService) {}

  @Get()
  @RequirePermissions('escalation.view_dean_queue')
  async getEscalations(@CurrentUser() user: JwtPayload) {
    return this.chatbotService.getEscalations(user.sub);
  }

  @Patch(':id')
  @RequirePermissions('escalation.resolve')
  async resolveEscalation(
    @Param('id') id: string,
    @Body() body: ResolveEscalationDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.chatbotService.resolveEscalation(id, body.resolution, user.sub, user.role);
  }
}
