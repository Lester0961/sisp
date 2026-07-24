import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { SendNotificationDto } from './dto/send-notification.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // Get unread notification count (for NotificationBell)
  @Get('unread-count')
  async getUnreadCount(@CurrentUser() user: JwtPayload) {
    return this.notificationsService.getUnreadCount(user.sub);
  }

  // Admin views all notifications
  @Get('admin/all')
  @Roles('admin_staff', 'dean')
  async getAllAdmin() {
    return this.notificationsService.getAllNotificationsAdmin();
  }

  // Get own notifications
  @Get()
  async getMyNotifications(
    @CurrentUser() user: JwtPayload,
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    return this.notificationsService.getMyNotifications(user.sub, unreadOnly === 'true');
  }

  // Mark all as read
  @Patch('read-all')
  async markAllAsRead(@CurrentUser() user: JwtPayload) {
    return this.notificationsService.markAllAsRead(user.sub);
  }

  // Mark one as read
  @Patch(':id/read')
  async markAsRead(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.notificationsService.markAsRead(id, user.sub);
  }

  // Delete a notification
  @Delete(':id')
  async deleteNotification(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.notificationsService.deleteNotification(id, user.sub);
  }

  // Admin sends a notification
  @Post('send')
  @Roles('admin_staff', 'dean')
  async sendNotification(@Body() dto: SendNotificationDto) {
    return this.notificationsService.sendNotification(dto);
  }
}
