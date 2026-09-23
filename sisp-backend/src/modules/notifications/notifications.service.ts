import { Injectable, NotFoundException, BadRequestException, Optional, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SendNotificationDto } from './dto/send-notification.dto';
import { MailService, escapeHtml } from '../auth/mail.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly mailService?: MailService,
  ) {}

  async getMyNotifications(userId: string, unreadOnly = false) {
    const notifications = await this.prisma.notification.findMany({
      where: {
        userId,
        ...(unreadOnly && { isRead: false }),
      },
      orderBy: { createdAt: 'desc' },
    });

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    return {
      data: notifications,
      total: notifications.length,
      unreadCount,
    };
  }

  async markAsRead(id: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }

    if (notification.userId !== userId) {
      throw new BadRequestException('You can only mark your own notifications as read');
    }

    const updated = await this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });

    return {
      message: 'Notification marked as read',
      data: updated,
    };
  }

  async markAllAsRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: { isRead: true },
    });

    return {
      message: `${result.count} notification(s) marked as read`,
      count: result.count,
    };
  }

  async deleteNotification(id: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }

    if (notification.userId !== userId) {
      throw new BadRequestException('You can only delete your own notifications');
    }

    await this.prisma.notification.delete({ where: { id } });

    return { message: 'Notification deleted successfully' };
  }

  async sendNotification(dto: SendNotificationDto) {
    if (dto.targetRole === 'all' && (dto.userId || dto.userIds?.length)) {
      throw new BadRequestException('The all-users target cannot be combined with named recipients');
    }
    if (dto.userIds && new Set(dto.userIds).size !== dto.userIds.length) {
      throw new BadRequestException('Duplicate notification recipients are not allowed');
    }
    if (dto.userId && dto.userIds?.includes(dto.userId)) {
      throw new BadRequestException('A named notification recipient cannot be specified twice');
    }
    // Must have at least one target
    if (!dto.userId && !dto.targetRole && !dto.userIds?.length) {
      throw new BadRequestException('Must provide userId, targetRole, or userIds');
    }

    const notificationsToCreate: {
      userId: string;
      title: string;
      message: string;
    }[] = [];

    // Send to a specific single user
    if (dto.userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: dto.userId },
      });

      if (!user) {
        throw new NotFoundException(`User with ID ${dto.userId} not found`);
      }

      notificationsToCreate.push({
        userId: dto.userId,
        title: dto.title,
        message: dto.message,
      });
    }

    // Send to multiple specific users
    if (dto.userIds?.length) {
      for (const uid of dto.userIds) {
        notificationsToCreate.push({
          userId: uid,
          title: dto.title,
          message: dto.message,
        });
      }
    }

    // Broadcast to all users of a role
    if (dto.targetRole) {
      const whereClause = dto.targetRole === 'all' ? {} : { role: { name: dto.targetRole } };

      const users = await this.prisma.user.findMany({
        where: {
          ...whereClause,
          isActive: true,
        },
        select: { id: true },
      });

      for (const user of users) {
        notificationsToCreate.push({
          userId: user.id,
          title: dto.title,
          message: dto.message,
        });
      }
    }

    // De-duplicate users returned by an overlapping named and role target.
    type NotifItem = { userId: string; title: string; message: string };
    const uniqueMap = new Map<string, NotifItem>();
    for (const n of notificationsToCreate) {
      if (!uniqueMap.has(n.userId)) uniqueMap.set(n.userId, n);
    }
    const unique = Array.from(uniqueMap.values());

    if (unique.length === 0) {
      return {
        message: 'No users found for the given target',
        count: 0,
      };
    }

    await this.createForUsers(unique);

    return {
      message: `Notification sent to ${unique.length} user(s)`,
      count: unique.length,
    };
  }

  // Internal helper — called by other services to send notifications.
  // Pass `{ email: true }` for business events that must also reach the user
  // by email (best-effort: email failures never block the workflow).
  async sendToUser(
    userId: string,
    title: string,
    message: string,
    options?: { email?: boolean; caseId?: string; eventKey?: string },
  ): Promise<void> {
    await this.createForUsers([{
      userId, title, message,
      ...(options?.caseId ? { caseId: options.caseId } : {}),
      ...(options?.eventKey ? { eventKey: options.eventKey } : {}),
    }]);
    if (options?.email) {
      await this.sendEmailBestEffort(userId, title, message);
    }
  }

  private async sendEmailBestEffort(userId: string, title: string, message: string): Promise<void> {
    if (!this.mailService?.isConfigured()) {
      return;
    }
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, firstName: true },
      });
      if (!user?.email) {
        return;
      }
      await this.mailService.send(
        user.email,
        user.firstName || 'SISP User',
        title,
        `<p>${escapeHtml(message)}</p><p style="color:#64748b;font-size:12px">Regis Marie College — Student Information and Services Portal</p>`,
        message,
      );
    } catch (error) {
      this.logger.warn(`Notification email skipped: ${(error as Error).message}`);
    }
  }

  private async createForUsers(data: { userId: string; title: string; message: string; caseId?: string; eventKey?: string }[]) {
    if (new Set(data.map((item) => item.userId)).size !== data.length) {
      throw new BadRequestException('Duplicate notification recipients are not allowed');
    }
    if (data.length === 1) {
      if (data[0].eventKey) {
        await this.prisma.notification.upsert({ where: { eventKey: data[0].eventKey }, update: {}, create: data[0] });
      } else {
        await this.prisma.notification.create({ data: data[0] });
      }
      return;
    }
    if (data.length > 1) await this.prisma.notification.createMany({ data });
  }

  async getUnreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });

    return { unreadCount: count };
  }

  async getAllNotificationsAdmin() {
    const notifications = await this.prisma.notification.findMany({
      include: {
        user: {
          select: {
            email: true,
            role: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return {
      data: notifications,
      total: notifications.length,
    };
  }
}
