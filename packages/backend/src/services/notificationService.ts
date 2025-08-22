import { db } from '../db';
import {
  notificationQueue,
  notificationHistory,
  userNotificationPreferences,
  users,
  webhookConfigurations
} from '../db/schema';
import { eq, and, lte, inArray, sql } from 'drizzle-orm';
import { getSetting } from './settingsService';
import { WebhookService } from './webhookService';

// Simple rate limiter for webhook notifications
class WebhookRateLimiter {
  private static limits = new Map<string, { count: number; resetTime: number }>();
  private static readonly RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
  private static readonly MAX_REQUESTS_PER_WINDOW = 30; // 30 requests per minute per webhook

  static canSend(webhookId: number): boolean {
    const key = `webhook_${webhookId}`;
    const now = Date.now();
    const limit = this.limits.get(key);

    if (!limit || now > limit.resetTime) {
      // Reset or initialize limit
      this.limits.set(key, { count: 1, resetTime: now + this.RATE_LIMIT_WINDOW });
      return true;
    }

    if (limit.count >= this.MAX_REQUESTS_PER_WINDOW) {
      return false; // Rate limit exceeded
    }

    limit.count++;
    return true;
  }

  static getRemainingRequests(webhookId: number): number {
    const key = `webhook_${webhookId}`;
    const limit = this.limits.get(key);

    if (!limit || Date.now() > limit.resetTime) {
      return this.MAX_REQUESTS_PER_WINDOW;
    }

    return Math.max(0, this.MAX_REQUESTS_PER_WINDOW - limit.count);
  }
}

// Notification event types
export type NotificationEventType =
  | 'contribution.approved'
  | 'contribution.rejected'
  | 'contribution.submitted'
  | 'contribution.vote_received'
  | 'user.registered'
  | 'user.welcome'
  | 'user.low_credits'
  | 'user.credit_topup'
  | 'user.password_reset'
  | 'user.account_updated'
  | 'system.maintenance'
  | 'system.announcement'
  | 'system.changelog'
  | 'admin.notification';

// Notification channels
export type NotificationChannel =
  | 'EMAIL'
  | 'WEBHOOK'
  | 'TEAMS'
  | 'SLACK'
  | 'DISCORD'
  | 'GOTIFY'
  | 'PUSHBULLET'
  | 'FCM'
  | 'APNS'
  | 'WEB_PUSH'
  | 'SMS'
  | 'IN_APP'
  | 'RSS';

// Notification status
export type NotificationStatus = 'PENDING' | 'PROCESSING' | 'SENT' | 'FAILED' | 'CANCELLED';

// Notification data interface
export interface NotificationData {
  userId?: number;
  channel: NotificationChannel;
  eventType: NotificationEventType;
  recipient: string;
  subject?: string;
  content: string;
  metadata?: Record<string, any>;
  scheduledAt?: Date;
  maxAttempts?: number;
}

// Template data interface
export interface TemplateData {
  [key: string]: any;
}

// Notification template interface
export interface NotificationTemplate {
  subject?: string;
  content: string;
  metadata?: Record<string, any>;
}

// Core notification service class
export class NotificationService {

  // Queue a notification for delivery
  static async queueNotification(data: NotificationData): Promise<number> {
    const now = new Date();

    const [notification] = await db.insert(notificationQueue).values({
      userId: data.userId,
      channel: data.channel,
      eventType: data.eventType,
      recipient: data.recipient,
      subject: data.subject,
      content: data.content,
      metadata: data.metadata ? JSON.stringify(data.metadata) : null,
      status: 'PENDING',
      attempts: 0,
      maxAttempts: data.maxAttempts || 3,
      scheduledAt: data.scheduledAt || now,
      createdAt: now,
      updatedAt: now,
    }).returning();

    console.log(`Notification queued: ${data.channel} to ${data.recipient} for event ${data.eventType}`);
    return notification.id;
  }

