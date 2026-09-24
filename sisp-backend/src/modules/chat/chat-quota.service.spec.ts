import { HttpException, HttpStatus } from '@nestjs/common';
import { ChatQuotaService } from './chat-quota.service';

describe('ChatQuotaService', () => {
  const originalLocalLimit = process.env.SISP_LOCAL_CHAT_DAILY_LIMIT;
  let prisma: any;
  let service: ChatQuotaService;
  let usage: any;

  beforeEach(() => {
    process.env.SISP_LOCAL_CHAT_DAILY_LIMIT = '200';
    usage = {
      id: 'usage-1',
      userId: 'student-1',
      usageDate: new Date(),
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

    try {
      await service.consume('student-1');
      fail('Expected the quota limit to reject another message.');
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
      expect((error as HttpException).getResponse()).toMatchObject({
        dailyLimit: 20,
        usedToday: 20,
        remainingToday: 0,
      });
    }
  });
});
