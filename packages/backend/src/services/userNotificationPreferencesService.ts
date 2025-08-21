import { db } from '../db';
import { userNotificationPreferences, users } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { NotificationChannel, NotificationEventType } from './notificationService';

// User notification preferences interface
export interface UserNotificationPreference {
  id: number;
  userId: number;
  channel: NotificationChannel;
  eventType: NotificationEventType;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Notification preference update interface
export interface NotificationPreferenceUpdate {
  channel: NotificationChannel;
  eventType: NotificationEventType;
  enabled: boolean;
}

// User notification preferences service
export class UserNotificationPreferencesService {

  // Get all notification preferences for a user
  static async getUserPreferences(userId: number): Promise<UserNotificationPreference[]> {
    const preferences = await db.select()
      .from(userNotificationPreferences)
      .where(eq(userNotificationPreferences.userId, userId));

    return preferences.map(pref => ({
      id: pref.id,
      userId: pref.userId,
      channel: pref.channel as NotificationChannel,
      eventType: pref.eventType as NotificationEventType,
      enabled: pref.enabled,
      createdAt: new Date(pref.createdAt),
      updatedAt: new Date(pref.updatedAt),
    }));
  }

  // Get preferences organized by channel and event type
  static async getUserPreferencesMatrix(userId: number): Promise<{
    [channel: string]: { [eventType: string]: boolean }
  }> {
    const preferences = await this.getUserPreferences(userId);
    const matrix: { [channel: string]: { [eventType: string]: boolean } } = {};

    // Initialize with default values
    const channels: NotificationChannel[] = [
      'EMAIL', 'WEBHOOK', 'TEAMS', 'SLACK', 'DISCORD',
      'GOTIFY', 'PUSHBULLET', 'FCM', 'APNS', 'WEB_PUSH',
      'SMS', 'IN_APP', 'RSS'
    ];

    const eventTypes: NotificationEventType[] = [
      'contribution.approved', 'contribution.rejected', 'contribution.submitted',
      'user.registered', 'user.password_reset', 'user.account_updated',
      'system.maintenance', 'system.announcement'
    ];

    // Initialize all combinations with default enabled state
    channels.forEach(channel => {
      matrix[channel] = {};
      eventTypes.forEach(eventType => {
        matrix[channel][eventType] = this.getDefaultPreference(channel, eventType);
      });
    });

    // Override with user's actual preferences
    preferences.forEach(pref => {
      if (!matrix[pref.channel]) {
        matrix[pref.channel] = {};
      }
      matrix[pref.channel][pref.eventType] = pref.enabled;
    });

    return matrix;
  }

  // Get default preference for a channel/event combination
  private static getDefaultPreference(channel: NotificationChannel, eventType: NotificationEventType): boolean {
    // Default preferences based on channel and event type
    const defaults: { [key: string]: { [key: string]: boolean } } = {
      EMAIL: {
        'contribution.approved': true,
        'contribution.rejected': true,
        'contribution.submitted': false,
        'user.registered': true,
        'user.password_reset': true,
        'user.account_updated': true,
        'system.maintenance': true,
        'system.announcement': true,
      },
      IN_APP: {
        'contribution.approved': true,
        'contribution.rejected': true,
        'contribution.submitted': true,
        'user.registered': true,
        'user.password_reset': false,
        'user.account_updated': true,
        'system.maintenance': true,
        'system.announcement': true,
      },
      SMS: {
        'contribution.approved': false,
        'contribution.rejected': false,
        'contribution.submitted': false,
        'user.registered': false,
        'user.password_reset': true,
        'user.account_updated': false,
        'system.maintenance': true,
        'system.announcement': false,
      },
      // Most other channels default to false for user notifications
    };

    return defaults[channel]?.[eventType] ?? false;
  }

  // Update user notification preferences
  static async updateUserPreferences(
    userId: number, 
    updates: NotificationPreferenceUpdate[]
  ): Promise<void> {
    const now = new Date();

    for (const update of updates) {
      // Check if preference already exists
      const [existing] = await db.select()
        .from(userNotificationPreferences)
        .where(and(
          eq(userNotificationPreferences.userId, userId),
          eq(userNotificationPreferences.channel, update.channel),
          eq(userNotificationPreferences.eventType, update.eventType)
        ))
        .limit(1);

      if (existing) {
        // Update existing preference
        await db.update(userNotificationPreferences)
          .set({
            enabled: update.enabled,
            updatedAt: now,
          })
          .where(eq(userNotificationPreferences.id, existing.id));
      } else {
        // Create new preference
        await db.insert(userNotificationPreferences).values({
          userId,
          channel: update.channel,
          eventType: update.eventType,
          enabled: update.enabled,
          createdAt: now,
          updatedAt: now,
        });
      }
    }
  }

