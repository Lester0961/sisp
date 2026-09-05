import { Module } from '@nestjs/common';
import { ChatbotController, ChatbotAdminController } from './chatbot.controller';
import { ChatSessionController } from './chat-session.controller';
import { ChatbotService } from './chatbot.service';
import { ChatSessionService } from './chat-session.service';
import { ChatQuotaService } from './chat-quota.service';
import { ChatGateway } from './chat.gateway';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [ChatbotController, ChatbotAdminController, ChatSessionController],
  providers: [ChatbotService, ChatSessionService, ChatQuotaService, ChatGateway],
  exports: [ChatbotService, ChatSessionService, ChatQuotaService],
})
export class ChatbotModule {}
