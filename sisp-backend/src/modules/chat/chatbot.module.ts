import { Module } from '@nestjs/common';
import { ChatbotController, ChatbotAdminController } from './chatbot.controller';
import { ChatbotService } from './chatbot.service';

@Module({
  controllers: [ChatbotController, ChatbotAdminController],
  providers: [ChatbotService],
  exports: [ChatbotService],
})
export class ChatbotModule {}
