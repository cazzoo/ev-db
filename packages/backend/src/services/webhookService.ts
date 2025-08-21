import { db } from '../db';
import { webhookConfigurations, users } from '../db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import crypto from 'crypto';
import { getTestPayloadForTemplate, detectTemplateFromUrl, replaceTemplateVariables } from './webhookTemplates';

export interface WebhookConfiguration {
  id: number;
  name: string;
  description?: string;
  url: string;
  method: string;
  contentType: string;
  authType: string;
  authToken?: string;
  authUsername?: string;
  authPassword?: string;
  authHeaderName?: string;
  secret?: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  enabledEvents: string[];
  eventFilters?: any;
  customHeaders?: any;
  payloadTemplate?: string;
  isEnabled: boolean;
  lastTriggered?: Date;
  successCount: number;
  failureCount: number;
  createdBy?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateWebhookRequest {
  name: string;
  description?: string;
  url: string;
  method?: string;
  contentType?: string;
  authType?: string;
  authToken?: string;
  authUsername?: string;
  authPassword?: string;
  authHeaderName?: string;
  secret?: string;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
  enabledEvents: string[];
  eventFilters?: any;
  customHeaders?: any;
  payloadTemplate?: string;
  isEnabled?: boolean;
}

export interface UpdateWebhookRequest extends Partial<CreateWebhookRequest> {
  id: number;
}

export class WebhookService {

  // Get all webhook configurations
  static async getAllWebhooks(): Promise<WebhookConfiguration[]> {
    const webhooks = await db.select()
      .from(webhookConfigurations)
      .orderBy(desc(webhookConfigurations.createdAt));

    return webhooks.map(this.mapToWebhookConfiguration);
  }

  // Get webhook by ID
  static async getWebhookById(id: number): Promise<WebhookConfiguration | null> {
    const [webhook] = await db.select()
      .from(webhookConfigurations)
      .where(eq(webhookConfigurations.id, id))
      .limit(1);

    return webhook ? this.mapToWebhookConfiguration(webhook) : null;
  }

  // Get enabled webhooks for specific event
  static async getWebhooksForEvent(eventType: string): Promise<WebhookConfiguration[]> {
    const webhooks = await db.select()
      .from(webhookConfigurations)
      .where(eq(webhookConfigurations.isEnabled, true));

    return webhooks
      .map(this.mapToWebhookConfiguration)
      .filter(webhook => webhook.enabledEvents.includes(eventType));
  }

  // Create new webhook
  static async createWebhook(data: CreateWebhookRequest, createdBy: number): Promise<WebhookConfiguration> {
    const now = new Date();

    const [webhook] = await db.insert(webhookConfigurations).values({
      name: data.name,
      description: data.description,
      url: data.url,
      method: data.method || 'POST',
      contentType: data.contentType || 'application/json',
      authType: data.authType || 'none',
      authToken: data.authToken,
      authUsername: data.authUsername,
      authPassword: data.authPassword,
      authHeaderName: data.authHeaderName,
      secret: data.secret,
      timeout: data.timeout || 30,
      retryAttempts: data.retryAttempts || 3,
      retryDelay: data.retryDelay || 5,
      enabledEvents: JSON.stringify(data.enabledEvents),
      eventFilters: data.eventFilters ? JSON.stringify(data.eventFilters) : null,
      customHeaders: data.customHeaders ? JSON.stringify(data.customHeaders) : null,
      payloadTemplate: data.payloadTemplate,
      isEnabled: data.isEnabled !== false,
      successCount: 0,
      failureCount: 0,
      createdBy,
      createdAt: now,
      updatedAt: now,
    }).returning();

    return this.mapToWebhookConfiguration(webhook);
  }

