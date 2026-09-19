import { ForbiddenException } from '@nestjs/common';
import { ChatSessionService } from './chat-session.service';

describe('ChatSessionService authorization', () => {
  const session = {
    id: 'session-1',
    status: 'open',
    studentId: 'profile-1',
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
        update: jest.fn().mockResolvedValue({ ...session }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      chatMessage: {
        create: jest.fn().mockResolvedValue({ id: 'message-1' }),
      },
    };
    service = new ChatSessionService(prisma);
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
    expect(prisma.chatSession.update).not.toHaveBeenCalled();
    expect(prisma.chatSession.updateMany).not.toHaveBeenCalled();
  });

  it('claims an unassigned live-agent session with a conditional update', async () => {
    prisma.chatSession.findUnique.mockResolvedValueOnce({ ...session, agentId: null });
    prisma.chatSession.findUnique.mockResolvedValueOnce({ ...session, agentId: 'agent-owner' });

    await service.assignAgent('session-1', 'agent-owner', 'live_agent');

    expect(prisma.chatSession.updateMany).toHaveBeenCalledWith({
      where: { id: 'session-1', status: 'open', OR: [{ agentId: null }, { agentId: 'agent-owner' }] },
      data: { agentId: 'agent-owner' },
    });
  });

  it('rejects a live-agent claim lost to a concurrent assignee', async () => {
    prisma.chatSession.findUnique.mockResolvedValueOnce({ ...session, agentId: null });
    prisma.chatSession.updateMany.mockResolvedValueOnce({ count: 0 });

    await expect(service.assignAgent('session-1', 'agent-owner', 'live_agent'))
      .rejects.toBeInstanceOf(ForbiddenException);
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
