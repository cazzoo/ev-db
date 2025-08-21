import { db } from '../db';
import {
  inAppNotifications,
  scheduledNotifications,
  notificationTemplates,
  notificationAnalytics,
  users
} from '../db/schema';
import { eq, and, desc, sql, inArray, gte, lte } from 'drizzle-orm';
import { NotificationService } from './notificationService';

// Types for admin notification management
export interface CreateNotificationRequest {
  title: string;
  content: string;
  notificationType: 'info' | 'success' | 'warning' | 'error' | 'announcement';
  targetAudience: 'all_users' | 'specific_roles' | 'individual_users';
  targetRoles?: string[];
  targetUserIds?: number[];
  scheduledAt?: Date;
  expiresAt?: Date;
  actionUrl?: string;
  metadata?: any;
}

export interface CreateTemplateRequest {
  name: string;
  description?: string;
  eventType: string;
  title: string;
  content: string;
  notificationType: 'info' | 'success' | 'warning' | 'error' | 'announcement';
  category: 'system' | 'contribution' | 'user' | 'admin' | 'changelog' | 'maintenance';
  variables?: string[];
}

export interface NotificationAnalyticsData {
  totalSent: number;
  totalRead: number;
  totalClicked: number;
  readRate: number;
  clickRate: number;
  deliveryStats: {
    delivered: number;
    failed: number;
    pending: number;
  };
}

export class AdminNotificationService {
  
  // Create and send immediate notification
  static async createNotification(data: CreateNotificationRequest, createdBy: number): Promise<number[]> {
    const now = new Date();
    const notificationIds: number[] = [];

    // Get target users based on audience type
    const targetUsers = await this.getTargetUsers(data.targetAudience, data.targetRoles, data.targetUserIds);

    if (targetUsers.length === 0) {
      throw new Error('No target users found for the specified audience');
    }

    // Create notifications for each target user
    for (const user of targetUsers) {
      const [notification] = await db.insert(inAppNotifications).values({
        userId: user.id,
        title: data.title,
        content: data.content,
        eventType: 'admin.notification',
        notificationType: data.notificationType,
        category: 'admin',
        priority: data.notificationType === 'error' ? 'urgent' : 'normal',
        actionUrl: data.actionUrl,
        metadata: data.metadata ? JSON.stringify(data.metadata) : null,
        expiresAt: data.expiresAt,
        createdBy: createdBy,
        createdAt: now,
      }).returning();

      notificationIds.push(notification.id);

      // Also send via other enabled channels if user has preferences
      await NotificationService.sendNotificationToUser(user.id, {
        eventType: 'admin.notification',
        title: data.title,
        content: data.content,
        metadata: data.metadata,
      });
    }

    return notificationIds;
  }

  // Schedule notification for future delivery
  static async scheduleNotification(data: CreateNotificationRequest, createdBy: number): Promise<number> {
    if (!data.scheduledAt) {
      throw new Error('Scheduled date is required for scheduled notifications');
    }

    const now = new Date();

    const [scheduledNotification] = await db.insert(scheduledNotifications).values({
      title: data.title,
      content: data.content,
      notificationType: data.notificationType,
      targetAudience: data.targetAudience,
      targetRoles: data.targetRoles ? JSON.stringify(data.targetRoles) : null,
      targetUserIds: data.targetUserIds ? JSON.stringify(data.targetUserIds) : null,
      scheduledAt: data.scheduledAt,
      expiresAt: data.expiresAt,
      metadata: data.metadata ? JSON.stringify(data.metadata) : null,
      createdBy: createdBy,
      createdAt: now,
      updatedAt: now,
    }).returning();

    return scheduledNotification.id;
  }

  // Process scheduled notifications
  static async processScheduledNotifications(): Promise<void> {
    const now = new Date();

    // Get pending notifications that are due
    const dueNotifications = await db
      .select()
      .from(scheduledNotifications)
      .where(
        and(
          eq(scheduledNotifications.status, 'pending'),
          lte(scheduledNotifications.scheduledAt, now)
        )
      );

    for (const scheduled of dueNotifications) {
      try {
        // Update status to processing
        await db
          .update(scheduledNotifications)
          .set({ status: 'processing', updatedAt: now })
          .where(eq(scheduledNotifications.id, scheduled.id));

        // Create the notification
        const notificationData: CreateNotificationRequest = {
          title: scheduled.title,
          content: scheduled.content,
          notificationType: scheduled.notificationType as any,
          targetAudience: scheduled.targetAudience as any,
          targetRoles: scheduled.targetRoles ? JSON.parse(scheduled.targetRoles) : undefined,
          targetUserIds: scheduled.targetUserIds ? JSON.parse(scheduled.targetUserIds) : undefined,
          expiresAt: scheduled.expiresAt,
          metadata: scheduled.metadata ? JSON.parse(scheduled.metadata) : undefined,
        };

        const notificationIds = await this.createNotification(notificationData, scheduled.createdBy);

        // Update scheduled notification status
        await db
          .update(scheduledNotifications)
          .set({
            status: 'sent',
            sentAt: now,
            sentCount: notificationIds.length,
            updatedAt: now,
          })
          .where(eq(scheduledNotifications.id, scheduled.id));

      } catch (error) {
        console.error(`Failed to process scheduled notification ${scheduled.id}:`, error);
        
        // Update status to failed
        await db
          .update(scheduledNotifications)
          .set({
            status: 'failed',
            failureCount: scheduled.failureCount + 1,
            updatedAt: now,
          })
          .where(eq(scheduledNotifications.id, scheduled.id));
      }
    }
  }

