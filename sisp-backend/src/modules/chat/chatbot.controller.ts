import { Controller, Post, Get, Patch, Body, Param } from '@nestjs/common';
import { ChatbotService } from './chatbot.service';
import { SendMessageDto } from './dto/send-message.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('chat')
export class ChatbotController {
  constructor(private readonly chatbotService: ChatbotService) {}

  @Post()
  async sendMessage(@CurrentUser() user: JwtPayload, @Body() sendMessageDto: SendMessageDto) {
    return this.chatbotService.sendMessage(user.sub, sendMessageDto);
  }

  @Get('history')
  async getHistory(@CurrentUser() user: JwtPayload) {
    return this.chatbotService.getHistory(user.sub);
  }
}

@Controller('admin/escalations')
@Roles('admin_staff', 'dean')
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
    return this.chatbotService.resolveEscalation(id, body.resolution, user.sub);
  }
}
