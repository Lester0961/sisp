import { ConfigService } from '@nestjs/config';
import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { requireStudentProfile } from '../../common/utils/require-student-profile';
import { ChatSessionService } from './chat-session.service';
import { ChatQuotaService } from './chat-quota.service';
import { SendMessageDto } from './dto/send-message.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ChatbotService {
  private readonly logger = new Logger(ChatbotService.name);
  private readonly mlServiceUrl: string;
  private readonly mlSecret: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly chatSessionService: ChatSessionService,
    private readonly chatQuotaService: ChatQuotaService,
    private readonly notificationsService: NotificationsService,
  ) {
    this.mlServiceUrl = this.config.get<string>('ML_SERVICE_URL') || 'http://localhost:8000';
    // Authenticates this backend to the ML service; never exposed to clients.
    // A missing secret must fail closed instead of reverting to a shared default.
    this.mlSecret = this.config.get<string>('ML_SECRET_TOKEN') || '';
  }

  /** Server-derived student identity. Never taken from client input. */
  private async resolveStudentId(userId: string): Promise<string | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { studentProfile: true },
    });
    return user?.studentProfile?.id ?? null;
  }

  async sendMessage(userId: string, sendMessageDto: SendMessageDto) {
    const { message, history, preferredLanguage } = sendMessageDto;
    let quota = await this.chatQuotaService.consume(userId);
    // Non-throwing: students without a profile can still use policy answers.
    const studentId = await this.resolveStudentId(userId);
    let mlResponse: any;
    // Keep the synchronous proxy comfortably below Render's request window.
    // A sleeping/unavailable ML service should become a persisted live-agent
    // handoff, not an abandoned HTTP request.
    // The hosted ARIA service may need several seconds for provider routing
    // and semantic retrieval, especially on a free-tier instance. Keep the
    // request bounded while allowing the normal policy path to complete.
    // Render's free ML instance can take close to a minute to wake from idle.
    // Keep the request bounded, but do not convert a normal cold start into a
    // false live-agent escalation.
    const ML_TIMEOUT_MS = 60000;
    const transientStatuses = new Set([429, 502, 503, 504]);

    try {
      if (!this.mlSecret) {
        throw new Error('ML_SECRET_TOKEN is not configured');
      }
      this.logger.log(`Forwarding query to ML service: ${this.mlServiceUrl}/chat`);
      const deadline = Date.now() + ML_TIMEOUT_MS;
      let response: Response | undefined;
      for (let attempt = 0; attempt < 2; attempt += 1) {
        const remainingMs = deadline - Date.now();
        if (remainingMs <= 0) throw new Error('ML Service request timed out');

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), remainingMs);
        try {
          response = await fetch(`${this.mlServiceUrl}/chat`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              // Internal service authentication. student_id below is derived
              // server-side via resolveStudentId — never from client input
              // (the global ValidationPipe rejects unknown body properties).
              'X-ML-Secret': this.mlSecret,
            },
            body: JSON.stringify({
              query: message,
              history: history || [],
              preferred_language: preferredLanguage,
              ...(studentId ? { student_id: studentId } : {}),
            }),
            signal: controller.signal,
          });
        } finally {
          clearTimeout(timeout);
        }

        if (response.ok) break;
        if (!transientStatuses.has(response.status) || attempt === 1) {
          throw new Error(`ML Service returned status ${response.status}`);
        }

        // A single retry helps with short Render gateway/rate-limit blips
        // without extending the request's overall 60-second budget.
        const retryAfter = response.headers?.get('retry-after');
        const retryAfterSeconds = retryAfter ? Number(retryAfter) : NaN;
        const retryDelayMs = Number.isFinite(retryAfterSeconds)
          ? Math.min(Math.max(retryAfterSeconds * 1000, 250), 3000)
          : 300;
        if (deadline - Date.now() <= retryDelayMs) {
          throw new Error(`ML Service returned status ${response.status}`);
        }
        this.logger.warn(`ML service returned transient status ${response.status}; retrying once.`);
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
      }

      if (!response?.ok) throw new Error('ML Service did not return a successful response');
      mlResponse = await response.json();
    } catch (error: any) {
      const reason = error?.name === 'AbortError' ? 'timed out' : error?.message || 'unavailable';
      this.logger.error(`ARIA answer service unavailable: ${reason}. Creating an advisor handoff.`);
      const unavailableMessages: Record<string, string> = {
        en: 'I can’t reach ARIA’s verified answer service right now, so I can’t give you a reliable answer yet. I’ve referred your question to an academic adviser for follow-up.',
        fil: 'Hindi ko ma-access ngayon ang verified answer service ng ARIA, kaya hindi ako makapagbibigay ng tiyak na sagot. Naipasa ko na ang tanong mo sa academic adviser para matulungan ka.',
        ceb: 'Dili nako ma-access karon ang verified answer service sa ARIA, busa dili ko makahatag og kasaligan nga tubag. Gipasa na nako ang imong pangutana sa academic adviser aron matabangan ka.',
        ilo: 'Diak ma-access ita ti verified answer service ti ARIA, isu a diak makaited iti mapagtalkan a sungbat. Naipasa ko ti saludsodmo iti academic adviser tapno matulonganka.',
        hil: 'Indi ko ma-access subong ang verified answer service sang ARIA, gani indi ako makahatag sang masaligan nga sabat. Ginpadala ko na ang imo pamangkot sa academic adviser para mabuligan ka.',
        war: 'Diri ko ma-access yana an verified answer service han ARIA, salit diri ako makakahatag hin masasarigan nga baton. Iginpasa ko na an imo pakiana ha academic adviser basi mabuligan ka.',
      };
      const fallbackLanguage = preferredLanguage || 'en';
      mlResponse = {
        response: unavailableMessages[fallbackLanguage] || unavailableMessages.en,
        intent: 'general_inquiry',
        confidence: 0.0,
        escalate: true,
        sources: [],
        route: 'live_advisor',
        action: null,
        language: {
          code: fallbackLanguage,
          name: fallbackLanguage,
          register: 'natural',
          nativeReviewRequired: false,
        },
        moderationCategories: [],
        systemUnavailable: true,
      };
    }

    const responseLang = mlResponse.language?.code || preferredLanguage || 'en';
    if (mlResponse.route === 'database' && mlResponse.action) {
      try {
        // Personal records are resolved from this authenticated user's SISP
        // data. Missing records become an explicit fallback, never a made-up
        // zero or an LLM-generated value.
        if (mlResponse.action === 'balance') {
          const result = await this.resolveBalance(userId, responseLang);
          mlResponse.response = result.text;
          if (!result.available) {
            mlResponse.escalate = true;
            mlResponse.route = 'live_advisor';
          }
        } else {
          mlResponse.response = await this.resolveDatabaseResponse(
            userId,
            mlResponse.action,
            responseLang,
          );
        }
      } catch (error: any) {
        this.logger.error(`Student record lookup failed for '${mlResponse.action}': ${error?.message || error}`);
        mlResponse.response =
          'SISP could not verify this student record. Please consult an authorized school representative.';
        mlResponse.escalate = true;
        mlResponse.route = 'live_advisor';
      }
    }
    // Multi-intent parts the ML service flagged for backend resolution.
    // A resolution failure must never 500 the whole request or expose the
    // ML-provided hint as if it were a verified personal record.
    let failedParts = false;
    if (Array.isArray(mlResponse.parts)) {
      let patched = false;
      for (const part of mlResponse.parts) {
        if (part?.data?.needs_backend_resolution && part?.action) {
          try {
            const resolved = await this.resolveDatabasePart(
              userId,
              part.action,
              responseLang,
              part?.data?.dayFilter,
            );
            part.text =
              resolved.text + (part?.data?.timetableNote ? `\n\n${part.data.timetableNote}` : '');
            part.data = {
              ...(part.data || {}),
              ...resolved.data,
              resolvedBy: 'backend',
              needs_backend_resolution: false,
            };
            if (resolved.data.recordAvailable === false) {
              part.error = 'student_record_unavailable';
              part.escalated = true;
              failedParts = true;
            } else {
              part.error = null;
              part.escalated = false;
            }
            patched = true;
          } catch (error: any) {
            this.logger.error(
              `Backend resolution failed for part action '${part.action}': ${error?.message || error}`,
            );
            part.text =
              'SISP could not verify this student record. Please consult an authorized school representative.';
            part.data = {
              ...(part.data || {}),
              resolvedBy: 'backend',
              needs_backend_resolution: false,
              recordAvailable: false,
            };
            part.error = 'backend_resolution_failed';
            part.escalated = true;
            patched = true;
            failedParts = true;
          }
        }
      }
      if (patched) {
        mlResponse.response = mlResponse.parts.map((p: any) => p.text).join('\n\n---\n\n');
      }
    }
    if (mlResponse.systemUnavailable || mlResponse.quotaRefund) {
      quota = await this.chatQuotaService.refund(userId);
    }

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
    if (mlResponse.escalate || failedParts) {
      if (failedParts) {
        this.logger.log('One or more parts failed backend resolution; escalating for human review.');
      }
      this.logger.log(`Escalating ChatLog ID: ${chatLog.id} to the academic advisor queue.`);
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { studentProfile: true },
      });
      if (user?.studentProfile) {
        chatSession = await this.chatSessionService.createSession(chatLog.id, user.studentProfile.id);
        escalation = { chatId: chatLog.id };
        this.logger.log(`Created ChatSession ID: ${chatSession.id} for escalation.`);
      } else {
        mlResponse.response = 'ARIA could not securely link this conversation to a student record, so it was not placed in the staff queue. Please contact the Registrar for assistance.';
        await this.prisma.chatLog.update({ where: { id: chatLog.id }, data: { response: mlResponse.response } });
        mlResponse.escalate = false;
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
      // Additive: single-intent responses carry a 1-element parts array;
      // existing consumers ignore unknown fields.
      parts: Array.isArray(mlResponse.parts) ? mlResponse.parts : [],
      data: mlResponse.data ?? null,
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

  async getEscalations(userId: string) {
    return this.prisma.escalationQueue.findMany({
      where: {
        OR: [
          { assignedTo: userId },
          { assignedTo: null, status: 'pending' },
        ],
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        chatId: true,
        status: true,
        assignedTo: true,
        resolution: true,
        createdAt: true,
        updatedAt: true,
        assignee: { select: { id: true, firstName: true, lastName: true } },
        chat: {
          select: {
            id: true,
            intent: true,
            createdAt: true,
            chatSession: {
              select: {
                id: true,
                status: true,
                agentId: true,
                student: { select: { studentNumber: true } },
              },
            },
          },
        },
      },
    });
  }

  async resolveEscalation(
    escalationId: string,
    resolution: string,
    resolverId: string,
    resolverRole = 'registrar',
  ) {
    const escalation = await this.prisma.escalationQueue.findUnique({
      where: { id: escalationId },
      select: { id: true, chat: { select: { chatSession: { select: { id: true } } } } },
    });
    if (!escalation) throw new HttpException('Escalation record not found.', HttpStatus.NOT_FOUND);
    const sessionId = escalation.chat.chatSession?.id;
    if (!sessionId) throw new HttpException('No live support session is linked to this escalation.', HttpStatus.CONFLICT);
    await this.chatSessionService.closeSession(sessionId, resolverId, resolverRole, resolution);
    return this.prisma.escalationQueue.findUnique({ where: { id: escalationId } });
  }

  /**
   * Rich structured variant of resolveDatabaseResponse for multi-intent
   * parts. The human-readable text is produced by the existing method
   * (guaranteeing identical wording); this wrapper only attaches the
   * structured rows the parts[] contract requires.
   */
  private async resolveDatabasePart(
    userId: string,
    action: string,
    language: string,
    dayFilter?: string | null,
  ): Promise<{ text: string; data: any }> {
    const balance = action === 'balance' ? await this.resolveBalance(userId, language) : null;
    const text = balance?.text ?? await this.resolveDatabaseResponse(userId, action, language);
    const data: any = { action, resolvedBy: 'backend' };
    try {
      const profile = await requireStudentProfile(this.prisma, userId);
      if (action === 'grades') {
        const grades = await this.prisma.grade.findMany({
          where: { isVisible: true, enrollment: { studentId: profile.id } },
          include: { enrollment: { include: { course: true } } },
        });
        data.items = grades.map((grade: any) => ({
          courseCode: grade.enrollment.course.code,
          courseTitle: grade.enrollment.course.title,
          finalGrade: grade.finalGrade,
        }));
        data.total = data.items.length;
      } else if (action === 'schedule' || action === 'enrollment_status') {
        const enrollments = await this.prisma.enrollment.findMany({
          where: { studentId: profile.id, status: 'enrolled' },
          include: { course: true, term: true },
        });
        data.items = enrollments.map((enrollment: any) => ({
          courseCode: enrollment.course.code,
          courseTitle: enrollment.course.title,
          units: enrollment.course.units,
          section: enrollment.section,
          status: enrollment.status,
          term: enrollment.term?.label || enrollment.term?.code || null,
        }));
        data.total = data.items.length;
      } else if (action === 'balance') {
        data.balance = balance?.balance ?? null;
        data.recordAvailable = balance?.available ?? false;
      } else if (action === 'document_request_status') {
        const requests = await this.prisma.documentRequest.findMany({
          where: { studentId: profile.id },
          include: { items: true },
          orderBy: { createdAt: 'desc' },
        });
        const latest: any = requests[0];
        data.latest = latest
          ? { id: latest.id, status: latest.status, paymentStatus: latest.paymentStatus }
          : null;
        data.total = requests.length;
      }
    } catch {
      // Text already rendered above; data stays minimal on failure.
    }
    if (dayFilter) data.appliedFilters = { day: dayFilter };
    return { text, data };
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
      return (await this.resolveBalance(userId, language)).text;
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

  private async resolveBalance(
    userId: string,
    language: string,
  ): Promise<{ text: string; available: boolean; balance: number | null }> {
    const headings: Record<string, string> = {
      en: 'Your account balance',
      fil: 'Iyong account balance',
      ceb: 'Imong account balance',
      ilo: 'Ti account balance-mo',
      hil: 'Imo account balance',
      war: 'Imo account balance',
    };
    const heading = headings[language] || headings.en;
    const profile = await requireStudentProfile(this.prisma, userId);
    const student = await this.prisma.studentProfile.findUnique({
      where: { id: profile.id },
      include: { accountBalance: true },
    });
    const rawBalance = student?.accountBalance?.balance;
    if (rawBalance === null || rawBalance === undefined) {
      return {
        text: `### ${heading}\n\nSISP could not verify an account balance record for you. Please contact the Treasury Office for assistance.`,
        available: false,
        balance: null,
      };
    }

    const balance = Number(rawBalance);
    return {
      text: `### ${heading}\n\nYour current SISP balance is **₱${balance.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}**.`,
      available: true,
      balance,
    };
  }
}
