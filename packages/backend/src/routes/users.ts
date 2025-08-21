import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db';
import { users, inAppNotifications, userNotificationPreferences } from '../db/schema';
import { eq, like, or, count, desc, asc, sql, and, isNotNull } from 'drizzle-orm';
import { hybridAuth, getUserInfo } from '../middleware/auth';

const usersRouter = new Hono();

// Get all users (for user switcher and admin purposes)
usersRouter.get('/', hybridAuth(), async (c) => {
  try {
    const allUsers = await db
      .select({
        id: users.id,
        email: users.email,
        role: users.role,
        appCurrencyBalance: users.appCurrencyBalance,
        avatarUrl: users.avatarUrl,
      })
      .from(users)
      .orderBy(asc(users.email));

    return c.json(allUsers);
  } catch (error) {
    console.error('Error fetching users:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get user notifications
usersRouter.get('/:id/notifications', hybridAuth(), async (c) => {
  try {
    const { userId: currentUserId } = getUserInfo(c);
    const requestedUserId = parseInt(c.req.param('id'));

    // Users can only access their own notifications unless they're admin
    if (currentUserId !== requestedUserId && payload?.role !== 'ADMIN') {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '20');
    const offset = (page - 1) * limit;

    const notifications = await db
      .select()
      .from(inAppNotifications)
      .where(eq(inAppNotifications.userId, requestedUserId))
      .orderBy(desc(inAppNotifications.createdAt))
      .limit(limit)
      .offset(offset);

    const totalCount = await db
      .select({ count: count() })
      .from(inAppNotifications)
      .where(eq(inAppNotifications.userId, requestedUserId));

    return c.json({
      notifications,
      pagination: {
        page,
        limit,
        total: totalCount[0]?.count || 0,
        totalPages: Math.ceil((totalCount[0]?.count || 0) / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get unread notification count
usersRouter.get('/:id/notifications/unread-count', hybridAuth(), async (c) => {
  try {
    const { userId: currentUserId } = getUserInfo(c);
    const requestedUserId = parseInt(c.req.param('id'));

    // Users can only access their own notifications unless they're admin
    if (currentUserId !== requestedUserId && payload?.role !== 'ADMIN') {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    const unreadCount = await db
      .select({ count: count() })
      .from(inAppNotifications)
      .where(
        and(
          eq(inAppNotifications.userId, requestedUserId),
          eq(inAppNotifications.isRead, false)
        )
      );

    return c.json({ unreadCount: unreadCount[0]?.count || 0 });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Mark notification as read
usersRouter.put('/:id/notifications/:notificationId/read', hybridAuth(), async (c) => {
  try {
    const { userId: currentUserId } = getUserInfo(c);
    const requestedUserId = parseInt(c.req.param('id'));
    const notificationId = parseInt(c.req.param('notificationId'));

    // Users can only modify their own notifications unless they're admin
    if (currentUserId !== requestedUserId && payload?.role !== 'ADMIN') {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    await db
      .update(inAppNotifications)
      .set({ isRead: true, readAt: new Date().toISOString() })
      .where(
        and(
          eq(inAppNotifications.id, notificationId),
          eq(inAppNotifications.userId, requestedUserId)
        )
      );

    return c.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Mark all notifications as read
usersRouter.put('/:id/notifications/mark-all-read', hybridAuth(), async (c) => {
  try {
    const { userId: currentUserId } = getUserInfo(c);
    const requestedUserId = parseInt(c.req.param('id'));

    // Users can only modify their own notifications unless they're admin
    if (currentUserId !== requestedUserId && payload?.role !== 'ADMIN') {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    await db
      .update(inAppNotifications)
      .set({ isRead: true, readAt: new Date().toISOString() })
      .where(
        and(
          eq(inAppNotifications.userId, requestedUserId),
          eq(inAppNotifications.isRead, false)
        )
      );

    return c.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get user notification preferences
usersRouter.get('/:id/notification-preferences', hybridAuth(), async (c) => {
  try {
    const { userId: currentUserId } = getUserInfo(c);
    const requestedUserId = parseInt(c.req.param('id'));

    // Users can only access their own preferences unless they're admin
    if (currentUserId !== requestedUserId && payload?.role !== 'ADMIN') {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    const preferences = await db
      .select()
      .from(userNotificationPreferences)
      .where(eq(userNotificationPreferences.userId, requestedUserId));

    return c.json({ preferences });
  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Update user notification preferences
usersRouter.put('/:id/notification-preferences', hybridAuth(), async (c) => {
  try {
    const { userId: currentUserId } = getUserInfo(c);
    const requestedUserId = parseInt(c.req.param('id'));

    // Users can only modify their own preferences unless they're admin
    if (currentUserId !== requestedUserId && payload?.role !== 'ADMIN') {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    const { preferences } = await c.req.json();

    // Update or insert preferences
    for (const pref of preferences) {
      await db
        .insert(userNotificationPreferences)
        .values({
          userId: requestedUserId,
          eventType: pref.eventType,
          inAppEnabled: pref.inAppEnabled,
          emailEnabled: pref.emailEnabled,
          webhookEnabled: pref.webhookEnabled,
        })
        .onConflictDoUpdate({
          target: [userNotificationPreferences.userId, userNotificationPreferences.eventType],
          set: {
            inAppEnabled: pref.inAppEnabled,
            emailEnabled: pref.emailEnabled,
            webhookEnabled: pref.webhookEnabled,
          },
        });
    }

    return c.json({ message: 'Notification preferences updated' });
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Notification preferences endpoints

// Validation schemas
const updatePreferenceSchema = z.object({
  channel: z.enum(['EMAIL', 'WEBHOOK', 'PUSH', 'SMS', 'IN_APP']),
  eventType: z.string().min(1),
  enabled: z.boolean(),
});

const batchUpdatePreferencesSchema = z.object({
  preferences: z.array(updatePreferenceSchema),
});

// Get user's notification preferences
usersRouter.get('/notification-preferences', hybridAuth(), async (c) => {
  try {
    const userInfo = getUserInfo(c);

    const preferences = await db
      .select()
      .from(userNotificationPreferences)
      .where(eq(userNotificationPreferences.userId, userInfo.userId))
      .orderBy(userNotificationPreferences.eventType, userNotificationPreferences.channel);

    return c.json(preferences);
  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    return c.json({ error: 'Failed to fetch notification preferences' }, 500);
  }
});

// Update single notification preference
usersRouter.put('/notification-preferences', hybridAuth(), async (c) => {
  try {
    const userInfo = getUserInfo(c);
    const body = await c.req.json();

    const validatedData = updatePreferenceSchema.parse(body);
    const now = new Date();

    // Check if preference already exists
    const [existingPreference] = await db
      .select()
      .from(userNotificationPreferences)
      .where(
        and(
          eq(userNotificationPreferences.userId, userInfo.userId),
          eq(userNotificationPreferences.channel, validatedData.channel),
          eq(userNotificationPreferences.eventType, validatedData.eventType)
        )
      );

    if (existingPreference) {
      // Update existing preference
      await db
        .update(userNotificationPreferences)
        .set({
          enabled: validatedData.enabled,
          updatedAt: now,
        })
        .where(eq(userNotificationPreferences.id, existingPreference.id));
    } else {
      // Create new preference
      await db.insert(userNotificationPreferences).values({
        userId: userInfo.userId,
        channel: validatedData.channel,
        eventType: validatedData.eventType,
        enabled: validatedData.enabled,
        createdAt: now,
        updatedAt: now,
      });
    }

    return c.json({ message: 'Notification preference updated successfully' });
  } catch (error) {
    console.error('Error updating notification preference:', error);
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Validation error', details: error.errors }, 400);
    }
    return c.json({ error: 'Failed to update notification preference' }, 500);
  }
});

// Batch update notification preferences
usersRouter.put('/notification-preferences/batch', hybridAuth(), async (c) => {
  try {
    const userInfo = getUserInfo(c);
    const body = await c.req.json();

    const validatedData = batchUpdatePreferencesSchema.parse(body);
    const now = new Date();

    // Process each preference update
    for (const preference of validatedData.preferences) {
      // Check if preference already exists
      const [existingPreference] = await db
        .select()
        .from(userNotificationPreferences)
        .where(
          and(
            eq(userNotificationPreferences.userId, userInfo.userId),
            eq(userNotificationPreferences.channel, preference.channel),
            eq(userNotificationPreferences.eventType, preference.eventType)
          )
        );

      if (existingPreference) {
        // Update existing preference
        await db
          .update(userNotificationPreferences)
          .set({
            enabled: preference.enabled,
            updatedAt: now,
          })
          .where(eq(userNotificationPreferences.id, existingPreference.id));
      } else {
        // Create new preference
        await db.insert(userNotificationPreferences).values({
          userId: userInfo.userId,
          channel: preference.channel,
          eventType: preference.eventType,
          enabled: preference.enabled,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    return c.json({ message: 'Notification preferences updated successfully' });
  } catch (error) {
    console.error('Error batch updating notification preferences:', error);
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Validation error', details: error.errors }, 400);
    }
    return c.json({ error: 'Failed to update notification preferences' }, 500);
  }
});

// Reset preferences to defaults
usersRouter.post('/notification-preferences/reset', hybridAuth(), async (c) => {
  try {
    const userInfo = getUserInfo(c);
    const now = new Date();

    // Delete all existing preferences for the user
    await db
      .delete(userNotificationPreferences)
      .where(eq(userNotificationPreferences.userId, userInfo.userId));

    // Define default preferences
    const defaultPreferences = [
      // Contribution events - IN_APP
      { channel: 'IN_APP', eventType: 'contribution.approved', enabled: true },
      { channel: 'IN_APP', eventType: 'contribution.rejected', enabled: true },
      { channel: 'IN_APP', eventType: 'contribution.submitted', enabled: false },
      { channel: 'IN_APP', eventType: 'contribution.vote_received', enabled: true },

      // User events - IN_APP
      { channel: 'IN_APP', eventType: 'user.welcome', enabled: true },
      { channel: 'IN_APP', eventType: 'user.low_credits', enabled: true },
      { channel: 'IN_APP', eventType: 'user.credit_topup', enabled: true },
      { channel: 'IN_APP', eventType: 'user.password_reset', enabled: true },
      { channel: 'IN_APP', eventType: 'user.account_updated', enabled: false },

      // System events - IN_APP
      { channel: 'IN_APP', eventType: 'system.announcement', enabled: true },
      { channel: 'IN_APP', eventType: 'system.maintenance', enabled: true },
      { channel: 'IN_APP', eventType: 'system.changelog', enabled: false },

      // Admin events - IN_APP
      { channel: 'IN_APP', eventType: 'admin.notification', enabled: true },

      // Email preferences (subset of important notifications)
      { channel: 'EMAIL', eventType: 'contribution.approved', enabled: true },
      { channel: 'EMAIL', eventType: 'contribution.rejected', enabled: true },
      { channel: 'EMAIL', eventType: 'user.welcome', enabled: true },
      { channel: 'EMAIL', eventType: 'user.low_credits', enabled: true },
      { channel: 'EMAIL', eventType: 'user.password_reset', enabled: true },
      { channel: 'EMAIL', eventType: 'system.announcement', enabled: true },
      { channel: 'EMAIL', eventType: 'system.maintenance', enabled: true },
      { channel: 'EMAIL', eventType: 'admin.notification', enabled: true },
    ];

    // Insert default preferences
    const preferencesToInsert = defaultPreferences.map(pref => ({
      userId: userInfo.userId,
      channel: pref.channel as any,
      eventType: pref.eventType,
      enabled: pref.enabled,
      createdAt: now,
      updatedAt: now,
    }));

    await db.insert(userNotificationPreferences).values(preferencesToInsert);

    return c.json({ message: 'Notification preferences reset to defaults successfully' });
  } catch (error) {
    console.error('Error resetting notification preferences:', error);
    return c.json({ error: 'Failed to reset notification preferences' }, 500);
  }
});

export default usersRouter;
