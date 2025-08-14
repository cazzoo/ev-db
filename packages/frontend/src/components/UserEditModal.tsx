import { useState } from 'react';
import { updateAdminUser, AdminUser, deleteUserAvatar } from '../services/api';
import Avatar from './Avatar';
import { XMarkIcon, TrashIcon } from '@heroicons/react/24/outline';

interface UserEditModalProps {
  user: AdminUser;
  onClose: () => void;
  onUserUpdated: () => void;
}

const UserEditModal = ({ user, onClose, onUserUpdated }: UserEditModalProps) => {
  const [formData, setFormData] = useState({
    email: user.email,
    role: user.role,
    appCurrencyBalance: user.appCurrencyBalance.toString(),
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avatarRemoved, setAvatarRemoved] = useState(false);
  const [removingAvatar, setRemovingAvatar] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const updates: {
        email?: string;
        role?: string;
        appCurrencyBalance?: number;
        password?: string;
      } = {
        email: formData.email,
        role: formData.role,
        appCurrencyBalance: parseInt(formData.appCurrencyBalance),
      };

      // Only include password if it's provided
      if (formData.password.trim()) {
        updates.password = formData.password;
      }

      await updateAdminUser(user.id, updates);
      onUserUpdated();
    } catch (err) {
      setError((err as Error).message || 'Failed to update user');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleRemoveAvatar = async () => {
    if (!user.avatarUrl || removingAvatar) return;

    setRemovingAvatar(true);
    setError(null);

    try {
      await deleteUserAvatar(user.id);
      setAvatarRemoved(true);
      // Note: We don't call onUserUpdated here because we want to show the change
      // in the modal first, then refresh when the modal is closed
    } catch (err) {
      setError((err as Error).message || 'Failed to remove avatar');
    } finally {
      setRemovingAvatar(false);
    }
  };

  const handleClose = () => {
    // If avatar was removed, refresh the user list
    if (avatarRemoved) {
      onUserUpdated();
    }
    onClose();
  };

  return (
    <div className="modal modal-open">
      <div className="modal-box w-11/12 max-w-2xl">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-lg">Edit User</h3>
          <button
            className="btn btn-sm btn-circle btn-ghost"
            onClick={handleClose}
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="alert alert-error mb-4">
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* User Info Header */}
          <div className="flex items-center gap-4 mb-6 p-4 bg-base-200 rounded-lg">
            <div className="relative">
              <Avatar
                user={avatarRemoved ? { ...user, avatarUrl: null } : user}
                size="lg"
              />
              {user.avatarUrl && !avatarRemoved && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  disabled={removingAvatar}
                  className="absolute -top-2 -right-2 btn btn-circle btn-xs btn-error"
                  title="Remove avatar"
                >
                  {removingAvatar ? (
                    <span className="loading loading-spinner loading-xs"></span>
                  ) : (
                    <TrashIcon className="h-3 w-3" />
                  )}
                </button>
              )}
            </div>
            <div className="flex-1">
              <div className="font-semibold">User ID: {user.id}</div>
              <div className="text-sm text-base-content/60">
                Current Role: <span className={`badge badge-sm ${
                  user.role === 'ADMIN' ? 'badge-error' :
                  user.role === 'MODERATOR' ? 'badge-warning' :
                  'badge-info'
                }`}>
                  {user.role}
                </span>
              </div>
              {avatarRemoved && (
                <div className="text-sm text-success mt-1">
                  ✓ Avatar removed successfully
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Email */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">Email Address</span>
              </label>
              <input
                type="email"
                className="input input-bordered"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                required
              />
            </div>

            {/* Role */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">Role</span>
              </label>
              <select
                className="select select-bordered"
                value={formData.role}
                onChange={(e) => handleInputChange('role', e.target.value)}
                required
              >
                <option value="MEMBER">Member</option>
                <option value="MODERATOR">Moderator</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>

            {/* App Currency Balance */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">App Currency Balance</span>
              </label>
              <input
                type="number"
                className="input input-bordered"
                value={formData.appCurrencyBalance}
                onChange={(e) => handleInputChange('appCurrencyBalance', e.target.value)}
                min="0"
                required
              />
            </div>

            {/* Password */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">New Password</span>
                <span className="label-text-alt">Leave empty to keep current</span>
              </label>
              <input
                type="password"
                className="input input-bordered"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                placeholder="Enter new password..."
              />
            </div>
          </div>

          {/* Role Change Warning */}
          {formData.role !== user.role && (
            <div className="alert alert-warning mt-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span>
                You are changing this user's role from <strong>{user.role}</strong> to <strong>{formData.role}</strong>.
                This will affect their permissions immediately.
              </span>
            </div>
          )}

          {/* Balance Change Info */}
          {parseInt(formData.appCurrencyBalance) !== user.appCurrencyBalance && (
            <div className="alert alert-info mt-4">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span>
                Balance will change from <strong>{user.appCurrencyBalance}</strong> to <strong>{formData.appCurrencyBalance}</strong> credits.
              </span>
            </div>
          )}

          <div className="modal-action">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Updating...
                </>
              ) : (
                'Update User'
              )}
            </button>
          </div>
        </form>
      </div>
      <div className="modal-backdrop" onClick={handleClose}></div>
    </div>
  );
};

export default UserEditModal;
