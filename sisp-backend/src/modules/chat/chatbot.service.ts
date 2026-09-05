import { ConfigService } from '@nestjs/config';
import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { requireStudentProfile } from '../../common/utils/require-student-profile';
import { ChatSessionService } from './chat-session.service';
import { ChatQuotaService } from './chat-quota.service';
import { SendMessageDto } from './dto/send-message.dto';

@Injectable()
export class ChatbotService {
  private readonly logger = new Logger(ChatbotService.name);
  private readonly mlServiceUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly chatSessionService: ChatSessionService,
    private readonly chatQuotaService: ChatQuotaService,
  ) {
    this.mlServiceUrl = this.config.get<string>('ML_SERVICE_URL') || 'http://localhost:8000';
  }

  async sendMessage(userId: string, sendMessageDto: SendMessageDto) {
    const { message, history, preferredLanguage } = sendMessageDto;
    let quota = await this.chatQuotaService.consume(userId);
    let mlResponse: any;
    const ML_TIMEOUT_MS = 12000;

    try {
      this.logger.log(`Forwarding query to ML service: ${this.mlServiceUrl}/chat`);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), ML_TIMEOUT_MS);
      let response: Response;
      try {
        response = await fetch(`${this.mlServiceUrl}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: message,
            history: history || [],
            preferred_language: preferredLanguage,
          }),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeout);
      }
      if (!response.ok) throw new Error(`ML Service returned status ${response.status}`);
      mlResponse = await response.json();
    } catch (error: any) {
      const reason = error?.name === 'AbortError' ? 'timed out' : error?.message || 'unavailable';
      this.logger.error(`Failed to connect to ML service: ${reason}. Triggering local fallback...`);
      mlResponse = {
        response:
          '### Hello! I am ARIA, your Academic Advisory Assistant.\n\n' +
          'I am currently undergoing scheduled system updates and could not query our policy handbook database.\n\n' +
          'To ensure you get the assistance you need, **I have referred this chat to an academic advisor**. ' +
          'An authorized advisor will review your request and reply in this portal.',
        intent: 'general_inquiry',
        confidence: 0.0,
        escalate: true,
        sources: [],
        route: 'live_advisor',
        action: null,
        language: {
          code: preferredLanguage || 'en',
          name: 'English',
          register: 'natural',
          nativeReviewRequired: false,
        },
        moderationCategories: [],
        systemUnavailable: true,
      };
    }

    if (mlResponse.route === 'database' && mlResponse.action) {
      mlResponse.response = await this.resolveDatabaseResponse(
        userId,
        mlResponse.action,
        mlResponse.language?.code || preferredLanguage || 'en',
      );
    }
    if (mlResponse.systemUnavailable) quota = await this.chatQuotaService.refund(userId);

    const chatLog = await this.prisma.chatLog.create({
      data: {
        userId,
        message,
        response: mlResponse.response,
        intent: mlResponse.intent,
        confidence: mlResponse.confidence,
      },
    });

    let escalation: any = null;
    let chatSession: any = null;
    if (mlResponse.escalate) {
      this.logger.log(`Escalating ChatLog ID: ${chatLog.id} to the academic advisor queue.`);
      escalation = await this.prisma.escalationQueue.create({
        data: { chatId: chatLog.id, status: 'pending' },
      });
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { studentProfile: true },
      });
      if (user?.studentProfile) {
        chatSession = await this.chatSessionService.createSession(chatLog.id, user.studentProfile.id);
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
      route: mlResponse.route,
      language: mlResponse.language,
      moderationCategories: mlResponse.moderationCategories || [],
      quota,
      createdAt: chatLog.createdAt,
    };
  }

  async getHistory(userId: string) {
    return this.prisma.chatLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      include: { escalation: true, chatSession: true },
    });
  }

  async getQuota(userId: string) {
    return this.chatQuotaService.status(userId);
  }

  async getEscalations() {
    return this.prisma.escalationQueue.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        chat: {
          include: {
            user: { select: { id: true, email: true, firstName: true, lastName: true } },
          },
        },
        assignee: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    });
  }

  async resolveEscalation(escalationId: string, resolution: string, resolverId: string) {
    const escalation = await this.prisma.escalationQueue.findUnique({
      where: { id: escalationId },
      include: { chat: true },
    });
    if (!escalation) throw new HttpException('Escalation record not found.', HttpStatus.NOT_FOUND);

    const updatedEscalation = await this.prisma.escalationQueue.update({
      where: { id: escalationId },
      data: { status: 'resolved', resolution, assignedTo: resolverId },
    });
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

  private async resolveDatabaseResponse(userId: string, action: string, language: string): Promise<string> {
    const profile = await requireStudentProfile(this.prisma, userId);
    const headings: Record<string, Record<string, string>> = {
      grades: {
        en: 'Your posted grades', fil: 'Iyong mga naka-post na grado', ceb: 'Imong mga na-post nga grado',
        ilo: 'Dagiti naipaskil a gradom', hil: 'Imo mga na-post nga grado', war: 'Imo mga na-post nga grado',
      },
      schedule: {
        en: 'Your current class schedule', fil: 'Iyong kasalukuyang schedule ng klase', ceb: 'Imong kasamtangang iskedyul sa klase',
        ilo: 'Ti agdama nga iskediul ti klasem', hil: 'Imo subong nga schedule sang klase', war: 'Imo yana nga schedule han klase',
      },
      balance: {
        en: 'Your account balance', fil: 'Iyong account balance', ceb: 'Imong account balance', ilo: 'Ti account balance-mo',
        hil: 'Imo account balance', war: 'Imo account balance',
      },
      enrollment_status: {
        en: 'Your enrollment status', fil: 'Iyong enrollment status', ceb: 'Imong enrollment status', ilo: 'Ti enrollment status-mo',
        hil: 'Imo enrollment status', war: 'Imo enrollment status',
      },
      document_request_status: {
        en: 'Your latest document request', fil: 'Iyong pinakabagong document request', ceb: 'Imong pinakabag-ong document request',
        ilo: 'Ti kabaruan a document request-mo', hil: 'Imo pinakabag-o nga document request', war: 'Imo pinakabag-o nga document request',
      },
    };
    const heading = headings[action]?.[language] || headings[action]?.en || 'Your SISP record';

    if (action === 'grades') {
      const grades = await this.prisma.grade.findMany({
        where: { isVisible: true, enrollment: { studentId: profile.id } },
        include: { enrollment: { include: { course: true } } },
      });
      if (!grades.length) return `### ${heading}\n\nNo visible grades are currently posted in SISP.`;
      return `### ${heading}\n\n${grades
        .map((grade: any) => `- **${grade.enrollment.course.code} ${grade.enrollment.course.title}:** ${grade.finalGrade ?? 'Not finalized'}`)
        .join('\n')}`;
    }
    if (action === 'schedule' || action === 'enrollment_status') {
      const enrollments = await this.prisma.enrollment.findMany({
        where: { studentId: profile.id, status: 'enrolled' }, include: { course: true },
      });
      if (!enrollments.length) return `### ${heading}\n\nNo active enrollment is currently recorded in SISP.`;
      return `### ${heading}\n\n${enrollments
        .map((enrollment: any) => `- **${enrollment.course.code} ${enrollment.course.title}**, Section ${enrollment.section}`)
        .join('\n')}`;
    }
    if (action === 'balance') {
      const student = await this.prisma.studentProfile.findUnique({ where: { id: profile.id }, include: { accountBalance: true } });
      const balance = Number(student?.accountBalance?.balance ?? 0);
      return `### ${heading}\n\nYour current SISP balance is **₱${balance.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}**.`;
    }
    if (action === 'document_request_status') {
      const requests = await this.prisma.documentRequest.findMany({
        where: { studentId: profile.id }, include: { items: true }, orderBy: { createdAt: 'desc' },
      });
      const latest: any = requests[0];
      if (!latest) return `### ${heading}\n\nYou have no document requests in SISP.`;
      const names = latest.items?.length
        ? latest.items.map((item: any) => `${item.label} x${item.quantity}`).join(', ')
        : latest.type.replaceAll('_', ' ');
      return `### ${heading}\n\n- **Documents:** ${names}\n- **Status:** ${latest.status.replaceAll('_', ' ')}\n- **Payment:** ${latest.paymentStatus.replaceAll('_', ' ')}`;
    }
    return 'I could not match that request to an authorized SISP record service.';
  }
}
