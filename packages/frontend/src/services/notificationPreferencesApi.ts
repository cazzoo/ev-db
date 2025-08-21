// Get auth token from localStorage
const getAuthToken = (): string => {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('No authentication token found');
  }
  return token;
};

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Types for notification preferences
export interface NotificationPreference {
  id: number;
  userId: number;
  channel: 'EMAIL' | 'WEBHOOK' | 'PUSH' | 'SMS' | 'IN_APP';
  eventType: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdatePreferenceRequest {
  channel: 'EMAIL' | 'WEBHOOK' | 'PUSH' | 'SMS' | 'IN_APP';
  eventType: string;
  enabled: boolean;
}

export interface PreferenceGroup {
  category: string;
  label: string;
  description: string;
  eventTypes: Array<{
    eventType: string;
    label: string;
    description: string;
    defaultEnabled: boolean;
  }>;
}

// Helper function to handle API responses
async function handleApiResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
  }
  return response.json();
}

// Get user's notification preferences
export const getNotificationPreferences = async (): Promise<NotificationPreference[]> => {
  const token = getAuthToken();
  const response = await fetch(`${API_URL}/users/notification-preferences`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  return handleApiResponse(response);
};

// Update notification preference
export const updateNotificationPreference = async (data: UpdatePreferenceRequest): Promise<{ message: string }> => {
  const token = getAuthToken();
  const response = await fetch(`${API_URL}/users/notification-preferences`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  return handleApiResponse(response);
};

// Batch update notification preferences
export const batchUpdatePreferences = async (preferences: UpdatePreferenceRequest[]): Promise<{ message: string }> => {
  const token = getAuthToken();
  const response = await fetch(`${API_URL}/users/notification-preferences/batch`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ preferences }),
  });
  return handleApiResponse(response);
};

// Reset preferences to defaults
export const resetPreferencesToDefaults = async (): Promise<{ message: string }> => {
  const token = getAuthToken();
  const response = await fetch(`${API_URL}/users/notification-preferences/reset`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  return handleApiResponse(response);
};

// Available notification channels
export const NOTIFICATION_CHANNELS = [
  { value: 'IN_APP', label: 'In-App Notifications', icon: '🔔', description: 'Notifications within the application' },
  { value: 'EMAIL', label: 'Email', icon: '📧', description: 'Email notifications to your registered address' },
  { value: 'WEBHOOK', label: 'Webhook', icon: '🔗', description: 'HTTP webhooks to external services' },
  { value: 'PUSH', label: 'Push Notifications', icon: '📱', description: 'Browser push notifications' },
  { value: 'SMS', label: 'SMS', icon: '💬', description: 'Text message notifications' },
] as const;

// Predefined preference groups
export const PREFERENCE_GROUPS: PreferenceGroup[] = [
  {
    category: 'contribution',
    label: 'Contribution Updates',
    description: 'Notifications about your vehicle data contributions',
    eventTypes: [
      {
        eventType: 'contribution.approved',
        label: 'Contribution Approved',
        description: 'When your contribution is approved and published',
        defaultEnabled: true,
      },
      {
        eventType: 'contribution.rejected',
        label: 'Contribution Rejected',
        description: 'When your contribution needs revision',
        defaultEnabled: true,
      },
      {
        eventType: 'contribution.submitted',
        label: 'Contribution Submitted',
        description: 'Confirmation when you submit a contribution',
        defaultEnabled: false,
      },
      {
        eventType: 'contribution.vote_received',
        label: 'Vote Received',
        description: 'When someone votes on your contribution',
        defaultEnabled: true,
      },
    ],
  },
  {
    category: 'user',
    label: 'Account & Credits',
    description: 'Notifications about your account and credit balance',
    eventTypes: [
      {
        eventType: 'user.welcome',
        label: 'Welcome Message',
        description: 'Welcome message for new users',
        defaultEnabled: true,
      },
      {
        eventType: 'user.low_credits',
        label: 'Low Credits Warning',
        description: 'When your credit balance is running low',
        defaultEnabled: true,
      },
      {
        eventType: 'user.credit_topup',
        label: 'Credits Added',
        description: 'When credits are added to your account',
        defaultEnabled: true,
      },
      {
        eventType: 'user.password_reset',
        label: 'Password Reset',
        description: 'Password reset confirmations and links',
        defaultEnabled: true,
      },
      {
        eventType: 'user.account_updated',
        label: 'Account Updated',
        description: 'When your account information is changed',
        defaultEnabled: false,
      },
    ],
  },
  {
    category: 'system',
    label: 'System Updates',
    description: 'Important system announcements and updates',
    eventTypes: [
      {
        eventType: 'system.announcement',
        label: 'System Announcements',
        description: 'Important announcements from the team',
        defaultEnabled: true,
      },
      {
        eventType: 'system.maintenance',
        label: 'Maintenance Alerts',
        description: 'Scheduled maintenance notifications',
        defaultEnabled: true,
      },
      {
        eventType: 'system.changelog',
        label: 'New Features',
        description: 'Updates about new features and improvements',
        defaultEnabled: false,
      },
    ],
  },
  {
    category: 'admin',
    label: 'Administrative',
    description: 'Administrative notifications and updates',
    eventTypes: [
      {
        eventType: 'admin.notification',
        label: 'Admin Messages',
        description: 'Direct messages from administrators',
        defaultEnabled: true,
      },
    ],
  },
];

// Helper functions
export const getPreferenceGroup = (category: string): PreferenceGroup | undefined => {
  return PREFERENCE_GROUPS.find(group => group.category === category);
};

export const getEventTypeInfo = (eventType: string) => {
  for (const group of PREFERENCE_GROUPS) {
    const eventInfo = group.eventTypes.find(et => et.eventType === eventType);
    if (eventInfo) {
      return {
        ...eventInfo,
        category: group.category,
        categoryLabel: group.label,
      };
    }
  }
  return null;
};

export const getChannelInfo = (channel: string) => {
  return NOTIFICATION_CHANNELS.find(ch => ch.value === channel);
};

export const isChannelAvailable = (channel: string): boolean => {
  // For now, only IN_APP and EMAIL are fully implemented
  return ['IN_APP', 'EMAIL'].includes(channel);
};

export const getDefaultPreferences = (): UpdatePreferenceRequest[] => {
  const preferences: UpdatePreferenceRequest[] = [];

  for (const group of PREFERENCE_GROUPS) {
    for (const eventType of group.eventTypes) {
      // Create default preferences for available channels
      for (const channel of NOTIFICATION_CHANNELS) {
        if (isChannelAvailable(channel.value)) {
          preferences.push({
            channel: channel.value as any,
            eventType: eventType.eventType,
            enabled: eventType.defaultEnabled,
          });
        }
      }
    }
  }

  return preferences;
};
