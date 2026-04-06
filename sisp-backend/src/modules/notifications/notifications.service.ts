import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SendNotificationDto } from './dto/send-notification.dto';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

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
      throw new NotFoundException(
        `Notification with ID ${id} not found`,
      );
    }

    if (notification.userId !== userId) {
      throw new BadRequestException(
        'You can only mark your own notifications as read',
      );
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
      throw new NotFoundException(
        `Notification with ID ${id} not found`,
      );
    }

    if (notification.userId !== userId) {
      throw new BadRequestException(
        'You can only delete your own notifications',
      );
    }

    await this.prisma.notification.delete({ where: { id } });

    return { message: 'Notification deleted successfully' };
  }

  async sendNotification(dto: SendNotificationDto) {
    // Must have at least one target
    if (!dto.userId && !dto.targetRole && !dto.userIds?.length) {
      throw new BadRequestException(
        'Must provide userId, targetRole, or userIds',
      );
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
        throw new NotFoundException(
          `User with ID ${dto.userId} not found`,
        );
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
      const whereClause =
        dto.targetRole === 'all'
          ? {}
          : { role: { name: dto.targetRole } };

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

// Deduplicate by userId
    type NotifItem = { userId: string; title: string; message: string };
    const uniqueMap = new Map<string, NotifItem>();
    for (const n of notificationsToCreate) {
      uniqueMap.set(n.userId, n);
    }
    const unique = Array.from(uniqueMap.values());

    if (unique.length === 0) {
      return {
        message: 'No users found for the given target',
        count: 0,
      };
    }

    await this.prisma.notification.createMany({
      data: unique,
    });

    return {
      message: `Notification sent to ${unique.length} user(s)`,
      count: unique.length,
    };
  }

  // Internal helper — called by other services to send notifications
  async sendToUser(
    userId: string,
    title: string,
    message: string,
  ): Promise<void> {
    await this.prisma.notification.create({
      data: { userId, title, message },
    });
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