  // Get target users based on audience criteria
  private static async getTargetUsers(
    targetAudience: string,
    targetRoles?: string[],
    targetUserIds?: number[]
  ): Promise<Array<{ id: number; email: string; role: string }>> {
    switch (targetAudience) {
      case 'all_users':
        return await db
          .select({ id: users.id, email: users.email, role: users.role })
          .from(users)
          .where(eq(users.isActive, true));

      case 'specific_roles':
        if (!targetRoles || targetRoles.length === 0) {
          throw new Error('Target roles must be specified for specific_roles audience');
        }
        return await db
          .select({ id: users.id, email: users.email, role: users.role })
          .from(users)
          .where(
            and(
              eq(users.isActive, true),
              inArray(users.role, targetRoles)
            )
          );

      case 'individual_users':
        if (!targetUserIds || targetUserIds.length === 0) {
          throw new Error('Target user IDs must be specified for individual_users audience');
        }
        return await db
          .select({ id: users.id, email: users.email, role: users.role })
          .from(users)
          .where(
            and(
              eq(users.isActive, true),
              inArray(users.id, targetUserIds)
            )
          );

      default:
        throw new Error(`Invalid target audience: ${targetAudience}`);
    }
  }

  // Create notification template
  static async createTemplate(data: CreateTemplateRequest, createdBy: number): Promise<number> {
    const now = new Date();

    const [template] = await db.insert(notificationTemplates).values({
      name: data.name,
      description: data.description,
      eventType: data.eventType,
      title: data.title,
      content: data.content,
      notificationType: data.notificationType,
      category: data.category,
      variables: data.variables ? JSON.stringify(data.variables) : null,
      createdBy: createdBy,
      createdAt: now,
      updatedAt: now,
    }).returning();

    return template.id;
  }

  // Get notification analytics
  static async getNotificationAnalytics(
    startDate?: Date,
    endDate?: Date,
    eventType?: string
  ): Promise<NotificationAnalyticsData> {
    const conditions = [];
    
    if (startDate) {
      conditions.push(gte(notificationAnalytics.createdAt, startDate));
    }
    if (endDate) {
      conditions.push(lte(notificationAnalytics.createdAt, endDate));
    }
    if (eventType) {
      conditions.push(eq(notificationAnalytics.eventType, eventType));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get analytics data
    const analytics = await db
      .select({
        action: notificationAnalytics.action,
        count: sql<number>`count(*)`.as('count'),
      })
      .from(notificationAnalytics)
      .where(whereClause)
      .groupBy(notificationAnalytics.action);

    // Calculate metrics
    let totalSent = 0;
    let totalRead = 0;
    let totalClicked = 0;
    let delivered = 0;
    let failed = 0;
    let pending = 0;

    for (const stat of analytics) {
      switch (stat.action) {
        case 'delivered':
          delivered = stat.count;
          totalSent += stat.count;
          break;
        case 'read':
          totalRead = stat.count;
          break;
        case 'clicked':
          totalClicked = stat.count;
          break;
        case 'failed':
          failed = stat.count;
          break;
        case 'pending':
          pending = stat.count;
          break;
      }
    }

    const readRate = totalSent > 0 ? (totalRead / totalSent) * 100 : 0;
    const clickRate = totalRead > 0 ? (totalClicked / totalRead) * 100 : 0;

    return {
      totalSent,
      totalRead,
      totalClicked,
      readRate: Math.round(readRate * 100) / 100,
      clickRate: Math.round(clickRate * 100) / 100,
      deliveryStats: {
        delivered,
        failed,
        pending,
      },
    };
  }

  // Get scheduled notifications
  static async getScheduledNotifications(page = 1, limit = 20) {
    const offset = (page - 1) * limit;

    const notifications = await db
      .select()
      .from(scheduledNotifications)
      .orderBy(desc(scheduledNotifications.scheduledAt))
      .limit(limit)
      .offset(offset);

    const totalCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(scheduledNotifications);

    return {
      notifications,
      pagination: {
        page,
        limit,
        total: totalCount[0].count,
        totalPages: Math.ceil(totalCount[0].count / limit),
      },
    };
  }

  // Get notification templates
  static async getTemplates(page = 1, limit = 20) {
    const offset = (page - 1) * limit;

    const templates = await db
      .select()
      .from(notificationTemplates)
      .where(eq(notificationTemplates.isActive, true))
      .orderBy(desc(notificationTemplates.createdAt))
      .limit(limit)
      .offset(offset);

    const totalCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(notificationTemplates)
      .where(eq(notificationTemplates.isActive, true));

    return {
      templates,
      pagination: {
        page,
        limit,
        total: totalCount[0].count,
        totalPages: Math.ceil(totalCount[0].count / limit),
      },
    };
  }

  // Cancel scheduled notification
  static async cancelScheduledNotification(id: number): Promise<void> {
    await db
      .update(scheduledNotifications)
      .set({ status: 'cancelled', updatedAt: new Date() })
      .where(eq(scheduledNotifications.id, id));
  }

  // Track notification analytics
  static async trackNotificationAction(
    notificationId: number,
    userId: number,
    action: 'delivered' | 'read' | 'clicked' | 'dismissed' | 'expired',
    actionUrl?: string,
    userAgent?: string,
    ipAddress?: string
  ): Promise<void> {
    await db.insert(notificationAnalytics).values({
      notificationId,
      userId,
      eventType: 'admin.notification',
      action,
      actionUrl,
      userAgent,
      ipAddress,
      createdAt: new Date(),
    });
  }
}
