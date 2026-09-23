import { ConflictException, ForbiddenException } from '@nestjs/common';
import { ChatSessionService } from './chat-session.service';

describe('ChatSessionService authorization (Phase 1 escalation)', () => {
  const session = {
    id: 'session-1',
    status: 'open',
    studentId: 'profile-1',
    escalationId: 'chat-log-1',
    student: { userId: 'student-owner' },
    agentId: 'agent-owner',
  };

  const roleFor = (id: string): string => {
    if (id === 'student-owner') return 'student';
    if (id === 'dean-1') return 'dean';
    if (id === 'live-agent-1') return 'live_agent';
    return 'registrar';
  };

  let prisma: any;
  let service: ChatSessionService;

  beforeEach(() => {
    prisma = {
      chatSession: {
        findUnique: jest.fn().mockResolvedValue({ ...session }),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        upsert: jest.fn().mockResolvedValue({ ...session }),
        create: jest.fn().mockResolvedValue({ ...session }),
      },
      escalationQueue: {
        findUnique: jest.fn().mockResolvedValue({ chatId: 'chat-log-1', assignedTo: 'agent-owner', status: 'in_progress' }),
        upsert: jest.fn().mockResolvedValue({ chatId: 'chat-log-1', status: 'pending' }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
      notification: { upsert: jest.fn().mockResolvedValue({}) },
      studentProfile: { findUnique: jest.fn().mockResolvedValue({ id: 'profile-1' }) },
      chatLog: {
        findFirst: jest.fn().mockResolvedValue({ id: 'chat-log-1', chatSession: { ...session } }),
        findUnique: jest.fn().mockResolvedValue({ userId: 'student-owner' }),
      },
      chatMessage: {
        create: jest.fn().mockResolvedValue({ id: 'message-1' }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      user: {
        findMany: jest.fn().mockResolvedValue([{ id: 'dean-1' }]),
        findUnique: jest.fn(({ where }: any) =>
          Promise.resolve({ id: where.id, isActive: true, role: { name: roleFor(where.id) } }),
        ),
      },
      $transaction: jest.fn((callback: (tx: any) => unknown) => callback(prisma)),
    };
    service = new ChatSessionService(prisma, { sendToUser: jest.fn().mockResolvedValue(undefined) } as any);
  });

  it('allows a student to send only to their own session', async () => {
    await service.sendMessage('session-1', 'student-owner', 'question', 'student');

    expect(prisma.chatMessage.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ senderId: 'student-owner', sessionId: 'session-1' }),
    }));
  });

  it('rejects a student sending to another student session', async () => {
    await expect(service.sendMessage('session-1', 'other-student', 'question', 'student'))
      .rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.chatMessage.create).not.toHaveBeenCalled();
  });

  it('requires staff to claim an unassigned session before replying', async () => {
    prisma.chatSession.findUnique.mockResolvedValueOnce({
      ...session,
      agentId: null,
    });

    await expect(service.sendMessage('session-1', 'agent-owner', 'reply', 'registrar'))
      .rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.chatMessage.create).not.toHaveBeenCalled();
  });

  it('prevents staff from taking another staff session', async () => {
    await expect(service.assignAgent('session-1', 'different-agent', 'registrar'))
      .rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.chatSession.updateMany).not.toHaveBeenCalled();
  });

  it('lets the Dean claim an unassigned concern with a conditional update', async () => {
    prisma.chatSession.findUnique.mockResolvedValueOnce({ ...session, agentId: null });
    prisma.chatSession.findUnique.mockResolvedValueOnce({ ...session, agentId: 'dean-1' });

    await service.assignAgent('session-1', 'dean-1', 'dean');

    expect(prisma.chatSession.updateMany).toHaveBeenCalledWith({
      where: { id: 'session-1', status: 'open', OR: [{ agentId: null }, { agentId: 'dean-1' }] },
      data: { agentId: 'dean-1', updatedAt: expect.any(Date) },
    });
  });

  it('excludes live agents from claiming an escalation', async () => {
    prisma.chatSession.findUnique.mockResolvedValueOnce({ ...session, agentId: null });
    await expect(service.assignAgent('session-1', 'live-agent-1', 'live_agent')).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.chatSession.updateMany).not.toHaveBeenCalled();
  });

  it('rejects a claim lost to a concurrent assignee', async () => {
    prisma.chatSession.findUnique.mockResolvedValueOnce({ ...session, agentId: null });
    prisma.chatSession.updateMany.mockResolvedValueOnce({ count: 0 });

    await expect(service.assignAgent('session-1', 'dean-1', 'dean'))
      .rejects.toBeInstanceOf(ConflictException);
  });

  it('does not allow unassigned staff to read conversation details', async () => {
    prisma.chatSession.findUnique.mockResolvedValueOnce({ ...session, agentId: null });
    await expect(service.getAuthorizedSession('session-1', 'agent-owner', 'registrar'))
      .rejects.toBeInstanceOf(ForbiddenException);
  });

  it('lets the Dean forward a claimed concern with a routing note', async () => {
    prisma.chatSession.findUnique.mockResolvedValue({ ...session, agentId: 'dean-1' });
    prisma.escalationQueue.findUnique.mockResolvedValue({ chatId: 'chat-log-1', assignedTo: 'dean-1', status: 'in_progress' });
    const result = await service.reassignAgent('session-1', 'dean-1', 'staff-2', 'dean', 'Records can answer this');

    expect(result.previousAgentId).toBe('dean-1');
    expect(prisma.escalationQueue.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ routingNote: 'Records can answer this' }),
      }),
    );
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'CHAT_SESSION_REASSIGNED' }),
      }),
    );
  });

  it('uses the prior Dean assignee even when the mock mutates the fetched session', async () => {
    const mutable = { ...session, agentId: 'dean-1' };
    prisma.chatSession.findUnique.mockResolvedValue(mutable);
    prisma.escalationQueue.findUnique.mockResolvedValue({ chatId: 'chat-log-1', assignedTo: 'dean-1', status: 'in_progress' });
    prisma.chatSession.updateMany.mockImplementation(async ({ data }: any) => {
      mutable.agentId = data.agentId;
      return { count: 1 };
    });

    await service.reassignAgent('session-1', 'dean-1', 'staff-2', 'dean');

    expect(prisma.escalationQueue.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ assignedTo: 'dean-1' }),
    }));
  });

  it('refuses to resolve an assignment split between the session and queue', async () => {
    prisma.escalationQueue.findUnique.mockResolvedValue({ id: 'queue-1', assignedTo: 'dean-1', status: 'in_progress' });

    await expect(service.closeSession('session-1', 'agent-owner', 'registrar', 'Handled')).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.chatSession.updateMany).not.toHaveBeenCalled();
    expect(prisma.chatMessage.create).not.toHaveBeenCalled();
  });

  it('counts only unseen staff replies for the owning student', async () => {
    prisma.chatSession.findMany.mockResolvedValue([
      { id: 's1', studentLastViewedAt: new Date('2026-09-23T10:00:00Z') },
      { id: 's2', studentLastViewedAt: null },
    ]);
    prisma.chatMessage.findMany.mockResolvedValue([
      { sessionId: 's1', createdAt: new Date('2026-09-23T09:00:00Z') },
      { sessionId: 's2', createdAt: new Date('2026-09-23T11:00:00Z') },
    ]);

    await expect(service.getAttention('student-owner', 'student')).resolves.toEqual({ count: 1 });
  });

  it('rejects an inactive target and a live agent target before forwarding', async () => {
    prisma.chatSession.findUnique.mockResolvedValue({ ...session, agentId: 'dean-1' });
    prisma.user.findUnique.mockImplementation(({ where }: any) => Promise.resolve({
      id: where.id,
      isActive: true,
      role: { name: where.id === 'live-agent-1' ? 'live_agent' : 'dean' },
    }));
    await expect(service.reassignAgent('session-1', 'dean-1', 'live-agent-1', 'dean')).rejects.toThrow('Choose an active');
    expect(prisma.chatSession.updateMany).not.toHaveBeenCalled();
  });

  it('does not let non-Dean staff forward concerns', async () => {
    await expect(
      service.reassignAgent('session-1', 'registrar-1', 'dean-1', 'registrar'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('returns the existing student-owned case on repeated human-assistance requests', async () => {
    const existingSession = { ...session, id: 'existing-session' };
    prisma.chatLog.findFirst.mockResolvedValueOnce({ id: 'chat-log-1', chatSession: existingSession });
    const result = await service.requestHumanAssistance('chat-log-1', 'student-owner');
    expect(result).toEqual(existingSession);
    expect(prisma.chatLog.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'chat-log-1', userId: 'student-owner' } }));
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('creates one case with Student and Dean notices in the same transaction', async () => {
    prisma.chatSession.findUnique.mockResolvedValueOnce(null);

    const created = await service.createSession('chat-log-1', 'profile-1');

    expect(created.id).toBe('session-1');
    expect(prisma.chatSession.create).toHaveBeenCalledTimes(1);
    expect(prisma.notification.upsert).toHaveBeenCalledTimes(2);
    expect(prisma.notification.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ userId: 'student-owner', caseId: 'session-1' }),
    }));
    expect(prisma.notification.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ userId: 'dean-1', caseId: 'session-1' }),
    }));
  });

  it('persists a staff reply and its Student notice through the transaction', async () => {
    await service.sendMessage('session-1', 'agent-owner', 'Staff response', 'registrar');
    expect(prisma.notification.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { eventKey: 'escalation:session-1:reply:message-1' },
      create: expect.objectContaining({ userId: 'student-owner', caseId: 'session-1' }),
    }));
  });

  it('returns a bounded privacy-minimized page for the Dean queue', async () => {
    prisma.chatSession.findMany.mockResolvedValue([]);
    prisma.chatSession.count.mockResolvedValue(125);

    const result = await service.getVisibleSessions('dean-1', 'dean', 'open', 2, 500);

    expect(prisma.chatSession.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { OR: [{ agentId: null }, { agentId: 'dean-1' }], escalationId: { not: null }, status: 'open' },
      skip: 100,
      take: 100,
      select: expect.objectContaining({
        student: { select: { studentNumber: true } },
        agent: { select: { id: true, firstName: true, lastName: true } },
        chatLog: { select: { intent: true } },
        messages: expect.objectContaining({ select: { senderRole: true, createdAt: true } }),
      }),
    }));
    expect(result).toEqual({ data: [], total: 125, page: 2, pageSize: 100, hasMore: false });
  });

  it('denies live agents the escalation queue', async () => {
    await expect(service.getVisibleSessions('live-agent-1', 'live_agent', 'open')).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.chatSession.findMany).not.toHaveBeenCalled();
  });

  it('shows other staff only their own assigned tickets', async () => {
    prisma.chatSession.findMany.mockResolvedValue([]);
    prisma.chatSession.count.mockResolvedValue(0);

    await service.getVisibleSessions('agent-owner', 'registrar', undefined, 1, 25);

    expect(prisma.chatSession.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { agentId: 'agent-owner' },
    }));
  });

  it('uses defaults for invalid queue pagination values', async () => {
    prisma.chatSession.findMany.mockResolvedValue([]);
    prisma.chatSession.count.mockResolvedValue(0);

    const result = await service.getVisibleSessions('registrar-1', 'registrar', undefined, 0, NaN);

    expect(prisma.chatSession.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 0, take: 25 }));
    expect(result).toEqual({ data: [], total: 0, page: 1, pageSize: 25, hasMore: false });
  });
});
