import { Hono } from 'hono';
import { getUserInfo } from '../middleware/auth';
import { adminAuth } from '../middleware/adminAuth';
import { AdminNotificationService } from '../services/adminNotificationService';
import { z } from 'zod';

const adminNotificationsRouter = new Hono();

// Apply admin middleware to all routes
adminNotificationsRouter.use('*', ...adminAuth);

// Validation schemas
const createNotificationSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(2000),
  notificationType: z.enum(['info', 'success', 'warning', 'error', 'announcement']),
  targetAudience: z.enum(['all_users', 'specific_roles', 'individual_users']),
  targetRoles: z.array(z.string()).optional(),
  targetUserIds: z.array(z.number()).optional(),
  scheduledAt: z.string().datetime().optional(),
  expiresAt: z.string().datetime().optional(),
  actionUrl: z.string().url().optional(),
  metadata: z.any().optional(),
});

const createTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  eventType: z.string().min(1).max(50),
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(2000),
  notificationType: z.enum(['info', 'success', 'warning', 'error', 'announcement']),
  category: z.enum(['system', 'contribution', 'user', 'admin', 'changelog', 'maintenance']),
  variables: z.array(z.string()).optional(),
});

// Create immediate notification
adminNotificationsRouter.post('/notifications', async (c) => {
  try {
    const userInfo = getUserInfo(c);
    const body = await c.req.json();

    const validatedData = createNotificationSchema.parse(body);

    // Convert string dates to Date objects
    const notificationData = {
      ...validatedData,
      scheduledAt: validatedData.scheduledAt ? new Date(validatedData.scheduledAt) : undefined,
      expiresAt: validatedData.expiresAt ? new Date(validatedData.expiresAt) : undefined,
    };

    if (!userInfo.userId) {
      return c.json({ error: 'User ID not found' }, 400);
    }

    const notificationIds = await AdminNotificationService.createNotification(
      notificationData,
      userInfo.userId
    );

    return c.json({
      message: 'Notifications created successfully',
      notificationIds,
      count: notificationIds.length,
    });
  } catch (error) {
    console.error('Error creating notification:', error);
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Validation error', details: error.errors }, 400);
    }
    return c.json({
      error: error instanceof Error ? error.message : 'Failed to create notification'
    }, 500);
  }
});

// Schedule notification
adminNotificationsRouter.post('/notifications/schedule', async (c) => {
  try {
    const userInfo = getUserInfo(c);
    const body = await c.req.json();

    const validatedData = createNotificationSchema.parse(body);

    if (!validatedData.scheduledAt) {
      return c.json({ error: 'scheduledAt is required for scheduled notifications' }, 400);
    }

    // Convert string dates to Date objects
    const notificationData = {
      ...validatedData,
      scheduledAt: new Date(validatedData.scheduledAt),
      expiresAt: validatedData.expiresAt ? new Date(validatedData.expiresAt) : undefined,
    };

    if (!userInfo.userId) {
      return c.json({ error: 'User ID not found' }, 400);
    }

    const scheduledId = await AdminNotificationService.scheduleNotification(
      notificationData,
      userInfo.userId
    );

    return c.json({
      message: 'Notification scheduled successfully',
      scheduledId,
    });
  } catch (error) {
    console.error('Error scheduling notification:', error);
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Validation error', details: error.errors }, 400);
    }
    return c.json({
      error: error instanceof Error ? error.message : 'Failed to schedule notification'
    }, 500);
  }
});

// Get scheduled notifications
adminNotificationsRouter.get('/notifications/scheduled', async (c) => {
  try {
    const page = parseInt(c.req.query('page') || '1');
    const limit = Math.min(parseInt(c.req.query('limit') || '20'), 100);

    const result = await AdminNotificationService.getScheduledNotifications(page, limit);

    return c.json(result);
  } catch (error) {
    console.error('Error fetching scheduled notifications:', error);
    return c.json({ error: 'Failed to fetch scheduled notifications' }, 500);
  }
});

