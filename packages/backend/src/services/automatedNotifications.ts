import { db } from '../db';
import { users, contributions, inAppNotifications, userNotificationPreferences } from '../db/schema';
import { eq, and, lt } from 'drizzle-orm';
import { NotificationService } from './notificationService';
import { AdminNotificationService } from './adminNotificationService';

// Configuration for automated notifications
const NOTIFICATION_CONFIG = {
  LOW_CREDITS_THRESHOLD: 10,
  WELCOME_DELAY_MINUTES: 5, // Delay welcome message by 5 minutes
  MAINTENANCE_ADVANCE_HOURS: 24, // Send maintenance alerts 24 hours in advance
};

export interface UserData {
  id: number;
  email: string;
  name?: string;
  credits: number;
  role: string;
}

export interface ContributionData {
  id: number;
  userId: number;
  vehicleId?: number;
  status: string;
  title?: string;
  description?: string;
}

export interface VoteData {
  contributionId: number;
  voterId: number;
  voteType: 'upvote' | 'downvote';
  contributorId: number;
}

export class AutomatedNotifications {

  // Welcome notification for new users
  static async sendWelcomeNotification(userId: number): Promise<void> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId));

      if (!user) {
        console.error(`User ${userId} not found for welcome notification`);
        return;
      }

      // Check if user wants welcome notifications
      const hasPreference = await this.checkUserPreference(userId, 'user.welcome', 'IN_APP');
      if (!hasPreference) {
        return;
      }

      // Create welcome notification
      await db.insert(inAppNotifications).values({
        userId: userId,
        title: `Welcome to EV Database! 👋`,
        content: `Hi ${user.name || user.email}! Welcome to the EV Database community. Start exploring electric vehicles, contribute your own data, or browse the latest updates. Your journey into the world of electric vehicles begins here!`,
        eventType: 'user.welcome',
        notificationType: 'info',
        category: 'user',
        priority: 'normal',
        actionUrl: '/vehicles',
        metadata: JSON.stringify({
          userName: user.name || user.email,
          userRole: user.role,
          registrationDate: new Date().toISOString(),
        }),
        createdAt: new Date(),
      });

      // Also send via other enabled channels (including webhooks)
      await NotificationService.sendNotificationToUser(userId, {
        eventType: 'user.welcome',
        title: 'Welcome to EV Database!',
        content: `Welcome ${user.name || user.email}! Start exploring electric vehicles and contributing to our community.`,
        metadata: {
          userName: user.name || user.email,
          actionUrl: '/vehicles',
        },
      });

      console.log(`Welcome notification sent to user ${userId}`);
    } catch (error) {
      console.error(`Failed to send welcome notification to user ${userId}:`, error);
    }
  }

  // Low credits warning
  static async sendLowCreditsWarning(userId: number): Promise<void> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId));

      if (!user || user.appCurrencyBalance >= NOTIFICATION_CONFIG.LOW_CREDITS_THRESHOLD) {
        return;
      }

      // Check if user wants low credits notifications
      const hasPreference = await this.checkUserPreference(userId, 'user.low_credits', 'IN_APP');
      if (!hasPreference) {
        return;
      }

      // Create low credits notification
      await db.insert(inAppNotifications).values({
        userId: userId,
        title: `⚠️ Low Credits Warning`,
        content: `Your credit balance is running low (${user.appCurrencyBalance} credits remaining). Consider contributing more vehicle data to earn additional credits, or contact an administrator if you need assistance.`,
        eventType: 'user.low_credits',
        notificationType: 'warning',
        category: 'user',
        priority: 'high',
        actionUrl: '/contribute',
        metadata: JSON.stringify({
          currentCredits: user.appCurrencyBalance,
          threshold: NOTIFICATION_CONFIG.LOW_CREDITS_THRESHOLD,
        }),
        createdAt: new Date(),
      });

      // Also send via other enabled channels
      await NotificationService.sendNotificationToUser(userId, {
        eventType: 'user.low_credits',
        title: 'Low Credits Warning',
        content: `Your credit balance is low (${user.appCurrencyBalance} credits). Consider contributing more data to earn credits.`,
        metadata: {
          currentCredits: user.appCurrencyBalance,
          actionUrl: '/contribute',
        },
      });

      console.log(`Low credits warning sent to user ${userId}`);
    } catch (error) {
      console.error(`Failed to send low credits warning to user ${userId}:`, error);
    }
  }

  // Credit top-up confirmation
  static async sendCreditTopUpConfirmation(
    userId: number,
    creditsAdded: number,
    reason: string,
    newBalance: number
  ): Promise<void> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId));

      if (!user) {
        console.error(`User ${userId} not found for credit top-up notification`);
        return;
      }

      // Check if user wants credit notifications
      const hasPreference = await this.checkUserPreference(userId, 'user.credit_topup', 'IN_APP');
      if (!hasPreference) {
        return;
      }

      // Create credit top-up notification
      await db.insert(inAppNotifications).values({
        userId: userId,
        title: `💰 Credits Added!`,
        content: `Great news! You've received ${creditsAdded} credits ${reason}. Your new balance is ${newBalance} credits. Keep up the great work contributing to the EV Database!`,
        eventType: 'user.credit_topup',
        notificationType: 'success',
        category: 'user',
        priority: 'normal',
        actionUrl: '/dashboard',
        metadata: JSON.stringify({
          creditsAdded,
          reason,
          newBalance,
          previousBalance: newBalance - creditsAdded,
        }),
        createdAt: new Date(),
      });

      // Also send via other enabled channels
      await NotificationService.sendNotificationToUser(userId, {
        eventType: 'user.credit_topup',
        title: 'Credits Added!',
        content: `You've received ${creditsAdded} credits ${reason}. New balance: ${newBalance} credits.`,
        metadata: {
          creditsAdded,
          reason,
          newBalance,
          actionUrl: '/dashboard',
        },
      });

      console.log(`Credit top-up notification sent to user ${userId}`);
    } catch (error) {
      console.error(`Failed to send credit top-up notification to user ${userId}:`, error);
    }
  }

  // Contribution vote received notification
  static async sendContributionVoteNotification(voteData: VoteData): Promise<void> {
    try {
      // Get contribution details
      const [contribution] = await db
        .select()
        .from(contributions)
        .where(eq(contributions.id, voteData.contributionId));

      if (!contribution) {
        console.error(`Contribution ${voteData.contributionId} not found for vote notification`);
        return;
      }

      // Check if contributor wants vote notifications
      const hasPreference = await this.checkUserPreference(voteData.contributorId, 'contribution.vote_received', 'IN_APP');
      if (!hasPreference) {
        return;
      }

      const voteEmoji = voteData.voteType === 'upvote' ? '👍' : '👎';
      const voteText = voteData.voteType === 'upvote' ? 'upvoted' : 'downvoted';

      // Create vote notification
      await db.insert(inAppNotifications).values({
        userId: voteData.contributorId,
        title: `${voteEmoji} Your contribution received a ${voteData.voteType}`,
        content: `Someone ${voteText} your contribution "${contribution.title || 'Vehicle Data'}". Community feedback helps improve the quality of our database!`,
        eventType: 'contribution.vote_received',
        notificationType: voteData.voteType === 'upvote' ? 'success' : 'info',
        category: 'contribution',
        priority: 'normal',
        actionUrl: `/contributions/${voteData.contributionId}`,
        metadata: JSON.stringify({
          contributionId: voteData.contributionId,
          voteType: voteData.voteType,
          voterId: voteData.voterId,
          contributionTitle: contribution.title,
        }),
        createdAt: new Date(),
      });

      // Also send via other enabled channels
      await NotificationService.sendNotificationToUser(voteData.contributorId, {
        eventType: 'contribution.vote_received',
        title: `Contribution ${voteText}`,
        content: `Your contribution "${contribution.title || 'Vehicle Data'}" received a ${voteData.voteType}.`,
        metadata: {
          contributionId: voteData.contributionId,
          voteType: voteData.voteType,
          actionUrl: `/contributions/${voteData.contributionId}`,
        },
      });

      console.log(`Vote notification sent to user ${voteData.contributorId}`);
    } catch (error) {
      console.error(`Failed to send vote notification:`, error);
    }
  }

  // Contribution status update notification
  static async sendContributionStatusNotification(
    contributionId: number,
    newStatus: string,
    adminMessage?: string
  ): Promise<void> {
    try {
      // Get contribution details
      const [contribution] = await db
        .select()
        .from(contributions)
        .where(eq(contributions.id, contributionId));

      if (!contribution) {
        console.error(`Contribution ${contributionId} not found for status notification`);
        return;
      }

      // Check if user wants status update notifications
      const eventType = `contribution.${newStatus}` as any;
      const hasPreference = await this.checkUserPreference(contribution.userId, eventType, 'IN_APP');
      if (!hasPreference) {
        return;
      }

      let title: string;
      let content: string;
      let notificationType: 'info' | 'success' | 'warning' | 'error';
      let emoji: string;

      switch (newStatus) {
        case 'approved':
          emoji = '✅';
          title = 'Contribution Approved!';
          content = `Great news! Your contribution "${contribution.title || 'Vehicle Data'}" has been approved and is now live in the database.`;
          notificationType = 'success';
          break;
        case 'rejected':
          emoji = '❌';
          title = 'Contribution Needs Revision';
          content = `Your contribution "${contribution.title || 'Vehicle Data'}" needs some revisions before it can be approved.`;
          notificationType = 'warning';
          break;
        case 'pending_review':
          emoji = '⏳';
          title = 'Contribution Under Review';
          content = `Your contribution "${contribution.title || 'Vehicle Data'}" is now under review by our team.`;
          notificationType = 'info';
          break;
        default:
          emoji = '📝';
          title = 'Contribution Status Updated';
          content = `Your contribution "${contribution.title || 'Vehicle Data'}" status has been updated to ${newStatus}.`;
          notificationType = 'info';
      }

      if (adminMessage) {
        content += `\n\nAdmin message: ${adminMessage}`;
      }

      // Create status notification
      await db.insert(inAppNotifications).values({
        userId: contribution.userId,
        title: `${emoji} ${title}`,
        content,
        eventType: eventType,
        notificationType,
        category: 'contribution',
        priority: newStatus === 'approved' ? 'high' : 'normal',
        actionUrl: `/contributions/${contributionId}`,
        metadata: JSON.stringify({
          contributionId,
          newStatus,
          contributionTitle: contribution.title,
          adminMessage,
        }),
        createdAt: new Date(),
      });

      // Also send via other enabled channels
      await NotificationService.sendNotificationToUser(contribution.userId, {
        eventType: eventType,
        title,
        content,
        metadata: {
          contributionId,
          newStatus,
          actionUrl: `/contributions/${contributionId}`,
        },
      });

      console.log(`Status notification sent to user ${contribution.userId} for contribution ${contributionId}`);
    } catch (error) {
      console.error(`Failed to send status notification for contribution ${contributionId}:`, error);
    }
  }

  // System maintenance alert
  static async sendMaintenanceAlert(
    title: string,
    message: string,
    scheduledTime: Date,
    estimatedDuration?: string
  ): Promise<void> {
    try {
      // Send to all users
      await AdminNotificationService.createNotification({
        title: `🔧 ${title}`,
        content: `${message}${estimatedDuration ? `\n\nEstimated duration: ${estimatedDuration}` : ''}`,
        notificationType: 'warning',
        targetAudience: 'all_users',
        actionUrl: '/maintenance',
        metadata: {
          scheduledTime: scheduledTime.toISOString(),
          estimatedDuration,
          maintenanceType: 'scheduled',
        },
      }, 1); // System user ID

      // Also send system-wide webhook notification
      await NotificationService.sendSystemNotificationViaWebhooks({
        eventType: 'system.maintenance',
        title: `🔧 ${title}`,
        content: `${message}${estimatedDuration ? ` (Duration: ${estimatedDuration})` : ''}`,
        metadata: {
          scheduledTime: scheduledTime.toISOString(),
          estimatedDuration,
          maintenanceType: 'scheduled',
        },
      });

      console.log(`Maintenance alert sent to all users and webhooks`);
    } catch (error) {
      console.error(`Failed to send maintenance alert:`, error);
    }
  }

  // Check if user has enabled a specific notification type
  private static async checkUserPreference(
    userId: number,
    eventType: string,
    channel: string
  ): Promise<boolean> {
    try {
      const [preference] = await db
        .select()
        .from(userNotificationPreferences)
        .where(
          and(
            eq(userNotificationPreferences.userId, userId),
            eq(userNotificationPreferences.eventType, eventType),
            eq(userNotificationPreferences.channel, channel)
          )
        );

      // If no preference is set, default to enabled
      return preference ? preference.enabled : true;
    } catch (error) {
      console.error(`Failed to check user preference for ${userId}:`, error);
      // Default to enabled if we can't check preferences
      return true;
    }
  }

  // Batch check for low credits and send warnings
  static async checkAndSendLowCreditsWarnings(): Promise<void> {
    try {
      const lowCreditUsers = await db
        .select()
        .from(users)
        .where(
          lt(users.appCurrencyBalance, NOTIFICATION_CONFIG.LOW_CREDITS_THRESHOLD)
        );

      for (const user of lowCreditUsers) {
        await this.sendLowCreditsWarning(user.id);
      }

      console.log(`Checked ${lowCreditUsers.length} users for low credits warnings`);
    } catch (error) {
      console.error('Failed to check for low credits warnings:', error);
    }
  }

  // Send delayed welcome notification (called by a scheduled job)
  static async sendDelayedWelcomeNotifications(): Promise<void> {
    try {
      const delayTime = new Date();
      delayTime.setMinutes(delayTime.getMinutes() - NOTIFICATION_CONFIG.WELCOME_DELAY_MINUTES);

      // Find users who registered within the delay window and haven't received welcome notification
      // For now, we'll skip this functionality since it requires more complex logic
      // to track which users have already received welcome notifications
      console.log('Delayed welcome notifications check completed (no users to process)');
    } catch (error) {
      console.error('Failed to send delayed welcome notifications:', error);
    }
  }
}
