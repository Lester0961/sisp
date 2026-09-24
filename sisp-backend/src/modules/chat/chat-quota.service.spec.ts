import { HttpException, HttpStatus } from '@nestjs/common';
import { ChatQuotaService } from './chat-quota.service';

describe('ChatQuotaService', () => {
  const originalLocalLimit = process.env.SISP_LOCAL_CHAT_DAILY_LIMIT;
  const originalUnlimitedUserIds = process.env.SISP_CHAT_UNLIMITED_USER_IDS;
  let prisma: any;
  let service: ChatQuotaService;
  let usage: any;

  const manilaUsageDate = () => {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());
    const value = (type: string) => parts.find((part) => part.type === type)?.value;
    return new Date(`${value('year')}-${value('month')}-${value('day')}T00:00:00.000Z`);
  };

  beforeEach(() => {
    process.env.SISP_LOCAL_CHAT_DAILY_LIMIT = '200';
    delete process.env.SISP_CHAT_UNLIMITED_USER_IDS;
    usage = {
      id: 'usage-1',
      userId: 'student-1',
      usageDate: manilaUsageDate(),
      count: 19,
    };
    prisma = {
      isOffline: true,
      chatDailyUsage: {
        findMany: jest.fn().mockResolvedValue([usage]),
        update: jest.fn().mockImplementation(async ({ data }) => Object.assign(usage, data)),
        create: jest.fn().mockResolvedValue({}),
      },
    };
    service = new ChatQuotaService(prisma);
  });

  afterAll(() => {
    if (originalLocalLimit === undefined) delete process.env.SISP_LOCAL_CHAT_DAILY_LIMIT;
    else process.env.SISP_LOCAL_CHAT_DAILY_LIMIT = originalLocalLimit;
    if (originalUnlimitedUserIds === undefined) delete process.env.SISP_CHAT_UNLIMITED_USER_IDS;
    else process.env.SISP_CHAT_UNLIMITED_USER_IDS = originalUnlimitedUserIds;
  });

  it('keeps the standard 20-message limit even if a local override is set', async () => {
    await expect(service.status('student-1')).resolves.toEqual(expect.objectContaining({
      dailyLimit: 20,
      usedToday: 19,
      remainingToday: 1,
    }));
  });

  it('allows the twentieth message and reports no remaining quota', async () => {
    await expect(service.consume('student-1')).resolves.toEqual(expect.objectContaining({
      dailyLimit: 20,
      usedToday: 20,
      remainingToday: 0,
    }));
    expect(prisma.chatDailyUsage.update).toHaveBeenCalledWith({
      where: { id: 'usage-1' },
      data: { count: 20 },
    });
  });

  it('rejects additional messages after the twentieth message', async () => {
    usage.count = 20;

    let error: unknown;
    try {
      await service.consume('student-1');
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(HttpException);
    expect((error as HttpException).getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
    expect((error as HttpException).getResponse()).toMatchObject({
      dailyLimit: 20,
      usedToday: 20,
      remainingToday: 0,
    });
  });

  it('reports unlimited quota only for a configured account', async () => {
    process.env.SISP_CHAT_UNLIMITED_USER_IDS = ' student-1 ';

    await expect(service.status('student-1')).resolves.toEqual(expect.objectContaining({
      isUnlimited: true,
      dailyLimit: 20,
      usedToday: 19,
    }));
    await expect(service.status('student-2')).resolves.toEqual(expect.objectContaining({
      isUnlimited: false,
      dailyLimit: 20,
    }));
  });

  it('allows the configured account to continue past twenty messages', async () => {
    process.env.SISP_CHAT_UNLIMITED_USER_IDS = 'student-1';
    usage.count = 20;

    await expect(service.consume('student-1')).resolves.toEqual(expect.objectContaining({
      isUnlimited: true,
      dailyLimit: 20,
      usedToday: 21,
      remainingToday: 0,
    }));
    expect(prisma.chatDailyUsage.update).toHaveBeenCalledWith({
      where: { id: 'usage-1' },
      data: { count: 21 },
    });
  });

  it('keeps the cap for every account outside the configured allowlist', async () => {
    process.env.SISP_CHAT_UNLIMITED_USER_IDS = 'student-1';
    usage.userId = 'student-2';
    usage.count = 20;

    await expect(service.consume('student-2')).rejects.toMatchObject({
      status: HttpStatus.TOO_MANY_REQUESTS,
    });
  });
});
