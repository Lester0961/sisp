import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

/**
 * Phase 1: human escalation is handled by existing institutional staff
 * accounts. There is no live_agent role; eligibility is the
 * `escalation.respond` permission (enforced by the controller/guard), and this
 * constant keeps service-level checks aligned with the six-role model.
 */
const STAFF_ROLES = ['faculty', 'dean', 'registrar', 'treasury', 'sys_admin'];

@Injectable()
export class ChatSessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async createSession(chatLogId: string, studentId: string) {
    try {
      return await this.prisma.$transaction(async (tx: any) => {
        await tx.escalationQueue.upsert({
          where: { chatId: chatLogId },
          update: {},
          create: { chatId: chatLogId, status: 'pending' },
        });
        return tx.chatSession.upsert({
          where: { escalationId: chatLogId },
          update: {},
          create: { studentId, escalationId: chatLogId, status: 'open' },
        });
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const [racedQueue, racedSession] = await Promise.all([
          this.prisma.escalationQueue.findUnique({ where: { chatId: chatLogId } }),
          this.prisma.chatSession.findUnique({ where: { escalationId: chatLogId } }),
        ]);
        if (racedQueue && racedSession) return racedSession;
      }
      throw error;
    }
  }

  async requestHumanAssistance(chatLogId: string, userId: string) {
    const log = await this.prisma.chatLog.findFirst({
      where: { id: chatLogId, userId },
      include: { escalation: true, chatSession: true },
    });
    if (!log) throw new NotFoundException('Conversation message not found');
    const profile = await this.getStudentProfileForUser(userId);
    if (!profile) throw new BadRequestException('A student profile is required for staff assistance');
    if (log.chatSession) return log.chatSession;

    const session = await this.createSession(log.id, profile.id);
    await Promise.resolve().then(() => this.notificationsService.sendToUser(userId, 'Human support requested', 'Your request has been added to the staff support queue.')).catch(() => undefined);
    return session;
  }