  // Queue notifications for multiple users
  static async queueNotificationForUsers(
    userIds: number[],
    channel: NotificationChannel,
    eventType: NotificationEventType,
    template: NotificationTemplate,
    templateData: TemplateData = {}
  ): Promise<number[]> {
    const notifications: NotificationData[] = [];

    // Get users and their preferences
    const usersData = await db.select({
      id: users.id,
      email: users.email,
    }).from(users).where(inArray(users.id, userIds));

    for (const user of usersData) {
      // Check if user has this notification enabled
      const isEnabled = await this.isNotificationEnabled(user.id, channel, eventType);
      if (!isEnabled) continue;

      // Determine recipient based on channel
      let recipient = '';
      switch (channel) {
        case 'EMAIL':
          recipient = user.email;
          break;
        case 'SMS':
          // Would need phone number from user profile
          continue; // Skip for now
        default:
          recipient = user.email; // Fallback
      }

      // Render template with user-specific data
      const renderedTemplate = this.renderTemplate(template, {
        ...templateData,
        user: user,
        userId: user.id,
        userEmail: user.email,
      });

      notifications.push({
        userId: user.id,
        channel,
        eventType,
        recipient,
        subject: renderedTemplate.subject,
        content: renderedTemplate.content,
        metadata: renderedTemplate.metadata,
      });
    }

    // Queue all notifications
    const notificationIds: number[] = [];
    for (const notification of notifications) {
      const id = await this.queueNotification(notification);
      notificationIds.push(id);
    }

    return notificationIds;
  }

  // Check if notification is enabled for user
  static async isNotificationEnabled(
    userId: number,
    channel: NotificationChannel,
    eventType: NotificationEventType
  ): Promise<boolean> {
    const [preference] = await db.select()
      .from(userNotificationPreferences)
      .where(and(
        eq(userNotificationPreferences.userId, userId),
        eq(userNotificationPreferences.channel, channel),
        eq(userNotificationPreferences.eventType, eventType)
      ))
      .limit(1);

    // Default to enabled if no preference is set
    return preference ? preference.enabled : true;
  }