// Cancel scheduled notification
adminNotificationsRouter.delete('/notifications/scheduled/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));

    if (isNaN(id)) {
      return c.json({ error: 'Invalid notification ID' }, 400);
    }

    await AdminNotificationService.cancelScheduledNotification(id);

    return c.json({ message: 'Scheduled notification cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling scheduled notification:', error);
    return c.json({ error: 'Failed to cancel scheduled notification' }, 500);
  }
});

// Create notification template
adminNotificationsRouter.post('/templates', async (c) => {
  try {
    const userInfo = getUserInfo(c);
    const body = await c.req.json();

    const validatedData = createTemplateSchema.parse(body);

    if (!userInfo.userId) {
      return c.json({ error: 'User ID not found' }, 400);
    }

    const templateId = await AdminNotificationService.createTemplate(
      validatedData,
      userInfo.userId
    );

    return c.json({
      message: 'Template created successfully',
      templateId,
    });
  } catch (error) {
    console.error('Error creating template:', error);
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Validation error', details: error.errors }, 400);
    }
    return c.json({
      error: error instanceof Error ? error.message : 'Failed to create template'
    }, 500);
  }
});

// Get notification templates
adminNotificationsRouter.get('/templates', async (c) => {
  try {
    const page = parseInt(c.req.query('page') || '1');
    const limit = Math.min(parseInt(c.req.query('limit') || '20'), 100);

    const result = await AdminNotificationService.getTemplates(page, limit);

    return c.json(result);
  } catch (error) {
    console.error('Error fetching templates:', error);
    return c.json({ error: 'Failed to fetch templates' }, 500);
  }
});

// Get notification analytics
adminNotificationsRouter.get('/analytics', async (c) => {
  try {
    const startDate = c.req.query('start_date');
    const endDate = c.req.query('end_date');
    const eventType = c.req.query('event_type');

    const analytics = await AdminNotificationService.getNotificationAnalytics(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
      eventType || undefined
    );

    return c.json(analytics);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return c.json({ error: 'Failed to fetch analytics' }, 500);
  }
});

// Track notification action (for analytics)
adminNotificationsRouter.post('/track/:notificationId/:action', async (c) => {
  try {
    const userInfo = getUserInfo(c);
    const notificationId = parseInt(c.req.param('notificationId'));
    const action = c.req.param('action') as 'delivered' | 'read' | 'clicked' | 'dismissed' | 'expired';

    if (isNaN(notificationId)) {
      return c.json({ error: 'Invalid notification ID' }, 400);
    }

    const validActions = ['delivered', 'read', 'clicked', 'dismissed', 'expired'];
    if (!validActions.includes(action)) {
      return c.json({ error: 'Invalid action' }, 400);
    }

    const body = await c.req.json().catch(() => ({}));
    const userAgent = c.req.header('user-agent');
    const ipAddress = c.req.header('x-forwarded-for') || c.req.header('x-real-ip');

    if (!userInfo.userId) {
      return c.json({ error: 'User ID not found' }, 400);
    }

    await AdminNotificationService.trackNotificationAction(
      notificationId,
      userInfo.userId,
      action,
      body.actionUrl,
      userAgent,
      ipAddress
    );

    return c.json({ message: 'Action tracked successfully' });
  } catch (error) {
    console.error('Error tracking notification action:', error);
    return c.json({ error: 'Failed to track action' }, 500);
  }
});

// Process scheduled notifications (internal endpoint)
adminNotificationsRouter.post('/process-scheduled', async (c) => {
  try {
    await AdminNotificationService.processScheduledNotifications();
    return c.json({ message: 'Scheduled notifications processed successfully' });
  } catch (error) {
    console.error('Error processing scheduled notifications:', error);
    return c.json({ error: 'Failed to process scheduled notifications' }, 500);
  }
});

export { adminNotificationsRouter };
