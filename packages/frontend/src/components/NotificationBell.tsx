import React, { useState, useRef, useEffect } from 'react';
import { useNotifications } from '../contexts/NotificationContext';
import { InAppNotification } from '../services/api';
import { useNavigate } from 'react-router-dom';

interface NotificationItemProps {
  notification: InAppNotification;
  onMarkAsRead: (id: number) => void;
  onDelete: (id: number) => void;
  onNavigate: (url: string) => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onMarkAsRead,
  onDelete,
  onNavigate
}) => {
  const handleClick = () => {
    if (!notification.isRead) {
      onMarkAsRead(notification.id);
    }

    if (notification.actionUrl) {
      // Handle different types of URLs
      if (notification.actionUrl.startsWith('http')) {
        // External URL - open in new tab
        window.open(notification.actionUrl, '_blank', 'noopener,noreferrer');
      } else {
        // Internal URL - navigate within app
        onNavigate(notification.actionUrl);
      }
    } else {
      // Default navigation based on event type
      const defaultUrl = getDefaultNavigationUrl(notification.eventType);
      if (defaultUrl) {
        onNavigate(defaultUrl);
      }
    }
  };

  const getDefaultNavigationUrl = (eventType: string): string | null => {
    switch (eventType) {
      case 'contribution.approved':
      case 'contribution.rejected':
      case 'contribution.submitted':
      case 'contribution.vote_received':
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
  };

  const getEventTypeIcon = (eventType: string) => {
    switch (eventType) {
      // Contribution events
      case 'contribution.approved':
        return '✅';
      case 'contribution.rejected':
        return '❌';
      case 'contribution.submitted':
        return '📝';
      case 'contribution.vote_received':
        return '👍';

      // User events
      case 'user.registered':
      case 'user.welcome':
        return '👋';
      case 'user.low_credits':
        return '⚠️';
      case 'user.credit_topup':
        return '💰';
      case 'user.password_reset':
        return '🔑';
      case 'user.account_updated':
        return '👤';

      // System events
      case 'system.announcement':
        return '📢';
      case 'system.maintenance':
        return '🔧';
      case 'system.changelog':
        return '📋';

      // Admin events
      case 'admin.notification':
        return '📬';

      default:
        return '🔔';
    }
  };

  const getEventTypeColor = (eventType: string) => {
    switch (eventType) {
      // Contribution events
      case 'contribution.approved':
        return 'text-success';
      case 'contribution.rejected':
        return 'text-error';
      case 'contribution.submitted':
        return 'text-info';
      case 'contribution.vote_received':
        return 'text-primary';

      // User events
      case 'user.registered':
      case 'user.welcome':
        return 'text-primary';
      case 'user.low_credits':
        return 'text-warning';
      case 'user.credit_topup':
        return 'text-success';
      case 'user.password_reset':
      case 'user.account_updated':
        return 'text-info';

      // System events
      case 'system.announcement':
        return 'text-warning';
      case 'system.maintenance':
        return 'text-error';
      case 'system.changelog':
        return 'text-accent';

      // Admin events
      case 'admin.notification':
        return 'text-secondary';

      default:
        return 'text-base-content';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  const getPriorityIndicator = (priority?: string) => {
    switch (priority) {
      case 'urgent':
        return <div className="w-2 h-2 bg-error rounded-full animate-pulse" title="Urgent"></div>;
      case 'high':
        return <div className="w-2 h-2 bg-warning rounded-full" title="High Priority"></div>;
      case 'normal':
        return null;
      case 'low':
        return <div className="w-2 h-2 bg-base-300 rounded-full" title="Low Priority"></div>;
      default:
        return null;
    }
  };

  const getCategoryBadge = (category?: string) => {
    if (!category || category === 'system') return null;

    const categoryConfig = {
      contribution: { label: 'Contribution', class: 'badge-success' },
      user: { label: 'Account', class: 'badge-info' },
      admin: { label: 'Admin', class: 'badge-secondary' },
      changelog: { label: 'Update', class: 'badge-accent' },
      maintenance: { label: 'Maintenance', class: 'badge-error' },
    };

    const config = categoryConfig[category as keyof typeof categoryConfig];
    if (!config) return null;

    return (
      <div className={`badge badge-xs ${config.class}`}>
        {config.label}
      </div>
    );
  };

  return (
    <div
      className={`group p-3 border-b border-base-200 hover:bg-base-100 cursor-pointer transition-colors ${
        !notification.isRead ? 'bg-primary/5 border-l-4 border-l-primary' : ''
      }`}
      onClick={handleClick}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className={`text-lg ${getEventTypeColor(notification.eventType)}`}>
            {getEventTypeIcon(notification.eventType)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className={`text-sm font-medium truncate ${
                !notification.isRead ? 'text-base-content' : 'text-base-content/70'
              }`}>
                {notification.title}
              </h4>
              <div className="flex items-center gap-1">
                {getPriorityIndicator((notification as any).priority)}
                {getCategoryBadge((notification as any).category)}
                {!notification.isRead && (
                  <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0"></div>
                )}
              </div>
            </div>
            <p className={`text-xs line-clamp-2 ${
              !notification.isRead ? 'text-base-content/80' : 'text-base-content/60'
            }`}>
              {notification.content}
            </p>
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-base-content/50">
                {formatTimeAgo(notification.createdAt)}
              </span>
              {notification.actionUrl && (
                <span className="text-xs text-primary">Click to view →</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {!notification.isRead && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMarkAsRead(notification.id);
              }}
              className="btn btn-ghost btn-xs text-primary hover:bg-primary/10"
              title="Mark as read"
            >
              ✓
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(notification.id);
            }}
            className="btn btn-ghost btn-xs text-error hover:bg-error/10"
            title="Delete"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
};

const NotificationBell: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const {
    notifications,
    unreadCount,
    isLoading,
    error,
    refreshNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotificationById,
    clearAll,
  } = useNotifications();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      refreshNotifications();
    }
  };

  const handleNavigate = (url: string) => {
    setIsOpen(false);
    navigate(url);
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  const handleClearAll = async () => {
    if (confirm('Are you sure you want to clear all notifications? This action cannot be undone.')) {
      await clearAll();
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Notification Bell Button */}
      <button
        onClick={handleToggle}
        className="btn btn-ghost btn-circle relative"
        aria-label="Notifications"
      >
        <div className="indicator">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
          {unreadCount > 0 && (
            <span className="badge badge-xs badge-primary indicator-item">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
      </button>

      {/* Notification Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-base-100 rounded-lg shadow-lg border border-base-200 z-50">
          {/* Header */}
          <div className="p-4 border-b border-base-200">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-base-content">Notifications</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="btn btn-ghost btn-xs text-primary"
                  >
                    Mark all read
                  </button>
                )}
                <div className="dropdown dropdown-end">
                  <div tabIndex={0} role="button" className="btn btn-ghost btn-xs">
                    ⋮
                  </div>
                  <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-32">
                    <li>
                      <button onClick={() => navigate('/notifications')} className="text-xs">
                        View all
                      </button>
                    </li>
                    <li>
                      <button onClick={handleClearAll} className="text-xs text-error">
                        Clear all
                      </button>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center">
                <span className="loading loading-spinner loading-sm"></span>
                <p className="text-sm text-base-content/60 mt-2">Loading notifications...</p>
              </div>
            ) : error ? (
              <div className="p-4 text-center">
                <p className="text-sm text-error">{error}</p>
                <button
                  onClick={refreshNotifications}
                  className="btn btn-ghost btn-xs mt-2"
                >
                  Try again
                </button>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <div className="text-4xl mb-2">🔔</div>
                <p className="text-sm text-base-content/60">No notifications yet</p>
                <p className="text-xs text-base-content/40 mt-1">
                  You'll see updates about your contributions here
                </p>
              </div>
            ) : (
              <div>
                {notifications.slice(0, 10).map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onMarkAsRead={markAsRead}
                    onDelete={deleteNotificationById}
                    onNavigate={handleNavigate}
                  />
                ))}
                {notifications.length > 10 && (
                  <div className="p-3 text-center border-t border-base-200">
                    <button
                      onClick={() => navigate('/notifications')}
                      className="btn btn-ghost btn-sm text-primary"
                    >
                      View all {notifications.length} notifications
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
