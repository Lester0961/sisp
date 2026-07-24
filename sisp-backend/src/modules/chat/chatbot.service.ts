import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { ChatSessionService } from './chat-session.service';
import { SendMessageDto } from './dto/send-message.dto';

@Injectable()
export class ChatbotService {
  private readonly logger = new Logger(ChatbotService.name);
  private readonly mlServiceUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly chatSessionService: ChatSessionService,
  ) {
    this.mlServiceUrl = this.config.get<string>('ML_SERVICE_URL') || 'http://localhost:8000';
  }

  /**
   * Process a student's chat message through ML RAG, log to database, and escalate if needed.
   */
  async sendMessage(userId: string, sendMessageDto: SendMessageDto) {
    const { message, history } = sendMessageDto;

    let mlResponse;

    const ML_TIMEOUT_MS = 12000;

    // 1. Call FastAPI ML Service
    try {
      this.logger.log(`Forwarding query to ML service: ${this.mlServiceUrl}/chat`);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), ML_TIMEOUT_MS);

      let response;
      try {
        response = await fetch(`${this.mlServiceUrl}/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: message,
            history: history || [],
          }),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeout);
      }

      if (!response.ok) {
        throw new Error(`ML Service returned status ${response.status}`);
      }

      mlResponse = await response.json();
    } catch (error: any) {
      const reason = error.name === 'AbortError' ? 'timed out' : error.message;
      this.logger.error(`Failed to connect to ML service: ${reason}. Triggering local fallback...`);
      // Elegant fallback when ML microservice is offline
      mlResponse = {
        response:
          `### Hello! I am ARIA, your Academic Advisory Assistant.\n\n` +
          `I am currently undergoing scheduled system updates and could not query our policy handbook database.\n\n` +
          `To ensure you get the assistance you need, **I have automatically escalated this chat to a human academic advisor**. ` +
          `A registrar staff member or academic Dean will review your request and message you back directly in this portal shortly!`,
        intent: 'general_inquiry',
        confidence: 0.0,
        escalate: true,
        sources: [],
      };
    }

    // 2. Save ChatLog in DB
    const chatLog = await this.prisma.chatLog.create({
      data: {
        userId,
        message,
        response: mlResponse.response,
        intent: mlResponse.intent,
        confidence: mlResponse.confidence,
      },
    });

    // 3. Create Escalation and ChatSession if flagged
    let escalation = null;
    let chatSession = null;
    if (mlResponse.escalate) {
      this.logger.log(`Escalating ChatLog ID: ${chatLog.id} to human advisor queue.`);
      escalation = await this.prisma.escalationQueue.create({
        data: {
          chatId: chatLog.id,
          status: 'pending',
        },
      });

      // Create a live chat session for async messaging
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { studentProfile: true },
      });

      if (user?.studentProfile) {
        chatSession = await this.chatSessionService.createSession(
          chatLog.id,
          user.studentProfile.id,
        );
        this.logger.log(`Created ChatSession ID: ${chatSession.id} for escalation.`);
      }
    }

    return {
      chatId: chatLog.id,
      response: mlResponse.response,
      intent: mlResponse.intent,
      confidence: mlResponse.confidence,
      escalated: !!escalation,
      sessionId: chatSession?.id || null,
      sources: mlResponse.sources,
      createdAt: chatLog.createdAt,
    };
  }

  /**
   * Retrieve chat history for a student.
   */
  async getHistory(userId: string) {
    return this.prisma.chatLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      include: {
        escalation: true,
      },
    });
  }

  /**
   * Retrieve all unresolved escalations for advisors/admins.
   */
  async getEscalations() {
    return this.prisma.escalationQueue.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        chat: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        assignee: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  /**
   * Resolve an academic inquiry escalation by providing an official resolution response.
   */
  async resolveEscalation(escalationId: string, resolution: string, resolverId: string) {
    const escalation = await this.prisma.escalationQueue.findUnique({
      where: { id: escalationId },
      include: { chat: true },
    });

    if (!escalation) {
      throw new HttpException('Escalation record not found.', HttpStatus.NOT_FOUND);
    }

    // Update escalation record
    const updatedEscalation = await this.prisma.escalationQueue.update({
      where: { id: escalationId },
      data: {
        status: 'resolved',
        resolution,
        assignedTo: resolverId,
      },
    });

    // Option: Insert a follow-up chat log system entry letting the student know the resolution has been provided
    await this.prisma.chatLog.create({
      data: {
        userId: escalation.chat.userId,
        message: `[ADVISOR ANSWER TO ESCALATION ID ${escalationId}]`,
        response: `### 📢 Official Advisor Resolution:\n\n${resolution}\n\n*(This query has been resolved by advisor ${resolverId})*`,
        intent: 'general_inquiry',
        confidence: 1.0,
      },
    });

    return updatedEscalation;
  }
}
