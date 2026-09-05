import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ChatSessionService {
  constructor(private readonly prisma: PrismaService) {}

  async createSession(chatLogId: string, studentId: string) {
    // Check if session already exists for this chat log
    const existing = await this.prisma.chatSession.findUnique({
      where: { escalationId: chatLogId },
    });

    if (existing) {
      return existing;
    }

    const session = await this.prisma.chatSession.create({
      data: {
        studentId,
        escalationId: chatLogId,
        status: 'open',
      },
      include: {
        student: {
          include: {
            user: { select: { id: true, email: true, firstName: true, lastName: true } },
          },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            sender: { select: { id: true, email: true, firstName: true, lastName: true } },
          },
        },
      },
    });

    return session;
  }

  async getSessions(agentId?: string, status?: string) {
    const where: any = {};
    if (agentId) where.agentId = agentId;
    if (status) where.status = status;

    const sessions = await this.prisma.chatSession.findMany({
      where,
      include: {
        student: {
          include: {
            user: { select: { id: true, email: true, firstName: true, lastName: true } },
          },
        },
        agent: { select: { id: true, email: true, firstName: true, lastName: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            sender: { select: { id: true, email: true, firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return sessions;
  }

  async getVisibleSessions(userId: string, role: string, status?: string) {
    if (['admin_staff', 'dean'].includes(role)) {
      return this.getSessions(undefined, status);
    }
    if (role === 'live_agent') {
      return this.getSessions(userId, status);
    }
    const profile = await this.getStudentProfileForUser(userId);
    return profile ? this.getMySessions(profile.id) : [];
  }

  async getSessionById(sessionId: string) {
    const session = await this.prisma.chatSession.findUnique({
      where: { id: sessionId },
      include: {
        student: {
          include: {
            user: { select: { id: true, email: true, firstName: true, lastName: true } },
          },
        },
        agent: { select: { id: true, email: true, firstName: true, lastName: true } },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            sender: { select: { id: true, email: true, firstName: true, lastName: true } },
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException(`Chat session ${sessionId} not found`);
    }

    return session;
  }

  async getAuthorizedSession(sessionId: string, userId: string, role: string) {
    const session = await this.getSessionById(sessionId);
    this.assertAccess(session, userId, role);
    return session;
  }

  async assignAgent(sessionId: string, agentId: string, role = 'admin_staff') {
    const session = await this.prisma.chatSession.findUnique({ where: { id: sessionId } });

    if (!session) {
      throw new NotFoundException(`Chat session ${sessionId} not found`);
    }

    if (session.status !== 'open') {
      throw new BadRequestException('Cannot assign agent to a closed session');
    }
    if (!['admin_staff', 'dean', 'live_agent'].includes(role)) {
      throw new ForbiddenException('Only authorized advisor roles can assign sessions');
    }

    const updated = await this.prisma.chatSession.update({
      where: { id: sessionId },
      data: { agentId },
      include: {
        student: {
          include: {
            user: { select: { id: true, email: true, firstName: true, lastName: true } },
          },
        },
        agent: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    });

    return updated;
  }

  async sendMessage(sessionId: string, senderId: string, content: string, senderRole: string) {
    const session = await this.prisma.chatSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException(`Chat session ${sessionId} not found`);
    }

    if (session.status === 'closed') {
      throw new BadRequestException('Cannot send message to a closed session');
    }

    const message = await this.prisma.chatMessage.create({
      data: {
        sessionId,
        senderId,
        senderRole,
        content,
      },
      include: {
        sender: { select: { id: true, email: true, firstName: true, lastName: true } },
        session: true,
      },
    });

    return message;
  }

  async getMessages(sessionId: string, userId?: string, role?: string) {
    if (userId && role) {
      await this.getAuthorizedSession(sessionId, userId, role);
    }
    const messages = await this.prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    });

    return messages;
  }

  async closeSession(sessionId: string, resolverId: string, role = 'admin_staff') {
    const session = await this.prisma.chatSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException(`Chat session ${sessionId} not found`);
    }
    if (!['admin_staff', 'dean', 'live_agent'].includes(role)) {
      throw new ForbiddenException('Only authorized advisor roles can close sessions');
    }

    const updated = await this.prisma.chatSession.update({
      where: { id: sessionId },
      data: {
        status: 'closed',
        agentId: resolverId,
      },
      include: {
        student: {
          include: {
            user: { select: { id: true, email: true, firstName: true, lastName: true } },
          },
        },
        agent: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    });

    return updated;
  }

  async getMySessions(studentId: string) {
    const sessions = await this.prisma.chatSession.findMany({
      where: { studentId },
      include: {
        student: {
          include: {
            user: { select: { id: true, email: true, firstName: true, lastName: true } },
          },
        },
        agent: { select: { id: true, email: true, firstName: true, lastName: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return sessions;
  }

  async getStudentProfileForUser(userId: string) {
    return this.prisma.studentProfile.findUnique({ where: { userId } });
  }

  private assertAccess(session: any, userId: string, role: string) {
    if (['admin_staff', 'dean', 'live_agent'].includes(role)) return;
    if (role === 'student' && session.student?.userId === userId) return;
    throw new ForbiddenException('You are not authorized to access this advisor session');
  }
}
