import { Module } from '@nestjs/common';
import { ChatbotController, ChatbotAdminController } from './chatbot.controller';
import { ChatSessionController } from './chat-session.controller';
import { ChatbotService } from './chatbot.service';
import { ChatSessionService } from './chat-session.service';

@Module({
  controllers: [ChatbotController, ChatbotAdminController, ChatSessionController],
  providers: [ChatbotService, ChatSessionService],
  exports: [ChatbotService, ChatSessionService],
})
export class ChatbotModule {}
