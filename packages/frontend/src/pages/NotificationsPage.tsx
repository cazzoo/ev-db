import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  InAppNotification,
  fetchInAppNotifications,
  markNotificationAsRead,
  deleteNotification,
  markAllNotificationsAsRead,
  clearAllNotifications
} from '../services/api';
import { useNotifications } from '../contexts/NotificationContext';

const NotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterUnreadOnly, setFilterUnreadOnly] = useState(false);
  const [selectedEventType, setSelectedEventType] = useState<string>('');

  const navigate = useNavigate();
  const { refreshUnreadCount } = useNotifications();

  const eventTypes = [
    { value: '', label: 'All Types' },
    { value: 'contribution.approved', label: 'Contribution Approved' },
    { value: 'contribution.rejected', label: 'Contribution Rejected' },
    { value: 'contribution.submitted', label: 'Contribution Submitted' },
    { value: 'user.registered', label: 'User Registered' },
    { value: 'system.announcement', label: 'System Announcement' },
    { value: 'system.maintenance', label: 'System Maintenance' },
  ];

  const loadNotifications = async (page = 1) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetchInAppNotifications(page, 20, filterUnreadOnly);

      // Filter by event type if selected
      let filteredNotifications = response.notifications;
      if (selectedEventType) {
        filteredNotifications = response.notifications.filter(
          notification => notification.eventType === selectedEventType
        );
      }

      setNotifications(filteredNotifications);
      setTotalPages(response.pagination.totalPages);
      setCurrentPage(page);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notifications');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications(1);
  }, [filterUnreadOnly, selectedEventType]);

  const handleMarkAsRead = async (notificationId: number) => {
    try {
      await markNotificationAsRead(notificationId);
      setNotifications(prev =>
        prev.map(notification =>
          notification.id === notificationId
            ? { ...notification, isRead: true, readAt: new Date().toISOString() }
            : notification
        )
      );
      refreshUnreadCount();
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const handleDelete = async (notificationId: number) => {
    if (!confirm('Are you sure you want to delete this notification?')) return;

    try {
      await deleteNotification(notificationId);
      setNotifications(prev => prev.filter(notification => notification.id !== notificationId));
      refreshUnreadCount();
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications(prev =>
        prev.map(notification => ({
          ...notification,
          isRead: true,
          readAt: new Date().toISOString()
        }))
      );
      refreshUnreadCount();
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  const handleClearAll = async () => {
    if (!confirm('Are you sure you want to clear all notifications? This action cannot be undone.')) return;

    try {
      await clearAllNotifications();
      setNotifications([]);
      refreshUnreadCount();
    } catch (err) {
      console.error('Error clearing all notifications:', err);
    }
  };

  const handleNotificationClick = (notification: InAppNotification) => {
    if (!notification.isRead) {
      handleMarkAsRead(notification.id);
    }

    if (notification.actionUrl) {
      navigate(notification.actionUrl);
    }
  };

  const getEventTypeIcon = (eventType: string) => {
    switch (eventType) {
      // Contribution events
      case 'contribution.approved': return '✅';
      case 'contribution.rejected': return '❌';
      case 'contribution.submitted': return '📝';
      case 'contribution.vote_received': return '👍';

      // User events
      case 'user.registered':
      case 'user.welcome': return '👋';
      case 'user.low_credits': return '⚠️';
      case 'user.credit_topup': return '💰';
      case 'user.password_reset': return '🔑';
      case 'user.account_updated': return '👤';

      // System events
      case 'system.announcement': return '📢';
      case 'system.maintenance': return '🔧';
      case 'system.changelog': return '📋';

      // Admin events
      case 'admin.notification': return '📬';

      default: return '🔔';
    }
  };

  const getEventTypeColor = (eventType: string) => {
    switch (eventType) {
      // Contribution events
      case 'contribution.approved': return 'text-success';
      case 'contribution.rejected': return 'text-error';
      case 'contribution.submitted': return 'text-info';
      case 'contribution.vote_received': return 'text-primary';

      // User events
      case 'user.registered':
      case 'user.welcome': return 'text-primary';
      case 'user.low_credits': return 'text-warning';
      case 'user.credit_topup': return 'text-success';
      case 'user.password_reset':
      case 'user.account_updated': return 'text-info';

      // System events
      case 'system.announcement': return 'text-warning';
      case 'system.maintenance': return 'text-error';
      case 'system.changelog': return 'text-accent';

      // Admin events
      case 'admin.notification': return 'text-secondary';

      default: return 'text-base-content';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-base-content mb-2">Notifications</h1>
        <p className="text-base-content/70">
          Manage your notifications and stay updated with the latest activities
        </p>
      </div>

      {/* Filters and Actions */}
      <div className="card bg-base-100 shadow-sm border border-base-200 mb-6">
        <div className="card-body p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              {/* Filter by read status */}
              <div className="form-control">
                <label className="label cursor-pointer gap-2">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-primary checkbox-sm"
                    checked={filterUnreadOnly}
                    onChange={(e) => setFilterUnreadOnly(e.target.checked)}
                  />
                  <span className="label-text">Unread only</span>
                </label>
              </div>

              {/* Filter by event type */}
              <div className="form-control">
                <select
                  className="select select-bordered select-sm w-full max-w-xs"
                  value={selectedEventType}
                  onChange={(e) => setSelectedEventType(e.target.value)}
                >
                  {eventTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="btn btn-ghost btn-sm text-primary"
                >
                  Mark all read ({unreadCount})
                </button>
              )}
              <div className="dropdown dropdown-end">
                <div tabIndex={0} role="button" className="btn btn-ghost btn-sm">
                  Actions ⋮
                </div>
                <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-32">
                  <li>
                    <button onClick={() => loadNotifications(currentPage)} className="text-xs">
                      Refresh
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
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      ) : error ? (
        <div className="alert alert-error">
          <span>{error}</span>
          <button onClick={() => loadNotifications(currentPage)} className="btn btn-ghost btn-sm">
            Try again
          </button>
        </div>
      ) : notifications.length === 0 ? (
        <div className="card bg-base-100 shadow-sm border border-base-200">
          <div className="card-body text-center py-12">
            <div className="text-6xl mb-4">🔔</div>
            <h3 className="text-xl font-semibold mb-2">No notifications found</h3>
            <p className="text-base-content/60">
              {filterUnreadOnly
                ? "You don't have any unread notifications"
                : selectedEventType
                  ? `No notifications found for ${eventTypes.find(t => t.value === selectedEventType)?.label}`
                  : "You don't have any notifications yet"
              }
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Notifications List */}
          <div className="space-y-2">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`card bg-base-100 shadow-sm border hover:shadow-md transition-shadow cursor-pointer ${
                  !notification.isRead ? 'border-l-4 border-l-primary bg-primary/5' : 'border-base-200'
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="card-body p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`text-xl ${getEventTypeColor(notification.eventType)}`}>
                        {getEventTypeIcon(notification.eventType)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className={`font-medium truncate ${
                            !notification.isRead ? 'text-base-content' : 'text-base-content/70'
                          }`}>
                            {notification.title}
                          </h4>
                          {!notification.isRead && (
                            <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0"></div>
                          )}
                        </div>
                        <p className={`text-sm mb-2 ${
                          !notification.isRead ? 'text-base-content/80' : 'text-base-content/60'
                        }`}>
                          {notification.content}
                        </p>
                        <div className="flex items-center justify-between text-xs text-base-content/50">
                          <span>{formatDate(notification.createdAt)}</span>
                          {notification.actionUrl && (
                            <span className="text-primary">Click to view →</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="dropdown dropdown-end">
                      <div
                        tabIndex={0}
                        role="button"
                        className="btn btn-ghost btn-xs"
                        onClick={(e) => e.stopPropagation()}
                      >
                        ⋮
                      </div>
                      <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-32">
                        {!notification.isRead && (
                          <li>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarkAsRead(notification.id);
                              }}
                              className="text-xs"
                            >
                              Mark as read
                            </button>
                          </li>
                        )}
                        <li>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(notification.id);
                            }}
                            className="text-xs text-error"
                          >
                            Delete
                          </button>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center mt-8">
              <div className="join">
                <button
                  className="join-item btn btn-sm"
                  disabled={currentPage === 1}
                  onClick={() => loadNotifications(currentPage - 1)}
                >
                  «
                </button>
                <button className="join-item btn btn-sm">
                  Page {currentPage} of {totalPages}
                </button>
                <button
                  className="join-item btn btn-sm"
                  disabled={currentPage === totalPages}
                  onClick={() => loadNotifications(currentPage + 1)}
                >
                  »
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default NotificationsPage;
