import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const DAILY_LIMIT = 20;

type QuotaStatus = {
  dailyLimit: number;
  usedToday: number;
  remainingToday: number;
  resetsAt: string;
  isUnlimited: boolean;
};

@Injectable()
export class ChatQuotaService {
  constructor(private readonly prisma: PrismaService) {}

  async consume(userId: string): Promise<QuotaStatus> {
    const window = this.manilaWindow();
    const isUnlimited = this.isUnlimitedUser(userId);
    let usedToday: number;

    if (this.prisma.isOffline) {
      const records = await (this.prisma as any).chatDailyUsage.findMany({ where: { userId } });
      const current = records.find(
        (record: any) => this.dateKey(new Date(record.usageDate)) === window.dayKey,
      );
      if (!isUnlimited && (current?.count ?? 0) >= DAILY_LIMIT) throw this.limitError(window.resetsAt);
      if (current) {
        usedToday = current.count + 1;
        await (this.prisma as any).chatDailyUsage.update({
          where: { id: current.id },
          data: { count: usedToday },
        });
      } else {
        usedToday = 1;
        await (this.prisma as any).chatDailyUsage.create({
          data: {
            userId,
            usageDate: new Date(`${window.dayKey}T00:00:00.000Z`),
            count: usedToday,
          },
        });
      }
    } else {
      // Type-safe (TEXT or uuid id columns) quota increment via Prisma.
      const usageDate = new Date(`${window.dayKey}T00:00:00.000Z`);
      try {
        await this.prisma.chatDailyUsage.create({
          data: { userId, usageDate, count: 1 },
        });
        usedToday = 1;
      } catch (error) {
        if (
          !(error instanceof Prisma.PrismaClientKnownRequestError) ||
          error.code !== 'P2002'
        ) {
          throw error;
        }
        const updated = await this.prisma.chatDailyUsage.updateMany({
          where: {
            userId,
            usageDate,
            ...(isUnlimited ? {} : { count: { lt: DAILY_LIMIT } }),
          },
          data: { count: { increment: 1 } },
        });
        if (updated.count === 0) throw this.limitError(window.resetsAt);
        const current = await this.prisma.chatDailyUsage.findUnique({
          where: { userId_usageDate: { userId, usageDate } },
        });
        usedToday = Number(current?.count ?? DAILY_LIMIT);
      }
    }

    return this.toStatus(usedToday, window.resetsAt, isUnlimited);
  }

  async refund(userId: string): Promise<QuotaStatus> {
    const window = this.manilaWindow();
    if (this.prisma.isOffline) {
      const records = await (this.prisma as any).chatDailyUsage.findMany({ where: { userId } });
      const current = records.find(
        (record: any) => this.dateKey(new Date(record.usageDate)) === window.dayKey,
      );
      if (!current) return this.toStatus(0, window.resetsAt, this.isUnlimitedUser(userId));
      const usedToday = Math.max(0, current.count - 1);
      await (this.prisma as any).chatDailyUsage.update({
        where: { id: current.id },
        data: { count: usedToday },
      });
      return this.toStatus(usedToday, window.resetsAt, this.isUnlimitedUser(userId));
    }

    const usageDate = new Date(`${window.dayKey}T00:00:00.000Z`);
    const current = await this.prisma.chatDailyUsage.findUnique({
      where: { userId_usageDate: { userId, usageDate } },
    });
    if (!current) return this.toStatus(0, window.resetsAt, this.isUnlimitedUser(userId));
    const usedToday = Math.max(0, current.count - 1);
    await this.prisma.chatDailyUsage.update({
      where: { id: current.id },
      data: { count: usedToday },
    });
    return this.toStatus(usedToday, window.resetsAt, this.isUnlimitedUser(userId));
  }

  async status(userId: string): Promise<QuotaStatus> {
    const window = this.manilaWindow();
    if (this.prisma.isOffline) {
      const records = await (this.prisma as any).chatDailyUsage.findMany({ where: { userId } });
      const current = records.find(
        (record: any) => this.dateKey(new Date(record.usageDate)) === window.dayKey,
      );
      return this.toStatus(Number(current?.count ?? 0), window.resetsAt, this.isUnlimitedUser(userId));
    }

    const record = await (this.prisma as any).chatDailyUsage.findFirst({
      where: {
        userId,
        usageDate: new Date(`${window.dayKey}T00:00:00.000Z`),
      },
    });
    return this.toStatus(Number(record?.count ?? 0), window.resetsAt, this.isUnlimitedUser(userId));
  }

  private limitError(resetsAt: string): HttpException {
    return new HttpException(
      {
        message: 'You have reached the daily limit of 20 ARIA messages.',
        dailyLimit: DAILY_LIMIT,
        usedToday: DAILY_LIMIT,
        remainingToday: 0,
        resetsAt,
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  private toStatus(usedToday: number, resetsAt: string, isUnlimited = false): QuotaStatus {
    return {
      dailyLimit: DAILY_LIMIT,
      usedToday,
      remainingToday: Math.max(0, DAILY_LIMIT - usedToday),
      resetsAt,
      isUnlimited,
    };
  }

  private isUnlimitedUser(userId: string): boolean {
    const allowedUserIds = (process.env.SISP_CHAT_UNLIMITED_USER_IDS || '')
      .split(',')
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean);
    return allowedUserIds.includes(userId.toLowerCase());
  }

  private manilaWindow(now = new Date()): { dayKey: string; resetsAt: string } {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(now);
    const value = (type: string) => Number(parts.find((part) => part.type === type)?.value);
    const year = value('year');
    const month = value('month');
    const day = value('day');
    const dayKey = `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    const resetsAt = new Date(Date.UTC(year, month - 1, day + 1, -8)).toISOString();
    return { dayKey, resetsAt };
  }

  private dateKey(date: Date): string {
    return date.toISOString().slice(0, 10);
  }
}
