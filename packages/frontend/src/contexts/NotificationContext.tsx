import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  InAppNotification,
  fetchInAppNotifications,
  fetchUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  clearAllNotifications
} from '../services/api';

interface NotificationContextType {
  notifications: InAppNotification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  isOnline: boolean;
  lastUpdate: Date | null;

  // Actions
  refreshNotifications: () => Promise<void>;
  refreshUnreadCount: () => Promise<void>;
  markAsRead: (notificationId: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotificationById: (notificationId: number) => Promise<void>;
  clearAll: () => Promise<void>;

  // Polling control
  startPolling: () => void;
  stopPolling: () => void;
  isPolling: boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: React.ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Refresh notifications
  const refreshNotifications = useCallback(async () => {
    if (!isOnline) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const response = await fetchInAppNotifications(1, 20, false);
      setNotifications(response.notifications);
      setLastUpdate(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch notifications');
      console.error('Error fetching notifications:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isOnline]);

  // Refresh unread count
  const refreshUnreadCount = useCallback(async () => {
    if (!isOnline) {
      return;
    }

    try {
      const response = await fetchUnreadNotificationCount();
      setUnreadCount(response.unreadCount);
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Error fetching unread count:', err);
    }
  }, [isOnline]);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: number) => {
    try {
      await markNotificationAsRead(notificationId);

      // Update local state
      setNotifications(prev =>
        prev.map(notification =>
          notification.id === notificationId
            ? { ...notification, isRead: true, readAt: new Date().toISOString() }
            : notification
        )
      );

      // Update unread count
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark notification as read');
      console.error('Error marking notification as read:', err);
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      await markAllNotificationsAsRead();

      // Update local state
      setNotifications(prev =>
        prev.map(notification => ({
          ...notification,
          isRead: true,
          readAt: new Date().toISOString()
        }))
      );

      setUnreadCount(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark all notifications as read');
      console.error('Error marking all notifications as read:', err);
    }
  }, []);

  // Delete notification
  const deleteNotificationById = useCallback(async (notificationId: number) => {
    try {
      await deleteNotification(notificationId);

      // Update local state
      const deletedNotification = notifications.find(n => n.id === notificationId);
      setNotifications(prev => prev.filter(notification => notification.id !== notificationId));

      // Update unread count if the deleted notification was unread
      if (deletedNotification && !deletedNotification.isRead) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete notification');
      console.error('Error deleting notification:', err);
    }
  }, [notifications]);

  // Clear all notifications
  const clearAll = useCallback(async () => {
    try {
      await clearAllNotifications();
      setNotifications([]);
      setUnreadCount(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear all notifications');
      console.error('Error clearing all notifications:', err);
    }
  }, []);

  // Start polling for new notifications
  const startPolling = useCallback(() => {
    if (pollingInterval || !isOnline) return; // Already polling or offline

    setIsPolling(true);
    const interval = setInterval(() => {
      if (isOnline) {
        refreshUnreadCount();
        // Only refresh full notifications if we have fewer than 5 to avoid too much data transfer
        if (notifications.length < 5) {
          refreshNotifications();
        }
      }
    }, 30000); // Poll every 30 seconds

    setPollingInterval(interval);
  }, [pollingInterval, isOnline, refreshUnreadCount, refreshNotifications, notifications.length]);

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
      setIsPolling(false);
    }
  }, [pollingInterval]);

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setError(null);
      // Refresh data when coming back online
      refreshNotifications();
      refreshUnreadCount();
      // Restart polling if it was stopped
      if (!pollingInterval) {
        startPolling();
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setError('You are currently offline. Notifications will update when connection is restored.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [refreshNotifications, refreshUnreadCount, startPolling, pollingInterval]);

  // Initial load and cleanup
  useEffect(() => {
    if (isOnline) {
      refreshNotifications();
      refreshUnreadCount();
    }

    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [isOnline]);

  // Auto-start polling when component mounts
  useEffect(() => {
    startPolling();

    return () => {
      stopPolling();
    };
  }, [startPolling, stopPolling]);

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    isLoading,
    error,
    isOnline,
    lastUpdate,
    refreshNotifications,
    refreshUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotificationById,
    clearAll,
    startPolling,
    stopPolling,
    isPolling,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