  async getSessions(agentId?: string, status?: string, pageInput = 1, pageSizeInput = 25, visibleAgentId?: string) {
    const where: any = {};
    if (agentId) where.agentId = agentId;
    if (visibleAgentId) where.OR = [{ agentId: null }, { agentId: visibleAgentId }];
    if (status) where.status = status;
    const page = Number.isFinite(Number(pageInput)) ? Math.max(1, Math.floor(Number(pageInput))) : 1;
    const pageSize = Number.isFinite(Number(pageSizeInput))
      ? Math.min(100, Math.max(1, Math.floor(Number(pageSizeInput))))
      : 25;
    const [data, total] = await Promise.all([
      this.prisma.chatSession.findMany({
        where,
        select: {
          id: true,
          studentId: true,
          agentId: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          student: { select: { studentNumber: true } },
          agent: { select: { id: true, firstName: true, lastName: true } },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { senderRole: true, createdAt: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.chatSession.count({ where }),
    ]);
    return { data, total, page, pageSize, hasMore: page * pageSize < total };
  }

  async getVisibleSessions(userId: string, role: string, status?: string, page = 1, pageSize = 25) {
    if (STAFF_ROLES.includes(role)) {
      // The Dean sees the initial escalation queue plus their own cases; other
      // staff see only tickets assigned to them (privacy-minimized queue).
      if (role === 'dean') {
        return this.getSessions(undefined, status, page, pageSize, userId);
      }
      return this.getSessions(userId, status, page, pageSize);
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
            user: { select: { id: true, firstName: true, lastName: true } },
          },
        },
        agent: { select: { id: true, firstName: true, lastName: true } },
        chatLog: { select: { message: true, response: true, intent: true, createdAt: true } },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            sender: { select: { id: true, firstName: true, lastName: true } },
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
    const actor = await this.prisma.user.findUnique({ where: { id: userId }, select: { isActive: true, role: { select: { name: true } } } });
    if (!actor?.isActive) throw new ForbiddenException('Active account required');
    this.assertAccess(session, userId, actor.role?.name || role);
    return session;
  }

  async assignAgent(sessionId: string, agentId: string, role = 'registrar') {
    const actor = await this.prisma.user.findUnique({ where: { id: agentId }, select: { isActive: true, role: { select: { name: true } } } });
    if (!actor?.isActive) throw new ForbiddenException('Active representative account required');
    role = actor.role?.name || role;
    const session = await this.prisma.chatSession.findUnique({ where: { id: sessionId } });

    if (!session) {
      throw new NotFoundException(`Chat session ${sessionId} not found`);
    }

    if (session.status !== 'open') {
      throw new BadRequestException('Cannot assign agent to a closed session');
    }
    if (!STAFF_ROLES.includes(role)) {
      throw new ForbiddenException('Only authorized staff can assign sessions');
    }
    if (session.agentId && session.agentId !== agentId) {
      throw new ForbiddenException('This advisor session is assigned to another representative');
    }
    if (!session.escalationId) throw new BadRequestException('This session has no linked escalation case');
    if (session.agentId === agentId) {
      const existingQueue = await this.prisma.escalationQueue.findUnique({ where: { chatId: session.escalationId } });
      if (existingQueue?.assignedTo === agentId && existingQueue.status === 'in_progress') return this.getSessionById(sessionId);
    }

    await this.prisma.$transaction(async (tx: any) => {
      const claimedSession = await tx.chatSession.updateMany({
        where: { id: sessionId, status: 'open', OR: [{ agentId: null }, { agentId }] },
        data: { agentId, updatedAt: new Date() },
      });
      if (claimedSession.count !== 1) {
        throw new ConflictException('This concern was claimed by another representative');
      }
      const claimedQueue = await tx.escalationQueue.updateMany({
        where: { chatId: session.escalationId, status: 'pending', OR: [{ assignedTo: null }, { assignedTo: agentId }] },
        data: { assignedTo: agentId, status: 'in_progress', updatedAt: new Date() },
      });
      if (claimedQueue.count !== 1) {
        throw new ConflictException('This concern is no longer available to claim');
      }
      await tx.auditLog.create({ data: { userId: agentId, action: 'CHAT_SESSION_ASSIGNED', resource: 'chat_sessions', resourceId: sessionId, oldValue: 'unassigned', newValue: agentId, ipAddress: null } });
    });

    return this.getSessionById(sessionId);
  }

  async reassignAgent(sessionId: string, managerId: string, targetId: string, role: string, routingNote?: string) {
    const manager = await this.prisma.user.findUnique({ where: { id: managerId }, select: { isActive: true, role: { select: { name: true } } } });
    if (!manager?.isActive) throw new ForbiddenException('Active manager account required');
    role = manager.role?.name || role;
    // Forwarding is the Dean's routing authority (Phase 1).
    if (role !== 'dean') {
      throw new ForbiddenException('Only the Dean can forward/reassign an escalation');
    }
    const session = await this.prisma.chatSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundException(`Chat session ${sessionId} not found`);
    if (session.status !== 'open') throw new BadRequestException('Cannot reassign a closed session');
    if (!session.escalationId) throw new BadRequestException('This session has no linked escalation case');
    if (!session.agentId) throw new BadRequestException('Accept the unassigned concern before reassigning it');
    if (session.agentId === targetId) return { session: await this.getSessionById(sessionId), previousAgentId: targetId };

    const target = await this.prisma.user.findUnique({
      where: { id: targetId },
      include: { role: true },
    });
    if (!target?.isActive || !STAFF_ROLES.includes(target.role?.name ?? '')) {
      throw new BadRequestException('Choose an active staff member (faculty, dean, registrar, treasury, or system administrator)');
    }

    const cleanNote = typeof routingNote === 'string' && routingNote.trim() ? routingNote.trim().slice(0, 500) : null;

    await this.prisma.$transaction(async (tx: any) => {
      const movedSession = await tx.chatSession.updateMany({
        where: { id: sessionId, status: 'open', agentId: session.agentId },
        data: { agentId: targetId, updatedAt: new Date() },
      });
      if (movedSession.count !== 1) throw new ConflictException('The assigned representative changed; refresh and retry');
      const movedQueue = await tx.escalationQueue.updateMany({
        where: { chatId: session.escalationId, status: 'in_progress', assignedTo: session.agentId },
        data: { assignedTo: targetId, updatedAt: new Date(), ...(cleanNote ? { routingNote: cleanNote } : {}) },
      });
      if (movedQueue.count !== 1) throw new ConflictException('The escalation assignment changed; refresh and retry');
      await tx.auditLog.create({ data: { userId: managerId, action: 'CHAT_SESSION_REASSIGNED', resource: 'chat_sessions', resourceId: sessionId, oldValue: session.agentId, newValue: JSON.stringify({ assigneeId: targetId, note: cleanNote }) } });
    });

    return { session: await this.getSessionById(sessionId), previousAgentId: session.agentId };
  }

  async sendMessage(sessionId: string, senderId: string, content: string, senderRole: string) {
    return this.prisma.$transaction(async (tx: any) => {
      const session = await tx.chatSession.findUnique({
        where: { id: sessionId },
        include: { student: { select: { userId: true } } },
      });
      if (!session) throw new NotFoundException(`Chat session ${sessionId} not found`);
      if (session.status === 'closed') throw new BadRequestException('Cannot send message to a closed session');
      const actor = await tx.user.findUnique({ where: { id: senderId }, select: { isActive: true, role: { select: { name: true } } } });
      if (!actor?.isActive) throw new ForbiddenException('Active account required');
      const effectiveRole = actor.role?.name || senderRole;
      this.assertAccess(session, senderId, effectiveRole);
      const lockWhere: any = { id: sessionId, status: 'open' };
      if (effectiveRole === 'student') lockWhere.studentId = session.studentId;
      else lockWhere.agentId = senderId;
      const authorizedAtWrite = await tx.chatSession.updateMany({
        where: lockWhere,
        data: { updatedAt: new Date() },
      });
      if (authorizedAtWrite.count !== 1) throw new ForbiddenException('Session assignment changed; refresh before replying');

      return tx.chatMessage.create({
        data: { sessionId, senderId, senderRole: effectiveRole, content },
        include: {
          sender: { select: { id: true, firstName: true, lastName: true } },
          session: true,
        },
      });
    });
  }

  async getMessages(sessionId: string, userId?: string, role?: string) {
    if (userId && role) {
      await this.getAuthorizedSession(sessionId, userId, role);
    }
    const messages = await this.prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return messages;
  }

  async closeSession(sessionId: string, resolverId: string, role: string, resolution: string) {
    const cleanResolution = typeof resolution === 'string' ? resolution.trim() : '';
    if (!cleanResolution) throw new BadRequestException('A resolution is required before closing a concern');
    if (cleanResolution.length > 2000) throw new BadRequestException('Resolution must be 2000 characters or fewer');
    if (!STAFF_ROLES.includes(role)) {
      throw new ForbiddenException('Only authorized staff can resolve a concern');
    }

    const result = await this.prisma.$transaction(async (tx: any) => {
      const session = await tx.chatSession.findUnique({
        where: { id: sessionId },
        include: { student: { select: { userId: true } } },
      });
      if (!session) throw new NotFoundException(`Chat session ${sessionId} not found`);
      if (!session.escalationId) throw new BadRequestException('This session has no linked escalation case');

      const actor = await tx.user.findUnique({ where: { id: resolverId }, select: { isActive: true, role: { select: { name: true } } } });
      if (!actor?.isActive) throw new ForbiddenException('Active representative account required');
      role = actor.role?.name || role;

      const queue = await tx.escalationQueue.findUnique({ where: { chatId: session.escalationId } });
      if (!queue) throw new NotFoundException('Linked escalation case not found');
      if (session.status === 'closed' && queue.status === 'resolved') {
        if (session.agentId === resolverId && queue.assignedTo === resolverId && queue.resolution === cleanResolution) {
          return { session, queue, studentUserId: session.student.userId, alreadyResolved: true };
        }
        throw new ConflictException('This concern has already been resolved');
      }
      if (session.status !== 'open' || session.agentId !== resolverId || queue.status !== 'in_progress' || queue.assignedTo !== resolverId) {
        throw new ForbiddenException('Only the current assigned representative can resolve this concern');
      }

      const closed = await tx.chatSession.updateMany({
        where: { id: sessionId, status: 'open', agentId: resolverId },
        data: { status: 'closed', updatedAt: new Date() },
      });
      if (closed.count !== 1) throw new ConflictException('The concern changed before it could be resolved');
      const resolved = await tx.escalationQueue.updateMany({
        where: { id: queue.id, status: 'in_progress', assignedTo: resolverId },
        data: { status: 'resolved', resolution: cleanResolution, updatedAt: new Date() },
      });
      if (resolved.count !== 1) throw new ConflictException('The escalation changed before it could be resolved');

      await tx.auditLog.create({ data: { userId: resolverId, action: 'CHAT_SESSION_RESOLVED', resource: 'chat_sessions', resourceId: sessionId, oldValue: 'open', newValue: 'closed', ipAddress: null } });

      await tx.chatMessage.create({
        data: { sessionId, senderId: resolverId, senderRole: role, content: cleanResolution },
      });
      await tx.chatLog.create({
        data: {
          userId: session.student.userId,
          message: 'Human support resolution',
          response: cleanResolution,
          intent: 'general_inquiry',
          confidence: 1,
        },
      });
      return {
        session: await tx.chatSession.findUnique({ where: { id: sessionId } }),
        queue: { ...queue, status: 'resolved', assignedTo: resolverId, resolution: cleanResolution },
        studentUserId: session.student.userId,
        alreadyResolved: false,
      };
    });

    if (!result.alreadyResolved) {
      await Promise.resolve().then(() => this.notificationsService.sendToUser(
        result.studentUserId,
        'ARIA Response Available',
        'A staff response is available in your ARIA conversation.',
      )).catch(() => undefined);
    }
    return this.getSessionById(sessionId);
  }

  async getMySessions(studentId: string) {
    const sessions = await this.prisma.chatSession.findMany({
      where: { studentId },
      include: {
        student: {
          include: {
            user: { select: { id: true, email: true, firstName: true, lastName: true } },
            studentSemesters: {
              orderBy: [{ year: 'desc' }, { semester: 'desc' }],
              take: 1,
              include: { term: true },
            },
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

  async getEligibleAssignees() {
    return this.prisma.user.findMany({
      where: { isActive: true, role: { name: { in: STAFF_ROLES } } },
      select: { id: true, firstName: true, lastName: true, role: { select: { name: true } } },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });
  }

  private assertAccess(session: any, userId: string, role: string) {
    if (STAFF_ROLES.includes(role) && session.agentId === userId) return;
    if (role === 'student' && session.student?.userId === userId) return;
    throw new ForbiddenException('You are not authorized to access this advisor session');
  }
}
