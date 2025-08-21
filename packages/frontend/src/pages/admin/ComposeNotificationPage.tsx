import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  createNotification,
  scheduleNotification,
  getAllUsers,
  CreateNotificationRequest,
  NOTIFICATION_TYPES,
  AVAILABLE_ROLES
} from '../../services/adminNotificationApi';

interface User {
  id: number;
  email: string;
  role: string;
}

const ComposeNotificationPage: React.FC = () => {
  const [formData, setFormData] = useState<CreateNotificationRequest>({
    title: '',
    content: '',
    notificationType: 'info',
    targetAudience: 'all_users',
    targetRoles: [],
    targetUserIds: [],
    scheduledAt: '',
    expiresAt: '',
    actionUrl: '',
    metadata: {},
  });

  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isScheduled, setIsScheduled] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const allUsers = await getAllUsers();
      setUsers(allUsers);
    } catch (err) {
      console.error('Failed to load users:', err);
    }
  };

  const handleInputChange = (field: keyof CreateNotificationRequest, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
    setSuccess(null);
  };

  const handleRoleToggle = (role: string) => {
    const currentRoles = formData.targetRoles || [];
    const newRoles = currentRoles.includes(role)
      ? currentRoles.filter(r => r !== role)
      : [...currentRoles, role];
    handleInputChange('targetRoles', newRoles);
  };

  const handleUserToggle = (userId: number) => {
    const currentUsers = formData.targetUserIds || [];
    const newUsers = currentUsers.includes(userId)
      ? currentUsers.filter(id => id !== userId)
      : [...currentUsers, userId];
    handleInputChange('targetUserIds', newUsers);
  };

  const validateForm = (): boolean => {
    if (!formData.title.trim()) {
      setError('Title is required');
      return false;
    }
    if (!formData.content.trim()) {
      setError('Content is required');
      return false;
    }
    if (formData.targetAudience === 'specific_roles' && (!formData.targetRoles || formData.targetRoles.length === 0)) {
      setError('Please select at least one role');
      return false;
    }
    if (formData.targetAudience === 'individual_users' && (!formData.targetUserIds || formData.targetUserIds.length === 0)) {
      setError('Please select at least one user');
      return false;
    }
    if (isScheduled && !formData.scheduledAt) {
      setError('Scheduled date and time is required');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      setIsLoading(true);
      setError(null);
      setSuccess(null);

      const submitData = {
        ...formData,
        scheduledAt: isScheduled ? formData.scheduledAt : undefined,
        expiresAt: formData.expiresAt || undefined,
        actionUrl: formData.actionUrl || undefined,
      };

      if (isScheduled) {
        const result = await scheduleNotification(submitData);
        setSuccess(`Notification scheduled successfully! ID: ${result.scheduledId}`);
      } else {
        const result = await createNotification(submitData);
        setSuccess(`Notification sent successfully to ${result.count} users!`);
      }

      // Reset form
      setFormData({
        title: '',
        content: '',
        notificationType: 'info',
        targetAudience: 'all_users',
        targetRoles: [],
        targetUserIds: [],
        scheduledAt: '',
        expiresAt: '',
        actionUrl: '',
        metadata: {},
      });
      setIsScheduled(false);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send notification');
    } finally {
      setIsLoading(false);
    }
  };

  const getTargetSummary = () => {
    switch (formData.targetAudience) {
      case 'all_users':
        return `All users (${users.length} users)`;
      case 'specific_roles':
        const roleCount = users.filter(u => formData.targetRoles?.includes(u.role)).length;
        return `Users with roles: ${formData.targetRoles?.join(', ')} (${roleCount} users)`;
      case 'individual_users':
        return `${formData.targetUserIds?.length || 0} selected users`;
      default:
        return '';
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Compose Notification</h1>
        <button
          onClick={() => navigate('/admin/notifications')}
          className="btn btn-ghost btn-sm"
        >
          ← Back to Management
        </button>
      </div>

      {error && (
        <div className="alert alert-error mb-4">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="btn btn-ghost btn-xs">✕</button>
        </div>
      )}

      {success && (
        <div className="alert alert-success mb-4">
          <span>{success}</span>
          <button onClick={() => setSuccess(null)} className="btn btn-ghost btn-xs">✕</button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card bg-base-100 shadow-sm border border-base-200">
          <div className="card-body">
            <h2 className="card-title mb-4">Notification Details</h2>

            {/* Title */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Title *</span>
              </label>
              <input
                type="text"
                className="input input-bordered"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="Enter notification title"
                maxLength={200}
                required
              />
              <div className="label">
                <span className="label-text-alt">{formData.title.length}/200 characters</span>
              </div>
            </div>

            {/* Content */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Content *</span>
              </label>
              <textarea
                className="textarea textarea-bordered h-32"
                value={formData.content}
                onChange={(e) => handleInputChange('content', e.target.value)}
                placeholder="Enter notification content"
                maxLength={2000}
                required
              />
              <div className="label">
                <span className="label-text-alt">{formData.content.length}/2000 characters</span>
              </div>
            </div>

            {/* Notification Type */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Type</span>
              </label>
              <select
                className="select select-bordered"
                value={formData.notificationType}
                onChange={(e) => handleInputChange('notificationType', e.target.value)}
              >
                {NOTIFICATION_TYPES.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Action URL */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Action URL (Optional)</span>
              </label>
              <input
                type="url"
                className="input input-bordered"
                value={formData.actionUrl}
                onChange={(e) => handleInputChange('actionUrl', e.target.value)}
                placeholder="https://example.com/action"
              />
              <div className="label">
                <span className="label-text-alt">URL to navigate to when notification is clicked</span>
              </div>
            </div>
          </div>
        </div>

        {/* Target Audience */}
        <div className="card bg-base-100 shadow-sm border border-base-200">
          <div className="card-body">
            <h2 className="card-title mb-4">Target Audience</h2>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Send to</span>
              </label>
              <div className="space-y-2">
                <label className="label cursor-pointer justify-start gap-3">
                  <input
                    type="radio"
                    name="targetAudience"
                    className="radio"
                    checked={formData.targetAudience === 'all_users'}
                    onChange={() => handleInputChange('targetAudience', 'all_users')}
                  />
                  <span className="label-text">All Users</span>
                </label>
                <label className="label cursor-pointer justify-start gap-3">
                  <input
                    type="radio"
                    name="targetAudience"
                    className="radio"
                    checked={formData.targetAudience === 'specific_roles'}
                    onChange={() => handleInputChange('targetAudience', 'specific_roles')}
                  />
                  <span className="label-text">Specific Roles</span>
                </label>
                <label className="label cursor-pointer justify-start gap-3">
                  <input
                    type="radio"
                    name="targetAudience"
                    className="radio"
                    checked={formData.targetAudience === 'individual_users'}
                    onChange={() => handleInputChange('targetAudience', 'individual_users')}
                  />
                  <span className="label-text">Individual Users</span>
                </label>
              </div>
            </div>

            {/* Role Selection */}
            {formData.targetAudience === 'specific_roles' && (
              <div className="form-control mt-4">
                <label className="label">
                  <span className="label-text font-semibold">Select Roles</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_ROLES.map(role => (
                    <label key={role} className="label cursor-pointer justify-start gap-2">
                      <input
                        type="checkbox"
                        className="checkbox checkbox-sm"
                        checked={formData.targetRoles?.includes(role) || false}
                        onChange={() => handleRoleToggle(role)}
                      />
                      <span className="label-text">{role}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* User Selection */}
            {formData.targetAudience === 'individual_users' && (
              <div className="form-control mt-4">
                <label className="label">
                  <span className="label-text font-semibold">Select Users</span>
                </label>
                <div className="max-h-48 overflow-y-auto border border-base-300 rounded-lg p-3">
                  {users.map(user => (
                    <label key={user.id} className="label cursor-pointer justify-start gap-2">
                      <input
                        type="checkbox"
                        className="checkbox checkbox-sm"
                        checked={formData.targetUserIds?.includes(user.id) || false}
                        onChange={() => handleUserToggle(user.id)}
                      />
                      <span className="label-text">{user.email} ({user.role})</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="alert alert-info mt-4">
              <span>📊 Target: {getTargetSummary()}</span>
            </div>
          </div>
        </div>

        {/* Scheduling */}
        <div className="card bg-base-100 shadow-sm border border-base-200">
          <div className="card-body">
            <h2 className="card-title mb-4">Scheduling</h2>

            <div className="form-control">
              <label className="label cursor-pointer justify-start gap-3">
                <input
                  type="checkbox"
                  className="checkbox"
                  checked={isScheduled}
                  onChange={(e) => setIsScheduled(e.target.checked)}
                />
                <span className="label-text font-semibold">Schedule for later</span>
              </label>
            </div>

            {isScheduled && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold">Scheduled Date & Time *</span>
                  </label>
                  <input
                    type="datetime-local"
                    className="input input-bordered"
                    value={formData.scheduledAt}
                    onChange={(e) => handleInputChange('scheduledAt', e.target.value)}
                    min={new Date().toISOString().slice(0, 16)}
                    required={isScheduled}
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold">Expires At (Optional)</span>
                  </label>
                  <input
                    type="datetime-local"
                    className="input input-bordered"
                    value={formData.expiresAt}
                    onChange={(e) => handleInputChange('expiresAt', e.target.value)}
                    min={formData.scheduledAt || new Date().toISOString().slice(0, 16)}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate('/admin/notifications')}
            className="btn btn-ghost"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="loading loading-spinner loading-sm"></span>
            ) : isScheduled ? (
              '📅 Schedule Notification'
            ) : (
              '📤 Send Now'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ComposeNotificationPage;
