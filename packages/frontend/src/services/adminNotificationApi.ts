// Frontend secret header to identify legitimate frontend requests
const FRONTEND_SECRET = import.meta.env.VITE_FRONTEND_SECRET || 'frontend-secret-key-change-in-production-12345';

// Get authentication headers for API requests
const getAuthHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('token');
  return {
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    'X-Frontend-Secret': FRONTEND_SECRET,
  };
};

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Types for admin notifications
export interface CreateNotificationRequest {
  title: string;
  content: string;
  notificationType: 'info' | 'success' | 'warning' | 'error' | 'announcement';
  targetAudience: 'all_users' | 'specific_roles' | 'individual_users';
  targetRoles?: string[];
  targetUserIds?: number[];
  scheduledAt?: string;
  expiresAt?: string;
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

export interface NotificationTemplate {
  id: number;
  name: string;
  description?: string;
  eventType: string;
  title: string;
  content: string;
  notificationType: 'info' | 'success' | 'warning' | 'error' | 'announcement';
  category: 'system' | 'contribution' | 'user' | 'admin' | 'changelog' | 'maintenance';
  variables?: string[];
  isActive: boolean;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduledNotification {
  id: number;
  title: string;
  content: string;
  notificationType: 'info' | 'success' | 'warning' | 'error' | 'announcement';
  targetAudience: 'all_users' | 'specific_roles' | 'individual_users';
  targetRoles?: string[];
  targetUserIds?: number[];
  scheduledAt: string;
  expiresAt?: string;
  status: 'pending' | 'processing' | 'sent' | 'failed' | 'cancelled';
  sentAt?: string;
  sentCount: number;
  failureCount: number;
  metadata?: any;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationAnalytics {
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

// Helper function to handle API responses
async function handleApiResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
  }
  return response.json();
}

// Create immediate notification
export const createNotification = async (data: CreateNotificationRequest): Promise<{ message: string; notificationIds: number[]; count: number }> => {
  const response = await fetch(`${API_URL}/admin/notifications/notifications`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(data),
  });
  return handleApiResponse(response);
};

// Schedule notification
export const scheduleNotification = async (data: CreateNotificationRequest): Promise<{ message: string; scheduledId: number }> => {
  const response = await fetch(`${API_URL}/admin/notifications/notifications/schedule`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(data),
  });
  return handleApiResponse(response);
};

// Get scheduled notifications
export const getScheduledNotifications = async (page = 1, limit = 20): Promise<{
  notifications: ScheduledNotification[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}> => {
  const response = await fetch(`${API_URL}/admin/notifications/notifications/scheduled?page=${page}&limit=${limit}`, {
    method: 'GET',
    headers: {
      ...getAuthHeaders(),
    },
  });
  return handleApiResponse(response);
};

// Cancel scheduled notification
export const cancelScheduledNotification = async (id: number): Promise<{ message: string }> => {
  const response = await fetch(`${API_URL}/admin/notifications/notifications/scheduled/${id}`, {
    method: 'DELETE',
    headers: {
      ...getAuthHeaders(),
    },
  });
  return handleApiResponse(response);
};

// Create notification template
export const createTemplate = async (data: CreateTemplateRequest): Promise<{ message: string; templateId: number }> => {
  const response = await fetch(`${API_URL}/admin/notifications/templates`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(data),
  });
  return handleApiResponse(response);
};

// Get notification templates
export const getTemplates = async (page = 1, limit = 20): Promise<{
  templates: NotificationTemplate[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}> => {
  const response = await fetch(`${API_URL}/admin/notifications/templates?page=${page}&limit=${limit}`, {
    method: 'GET',
    headers: {
      ...getAuthHeaders(),
    },
  });
  return handleApiResponse(response);
};

// Get notification analytics
export const getNotificationAnalytics = async (
  startDate?: string,
  endDate?: string,
  eventType?: string
): Promise<NotificationAnalytics> => {
  const params = new URLSearchParams();
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);
  if (eventType) params.append('event_type', eventType);

  const response = await fetch(`${API_URL}/admin/notifications/analytics?${params.toString()}`, {
    method: 'GET',
    headers: {
      ...getAuthHeaders(),
    },
  });
  return handleApiResponse(response);
};

// Track notification action
export const trackNotificationAction = async (
  notificationId: number,
  action: 'delivered' | 'read' | 'clicked' | 'dismissed' | 'expired',
  actionUrl?: string
): Promise<{ message: string }> => {
  const response = await fetch(`${API_URL}/admin/notifications/track/${notificationId}/${action}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ actionUrl }),
  });
  return handleApiResponse(response);
};

// Process scheduled notifications (manual trigger)
export const processScheduledNotifications = async (): Promise<{ message: string }> => {
  const response = await fetch(`${API_URL}/admin/notifications/process-scheduled`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(),
    },
  });
  return handleApiResponse(response);
};

// Get all users for targeting
export const getAllUsers = async (): Promise<Array<{ id: number; email: string; role: string }>> => {
  const response = await fetch(`${API_URL}/admin/users?limit=1000`, {
    method: 'GET',
    headers: {
      ...getAuthHeaders(),
    },
  });
  const data = await handleApiResponse(response);
  return data.users; // Extract users array from the response
};

// Available roles for targeting
export const AVAILABLE_ROLES = ['MEMBER', 'MODERATOR', 'ADMIN'];

// Available notification types
export const NOTIFICATION_TYPES = [
  { value: 'info', label: 'Info', color: 'text-info' },
  { value: 'success', label: 'Success', color: 'text-success' },
  { value: 'warning', label: 'Warning', color: 'text-warning' },
  { value: 'error', label: 'Error', color: 'text-error' },
  { value: 'announcement', label: 'Announcement', color: 'text-primary' },
];

// Available categories
export const NOTIFICATION_CATEGORIES = [
  { value: 'system', label: 'System' },
  { value: 'contribution', label: 'Contribution' },
  { value: 'user', label: 'User' },
  { value: 'admin', label: 'Admin' },
  { value: 'changelog', label: 'Changelog' },
  { value: 'maintenance', label: 'Maintenance' },
];