  // Render notification template
  static renderTemplate(template: NotificationTemplate, data: TemplateData): NotificationTemplate {
    const renderString = (str: string): string => {
      return str.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, path) => {
        const value = this.getNestedValue(data, path);
        return value !== undefined ? String(value) : match;
      });
    };

    return {
      subject: template.subject ? renderString(template.subject) : undefined,
      content: renderString(template.content),
      metadata: template.metadata,
    };
  }

  // Get nested value from object using dot notation
  private static getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  // Process pending notifications
  static async processPendingNotifications(limit = 50): Promise<void> {
    const now = new Date();

    // Get pending notifications that are scheduled to be sent
    const pendingNotifications = await db.select()
      .from(notificationQueue)
      .where(and(
        eq(notificationQueue.status, 'PENDING'),
        lte(notificationQueue.scheduledAt, now)
      ))
      .limit(limit);

    for (const notification of pendingNotifications) {
      await this.processNotification(notification);
    }
  }

  // Process a single notification
  static async processNotification(notification: any): Promise<void> {
    const now = new Date();

    try {
      // Update status to processing
      await db.update(notificationQueue)
        .set({
          status: 'PROCESSING',
          updatedAt: now
        })
        .where(eq(notificationQueue.id, notification.id));

      // Get channel-specific handler
      const handler = this.getChannelHandler(notification.channel);
      if (!handler) {
        throw new Error(`No handler found for channel: ${notification.channel}`);
      }

      // Check if channel is enabled before sending (except for IN_APP which is always enabled)
      if (notification.channel !== 'IN_APP') {
        const isEnabled = await handler.isEnabled();
        if (!isEnabled) {
          // Mark as skipped instead of failed
          await db.update(notificationQueue)
            .set({
              status: 'SKIPPED',
              errorMessage: `Channel ${notification.channel} is not enabled`,
              updatedAt: now
            })
            .where(eq(notificationQueue.id, notification.id));

          console.log(`Skipped notification ${notification.id}: ${notification.channel} is not enabled`);
          return;
        }
      }

      // Send notification
      const result = await handler.send(notification);

      // Update status to sent
      await db.update(notificationQueue)
        .set({
          status: 'SENT',
          sentAt: now,
          updatedAt: now
        })
        .where(eq(notificationQueue.id, notification.id));

      // Add to history
      await db.insert(notificationHistory).values({
        queueId: notification.id,
        userId: notification.userId,
        channel: notification.channel,
        eventType: notification.eventType,
        recipient: notification.recipient,
        subject: notification.subject,
        status: 'SENT',
        sentAt: now,
        responseData: JSON.stringify(result),
        createdAt: now,
      });

      console.log(`Notification sent successfully: ${notification.channel} to ${notification.recipient}`);

    } catch (error) {
      console.error(`Failed to send notification ${notification.id}:`, error);

      const attempts = notification.attempts + 1;
      const maxAttempts = notification.maxAttempts || 3;

      if (attempts >= maxAttempts) {
        // Mark as failed
        await db.update(notificationQueue)
          .set({
            status: 'FAILED',
            attempts,
            failedAt: now,
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
            updatedAt: now
          })
          .where(eq(notificationQueue.id, notification.id));

        // Add to history
        await db.insert(notificationHistory).values({
          queueId: notification.id,
          userId: notification.userId,
          channel: notification.channel,
          eventType: notification.eventType,
          recipient: notification.recipient,
          subject: notification.subject,
          status: 'FAILED',
          responseData: JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
          createdAt: now,
        });
      } else {
        // Retry later
        const retryDelay = Math.pow(2, attempts) * 60 * 1000; // Exponential backoff
        const nextAttempt = new Date(now.getTime() + retryDelay);

        await db.update(notificationQueue)
          .set({
            status: 'PENDING',
            attempts,
            scheduledAt: nextAttempt,
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
            updatedAt: now
          })
          .where(eq(notificationQueue.id, notification.id));
      }
    }
  }

  // Get channel-specific handler
  private static getChannelHandler(channel: NotificationChannel): any {
    const { NotificationHandlerRegistry } = require('./notificationHandlers');
    return NotificationHandlerRegistry.getHandler(channel);
  }

  // Get notification templates
  static getNotificationTemplates(): Record<NotificationEventType, Record<NotificationChannel, NotificationTemplate>> {
    return {
      'contribution.approved': {
        EMAIL: {
          subject: 'Your contribution has been approved!',
          content: `Hello {{user.email}},\n\nYour contribution for {{vehicleData.make}} {{vehicleData.model}} has been approved and is now live in the database.\n\nThank you for contributing to the EV Database!\n\nBest regards,\nEV Database Team`,
        },
        WEBHOOK: {
          content: JSON.stringify({
            event: 'contribution.approved',
            userId: '{{userId}}',
            userEmail: '{{user.email}}',
            contributionId: '{{contributionId}}',
            vehicleData: '{{vehicleData}}',
            timestamp: '{{timestamp}}'
          }),
        },
        TEAMS: {
          content: JSON.stringify({
            "@type": "MessageCard",
            "@context": "http://schema.org/extensions",
            "themeColor": "28a745",
            "summary": "Contribution Approved",
            "sections": [{
              "activityTitle": "Contribution Approved",
              "activitySubtitle": "{{user.email}}",
              "activityImage": "https://via.placeholder.com/64x64/28a745/ffffff?text=✓",
              "facts": [
                { "name": "Vehicle", "value": "{{vehicleData.make}} {{vehicleData.model}}" },
                { "name": "Contributor", "value": "{{user.email}}" },
                { "name": "Approved At", "value": "{{timestamp}}" }
              ]
            }]
          }),
        },
        SLACK: {
          content: JSON.stringify({
            text: "Contribution Approved",
            attachments: [{
              color: "good",
              fields: [
                { title: "Vehicle", value: "{{vehicleData.make}} {{vehicleData.model}}", short: true },
                { title: "Contributor", value: "{{user.email}}", short: true }
              ]
            }]
          }),
        },
        DISCORD: {
          content: JSON.stringify({
            embeds: [{
              title: "Contribution Approved",
              color: 2664261, // Green
              fields: [
                { name: "Vehicle", value: "{{vehicleData.make}} {{vehicleData.model}}", inline: true },
                { name: "Contributor", value: "{{user.email}}", inline: true }
              ],
              timestamp: "{{timestamp}}"
            }]
          }),
        },
        GOTIFY: { content: "Your contribution for {{vehicleData.make}} {{vehicleData.model}} has been approved!" },
        PUSHBULLET: { content: "Your contribution for {{vehicleData.make}} {{vehicleData.model}} has been approved!" },
        FCM: { content: "Your contribution for {{vehicleData.make}} {{vehicleData.model}} has been approved!" },
        APNS: { content: "Your contribution for {{vehicleData.make}} {{vehicleData.model}} has been approved!" },
        WEB_PUSH: { content: "Your contribution for {{vehicleData.make}} {{vehicleData.model}} has been approved!" },
        SMS: { content: "EV DB: Your contribution for {{vehicleData.make}} {{vehicleData.model}} has been approved!" },
        IN_APP: { content: "Your {{vehicleData.make}} {{vehicleData.model}} contribution has been approved! 🎉" },
        RSS: { content: "Contribution approved: {{vehicleData.make}} {{vehicleData.model}}" },
      },
      'contribution.rejected': {
        EMAIL: {
          subject: 'Your contribution needs attention',
          content: `Hello {{user.email}},\n\nYour contribution for {{vehicleData.make}} {{vehicleData.model}} has been reviewed and requires some changes.\n\nReason: {{rejectionComment}}\n\nPlease review the feedback and resubmit your contribution.\n\nBest regards,\nEV Database Team`,
        },
        // ... other channels would follow similar pattern
        WEBHOOK: { content: JSON.stringify({ event: 'contribution.rejected', userId: '{{userId}}', reason: '{{rejectionComment}}' }) },
        TEAMS: { content: JSON.stringify({ "@type": "MessageCard", "themeColor": "dc3545", "summary": "Contribution Rejected" }) },
        SLACK: { content: JSON.stringify({ text: "Contribution Rejected", attachments: [{ color: "danger" }] }) },
        DISCORD: { content: JSON.stringify({ embeds: [{ title: "Contribution Rejected", color: 14431557 }] }) },
        GOTIFY: { content: "Your contribution was rejected: {{rejectionComment}}" },
        PUSHBULLET: { content: "Your contribution was rejected: {{rejectionComment}}" },
        FCM: { content: "Your contribution was rejected: {{rejectionComment}}" },
        APNS: { content: "Your contribution was rejected: {{rejectionComment}}" },
        WEB_PUSH: { content: "Your contribution was rejected: {{rejectionComment}}" },
        SMS: { content: "EV DB: Your contribution was rejected. Check your email for details." },
        IN_APP: { content: "Your {{vehicleData.make}} {{vehicleData.model}} contribution needs attention" },
        RSS: { content: "Contribution rejected: {{vehicleData.make}} {{vehicleData.model}}" },
      },
      // Additional event types would be defined here...
      'contribution.submitted': {
        EMAIL: { subject: 'Contribution received', content: 'Thank you for your contribution!' },
        WEBHOOK: { content: JSON.stringify({ event: 'contribution.submitted' }) },
        TEAMS: { content: JSON.stringify({ "@type": "MessageCard", "summary": "New Contribution" }) },
        SLACK: { content: JSON.stringify({ text: "New contribution submitted" }) },
        DISCORD: { content: JSON.stringify({ embeds: [{ title: "New Contribution" }] }) },
        GOTIFY: { content: "New contribution submitted" },
        PUSHBULLET: { content: "New contribution submitted" },
        FCM: { content: "New contribution submitted" },
        APNS: { content: "New contribution submitted" },
        WEB_PUSH: { content: "New contribution submitted" },
        SMS: { content: "New contribution submitted" },
        IN_APP: { content: "Your {{vehicleData.make}} {{vehicleData.model}} contribution has been submitted for review" },
        RSS: { content: "New contribution submitted" },
      },
      'user.registered': {
        EMAIL: { subject: 'Welcome to EV Database!', content: 'Welcome {{user.email}}! Your account has been created.' },
        WEBHOOK: { content: JSON.stringify({ event: 'user.registered' }) },
        TEAMS: { content: JSON.stringify({ "@type": "MessageCard", "summary": "New User Registration" }) },
        SLACK: { content: JSON.stringify({ text: "New user registered" }) },
        DISCORD: { content: JSON.stringify({ embeds: [{ title: "New User" }] }) },
        GOTIFY: { content: "New user registered" },
        PUSHBULLET: { content: "New user registered" },
        FCM: { content: "Welcome to EV Database!" },
        APNS: { content: "Welcome to EV Database!" },
        WEB_PUSH: { content: "Welcome to EV Database!" },
        SMS: { content: "Welcome to EV Database!" },
        IN_APP: { content: "Welcome to EV Database!" },
        RSS: { content: "New user registered" },
      },
      'user.password_reset': {
        EMAIL: { subject: 'Password Reset Request', content: 'A password reset was requested for your account.' },
        WEBHOOK: { content: JSON.stringify({ event: 'user.password_reset' }) },
        TEAMS: { content: JSON.stringify({ "@type": "MessageCard", "summary": "Password Reset" }) },
        SLACK: { content: JSON.stringify({ text: "Password reset requested" }) },
        DISCORD: { content: JSON.stringify({ embeds: [{ title: "Password Reset" }] }) },
        GOTIFY: { content: "Password reset requested" },
        PUSHBULLET: { content: "Password reset requested" },
        FCM: { content: "Password reset requested" },
        APNS: { content: "Password reset requested" },
        WEB_PUSH: { content: "Password reset requested" },
        SMS: { content: "Password reset requested for your EV DB account" },
        IN_APP: { content: "Password reset requested" },
        RSS: { content: "Password reset requested" },
      },
      'user.account_updated': {
        EMAIL: { subject: 'Account Updated', content: 'Your account information has been updated.' },
        WEBHOOK: { content: JSON.stringify({ event: 'user.account_updated' }) },
        TEAMS: { content: JSON.stringify({ "@type": "MessageCard", "summary": "Account Updated" }) },
        SLACK: { content: JSON.stringify({ text: "Account updated" }) },
        DISCORD: { content: JSON.stringify({ embeds: [{ title: "Account Updated" }] }) },
        GOTIFY: { content: "Account updated" },
        PUSHBULLET: { content: "Account updated" },
        FCM: { content: "Account updated" },
        APNS: { content: "Account updated" },
        WEB_PUSH: { content: "Account updated" },
        SMS: { content: "Your EV DB account was updated" },
        IN_APP: { content: "Account updated" },
        RSS: { content: "Account updated" },
      },
      'system.maintenance': {
        EMAIL: { subject: 'System Maintenance Notice', content: 'The system will undergo maintenance.' },
        WEBHOOK: { content: JSON.stringify({ event: 'system.maintenance' }) },
        TEAMS: { content: JSON.stringify({ "@type": "MessageCard", "summary": "System Maintenance" }) },
        SLACK: { content: JSON.stringify({ text: "System maintenance scheduled" }) },
        DISCORD: { content: JSON.stringify({ embeds: [{ title: "System Maintenance" }] }) },
        GOTIFY: { content: "System maintenance scheduled" },
        PUSHBULLET: { content: "System maintenance scheduled" },
        FCM: { content: "System maintenance scheduled" },
        APNS: { content: "System maintenance scheduled" },
        WEB_PUSH: { content: "System maintenance scheduled" },
        SMS: { content: "EV DB maintenance scheduled" },
        IN_APP: { content: "System maintenance scheduled" },
        RSS: { content: "System maintenance scheduled" },
      },
      'system.announcement': {
        EMAIL: { subject: 'System Announcement', content: 'Important system announcement.' },
        WEBHOOK: { content: JSON.stringify({ event: 'system.announcement' }) },
        TEAMS: { content: JSON.stringify({ "@type": "MessageCard", "summary": "System Announcement" }) },
        SLACK: { content: JSON.stringify({ text: "System announcement" }) },
        DISCORD: { content: JSON.stringify({ embeds: [{ title: "System Announcement" }] }) },
        GOTIFY: { content: "System announcement" },
        PUSHBULLET: { content: "System announcement" },
        FCM: { content: "System announcement" },
        APNS: { content: "System announcement" },
        WEB_PUSH: { content: "System announcement" },
        SMS: { content: "EV DB announcement" },
        IN_APP: { content: "System announcement" },
        RSS: { content: "System announcement" },
      },
    };
  }

  // Send notification to user via all enabled channels (including webhooks)
  static async sendNotificationToUser(
    userId: number,
    notification: {
      eventType: NotificationEventType;
      title: string;
      content: string;
      metadata?: any;
    }
  ): Promise<void> {
    try {
      // Get user preferences for this event type
      const preferences = await db
        .select()
        .from(userNotificationPreferences)
        .where(
          and(
            eq(userNotificationPreferences.userId, userId),
            eq(userNotificationPreferences.eventType, notification.eventType)
          )
        );

      // If no preferences exist, use defaults (IN_APP enabled)
      const enabledChannels = preferences.length > 0
        ? preferences.filter(p => p.enabled).map(p => p.channel)
        : ['IN_APP'];

      // Get user info
      const [user] = await db
        .select({ email: users.email, name: users.name })
        .from(users)
        .where(eq(users.id, userId));

      if (!user) {
        console.error(`User ${userId} not found for notification`);
        return;
      }

      // Send to each enabled channel
      for (const channel of enabledChannels) {
        if (channel === 'WEBHOOK') {
          // Handle webhooks separately
          await this.sendNotificationViaWebhooks(userId, notification);
        } else {
          // Queue for other channels
          await this.queueNotification({
            userId,
            channel: channel as NotificationChannel,
            eventType: notification.eventType,
            recipient: user.email,
            subject: notification.title,
            content: notification.content,
            metadata: notification.metadata,
          });
        }
      }
    } catch (error) {
      console.error(`Failed to send notification to user ${userId}:`, error);
    }
  }

  // Send notification via configured webhooks
  static async sendNotificationViaWebhooks(
    userId: number,
    notification: {
      eventType: NotificationEventType;
      title: string;
      content: string;
      metadata?: any;
    }
  ): Promise<void> {
    try {
      // Get user's webhook configurations
      const webhooks = await db
        .select()
        .from(webhookConfigurations)
        .where(
          and(
            eq(webhookConfigurations.createdBy, userId),
            eq(webhookConfigurations.isEnabled, true),
            sql`JSON_EXTRACT(${webhookConfigurations.enabledEvents}, '$') LIKE '%${notification.eventType}%'`
          )
        );

      if (webhooks.length === 0) {
        return;
      }

      // Get user info for webhook payload
      const [user] = await db
        .select({ email: users.email, name: users.name })
        .from(users)
        .where(eq(users.id, userId));

      // Send to each webhook
      for (const webhook of webhooks) {
        try {
          // Check rate limit
          if (!WebhookRateLimiter.canSend(webhook.id)) {
            console.warn(`Rate limit exceeded for webhook ${webhook.name} (${webhook.id}). Remaining: ${WebhookRateLimiter.getRemainingRequests(webhook.id)}`);
            continue;
          }

          const payload = {
            event: notification.eventType,
            timestamp: new Date().toISOString(),
            user: {
              id: userId,
              email: user?.email,
              name: user?.name,
            },
            notification: {
              title: notification.title,
              content: notification.content,
              metadata: notification.metadata,
            },
            webhook: {
              id: webhook.id,
              name: webhook.name,
            },
          };

          await WebhookService.sendWebhook(webhook as any, payload);

          // Update webhook success stats
          await db
            .update(webhookConfigurations)
            .set({
              successCount: sql`${webhookConfigurations.successCount} + 1`,
              lastTriggered: new Date(),
            })
            .where(eq(webhookConfigurations.id, webhook.id));

          console.log(`Webhook notification sent successfully: ${webhook.name} (${webhook.id})`);
        } catch (error) {
          console.error(`Failed to send webhook notification to ${webhook.name}:`, error);

          // Update webhook failure stats
          await db
            .update(webhookConfigurations)
            .set({
              failureCount: sql`${webhookConfigurations.failureCount} + 1`,
            })
            .where(eq(webhookConfigurations.id, webhook.id));
        }
      }
    } catch (error) {
      console.error(`Failed to send webhook notifications for user ${userId}:`, error);
    }
  }

  // Send system-wide notification via all configured webhooks
  static async sendSystemNotificationViaWebhooks(
    notification: {
      eventType: NotificationEventType;
      title: string;
      content: string;
      metadata?: any;
    }
  ): Promise<void> {
    try {
      // Get all enabled webhook configurations that listen to this event
      const webhooks = await db
        .select()
        .from(webhookConfigurations)
        .where(
          and(
            eq(webhookConfigurations.isEnabled, true),
            sql`JSON_EXTRACT(${webhookConfigurations.enabledEvents}, '$') LIKE '%${notification.eventType}%'`
          )
        );

      if (webhooks.length === 0) {
        return;
      }

      // Send to each webhook
      for (const webhook of webhooks) {
        try {
          // Check rate limit
          if (!WebhookRateLimiter.canSend(webhook.id)) {
            console.warn(`Rate limit exceeded for system webhook ${webhook.name} (${webhook.id}). Remaining: ${WebhookRateLimiter.getRemainingRequests(webhook.id)}`);
            continue;
          }

          const payload = {
            event: notification.eventType,
            timestamp: new Date().toISOString(),
            notification: {
              title: notification.title,
              content: notification.content,
              metadata: notification.metadata,
            },
            webhook: {
              id: webhook.id,
              name: webhook.name,
            },
            system: true,
          };

          await WebhookService.sendWebhook(webhook as any, payload);

          // Update webhook success stats
          await db
            .update(webhookConfigurations)
            .set({
              successCount: sql`${webhookConfigurations.successCount} + 1`,
              lastTriggered: new Date(),
            })
            .where(eq(webhookConfigurations.id, webhook.id));

          console.log(`System webhook notification sent successfully: ${webhook.name} (${webhook.id})`);
        } catch (error) {
          console.error(`Failed to send system webhook notification to ${webhook.name}:`, error);

          // Update webhook failure stats
          await db
            .update(webhookConfigurations)
            .set({
              failureCount: sql`${webhookConfigurations.failureCount} + 1`,
            })
            .where(eq(webhookConfigurations.id, webhook.id));
        }
      }
    } catch (error) {
      console.error('Failed to send system webhook notifications:', error);
    }
  }
}
