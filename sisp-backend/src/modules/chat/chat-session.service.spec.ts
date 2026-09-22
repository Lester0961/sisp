import { ConflictException, ForbiddenException } from '@nestjs/common';
import { ChatSessionService } from './chat-session.service';

describe('ChatSessionService authorization', () => {
  const session = {
    id: 'session-1',
    status: 'open',
    studentId: 'profile-1',
    escalationId: 'chat-log-1',
    student: { userId: 'student-owner' },
    agentId: 'agent-owner',
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
      },
      escalationQueue: {
        findUnique: jest.fn().mockResolvedValue({ chatId: 'chat-log-1', assignedTo: 'agent-owner', status: 'in_progress' }),
        upsert: jest.fn().mockResolvedValue({ chatId: 'chat-log-1', status: 'pending' }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
      studentProfile: { findUnique: jest.fn().mockResolvedValue({ id: 'profile-1' }) },
      chatLog: { findFirst: jest.fn().mockResolvedValue({ id: 'chat-log-1', chatSession: { ...session } }) },
      chatMessage: {
        create: jest.fn().mockResolvedValue({ id: 'message-1' }),
      },
      user: { findUnique: jest.fn(({ where }: any) => Promise.resolve({ isActive: true, role: { name: where.id === 'student-owner' ? 'student' : 'live_agent' } })) },
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

  it('requires a live agent to claim an unassigned session before replying', async () => {
    prisma.chatSession.findUnique.mockResolvedValueOnce({
      ...session,
      agentId: null,
    });

    await expect(service.sendMessage('session-1', 'agent-owner', 'reply', 'live_agent'))
      .rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.chatMessage.create).not.toHaveBeenCalled();
  });

  it('prevents a live agent from taking another agent session', async () => {
    await expect(service.assignAgent('session-1', 'different-agent', 'live_agent'))
      .rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.chatSession.updateMany).not.toHaveBeenCalled();
  });

  it('claims an unassigned live-agent session with a conditional update', async () => {
    prisma.chatSession.findUnique.mockResolvedValueOnce({ ...session, agentId: null });
    prisma.chatSession.findUnique.mockResolvedValueOnce({ ...session, agentId: 'agent-owner' });

    await service.assignAgent('session-1', 'agent-owner', 'live_agent');

    expect(prisma.chatSession.updateMany).toHaveBeenCalledWith({
      where: { id: 'session-1', status: 'open', OR: [{ agentId: null }, { agentId: 'agent-owner' }] },
      data: { agentId: 'agent-owner', updatedAt: expect.any(Date) },
    });
  });

  it('rejects a live-agent claim lost to a concurrent assignee', async () => {
    prisma.chatSession.findUnique.mockResolvedValueOnce({ ...session, agentId: null });
    prisma.chatSession.updateMany.mockResolvedValueOnce({ count: 0 });

    await expect(service.assignAgent('session-1', 'agent-owner', 'live_agent'))
      .rejects.toBeInstanceOf(ConflictException);
  });

  it('does not allow unassigned staff to read conversation details', async () => {
    prisma.chatSession.findUnique.mockResolvedValueOnce({ ...session, agentId: null });
    await expect(service.getAuthorizedSession('session-1', 'agent-owner', 'live_agent'))
      .rejects.toBeInstanceOf(ForbiddenException);
  });

  it('returns the existing student-owned case on repeated human-assistance requests', async () => {
    const existingSession = { ...session, id: 'existing-session' };
    prisma.chatLog.findFirst.mockResolvedValueOnce({ id: 'chat-log-1', chatSession: existingSession });
    const result = await service.requestHumanAssistance('chat-log-1', 'student-owner');
    expect(result).toEqual(existingSession);
    expect(prisma.chatLog.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'chat-log-1', userId: 'student-owner' } }));
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('returns a bounded privacy-minimized page for the live-agent queue', async () => {
    prisma.chatSession.findMany.mockResolvedValue([]);
    prisma.chatSession.count.mockResolvedValue(125);

    const result = await service.getVisibleSessions('agent-owner', 'live_agent', 'open', 2, 500);

    expect(prisma.chatSession.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { OR: [{ agentId: null }, { agentId: 'agent-owner' }], status: 'open' },
      skip: 100,
      take: 100,
      select: expect.objectContaining({
        student: { select: { studentNumber: true } },
        agent: { select: { id: true, firstName: true, lastName: true } },
        messages: expect.objectContaining({ select: { senderRole: true, createdAt: true } }),
      }),
    }));
    expect(result).toEqual({ data: [], total: 125, page: 2, pageSize: 100, hasMore: false });
  });

  it('uses defaults for invalid queue pagination values', async () => {
    prisma.chatSession.findMany.mockResolvedValue([]);
    prisma.chatSession.count.mockResolvedValue(0);

    const result = await service.getVisibleSessions('registrar-1', 'registrar', undefined, 0, NaN);

    expect(prisma.chatSession.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 0, take: 25 }));
    expect(result).toEqual({ data: [], total: 0, page: 1, pageSize: 25, hasMore: false });
  });

});