  // Update webhook
  static async updateWebhook(data: UpdateWebhookRequest): Promise<WebhookConfiguration | null> {
    const now = new Date();

    const updateData: any = {
      updatedAt: now,
    };

    // Only update provided fields
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.url !== undefined) updateData.url = data.url;
    if (data.method !== undefined) updateData.method = data.method;
    if (data.contentType !== undefined) updateData.contentType = data.contentType;
    if (data.authType !== undefined) updateData.authType = data.authType;
    if (data.authToken !== undefined) updateData.authToken = data.authToken;
    if (data.authUsername !== undefined) updateData.authUsername = data.authUsername;
    if (data.authPassword !== undefined) updateData.authPassword = data.authPassword;
    if (data.authHeaderName !== undefined) updateData.authHeaderName = data.authHeaderName;
    if (data.secret !== undefined) updateData.secret = data.secret;
    if (data.timeout !== undefined) updateData.timeout = data.timeout;
    if (data.retryAttempts !== undefined) updateData.retryAttempts = data.retryAttempts;
    if (data.retryDelay !== undefined) updateData.retryDelay = data.retryDelay;
    if (data.enabledEvents !== undefined) updateData.enabledEvents = JSON.stringify(data.enabledEvents);
    if (data.eventFilters !== undefined) updateData.eventFilters = data.eventFilters ? JSON.stringify(data.eventFilters) : null;
    if (data.customHeaders !== undefined) updateData.customHeaders = data.customHeaders ? JSON.stringify(data.customHeaders) : null;
    if (data.payloadTemplate !== undefined) updateData.payloadTemplate = data.payloadTemplate;
    if (data.isEnabled !== undefined) updateData.isEnabled = data.isEnabled;

    const [webhook] = await db.update(webhookConfigurations)
      .set(updateData)
      .where(eq(webhookConfigurations.id, data.id))
      .returning();

    return webhook ? this.mapToWebhookConfiguration(webhook) : null;
  }

  // Delete webhook
  static async deleteWebhook(id: number): Promise<boolean> {
    const result = await db.delete(webhookConfigurations)
      .where(eq(webhookConfigurations.id, id))
      .returning();

    return result.length > 0;
  }