  // Bulk update preferences for a channel
  static async updateChannelPreferences(
    userId: number,
    channel: NotificationChannel,
    preferences: { [eventType: string]: boolean }
  ): Promise<void> {
    const updates: NotificationPreferenceUpdate[] = Object.entries(preferences).map(
      ([eventType, enabled]) => ({
        channel,
        eventType: eventType as NotificationEventType,
        enabled,
      })
    );

    await this.updateUserPreferences(userId, updates);
  }

  // Enable/disable all notifications for a user
  static async setAllNotifications(userId: number, enabled: boolean): Promise<void> {
    const channels: NotificationChannel[] = [
      'EMAIL', 'WEBHOOK', 'TEAMS', 'SLACK', 'DISCORD',
      'GOTIFY', 'PUSHBULLET', 'FCM', 'APNS', 'WEB_PUSH',
      'SMS', 'IN_APP', 'RSS'
    ];

    const eventTypes: NotificationEventType[] = [
      'contribution.approved', 'contribution.rejected', 'contribution.submitted',
      'user.registered', 'user.password_reset', 'user.account_updated',
      'system.maintenance', 'system.announcement'
    ];

    const updates: NotificationPreferenceUpdate[] = [];
    channels.forEach(channel => {
      eventTypes.forEach(eventType => {
        updates.push({ channel, eventType, enabled });
      });
    });

    await this.updateUserPreferences(userId, updates);
  }

  // Get notification preference for specific channel and event
  static async getPreference(
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

    return preference ? preference.enabled : this.getDefaultPreference(channel, eventType);
  }

  // Get users who have enabled a specific notification
  static async getUsersWithEnabledNotification(
    channel: NotificationChannel,
    eventType: NotificationEventType
  ): Promise<number[]> {
    // Get users who explicitly enabled this notification
    const enabledUsers = await db.select({ userId: userNotificationPreferences.userId })
      .from(userNotificationPreferences)
      .where(and(
        eq(userNotificationPreferences.channel, channel),
        eq(userNotificationPreferences.eventType, eventType),
        eq(userNotificationPreferences.enabled, true)
      ));

    // Get all users who don't have this preference set (use default)
    const allUsers = await db.select({ id: users.id }).from(users);
    const usersWithPreference = await db.select({ userId: userNotificationPreferences.userId })
      .from(userNotificationPreferences)
      .where(and(
        eq(userNotificationPreferences.channel, channel),
        eq(userNotificationPreferences.eventType, eventType)
      ));

    const usersWithPreferenceIds = new Set(usersWithPreference.map(u => u.userId));
    const usersWithoutPreference = allUsers
      .filter(user => !usersWithPreferenceIds.has(user.id))
      .map(user => user.id);

    // Check default preference for users without explicit setting
    const defaultEnabled = this.getDefaultPreference(channel, eventType);
    const defaultUsers = defaultEnabled ? usersWithoutPreference : [];

    // Combine explicitly enabled users with default users
    const enabledUserIds = [
      ...enabledUsers.map(u => u.userId),
      ...defaultUsers
    ];

    return [...new Set(enabledUserIds)]; // Remove duplicates
  }

  // Reset user preferences to defaults
  static async resetToDefaults(userId: number): Promise<void> {
    // Delete all existing preferences for the user
    await db.delete(userNotificationPreferences)
      .where(eq(userNotificationPreferences.userId, userId));

    console.log(`Reset notification preferences to defaults for user ${userId}`);
  }

  // Get notification summary for user
  static async getNotificationSummary(userId: number): Promise<{
    totalChannels: number;
    enabledChannels: number;
    totalEvents: number;
    enabledEvents: number;
    channelSummary: { [channel: string]: { total: number; enabled: number } };
  }> {
    const matrix = await this.getUserPreferencesMatrix(userId);
    
    const channels = Object.keys(matrix);
    const eventTypes = Object.keys(matrix[channels[0]] || {});
    
    let totalEnabled = 0;
    const channelSummary: { [channel: string]: { total: number; enabled: number } } = {};
    
    channels.forEach(channel => {
      const channelEvents = matrix[channel];
      const enabledInChannel = Object.values(channelEvents).filter(Boolean).length;
      
      channelSummary[channel] = {
        total: eventTypes.length,
        enabled: enabledInChannel,
      };
      
      totalEnabled += enabledInChannel;
    });
    
    const enabledChannels = Object.values(channelSummary)
      .filter(summary => summary.enabled > 0).length;
    
    return {
      totalChannels: channels.length,
      enabledChannels,
      totalEvents: eventTypes.length,
      enabledEvents: Math.round(totalEnabled / channels.length),
      channelSummary,
    };
  }
}
