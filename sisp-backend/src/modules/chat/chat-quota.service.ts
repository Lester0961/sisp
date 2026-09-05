import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';

const DAILY_LIMIT = 20;

type QuotaStatus = {
  dailyLimit: number;
  usedToday: number;
  remainingToday: number;
  resetsAt: string;
};

@Injectable()
export class ChatQuotaService {
  constructor(private readonly prisma: PrismaService) {}

  async consume(userId: string): Promise<QuotaStatus> {
    const window = this.manilaWindow();
    let usedToday: number;

    if (this.prisma.isOffline) {
      const records = await (this.prisma as any).chatDailyUsage.findMany({ where: { userId } });
      const current = records.find(
        (record: any) => this.dateKey(new Date(record.usageDate)) === window.dayKey,
      );
      if ((current?.count ?? 0) >= DAILY_LIMIT) throw this.limitError(window.resetsAt);
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
      const rows = await this.prisma.$queryRaw<{ count: number }[]>(Prisma.sql`
        INSERT INTO "chat_daily_usage" ("id", "user_id", "usage_date", "count", "created_at", "updated_at")
        VALUES (${randomUUID()}, ${userId}, CAST(${window.dayKey} AS date), 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT ("user_id", "usage_date")
        DO UPDATE SET "count" = "chat_daily_usage"."count" + 1, "updated_at" = CURRENT_TIMESTAMP
        WHERE "chat_daily_usage"."count" < ${DAILY_LIMIT}
        RETURNING "count"
      `);
      if (rows.length === 0) throw this.limitError(window.resetsAt);
      usedToday = Number(rows[0].count);
    }

    return this.toStatus(usedToday, window.resetsAt);
  }

  async refund(userId: string): Promise<QuotaStatus> {
    const window = this.manilaWindow();
    if (this.prisma.isOffline) {
      const records = await (this.prisma as any).chatDailyUsage.findMany({ where: { userId } });
      const current = records.find(
        (record: any) => this.dateKey(new Date(record.usageDate)) === window.dayKey,
      );
      if (!current) return this.toStatus(0, window.resetsAt);
      const usedToday = Math.max(0, current.count - 1);
      await (this.prisma as any).chatDailyUsage.update({
        where: { id: current.id },
        data: { count: usedToday },
      });
      return this.toStatus(usedToday, window.resetsAt);
    }

    const rows = await this.prisma.$queryRaw<{ count: number }[]>(Prisma.sql`
      UPDATE "chat_daily_usage"
      SET "count" = GREATEST(0, "count" - 1), "updated_at" = CURRENT_TIMESTAMP
      WHERE "user_id" = ${userId} AND "usage_date" = CAST(${window.dayKey} AS date)
      RETURNING "count"
    `);
    return this.toStatus(Number(rows[0]?.count ?? 0), window.resetsAt);
  }

  async status(userId: string): Promise<QuotaStatus> {
    const window = this.manilaWindow();
    if (this.prisma.isOffline) {
      const records = await (this.prisma as any).chatDailyUsage.findMany({ where: { userId } });
      const current = records.find(
        (record: any) => this.dateKey(new Date(record.usageDate)) === window.dayKey,
      );
      return this.toStatus(Number(current?.count ?? 0), window.resetsAt);
    }

    const record = await (this.prisma as any).chatDailyUsage.findFirst({
      where: {
        userId,
        usageDate: new Date(`${window.dayKey}T00:00:00.000Z`),
      },
    });
    return this.toStatus(Number(record?.count ?? 0), window.resetsAt);
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

  private toStatus(usedToday: number, resetsAt: string): QuotaStatus {
    return {
      dailyLimit: DAILY_LIMIT,
      usedToday,
      remainingToday: Math.max(0, DAILY_LIMIT - usedToday),
      resetsAt,
    };
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