  // Test webhook
  static async testWebhook(id: number): Promise<{ success: boolean; response?: any; error?: string }> {
    const webhook = await this.getWebhookById(id);
    if (!webhook) {
      return { success: false, error: 'Webhook not found' };
    }

    const testPayload = {
      event: 'webhook.test',
      timestamp: new Date().toISOString(),
      data: {
        message: 'This is a test webhook from EV Database',
        webhook_id: webhook.id,
        webhook_name: webhook.name,
      }
    };

    try {
      const response = await this.sendWebhook(webhook, testPayload);
      return { success: true, response };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Test webhook configuration (without saving)
  static async testWebhookConfig(config: any): Promise<{ success: boolean; response?: any; error?: string }> {
    // Create a temporary webhook configuration for testing
    const tempWebhook: WebhookConfiguration = {
      id: 0, // Temporary ID
      name: config.name || 'Test Webhook',
      description: config.description || '',
      url: config.url,
      method: config.method || 'POST',
      contentType: config.contentType || 'application/json',
      authType: config.authType || 'none',
      authToken: config.authToken || '',
      authUsername: config.authUsername || '',
      authPassword: config.authPassword || '',
      authHeaderName: config.authHeaderName || '',
      secret: config.secret || '',
      timeout: config.timeout || 30,
      retryAttempts: config.retryAttempts || 3,
      retryDelay: config.retryDelay || 5,
      enabledEvents: config.enabledEvents || [],
      eventFilters: config.eventFilters,
      customHeaders: config.customHeaders,
      payloadTemplate: config.payloadTemplate,
      isEnabled: true,
      successCount: 0,
      failureCount: 0,
      lastTriggered: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Determine template type and get appropriate test payload
    const templateId = config.templateId || detectTemplateFromUrl(config.url);
    let testPayload = getTestPayloadForTemplate(templateId);

    // If custom payload template is provided, use it
    if (config.payloadTemplate) {
      try {
        const variables = {
          event: 'webhook.test',
          timestamp: new Date().toISOString(),
          data: {
            message: 'This is a test webhook from EV Database',
            test_mode: true,
            webhook_name: tempWebhook.name,
          }
        };

        const customPayload = replaceTemplateVariables(config.payloadTemplate, variables);
        testPayload = JSON.parse(customPayload);
      } catch (error) {
        // Fall back to template default if custom template is invalid
        console.warn('Invalid payload template, using default:', error);
      }
    }

    try {
      const response = await this.sendWebhook(tempWebhook, testPayload);
      return { success: true, response };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Send webhook (used by notification system)
  static async sendWebhook(webhook: WebhookConfiguration, payload: any): Promise<any> {
    const headers: Record<string, string> = {
      'Content-Type': webhook.contentType,
      'User-Agent': 'EV-Database-Webhook/1.0',
    };

    // Add authentication
    if (webhook.authType === 'bearer' && webhook.authToken) {
      headers['Authorization'] = `Bearer ${webhook.authToken}`;
    } else if (webhook.authType === 'api_key' && webhook.authToken && webhook.authHeaderName) {
      headers[webhook.authHeaderName] = webhook.authToken;
    } else if (webhook.authType === 'basic' && webhook.authUsername && webhook.authPassword) {
      const credentials = Buffer.from(`${webhook.authUsername}:${webhook.authPassword}`).toString('base64');
      headers['Authorization'] = `Basic ${credentials}`;
    }

    // Add custom headers
    if (webhook.customHeaders) {
      Object.assign(headers, webhook.customHeaders);
    }

    // Prepare body
    let body: string;
    if (webhook.contentType === 'application/json') {
      body = JSON.stringify(payload);
    } else {
      body = new URLSearchParams(payload).toString();
    }

    // Add signature if secret is configured
    if (webhook.secret) {
      const signature = crypto.createHmac('sha256', webhook.secret).update(body).digest('hex');
      headers['X-Webhook-Signature'] = `sha256=${signature}`;
    }

    // Add timestamp
    headers['X-Webhook-Timestamp'] = Math.floor(Date.now() / 1000).toString();

    const response = await fetch(webhook.url, {
      method: webhook.method,
      headers,
      body,
      signal: AbortSignal.timeout(webhook.timeout * 1000),
    });

    if (!response.ok) {
      throw new Error(`Webhook failed: ${response.status} ${response.statusText}`);
    }

    return {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
    };
  }

  // Update webhook statistics
  static async updateWebhookStats(id: number, success: boolean): Promise<void> {
    const now = new Date();

    if (success) {
      await db.update(webhookConfigurations)
        .set({
          successCount: sql`success_count + 1`,
          lastTriggered: now,
          updatedAt: now,
        })
        .where(eq(webhookConfigurations.id, id));
    } else {
      await db.update(webhookConfigurations)
        .set({
          failureCount: sql`failure_count + 1`,
          updatedAt: now,
        })
        .where(eq(webhookConfigurations.id, id));
    }
  }

  // Map database row to WebhookConfiguration
  private static mapToWebhookConfiguration(row: any): WebhookConfiguration {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      url: row.url,
      method: row.method,
      contentType: row.contentType,
      authType: row.authType,
      authToken: row.authToken,
      authUsername: row.authUsername,
      authPassword: row.authPassword,
      authHeaderName: row.authHeaderName,
      secret: row.secret,
      timeout: row.timeout,
      retryAttempts: row.retryAttempts,
      retryDelay: row.retryDelay,
      enabledEvents: JSON.parse(row.enabledEvents || '[]'),
      eventFilters: row.eventFilters ? JSON.parse(row.eventFilters) : undefined,
      customHeaders: row.customHeaders ? JSON.parse(row.customHeaders) : undefined,
      payloadTemplate: row.payloadTemplate,
      isEnabled: row.isEnabled,
      lastTriggered: row.lastTriggered ? new Date(row.lastTriggered) : undefined,
      successCount: row.successCount,
      failureCount: row.failureCount,
      createdBy: row.createdBy,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    };
  }
}
