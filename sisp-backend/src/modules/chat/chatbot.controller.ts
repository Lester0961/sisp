import { Controller, Post, Get, Patch, Body, Param } from '@nestjs/common';
import { ChatbotService } from './chatbot.service';
import { SendMessageDto } from './dto/send-message.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermissions } from '../../common/authz/require-permissions.decorator';

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
@Roles('registrar', 'dean')
export class ChatbotAdminController {
  constructor(private readonly chatbotService: ChatbotService) {}

  @Get()
  async getEscalations() {
    return this.chatbotService.getEscalations();
  }

  @Patch(':id')
  async resolveEscalation(
    @Param('id') id: string,
    @Body() body: { resolution: string },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.chatbotService.resolveEscalation(id, body.resolution, user.sub, user.role);
  }
}
