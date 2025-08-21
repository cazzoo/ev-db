import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getScheduledNotifications,
  getNotificationAnalytics,
  cancelScheduledNotification,
  processScheduledNotifications,
  ScheduledNotification,
  NotificationAnalytics,
  NOTIFICATION_TYPES
} from '../../services/adminNotificationApi';

const NotificationManagementPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'compose' | 'scheduled' | 'analytics' | 'templates'>('compose');
  const [scheduledNotifications, setScheduledNotifications] = useState<ScheduledNotification[]>([]);
  const [analytics, setAnalytics] = useState<NotificationAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (activeTab === 'scheduled') {
      loadScheduledNotifications();
    } else if (activeTab === 'analytics') {
      loadAnalytics();
    }
  }, [activeTab]);

  const loadScheduledNotifications = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await getScheduledNotifications();
      setScheduledNotifications(result.notifications);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load scheduled notifications');
    } finally {
      setIsLoading(false);
    }
  };

  const loadAnalytics = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await getNotificationAnalytics();
      setAnalytics(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelNotification = async (id: number) => {
    if (!confirm('Are you sure you want to cancel this scheduled notification?')) {
      return;
    }

    try {
      await cancelScheduledNotification(id);
      await loadScheduledNotifications();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel notification');
    }
  };

  const handleProcessScheduled = async () => {
    try {
      setIsLoading(true);
      await processScheduledNotifications();
      await loadScheduledNotifications();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process scheduled notifications');
    } finally {
      setIsLoading(false);
    }
  };

  const getNotificationTypeColor = (type: string) => {
    const notificationType = NOTIFICATION_TYPES.find(t => t.value === type);
    return notificationType?.color || 'text-base-content';
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'pending': return 'badge-warning';
      case 'processing': return 'badge-info';
      case 'sent': return 'badge-success';
      case 'failed': return 'badge-error';
      case 'cancelled': return 'badge-neutral';
      default: return 'badge-ghost';
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Notification Management</h1>
        <div className="flex gap-2">
          <button
            onClick={() => navigate('/admin/notifications/compose')}
            className="btn btn-primary btn-sm"
          >
            📝 Compose Notification
          </button>
          <button
            onClick={() => navigate('/admin/notifications/templates')}
            className="btn btn-outline btn-sm"
          >
            📋 Manage Templates
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-error mb-4">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="btn btn-ghost btn-xs">✕</button>
        </div>
      )}

      {/* Tabs */}
      <div className="tabs tabs-bordered mb-6">
        <button
          className={`tab tab-lg ${activeTab === 'scheduled' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('scheduled')}
        >
          📅 Scheduled Notifications
        </button>
        <button
          className={`tab tab-lg ${activeTab === 'analytics' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          📊 Analytics
        </button>
      </div>

      {/* Scheduled Notifications Tab */}
      {activeTab === 'scheduled' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Scheduled Notifications</h2>
            <button
              onClick={handleProcessScheduled}
              className="btn btn-outline btn-sm"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="loading loading-spinner loading-sm"></span>
              ) : (
                '⚡ Process Now'
              )}
            </button>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <span className="loading loading-spinner loading-lg"></span>
            </div>
          ) : scheduledNotifications.length === 0 ? (
            <div className="card bg-base-100 shadow-sm border border-base-200">
              <div className="card-body text-center py-12">
                <div className="text-6xl mb-4">📅</div>
                <h3 className="text-xl font-semibold mb-2">No Scheduled Notifications</h3>
                <p className="text-base-content/60">
                  Create a scheduled notification to see it here.
                </p>
                <button
                  onClick={() => navigate('/admin/notifications/compose')}
                  className="btn btn-primary mt-4"
                >
                  Create Notification
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {scheduledNotifications.map((notification) => (
                <div key={notification.id} className="card bg-base-100 shadow-sm border border-base-200">
                  <div className="card-body">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold">{notification.title}</h3>
                          <div className={`badge ${getStatusBadgeClass(notification.status)}`}>
                            {notification.status}
                          </div>
                          <div className={`badge badge-outline ${getNotificationTypeColor(notification.notificationType)}`}>
                            {notification.notificationType}
                          </div>
                        </div>
                        <p className="text-sm text-base-content/70 mb-3 line-clamp-2">
                          {notification.content}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-base-content/60">
                          <span>📅 {new Date(notification.scheduledAt).toLocaleString()}</span>
                          <span>👥 {notification.targetAudience.replace('_', ' ')}</span>
                          {notification.sentCount > 0 && (
                            <span>✅ Sent to {notification.sentCount} users</span>
                          )}
                          {notification.failureCount > 0 && (
                            <span className="text-error">❌ {notification.failureCount} failures</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {notification.status === 'pending' && (
                          <button
                            onClick={() => handleCancelNotification(notification.id)}
                            className="btn btn-ghost btn-xs text-error"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Notification Analytics</h2>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <span className="loading loading-spinner loading-lg"></span>
            </div>
          ) : analytics ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="stat bg-base-100 shadow-sm border border-base-200 rounded-lg">
                <div className="stat-title">Total Sent</div>
                <div className="stat-value text-primary">{analytics.totalSent.toLocaleString()}</div>
                <div className="stat-desc">Notifications delivered</div>
              </div>

              <div className="stat bg-base-100 shadow-sm border border-base-200 rounded-lg">
                <div className="stat-title">Read Rate</div>
                <div className="stat-value text-success">{analytics.readRate.toFixed(1)}%</div>
                <div className="stat-desc">{analytics.totalRead.toLocaleString()} read</div>
              </div>

              <div className="stat bg-base-100 shadow-sm border border-base-200 rounded-lg">
                <div className="stat-title">Click Rate</div>
                <div className="stat-value text-info">{analytics.clickRate.toFixed(1)}%</div>
                <div className="stat-desc">{analytics.totalClicked.toLocaleString()} clicked</div>
              </div>

              <div className="stat bg-base-100 shadow-sm border border-base-200 rounded-lg">
                <div className="stat-title">Delivery Status</div>
                <div className="stat-value text-sm">
                  <div className="text-success">✅ {analytics.deliveryStats.delivered}</div>
                  <div className="text-error">❌ {analytics.deliveryStats.failed}</div>
                  <div className="text-warning">⏳ {analytics.deliveryStats.pending}</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="card bg-base-100 shadow-sm border border-base-200">
              <div className="card-body text-center py-12">
                <div className="text-6xl mb-4">📊</div>
                <h3 className="text-xl font-semibold mb-2">No Analytics Data</h3>
                <p className="text-base-content/60">
                  Send some notifications to see analytics here.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationManagementPage;
