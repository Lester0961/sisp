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
    chatLog: { create: jest.fn(), update: jest.fn().mockResolvedValue({}) },
    escalationQueue: { create: jest.fn(), findUnique: jest.fn() },
  };

  const mockConfig = {
    get: jest.fn((key: string) => {
      if (key === 'ML_SERVICE_URL') return 'http://ml.test';
      if (key === 'ML_SECRET_TOKEN') return 'test-secret';
      return undefined;
    }),
  };

  const mockSessions = { createSession: jest.fn(), closeSession: jest.fn() };
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
    jest.useRealTimers();
    delete (global as any).fetch;
    // Remove queued one-shot mock results when a case exits before that path
    // is reached, so later escalation tests always use the intended profile.
    mockPrisma.user.findUnique.mockReset();
    jest.clearAllMocks();
  });

  it('authenticates to ML without sending the student profile identifier', async () => {
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

    const result = await service.sendMessage('user-1', { message: 'hi' } as any);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://ml.test/chat');
    expect(init.headers['X-ML-Secret']).toBe('test-secret');
    expect(init.headers['X-Request-ID']).toMatch(/^[0-9a-f-]{36}$/i);
    const body = JSON.parse(init.body);
    expect(body.student_id).toBeUndefined();
    expect(mockPrisma.chatLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-1',
        message: 'hi',
        response: 'ok',
        intent: 'enrollment_inquiry',
        confidence: 0.9,
        createdAt: expect.any(Date),
      }),
    });
    expect(result.createdAt).toEqual(mockPrisma.chatLog.create.mock.calls[0][0].data.createdAt);
  });

  it('keeps policy chat working when the user has no profile', async () => {
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

  it('refunds quota for an unresolved answer and leaves human support optional', async () => {
    fetchMock.mockImplementation(() =>
      mlOk({
        response: 'I do not have verified information for that yet.',
        intent: 'enrollment_inquiry',
        confidence: 1,
        escalate: false,
        quotaRefund: true,
        sources: [],
        route: 'knowledge_gap',
        language: { code: 'en' },
        parts: [],
      }),
    );

    const result = await service.sendMessage('user-1', { message: 'How do I enroll?' } as any);

    expect(mockQuota.refund).toHaveBeenCalledWith('user-1');
    expect(mockSessions.createSession).not.toHaveBeenCalled();
    expect(result.escalated).toBe(false);
  });

  it('keeps a grounded partial enrollment answer out of the live-agent queue', async () => {
    fetchMock.mockImplementation(() =>
      mlOk({
        response: 'According to interview notes, clear a previous balance at Treasury, then go to Admissions.',
        intent: 'enrollment_inquiry',
        confidence: 1,
        escalate: false,
        quotaRefund: false,
        sources: [{ source: 'enrollment_interview_guidance.txt', category: 'enrollment_policy' }],
        route: 'partially_answered',
        language: { code: 'en' },
        parts: [],
      }),
    );

    const result = await service.sendMessage('user-1', { message: 'How do I enroll and how much is tuition?' } as any);

    expect(result.response).toContain('Treasury');
    expect(result.response).toContain('Admissions');
    expect(result.route).toBe('partially_answered');
    expect(result.escalated).toBe(false);
    expect(result.sessionId).toBeNull();
    expect(mockQuota.refund).not.toHaveBeenCalled();
    expect(mockSessions.createSession).not.toHaveBeenCalled();
  });

  it('retries one transient ML gateway failure before returning the answer', async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: false, status: 502, headers: { get: () => null } })
      .mockImplementationOnce(() =>
        mlOk({
          response: 'Here is the answer.',
          intent: 'document_request',
          confidence: 0.9,
          escalate: false,
          sources: [],
          route: 'policy',
          language: { code: 'en' },
          parts: [],
        }),
      );

    const res = await service.sendMessage('user-1', { message: 'How much is a TOR?' } as any);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(res.response).toBe('Here is the answer.');
    expect(res.escalated).toBe(false);
  });

  it('does not replay an ML failure marked unsafe after processing began', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 503,
      headers: { get: (name: string) => name === 'x-aria-retry-safe' ? 'false' : null },
    });

    const result = await service.sendMessage('user-1', { message: 'How much is a TOR?' } as any);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.escalated).toBe(true);
    expect(mockSessions.createSession).toHaveBeenCalledTimes(1);
  });

  it('backs off across multiple gateway failures and recovers within the bounded window', async () => {
    jest.useFakeTimers();
    fetchMock
      .mockResolvedValueOnce({ ok: false, status: 502, headers: { get: () => null } })
      .mockResolvedValueOnce({ ok: false, status: 503, headers: { get: () => null } })
      .mockImplementationOnce(() =>
        mlOk({
          response: 'The curriculum source has the answer.',
          intent: 'curriculum_inquiry',
          confidence: 1,
          escalate: false,
          sources: [{ source: 'curriculum_BSCS_2024.txt' }],
          route: 'policy',
          language: { code: 'en' },
          parts: [],
        }),
      );

    const pending = service.sendMessage('user-1', {
      message: 'What subjects are in the BSCS curriculum?',
    } as any);
    await jest.runAllTimersAsync();
    const result = await pending;

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(result.response).toContain('curriculum source');
    expect(result.escalated).toBe(false);
  });

  it('retries one transient ML transport failure before creating a handoff', async () => {
    fetchMock
      .mockRejectedValueOnce(new TypeError('fetch failed'))
      .mockImplementationOnce(() =>
        mlOk({
          response: 'Here is the answer.',
          intent: 'document_request',
          confidence: 0.9,
          escalate: false,
          sources: [],
          route: 'policy',
          language: { code: 'en' },
          parts: [],
        }),
      );

    const res = await service.sendMessage('user-1', { message: 'How much is a TOR?' } as any);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(res.response).toBe('Here is the answer.');
    expect(res.escalated).toBe(false);
    expect(mockSessions.createSession).not.toHaveBeenCalled();
  });

  it('uses a truthful localized handoff when the ML service remains unavailable', async () => {
    jest.useFakeTimers();
    fetchMock.mockResolvedValue({ ok: false, status: 429, headers: { get: () => null } });

    const pending = service.sendMessage('user-1', {
      message: 'Paano mag-enroll?',
      preferredLanguage: 'fil',
    } as any);
    await jest.runAllTimersAsync();
    const res = await pending;

    expect(fetchMock).toHaveBeenCalledTimes(7);
    expect(res.response).toContain('Hindi ko ma-access ngayon');
    expect(res.response).not.toContain('scheduled system updates');
    expect(res.escalated).toBe(true);
    expect(mockQuota.refund).toHaveBeenCalledWith('user-1');
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

    const res = await service.sendMessage('user-1', {
      message: 'What classes am I currently enrolled in?',
    } as any);

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

    const res = await service.sendMessage('user-1', {
      message: 'What classes am I currently enrolled in?',
    } as any);

    expect(res.escalated).toBe(true);
    expect(res.sessionId).toBe('sess-1');
    expect(res.parts[0].error).toBeTruthy();
    expect(res.parts[0].text).toContain('could not verify this student record');
    expect(res.parts[0].text).not.toContain('hint');
    expect(res.response).not.toContain('hint');
  });

  it('resolves an escalation through the assigned live session close workflow', async () => {
    mockPrisma.escalationQueue.findUnique.mockResolvedValue({
      id: 'escalation-1',
      chat: { userId: 'user-1', chatSession: { id: 'session-1' } },
    });
    mockPrisma.escalationQueue.findUnique
      .mockResolvedValueOnce({ id: 'escalation-1', chat: { userId: 'user-1', chatSession: { id: 'session-1' } } })
      .mockResolvedValueOnce({ id: 'escalation-1', status: 'resolved' });
    mockSessions.closeSession.mockResolvedValue({ id: 'session-1', status: 'closed' });

    const result = await service.resolveEscalation('escalation-1', 'Approved course plan', 'registrar-1', 'registrar');

    expect(mockSessions.closeSession).toHaveBeenCalledWith('session-1', 'registrar-1', 'registrar', 'Approved course plan');
    expect(result).toEqual({ id: 'escalation-1', status: 'resolved' });
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

  it('does not resolve a Waray enrollment and tuition-price question as a personal balance', async () => {
    fetchMock.mockImplementation(() =>
      mlOk({
        response: 'incorrect balance hint',
        intent: 'payment_inquiry',
        confidence: 0.9,
        escalate: false,
        sources: [],
        route: 'database',
        action: 'balance',
        language: { code: 'war' },
        data: null,
        parts: [],
      }),
    );

    const res = await service.sendMessage('user-1', {
      message: 'Ano it proseso hit pag-enroll para ha sunod nga semester, ngan tag-pira it angay ko bayaran ha matrikula?',
    } as any);

    expect(mockPrisma.studentProfile.findUnique).not.toHaveBeenCalled();
    expect(res.response).toContain('Waray ko mapamatud-i');
    expect(res.response).not.toContain('account balance');
    expect(res.response).not.toContain('0.00');
    expect(res.route).toBe('knowledge_gap');
  });

  it('never exposes personal grades when ML misroutes a grade-appeal policy question', async () => {
    fetchMock.mockImplementation(() =>
      mlOk({
        response: 'Your posted grades',
        intent: 'grade_inquiry',
        confidence: 0.91,
        escalate: false,
        sources: [],
        route: 'database',
        action: 'grades',
        language: { code: 'en' },
        parts: [],
      }),
    );

    const res = await service.sendMessage('user-1', {
      message: 'How many days are allowed for a grade appeal under a current verified rule?',
    } as any);

    expect(mockPrisma.grade.findMany).not.toHaveBeenCalled();
    expect(mockPrisma.studentProfile.findUnique).not.toHaveBeenCalled();
    expect(res.response).toContain("couldn't verify a grade-appeal time limit");
    expect(res.response).not.toContain('Your posted grades');
    expect(res.route).toBe('knowledge_gap');
    expect(res.escalated).toBe(false);
  });

  it('does not expose grades when a capability question is misrouted as a record lookup', async () => {
    fetchMock.mockImplementation(() =>
      mlOk({
        response: 'Your posted grades',
        intent: 'grade_inquiry',
        confidence: 0.91,
        escalate: false,
        sources: [],
        route: 'database',
        action: 'grades',
        language: { code: 'en' },
        parts: [],
      }),
    );

    const res = await service.sendMessage('user-1', {
      message: 'Can ARIA directly change a grade in my record?',
    } as any);

    expect(mockPrisma.grade.findMany).not.toHaveBeenCalled();
    expect(mockPrisma.studentProfile.findUnique).not.toHaveBeenCalled();
    expect(res.response).toContain('cannot change or edit posted grades');
    expect(res.response).not.toContain('Your posted grades');
    expect(res.route).toBe('knowledge_gap');
    expect(res.escalated).toBe(false);
  });

  it('does not read enrollment records to answer whether down-payment proves active status', async () => {
    fetchMock.mockImplementation(() =>
      mlOk({
        response: 'Your enrollment status',
        intent: 'enrollment_inquiry',
        confidence: 0.89,
        escalate: false,
        sources: [],
        route: 'database',
        action: 'enrollment_status',
        language: { code: 'en' },
        parts: [],
      }),
    );

    const res = await service.sendMessage('user-1', {
      message: 'Does paying the down-payment by itself prove that my portal enrollment status is active?',
    } as any);

    expect(mockPrisma.enrollment.findMany).not.toHaveBeenCalled();
    expect(mockPrisma.studentProfile.findUnique).not.toHaveBeenCalled();
    expect(res.response).not.toContain('Your enrollment status');
    expect(res.route).toBe('knowledge_gap');
    expect(res.escalated).toBe(false);
  });
});
