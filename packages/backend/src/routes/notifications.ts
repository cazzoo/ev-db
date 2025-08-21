import { Hono } from 'hono';
import { db } from '../db/index.js';
import { inAppNotifications, users } from '../db/schema.js';
import { eq, desc, and, count } from 'drizzle-orm';
import { hybridAuth, getUserInfo } from '../middleware/auth.js';

const notificationsRouter = new Hono();

// Apply hybrid authentication to all notification routes
notificationsRouter.use('*', hybridAuth());

// Get user's in-app notifications with pagination
notificationsRouter.get('/user/notifications', async (c) => {
  try {
    const userInfo = getUserInfo(c);
    const page = parseInt(c.req.query('page') || '1');
    const limit = Math.min(parseInt(c.req.query('limit') || '20'), 100);
    const unreadOnly = c.req.query('unread_only') === 'true';
    const offset = (page - 1) * limit;

    // Build query conditions
    const conditions = [eq(inAppNotifications.userId, userInfo.userId)];
    if (unreadOnly) {
      conditions.push(eq(inAppNotifications.isRead, false));
    }

    // Get notifications with pagination
    const notifications = await db
      .select()
      .from(inAppNotifications)
      .where(and(...conditions))
      .orderBy(desc(inAppNotifications.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count for pagination
    const [totalResult] = await db
      .select({ count: count() })
      .from(inAppNotifications)
      .where(and(...conditions));

    const total = totalResult.count;
    const totalPages = Math.ceil(total / limit);

    return c.json({
      notifications: notifications.map(notification => ({
        id: notification.id,
        userId: notification.userId,
        title: notification.title,
        content: notification.content,
        eventType: notification.eventType,
        isRead: notification.isRead,
        readAt: notification.readAt ? new Date(notification.readAt).toISOString() : null,
        actionUrl: notification.actionUrl,
        metadata: notification.metadata ? JSON.parse(notification.metadata) : null,
        createdAt: new Date(notification.createdAt).toISOString(),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return c.json({ error: 'Failed to fetch notifications' }, 500);
  }
});

// Get unread notification count
notificationsRouter.get('/user/notifications/unread-count', async (c) => {
  try {
    const userInfo = getUserInfo(c);

    const [result] = await db
      .select({ count: count() })
      .from(inAppNotifications)
      .where(
        and(
          eq(inAppNotifications.userId, userInfo.userId),
          eq(inAppNotifications.isRead, false)
        )
      );

    return c.json({ unreadCount: result.count });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    return c.json({ error: 'Failed to fetch unread count' }, 500);
  }
});

// Get specific notification by ID
notificationsRouter.get('/user/notifications/:id', async (c) => {
  try {
    const userInfo = getUserInfo(c);
    const notificationId = parseInt(c.req.param('id'));

    if (isNaN(notificationId)) {
      return c.json({ error: 'Invalid notification ID' }, 400);
    }

    const [notification] = await db
      .select()
      .from(inAppNotifications)
      .where(
        and(
          eq(inAppNotifications.id, notificationId),
          eq(inAppNotifications.userId, userInfo.userId)
        )
      );

    if (!notification) {
      return c.json({ error: 'Notification not found' }, 404);
    }

    return c.json({
      notification: {
        id: notification.id,
        userId: notification.userId,
        title: notification.title,
        content: notification.content,
        eventType: notification.eventType,
        isRead: notification.isRead,
        readAt: notification.readAt ? new Date(notification.readAt).toISOString() : null,
        actionUrl: notification.actionUrl,
        metadata: notification.metadata ? JSON.parse(notification.metadata) : null,
        createdAt: new Date(notification.createdAt).toISOString(),
      },
    });
  } catch (error) {
    console.error('Error fetching notification:', error);
    return c.json({ error: 'Failed to fetch notification' }, 500);
  }
});

// Mark notification as read
notificationsRouter.put('/user/notifications/:id/read', async (c) => {
  try {
    const userInfo = getUserInfo(c);
    const notificationId = parseInt(c.req.param('id'));

    if (isNaN(notificationId)) {
      return c.json({ error: 'Invalid notification ID' }, 400);
    }

    // Check if notification exists and belongs to user
    const [existingNotification] = await db
      .select()
      .from(inAppNotifications)
      .where(
        and(
          eq(inAppNotifications.id, notificationId),
          eq(inAppNotifications.userId, userInfo.userId)
        )
      );

    if (!existingNotification) {
      return c.json({ error: 'Notification not found' }, 404);
    }

    // Update notification as read
    const now = new Date();
    await db
      .update(inAppNotifications)
      .set({
        isRead: true,
        readAt: now,
      })
      .where(eq(inAppNotifications.id, notificationId));

    // Return updated notification
    const [updatedNotification] = await db
      .select()
      .from(inAppNotifications)
      .where(eq(inAppNotifications.id, notificationId));

    return c.json({
      message: 'Notification marked as read',
      notification: {
        id: updatedNotification.id,
        userId: updatedNotification.userId,
        title: updatedNotification.title,
        content: updatedNotification.content,
        eventType: updatedNotification.eventType,
        isRead: updatedNotification.isRead,
        readAt: updatedNotification.readAt ? new Date(updatedNotification.readAt).toISOString() : null,
        actionUrl: updatedNotification.actionUrl,
        metadata: updatedNotification.metadata ? JSON.parse(updatedNotification.metadata) : null,
        createdAt: new Date(updatedNotification.createdAt).toISOString(),
      },
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return c.json({ error: 'Failed to mark notification as read' }, 500);
  }
});

// Mark all notifications as read
notificationsRouter.put('/user/notifications/mark-all-read', async (c) => {
  try {
    const userInfo = getUserInfo(c);
    const now = new Date();

    // Update all unread notifications for the user
    const result = await db
      .update(inAppNotifications)
      .set({
        isRead: true,
        readAt: now,
      })
      .where(
        and(
          eq(inAppNotifications.userId, userInfo.userId),
          eq(inAppNotifications.isRead, false)
        )
      );

    return c.json({
      message: 'All notifications marked as read',
      updatedCount: result.changes || 0,
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return c.json({ error: 'Failed to mark all notifications as read' }, 500);
  }
});

// Clear all notifications (must come before /:id routes)
notificationsRouter.delete('/user/notifications/clear-all', async (c) => {
  try {
    const userInfo = getUserInfo(c);

    // Delete all notifications for the user
    const result = await db
      .delete(inAppNotifications)
      .where(eq(inAppNotifications.userId, userInfo.userId));

    return c.json({
      message: 'All notifications cleared successfully',
      deletedCount: result.changes || 0,
    });
  } catch (error) {
    console.error('Error clearing all notifications:', error);
    return c.json({ error: 'Failed to clear all notifications' }, 500);
  }
});

// Delete notification
notificationsRouter.delete('/user/notifications/:id', async (c) => {
  try {
    const userInfo = getUserInfo(c);
    const notificationId = parseInt(c.req.param('id'));

    if (isNaN(notificationId)) {
      return c.json({ error: 'Invalid notification ID' }, 400);
    }

    // Check if notification exists and belongs to user
    const [existingNotification] = await db
      .select()
      .from(inAppNotifications)
      .where(
        and(
          eq(inAppNotifications.id, notificationId),
          eq(inAppNotifications.userId, userInfo.userId)
        )
      );

    if (!existingNotification) {
      return c.json({ error: 'Notification not found' }, 404);
    }

    // Delete the notification
    await db
      .delete(inAppNotifications)
      .where(eq(inAppNotifications.id, notificationId));

    return c.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    return c.json({ error: 'Failed to delete notification' }, 500);
  }
});

// Development endpoint to create test notifications
if (process.env.NODE_ENV !== 'production') {
  notificationsRouter.post('/dev/create-test-notifications', async (c) => {
    try {
      const userInfo = getUserInfo(c);
      const now = new Date();

      const testNotifications = [
        {
          userId: userInfo.userId,
          title: 'Welcome to EV Database! 👋',
          content: 'Welcome to the EV Database community. Start exploring electric vehicles or contribute your own data.',
          eventType: 'user.registered',
          actionUrl: '/vehicles',
          metadata: JSON.stringify({ userName: userInfo.email }),
          isRead: false,
          readAt: null,
          createdAt: now,
        },
        {
          userId: userInfo.userId,
          title: 'Contribution Approved! 🎉',
          content: 'Your contribution for Tesla Model S has been approved and is now live in the database.',
          eventType: 'contribution.approved',
          actionUrl: '/contributions/1',
          metadata: JSON.stringify({ contributionId: 1, vehicleName: 'Tesla Model S' }),
          isRead: false,
          readAt: null,
          createdAt: new Date(now.getTime() - 30 * 60 * 1000), // 30 minutes ago
        },
        {
          userId: userInfo.userId,
          title: 'System Announcement 📢',
          content: 'We have added new features to the EV Database. Check out the latest updates!',
          eventType: 'system.announcement',
          actionUrl: '/changelog',
          metadata: JSON.stringify({ isSystemAnnouncement: true }),
          isRead: true,
          readAt: new Date(now.getTime() - 10 * 60 * 1000), // Read 10 minutes ago
          createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2 hours ago
        },
        {
          userId: userInfo.userId,
          title: 'New Vehicle Added',
          content: 'A new vehicle BMW iX has been added to the database.',
          eventType: 'vehicle.created',
          actionUrl: '/vehicles/2',
          metadata: JSON.stringify({ vehicleId: 2, vehicleName: 'BMW iX' }),
          isRead: false,
          readAt: null,
          createdAt: new Date(now.getTime() - 60 * 60 * 1000), // 1 hour ago
        },
        {
          userId: userInfo.userId,
          title: 'Scheduled Maintenance 🔧',
          content: 'The system will undergo maintenance tonight from 2 AM to 4 AM UTC.',
          eventType: 'system.maintenance',
          actionUrl: null,
          metadata: JSON.stringify({ scheduledTime: '2 AM - 4 AM UTC', isMaintenanceNotice: true }),
          isRead: false,
          readAt: null,
          createdAt: new Date(now.getTime() - 15 * 60 * 1000), // 15 minutes ago
        }
      ];

      // Insert test notifications
      const insertedNotifications = await db.insert(inAppNotifications).values(testNotifications).returning();

      return c.json({
        message: `Created ${insertedNotifications.length} test notifications`,
        notifications: insertedNotifications.map(notification => ({
          id: notification.id,
          title: notification.title,
          eventType: notification.eventType,
          isRead: notification.isRead,
          createdAt: new Date(notification.createdAt).toISOString(),
        })),
      });
    } catch (error) {
      console.error('Error creating test notifications:', error);
      return c.json({ error: 'Failed to create test notifications' }, 500);
    }
  });
}

export default notificationsRouter;
