import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ChatbotService } from './chatbot.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ChatSessionService } from './chat-session.service';
import { ChatQuotaService } from './chat-quota.service';
import { NotificationsService } from '../notifications/notifications.service';

describe('ChatbotService (multi-intent + secure identity)', () => {
  let service: ChatbotService;
  let fetchMock: jest.Mock;

  const mockProfile = { id: 'student-profile-1', userId: 'user-1' };
  const mockUserWithProfile = {
    id: 'user-1',
    studentProfile: mockProfile,
  };

  const mockPrisma: any = {
    user: { findUnique: jest.fn() },
    studentProfile: { findUnique: jest.fn() },
    enrollment: { findMany: jest.fn() },
    grade: { findMany: jest.fn() },
    documentRequest: { findMany: jest.fn() },
    chatLog: { create: jest.fn() },
    escalationQueue: { create: jest.fn() },
  };

  const mockConfig = {
    get: jest.fn((key: string) => {
      if (key === 'ML_SERVICE_URL') return 'http://ml.test';
      if (key === 'ML_SECRET_TOKEN') return 'test-secret';
      return undefined;
    }),
  };

  const mockSessions = { createSession: jest.fn() };
  const mockNotifications = { sendToUser: jest.fn() };
  const mockQuota = {
    consume: jest.fn(),
    refund: jest.fn(),
    status: jest.fn(),
  };

  const mlOk = (body: any) =>
    Promise.resolve({ ok: true, json: () => Promise.resolve(body) } as any);

  beforeEach(async () => {
    fetchMock = jest.fn();
    (global as any).fetch = fetchMock;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatbotService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfig },
        { provide: ChatSessionService, useValue: mockSessions },
        { provide: ChatQuotaService, useValue: mockQuota },
        { provide: NotificationsService, useValue: mockNotifications },
      ],
    }).compile();

    service = module.get<ChatbotService>(ChatbotService);

    mockPrisma.user.findUnique.mockResolvedValue(mockUserWithProfile);
    mockPrisma.studentProfile.findUnique.mockResolvedValue(mockProfile);
    mockPrisma.chatLog.create.mockImplementation((args: any) =>
      Promise.resolve({ id: 'chat-1', createdAt: new Date(), ...args.data }),
    );
    mockPrisma.escalationQueue.create.mockImplementation((args: any) =>
      Promise.resolve({ id: 'esc-1', ...args.data }),
    );
    mockSessions.createSession.mockResolvedValue({ id: 'sess-1' });
    mockQuota.consume.mockResolvedValue({ remainingToday: 19 });
    mockQuota.refund.mockImplementation((id: string) =>
      Promise.resolve({ remainingToday: 20 }),
    );
    mockPrisma.enrollment.findMany.mockResolvedValue([]);
    mockPrisma.grade.findMany.mockResolvedValue([]);
    mockPrisma.documentRequest.findMany.mockResolvedValue([]);
  });

  afterEach(() => {
    delete (global as any).fetch;
    jest.clearAllMocks();
  });

  it('sends X-ML-Secret and server-derived student_id to the ML service', async () => {
    fetchMock.mockImplementation(() =>
      mlOk({
        response: 'ok',
        intent: 'enrollment_inquiry',
        confidence: 0.9,
        escalate: false,
        sources: [],
        route: 'policy',
        language: { code: 'en' },
        parts: [],
      }),
    );

    await service.sendMessage('user-1', { message: 'hi' } as any);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://ml.test/chat');
    expect(init.headers['X-ML-Secret']).toBe('test-secret');
    const body = JSON.parse(init.body);
    expect(body.student_id).toBe('student-profile-1');
    expect(mockPrisma.chatLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-1',
        message: 'hi',
        response: 'ok',
        intent: 'enrollment_inquiry',
        confidence: 0.9,
      }),
    });
  });

  it('omits student_id (but still works) when the user has no profile', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce({ id: 'user-1' });
    fetchMock.mockImplementation(() =>
      mlOk({
        response: 'ok',
        intent: 'enrollment_inquiry',
        confidence: 0.9,
        escalate: false,
        sources: [],
        route: 'policy',
        language: { code: 'en' },
        parts: [],
      }),
    );

    const res = await service.sendMessage('user-1', { message: 'hi' } as any);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.student_id).toBeUndefined();
    expect(res.response).toBe('ok');
  });

  it('resolves backend-flagged parts and re-stitches the response', async () => {
    fetchMock.mockImplementation(() =>
      mlOk({
        response: 'hint-a\n\n---\n\nhint-b',
        intent: 'multi_intent',
        confidence: 0.8,
        escalate: false,
        sources: [],
        route: 'multi',
        language: { code: 'en' },
        parts: [
          {
            index: 0,
            text: 'policy answer',
            intent: 'enrollment_inquiry',
            confidence: 0.9,
            route: 'policy',
            sources: [],
            data: null,
            error: null,
            escalated: false,
          },
          {
            index: 1,
            text: 'checking records',
            intent: 'schedule',
            confidence: 1.0,
            route: 'database',
            action: 'schedule',
            sources: [],
            data: { needs_backend_resolution: true, action: 'schedule' },
            error: null,
            escalated: false,
          },
        ],
      }),
    );
    mockPrisma.enrollment.findMany.mockResolvedValue([
      {
        course: { code: 'CS 101', title: 'Intro', units: 3 },
        section: 'A',
        status: 'enrolled',
        term: { label: 'Term 1' },
      },
    ]);

    const res = await service.sendMessage('user-1', { message: 'q' } as any);

    expect(res.parts).toHaveLength(2);
    expect(res.parts[1].text).toContain('CS 101');
    expect(res.parts[1].data.resolvedBy).toBe('backend');
    expect(res.response).toContain('policy answer');
    expect(res.response).toContain('CS 101');
  });

  it('never throws on backend resolve failure; escalates instead', async () => {
    fetchMock.mockImplementation(() =>
      mlOk({
        response: 'hint',
        intent: 'multi_intent',
        confidence: 0.8,
        escalate: false,
        sources: [],
        route: 'multi',
        language: { code: 'en' },
        parts: [
          {
            index: 0,
            text: 'hint',
            intent: 'schedule',
            confidence: 1.0,
            route: 'database',
            action: 'schedule',
            sources: [],
            data: { needs_backend_resolution: true, action: 'schedule' },
            error: null,
            escalated: false,
          },
        ],
      }),
    );
    // No profile at resolve time AND no enrollments data path: force failure.
    mockPrisma.studentProfile.findUnique.mockRejectedValueOnce(new Error('db down'));
    // resolveStudentId still succeeds (user lookup), resolveDatabasePart fails.
    mockPrisma.user.findUnique.mockResolvedValue(mockUserWithProfile);

    const res = await service.sendMessage('user-1', { message: 'q' } as any);

    expect(res.escalated).toBe(true);
    expect(res.sessionId).toBe('sess-1');
    expect(res.parts[0].error).toBeTruthy();
    expect(res.parts[0].text).toContain('could not verify this student record');
    expect(res.parts[0].text).not.toContain('hint');
    expect(res.response).not.toContain('hint');
  });

  it('notifies the student after an ARIA escalation response is persisted', async () => {
    const order: string[] = [];
    mockPrisma.escalationQueue.findUnique = jest.fn().mockResolvedValue({
      id: 'escalation-1',
      chat: { userId: 'user-1', chatSession: null },
    });
    mockPrisma.escalationQueue.update = jest.fn().mockImplementation(async () => {
      order.push('resolved');
      return { id: 'escalation-1', status: 'resolved' };
    });
    mockPrisma.chatLog.create.mockImplementation(async ({ data }: any) => {
      order.push('response');
      return { id: 'chat-log-1', ...data };
    });
    mockNotifications.sendToUser.mockImplementation(async () => {
      order.push('notification');
    });

    await service.resolveEscalation('escalation-1', 'Approved course plan', 'registrar-1');

    expect(order).toEqual(['resolved', 'response', 'notification']);
    expect(mockNotifications.sendToUser).toHaveBeenCalledWith(
      'user-1',
      'ARIA Response Available',
      'A staff response is available in your ARIA conversation.',
    );
  });

  it('does not report a missing balance record as zero and escalates it', async () => {
    fetchMock.mockImplementation(() =>
      mlOk({
        response: 'balance hint',
        intent: 'payment_inquiry',
        confidence: 0.9,
        escalate: false,
        sources: [],
        route: 'database',
        action: 'balance',
        language: { code: 'en' },
        data: null,
        parts: [],
      }),
    );
    mockPrisma.studentProfile.findUnique.mockResolvedValue({ id: 'student-profile-1' });

    const res = await service.sendMessage('user-1', { message: 'What is my balance?' } as any);

    expect(res.response).toContain('could not verify an account balance record');
    expect(res.response).not.toContain('0.00');
    expect(res.escalated).toBe(true);
    expect(res.sessionId).toBe('sess-1');
  });
});
