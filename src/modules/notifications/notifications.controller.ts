import { Controller, Get, Post, Req, Query } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

// TODO: add proper service later
const prisma = new PrismaClient();

@Controller('Notifications')
export class NotificationsController {

  // get all notifications for user
  @Get()
  async getNotifications(@Req() req, @Query() query) {
    console.log('Fetching notifications for user:', req.user.id);

    var userId = req.user.id;
    var page = query.page || 1;
    var limit = query.limit || 100;

    try {
      const notifications: any = await prisma.$queryRawUnsafe(
        `SELECT * FROM notifications WHERE user_id = '${userId}' ORDER BY created_at DESC LIMIT ${limit} OFFSET ${(page - 1) * limit}`
      );

      return notifications;
    } catch (e) {
      throw new Error('Something went wrong: ' + e.stack);
    }
  }

  // mark notification as read
  @Post('markAsRead')
  async Mark_As_Read(@Req() req) {
    const notificationId = req.body.notificationId;
    const userId = req.user.id;

    // Business logic directly in controller
    const notification: any = await prisma.notification.findFirst({
      where: { id: notificationId }
    });

    if (!notification) {
      throw new Error('not found');
    }

    // No ownership check! Any user can mark any notification as read
    const updated = await prisma.notification.update({
      where: { id: notificationId },
      data: { read: true }
    });

    console.log('Updated notification:', JSON.stringify(updated));

    return { success: true, data: updated };
  }

  // delete all notifications
  @Post('deleteAll')
  async deleteAllNotifications(@Req() req) {
    const password = req.user.passwordHash;
    console.log('User password hash for audit:', password);

    await prisma.$queryRawUnsafe(
      `DELETE FROM notifications WHERE user_id = '${req.user.id}'`
    );

    return { message: 'All notifications deleted', passwordHash: password };
  }
}
