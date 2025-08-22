import { getSetting } from './settingsService';
import { EmailService } from './emailService';

// Base notification handler interface
export interface NotificationHandler {
  send(notification: any): Promise<any>;
  isEnabled(): Promise<boolean>;
}

// Email notification handler
export class EmailHandler implements NotificationHandler {
  async isEnabled(): Promise<boolean> {
    const enabled = await getSetting('EMAIL', 'smtp_host');
    return !!enabled?.value;
  }

  async send(notification: any): Promise<any> {
    const smtpHost = await getSetting('EMAIL', 'smtp_host');

    if (!smtpHost?.value) {
      throw new Error('SMTP configuration not found');
    }

    // Determine if content should be treated as HTML
    const isHtml = notification.content.includes('<') && notification.content.includes('>');

    // Generate HTML version if content is plain text
    let htmlContent = notification.content;
    if (!isHtml) {
      htmlContent = EmailService.generateHTMLTemplate(
        notification.subject || 'EV Database Notification',
        notification.content,
        undefined,
        undefined,
        'This is an automated notification from EV Database.'
      );
    }

    const result = await EmailService.sendEmail({
      to: notification.recipient,
      subject: notification.subject || 'EV Database Notification',
      text: notification.content.replace(/<[^>]*>/g, ''), // Strip HTML for text version
      html: htmlContent,
    });

    return {
      messageId: result.messageId,
      status: 'sent',
      response: result.response
    };
  }
}

// Dynamic webhook handler - uses webhook configurations from database
export class DynamicWebhookHandler implements NotificationHandler {
  async isEnabled(): Promise<boolean> {
    // Always enabled - individual webhooks control their own enabled state
    return true;
  }

