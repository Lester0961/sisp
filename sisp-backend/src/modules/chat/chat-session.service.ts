import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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

  async assignAgent(sessionId: string, agentId: string) {
    const session = await this.prisma.chatSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException(`Chat session ${sessionId} not found`);
    }

    if (session.status !== 'open') {
      throw new BadRequestException('Cannot assign agent to a closed session');
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

  async getMessages(sessionId: string) {
    const messages = await this.prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    });

    return messages;
  }

  async closeSession(sessionId: string, resolverId: string) {
    const session = await this.prisma.chatSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException(`Chat session ${sessionId} not found`);
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
}
