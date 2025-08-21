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
  customHeaders?: any;
  payloadTemplate?: string;
  isEnabled: boolean;
  lastTriggered?: string;
  successCount: number;
  failureCount: number;
  createdAt: string;
  updatedAt: string;
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
  customHeaders?: any;
  payloadTemplate?: string;
  isEnabled?: boolean;
}

export interface UpdateWebhookRequest extends Partial<CreateWebhookRequest> {
  id: number;
}

export interface WebhookTestResult {
  success: boolean;
  response?: any;
  error?: string;
}

const API_BASE = '/api/admin/webhooks';

// Frontend secret header to identify legitimate frontend requests
const FRONTEND_SECRET = import.meta.env.VITE_FRONTEND_SECRET || 'frontend-secret-key-change-in-production-12345';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    'X-Frontend-Secret': FRONTEND_SECRET,
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
  };
};

export const webhookService = {
  async getAllWebhooks(): Promise<WebhookConfiguration[]> {
    // Add timestamp to prevent caching
    const url = `${API_BASE}?t=${Date.now()}`;
    const response = await fetch(url, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Webhook API error:', response.status, errorText);
      throw new Error(`Failed to load webhooks: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.webhooks || [];
  },

  async getWebhookById(id: number): Promise<WebhookConfiguration> {
    const response = await fetch(`${API_BASE}/${id}`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to load webhook');
    }

    const data = await response.json();
    return data.webhook;
  },

  async createWebhook(webhook: CreateWebhookRequest): Promise<WebhookConfiguration> {
    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(webhook),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to create webhook');
    }

    const data = await response.json();
    return data.webhook;
  },

  async updateWebhook(webhook: UpdateWebhookRequest): Promise<WebhookConfiguration> {
    const response = await fetch(`${API_BASE}/${webhook.id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(webhook),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to update webhook');
    }

    const data = await response.json();
    return data.webhook;
  },

  async deleteWebhook(id: number): Promise<void> {
    const response = await fetch(`${API_BASE}/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to delete webhook');
    }
  },

  async testWebhook(id: number): Promise<WebhookTestResult> {
    const response = await fetch(`${API_BASE}/${id}/test`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });

    const result = await response.json();
    return result;
  },

  async testWebhookConfig(config: Partial<CreateWebhookRequest>): Promise<WebhookTestResult> {
    const response = await fetch(`${API_BASE}/test-config`, {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(config),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to test webhook configuration');
    }

    return result;
  },
};

export const WEBHOOK_EVENT_TYPES = [
  { value: 'contribution.approved', label: 'Contribution Approved' },
  { value: 'contribution.rejected', label: 'Contribution Rejected' },
  { value: 'contribution.submitted', label: 'Contribution Submitted' },
  { value: 'user.registered', label: 'User Registered' },
  { value: 'system.announcement', label: 'System Announcement' },
  { value: 'system.maintenance', label: 'System Maintenance' },
] as const;

export const WEBHOOK_AUTH_TYPES = [
  { value: 'none', label: 'No Authentication' },
  { value: 'bearer', label: 'Bearer Token' },
  { value: 'basic', label: 'Basic Authentication' },
  { value: 'api_key', label: 'API Key Header' },
] as const;

export const WEBHOOK_HTTP_METHODS = [
  { value: 'POST', label: 'POST' },
  { value: 'PUT', label: 'PUT' },
  { value: 'PATCH', label: 'PATCH' },
] as const;

export const formatWebhookDate = (dateString: string): string => {
  return new Date(dateString).toLocaleString();
};

export const calculateSuccessRate = (webhook: WebhookConfiguration): string => {
  const total = webhook.successCount + webhook.failureCount;
  if (total === 0) return 'N/A';
  return `${Math.round((webhook.successCount / total) * 100)}%`;
};

export const getEventTypeLabel = (eventValue: string): string => {
  const eventType = WEBHOOK_EVENT_TYPES.find(e => e.value === eventValue);
  return eventType?.label || eventValue;
};