  async send(notification: any): Promise<any> {
    const { WebhookService } = await import('./webhookService');

    // Get all webhooks configured for this event type
    const webhooks = await WebhookService.getWebhooksForEvent(notification.eventType);

    if (webhooks.length === 0) {
      console.log(`No webhooks configured for event type: ${notification.eventType}`);
      return { message: 'No webhooks configured for this event type' };
    }

    const results = [];

    // Send to all configured webhooks
    for (const webhook of webhooks) {
      try {
        // Prepare payload
        const timestamp = Math.floor(Date.now() / 1000);
        const payload = {
          timestamp,
          event: notification.eventType,
          webhook_id: webhook.id,
          webhook_name: webhook.name,
          data: JSON.parse(notification.content),
          metadata: notification.metadata ? JSON.parse(notification.metadata) : {},
        };

        // Send webhook
        const result = await WebhookService.sendWebhook(webhook, payload);

        // Update success statistics
        await WebhookService.updateWebhookStats(webhook.id, true);

        results.push({
          webhookId: webhook.id,
          webhookName: webhook.name,
          success: true,
          result,
        });

        console.log(`Webhook ${webhook.name} (${webhook.id}) sent successfully`);

      } catch (error) {
        // Update failure statistics
        await WebhookService.updateWebhookStats(webhook.id, false);

        results.push({
          webhookId: webhook.id,
          webhookName: webhook.name,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        console.error(`Webhook ${webhook.name} (${webhook.id}) failed:`, error);
      }
    }

    // Return summary of all webhook attempts
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    return {
      totalWebhooks: webhooks.length,
      successCount,
      failureCount,
      results,
    };
  }
}

// Legacy webhook handler for backward compatibility
export class WebhookHandler implements NotificationHandler {
  async isEnabled(): Promise<boolean> {
    const enabled = await getSetting('WEBHOOKS', 'webhook_enabled');
    return enabled?.value === 'true';
  }

  async send(notification: any): Promise<any> {
    const webhookUrl = await getSetting('WEBHOOKS', 'webhook_url');
    const webhookSecret = await getSetting('WEBHOOKS', 'webhook_secret');
    const webhookFormat = await getSetting('WEBHOOKS', 'webhook_format');
    const webhookTimeout = await getSetting('WEBHOOKS', 'webhook_timeout');

    if (!webhookUrl?.value) {
      throw new Error('Webhook URL not configured');
    }

    const timeout = parseInt(webhookTimeout?.value || '30') * 1000;
    const isJson = webhookFormat?.value !== 'form-data';

    // Prepare payload
    const timestamp = Math.floor(Date.now() / 1000);
    const payload = {
      timestamp,
      event: notification.eventType,
      data: JSON.parse(notification.content),
      metadata: notification.metadata ? JSON.parse(notification.metadata) : {},
    };

    const headers: Record<string, string> = {
      'User-Agent': 'EV-Database-Webhook/1.0',
      'X-Webhook-Timestamp': timestamp.toString(),
      'X-Webhook-Event': notification.eventType,
    };

    let body: string;
    if (isJson) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(payload);
    } else {
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
      body = new URLSearchParams({ payload: JSON.stringify(payload) }).toString();
    }

    // Add signature if secret is configured
    if (webhookSecret?.value) {
      const signature = await this.generateSignature(body, webhookSecret.value);
      headers['X-Webhook-Signature'] = signature;
      headers['X-Webhook-Secret'] = webhookSecret.value; // Keep for backward compatibility
    }

    const response = await fetch(webhookUrl.value, {
      method: 'POST',
      headers,
      body,
      signal: AbortSignal.timeout(timeout),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`Webhook failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const responseText = await response.text().catch(() => '');
    return {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      body: responseText,
    };
  }

  // Generate HMAC-SHA256 signature for webhook verification
  private async generateSignature(payload: string, secret: string): Promise<string> {
    const crypto = await import('crypto');
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload);
    return `sha256=${hmac.digest('hex')}`;
  }
}

// Microsoft Teams handler
export class TeamsHandler implements NotificationHandler {
  async isEnabled(): Promise<boolean> {
    const enabled = await getSetting('TEAMS', 'teams_enabled');
    return enabled?.value === 'true';
  }

  async send(notification: any): Promise<any> {
    const webhookUrl = await getSetting('TEAMS', 'teams_webhook_url');

    if (!webhookUrl?.value) {
      throw new Error('Teams webhook URL not configured');
    }

    // Parse the content if it's a JSON string, otherwise create a simple message
    let payload;
    try {
      payload = JSON.parse(notification.content);
    } catch {
      // Create a simple Teams message card
      payload = {
        "@type": "MessageCard",
        "@context": "http://schema.org/extensions",
        "themeColor": "0076D7",
        "summary": notification.subject || "EV Database Notification",
        "sections": [{
          "activityTitle": notification.subject || "EV Database Notification",
          "activitySubtitle": new Date().toLocaleString(),
          "activityImage": "https://via.placeholder.com/64x64/0076D7/ffffff?text=EV",
          "text": notification.content,
          "markdown": true
        }]
      };
    }

    // Add timestamp if not present
    if (!payload.sections?.[0]?.activitySubtitle) {
      if (payload.sections?.[0]) {
        payload.sections[0].activitySubtitle = new Date().toLocaleString();
      }
    }

    const response = await fetch(webhookUrl.value, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'EV-Database-Teams-Webhook/1.0',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`Teams webhook failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return {
      status: response.status,
      response: await response.text().catch(() => ''),
      payload: payload
    };
  }
}

// Slack handler
export class SlackHandler implements NotificationHandler {
  async isEnabled(): Promise<boolean> {
    const enabled = await getSetting('SLACK', 'slack_enabled');
    return enabled?.value === 'true';
  }

  async send(notification: any): Promise<any> {
    const webhookUrl = await getSetting('SLACK', 'slack_webhook_url');
    const botToken = await getSetting('SLACK', 'slack_bot_token');
    const channel = await getSetting('SLACK', 'slack_channel');

    // Use bot token API if available, otherwise use webhook
    if (botToken?.value) {
      return this.sendViaAPI(notification, botToken.value, channel?.value);
    } else if (webhookUrl?.value) {
      return this.sendViaWebhook(notification, webhookUrl.value);
    } else {
      throw new Error('Neither Slack webhook URL nor bot token configured');
    }
  }

  private async sendViaWebhook(notification: any, webhookUrl: string): Promise<any> {
    // Parse the content if it's a JSON string, otherwise create a simple message
    let payload;
    try {
      payload = JSON.parse(notification.content);
    } catch {
      // Create a simple Slack message
      payload = {
        text: notification.subject || "EV Database Notification",
        attachments: [{
          color: "good",
          text: notification.content,
          footer: "EV Database",
          ts: Math.floor(Date.now() / 1000)
        }]
      };
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'EV-Database-Slack-Webhook/1.0',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`Slack webhook failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return {
      status: response.status,
      response: await response.text().catch(() => ''),
      method: 'webhook'
    };
  }

  private async sendViaAPI(notification: any, botToken: string, channel?: string): Promise<any> {
    // Parse the content if it's a JSON string, otherwise create a simple message
    let payload;
    try {
      payload = JSON.parse(notification.content);
    } catch {
      payload = {
        text: notification.content,
        attachments: [{
          color: "good",
          title: notification.subject || "EV Database Notification",
          footer: "EV Database",
          ts: Math.floor(Date.now() / 1000)
        }]
      };
    }

    // Add channel if specified
    if (channel) {
      payload.channel = channel;
    }

    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${botToken}`,
        'Content-Type': 'application/json',
        'User-Agent': 'EV-Database-Slack-Bot/1.0',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`Slack API failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    if (!result.ok) {
      throw new Error(`Slack API error: ${result.error}`);
    }

    return {
      status: response.status,
      response: result,
      method: 'api'
    };
  }
}

// Discord handler
export class DiscordHandler implements NotificationHandler {
  async isEnabled(): Promise<boolean> {
    const enabled = await getSetting('DISCORD', 'discord_enabled');
    return enabled?.value === 'true';
  }

  async send(notification: any): Promise<any> {
    const webhookUrl = await getSetting('DISCORD', 'discord_webhook_url');
    const username = await getSetting('DISCORD', 'discord_username');

    if (!webhookUrl?.value) {
      throw new Error('Discord webhook URL not configured');
    }

    // Parse the content if it's a JSON string, otherwise create a simple embed
    let payload;
    try {
      payload = JSON.parse(notification.content);
    } catch {
      // Create a simple Discord embed
      payload = {
        embeds: [{
          title: notification.subject || "EV Database Notification",
          description: notification.content,
          color: 0x0099ff, // Blue color
          footer: {
            text: "EV Database",
            icon_url: "https://via.placeholder.com/32x32/0099ff/ffffff?text=EV"
          },
          timestamp: new Date().toISOString()
        }]
      };
    }

    // Add username if specified
    if (username?.value) {
      payload.username = username.value;
    }

    // Add avatar if not present
    if (!payload.avatar_url) {
      payload.avatar_url = "https://via.placeholder.com/64x64/0099ff/ffffff?text=EV";
    }

    // Ensure embeds have proper structure
    if (payload.embeds) {
      payload.embeds = payload.embeds.map((embed: any) => ({
        ...embed,
        timestamp: embed.timestamp || new Date().toISOString(),
        footer: embed.footer || {
          text: "EV Database",
          icon_url: "https://via.placeholder.com/32x32/0099ff/ffffff?text=EV"
        }
      }));
    }

    const response = await fetch(webhookUrl.value, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'EV-Database-Discord-Webhook/1.0',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`Discord webhook failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return {
      status: response.status,
      response: await response.text().catch(() => ''),
      payload: payload
    };
  }
}

// Gotify handler
export class GotifyHandler implements NotificationHandler {
  async isEnabled(): Promise<boolean> {
    const enabled = await getSetting('GOTIFY', 'gotify_enabled');
    return enabled?.value === 'true';
  }

  async send(notification: any): Promise<any> {
    const serverUrl = await getSetting('GOTIFY', 'gotify_server_url');
    const appToken = await getSetting('GOTIFY', 'gotify_app_token');
    const priority = await getSetting('GOTIFY', 'gotify_priority');

    if (!serverUrl?.value || !appToken?.value) {
      throw new Error('Gotify configuration incomplete');
    }

    const url = `${serverUrl.value.replace(/\/$/, '')}/message?token=${appToken.value}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: notification.subject || 'EV Database Notification',
        message: notification.content,
        priority: parseInt(priority?.value || '5'),
      }),
    });

    if (!response.ok) {
      throw new Error(`Gotify failed: ${response.status} ${response.statusText}`);
    }

    return { status: response.status, response: await response.json() };
  }
}

// Pushbullet handler
export class PushbulletHandler implements NotificationHandler {
  async isEnabled(): Promise<boolean> {
    const enabled = await getSetting('PUSHBULLET', 'pushbullet_enabled');
    return enabled?.value === 'true';
  }

  async send(notification: any): Promise<any> {
    const accessToken = await getSetting('PUSHBULLET', 'pushbullet_access_token');
    const deviceIden = await getSetting('PUSHBULLET', 'pushbullet_device_iden');

    if (!accessToken?.value) {
      throw new Error('Pushbullet access token not configured');
    }

    const payload: any = {
      type: 'note',
      title: notification.subject || 'EV Database Notification',
      body: notification.content,
    };

    if (deviceIden?.value) {
      payload.device_iden = deviceIden.value;
    }

    const response = await fetch('https://api.pushbullet.com/v2/pushes', {
      method: 'POST',
      headers: {
        'Access-Token': accessToken.value,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Pushbullet failed: ${response.status} ${response.statusText}`);
    }

    return { status: response.status, response: await response.json() };
  }
}

// SMS handler (Twilio)
export class SMSHandler implements NotificationHandler {
  async isEnabled(): Promise<boolean> {
    const enabled = await getSetting('SMS', 'sms_enabled');
    return enabled?.value === 'true';
  }

  async send(notification: any): Promise<any> {
    const provider = await getSetting('SMS', 'sms_provider');

    if (provider?.value === 'twilio') {
      return this.sendTwilio(notification);
    } else if (provider?.value === 'aws_sns') {
      return this.sendAWSSNS(notification);
    } else {
      throw new Error('SMS provider not configured');
    }
  }

  private async sendTwilio(notification: any): Promise<any> {
    const accountSid = await getSetting('SMS', 'twilio_account_sid');
    const authToken = await getSetting('SMS', 'twilio_auth_token');
    const fromNumber = await getSetting('SMS', 'twilio_phone_number');

    if (!accountSid?.value || !authToken?.value || !fromNumber?.value) {
      throw new Error('Twilio configuration incomplete');
    }

    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid.value}/Messages.json`;
    const auth = Buffer.from(`${accountSid.value}:${authToken.value}`).toString('base64');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        From: fromNumber.value,
        To: notification.recipient,
        Body: notification.content,
      }),
    });

    if (!response.ok) {
      throw new Error(`Twilio failed: ${response.status} ${response.statusText}`);
    }

    return { status: response.status, response: await response.json() };
  }

  private async sendAWSSNS(notification: any): Promise<any> {
    const accessKey = await getSetting('SMS', 'aws_sns_access_key');
    const secretKey = await getSetting('SMS', 'aws_sns_secret_key');
    const region = await getSetting('SMS', 'aws_sns_region');

    if (!accessKey?.value || !secretKey?.value) {
      throw new Error('AWS SNS configuration incomplete');
    }

    // For now, just log the SMS (implement actual AWS SNS later)
    console.log('Sending SMS via AWS SNS:', {
      to: notification.recipient,
      message: notification.content,
      region: region?.value || 'us-east-1'
    });

    return { messageId: `aws-sns-${Date.now()}`, status: 'sent' };
  }
}

// Firebase Cloud Messaging handler
export class FCMHandler implements NotificationHandler {
  async isEnabled(): Promise<boolean> {
    const enabled = await getSetting('FCM', 'fcm_enabled');
    return enabled?.value === 'true';
  }

  async send(notification: any): Promise<any> {
    const serverKey = await getSetting('FCM', 'fcm_server_key');
    const projectId = await getSetting('FCM', 'fcm_project_id');

    if (!serverKey?.value) {
      throw new Error('FCM server key not configured');
    }

    // Parse metadata to get FCM token
    const metadata = notification.metadata ? JSON.parse(notification.metadata) : {};
    const fcmToken = metadata.fcmToken || notification.recipient;

    if (!fcmToken) {
      throw new Error('FCM token not provided');
    }

    const payload = {
      to: fcmToken,
      notification: {
        title: notification.subject || 'EV Database Notification',
        body: notification.content,
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png',
        click_action: metadata.clickAction || '/',
      },
      data: {
        eventType: notification.eventType,
        timestamp: new Date().toISOString(),
        ...metadata.data
      }
    };

    const response = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Authorization': `key=${serverKey.value}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`FCM failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    if (result.failure > 0) {
      throw new Error(`FCM delivery failed: ${JSON.stringify(result.results)}`);
    }

    return {
      status: response.status,
      response: result,
      messageId: result.results?.[0]?.message_id
    };
  }
}

// Apple Push Notification Service handler
export class APNsHandler implements NotificationHandler {
  async isEnabled(): Promise<boolean> {
    const enabled = await getSetting('APNS', 'apns_enabled');
    return enabled?.value === 'true';
  }

  async send(notification: any): Promise<any> {
    const keyId = await getSetting('APNS', 'apns_key_id');
    const teamId = await getSetting('APNS', 'apns_team_id');
    const privateKey = await getSetting('APNS', 'apns_private_key');
    const bundleId = await getSetting('APNS', 'apns_bundle_id');

    if (!keyId?.value || !teamId?.value || !privateKey?.value || !bundleId?.value) {
      throw new Error('APNs configuration incomplete');
    }

    // Parse metadata to get device token
    const metadata = notification.metadata ? JSON.parse(notification.metadata) : {};
    const deviceToken = metadata.deviceToken || notification.recipient;

    if (!deviceToken) {
      throw new Error('APNs device token not provided');
    }

    // For now, just log the push notification (implement actual APNs later)
    console.log('Sending APNs push notification:', {
      deviceToken,
      title: notification.subject || 'EV Database Notification',
      body: notification.content,
      bundleId: bundleId.value,
      badge: metadata.badge || 1,
      sound: metadata.sound || 'default'
    });

    return {
      messageId: `apns-${Date.now()}`,
      status: 'sent',
      deviceToken
    };
  }
}

// Web Push handler
export class WebPushHandler implements NotificationHandler {
  async isEnabled(): Promise<boolean> {
    const enabled = await getSetting('WEB_PUSH', 'web_push_enabled');
    return enabled?.value === 'true';
  }

  async send(notification: any): Promise<any> {
    const publicKey = await getSetting('WEB_PUSH', 'vapid_public_key');
    const privateKey = await getSetting('WEB_PUSH', 'vapid_private_key');
    const subject = await getSetting('WEB_PUSH', 'vapid_subject');

    if (!publicKey?.value || !privateKey?.value || !subject?.value) {
      throw new Error('Web Push VAPID configuration incomplete');
    }

    // Parse metadata to get subscription
    const metadata = notification.metadata ? JSON.parse(notification.metadata) : {};
    const subscription = metadata.subscription;

    if (!subscription || !subscription.endpoint) {
      throw new Error('Web Push subscription not provided');
    }

    const payload = {
      title: notification.subject || 'EV Database Notification',
      body: notification.content,
      icon: '/icon-192x192.png',
      badge: '/badge-72x72.png',
      data: {
        eventType: notification.eventType,
        timestamp: new Date().toISOString(),
        url: metadata.url || '/',
        ...metadata.data
      },
      actions: metadata.actions || []
    };

    // For now, just log the web push (implement actual Web Push API later)
    console.log('Sending Web Push notification:', {
      endpoint: subscription.endpoint,
      payload: JSON.stringify(payload),
      vapidSubject: subject.value
    });

    return {
      messageId: `webpush-${Date.now()}`,
      status: 'sent',
      endpoint: subscription.endpoint
    };
  }
}

// In-app notification handler
export class InAppHandler implements NotificationHandler {
  async isEnabled(): Promise<boolean> {
    // In-app notifications are always enabled
    return true;
  }

  async send(notification: any): Promise<any> {
    // Store in-app notification in database for user to see in UI
    const { db } = await import('../db');
    const { inAppNotifications } = await import('../db/schema');

    const now = new Date();

    // Generate actionUrl based on event type and metadata
    const actionUrl = this.generateActionUrl(notification);

    const [inAppNotification] = await db.insert(inAppNotifications).values({
      userId: notification.userId,
      title: notification.subject || 'EV Database Notification',
      content: notification.content,
      eventType: notification.eventType,
      actionUrl: actionUrl,
      isRead: false,
      createdAt: now,
    }).returning();

    console.log('In-app notification created:', inAppNotification.id);

    return {
      messageId: `inapp-${inAppNotification.id}`,
      status: 'sent',
      notificationId: inAppNotification.id
    };
  }

  private generateActionUrl(notification: any): string | null {
    const metadata = notification.metadata ? JSON.parse(notification.metadata) : {};

    switch (notification.eventType) {
      case 'contribution.approved':
      case 'contribution.rejected':
      case 'contribution.submitted':
      case 'contribution.vote_received':
        // If we have a contribution ID, link directly to the contribution
        if (metadata.contributionId) {
          return `/contributions/${metadata.contributionId}`;
        }
        // Fallback to browse page
        return '/contributions/browse';
      case 'user.low_credits':
        return '/contribute';
      case 'user.credit_topup':
        return '/dashboard';
      case 'system.changelog':
        return '/changelog';
      case 'user.account_updated':
        return '/settings';
      default:
        return null;
    }
  }
}

// RSS/Atom feed handler
export class RSSHandler implements NotificationHandler {
  async isEnabled(): Promise<boolean> {
    const enabled = await getSetting('RSS', 'rss_enabled');
    return enabled?.value === 'true';
  }

  async send(notification: any): Promise<any> {
    // RSS feeds are generated on-demand, not sent individually
    // This handler just logs that an RSS-worthy event occurred
    console.log('RSS feed event:', {
      eventType: notification.eventType,
      title: notification.subject,
      content: notification.content,
      timestamp: new Date().toISOString()
    });

    // Store RSS feed item in database
    const { db } = await import('../db');
    const { rssFeedItems } = await import('../db/schema');

    const now = new Date();

    const [feedItem] = await db.insert(rssFeedItems).values({
      title: notification.subject || 'EV Database Update',
      description: notification.content,
      eventType: notification.eventType,
      link: this.generateItemLink(notification),
      guid: `evdb-${notification.eventType}-${Date.now()}`,
      pubDate: now,
      createdAt: now,
    }).returning();

    return {
      messageId: `rss-${feedItem.id}`,
      status: 'sent',
      feedItemId: feedItem.id
    };
  }

  private generateItemLink(notification: any): string {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const metadata = notification.metadata ? JSON.parse(notification.metadata) : {};

    switch (notification.eventType) {
      case 'contribution.approved':
        return `${baseUrl}/vehicles/${metadata.vehicleId || ''}`;
      case 'user.registered':
        return `${baseUrl}/community`;
      case 'system.announcement':
        return `${baseUrl}/announcements/${metadata.announcementId || ''}`;
      default:
        return baseUrl;
    }
  }
}

// Notification handler registry
export class NotificationHandlerRegistry {
  private static handlers: Map<string, NotificationHandler> = new Map([
    ['EMAIL', new EmailHandler()],
    ['WEBHOOK', new DynamicWebhookHandler()], // Use dynamic webhook handler
    ['WEBHOOK_LEGACY', new WebhookHandler()], // Keep legacy for backward compatibility
    ['TEAMS', new TeamsHandler()],
    ['SLACK', new SlackHandler()],
    ['DISCORD', new DiscordHandler()],
    ['GOTIFY', new GotifyHandler()],
    ['PUSHBULLET', new PushbulletHandler()],
    ['FCM', new FCMHandler()],
    ['APNS', new APNsHandler()],
    ['WEB_PUSH', new WebPushHandler()],
    ['SMS', new SMSHandler()],
    ['IN_APP', new InAppHandler()],
    ['RSS', new RSSHandler()],
  ]);

  static getHandler(channel: string): NotificationHandler | null {
    return this.handlers.get(channel) || null;
  }

  static getAllHandlers(): Map<string, NotificationHandler> {
    return this.handlers;
  }

  static getEnabledHandlers(): Promise<Map<string, NotificationHandler>> {
    return new Promise(async (resolve) => {
      const enabledHandlers = new Map<string, NotificationHandler>();

      for (const [channel, handler] of this.handlers) {
        try {
          if (await handler.isEnabled()) {
            enabledHandlers.set(channel, handler);
          }
        } catch (error) {
          console.warn(`Failed to check if ${channel} handler is enabled:`, error);
        }
      }

      resolve(enabledHandlers);
    });
  }
}
