import { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { uploadAvatar, deleteAvatar } from '../services/api';
import Avatar from './Avatar';

const AvatarUpload = () => {
  const { user, updateUser } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!user) return null;

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    // Validate file size (2MB limit)
    if (file.size > 2 * 1024 * 1024) {
      setError('File size must be less than 2MB');
      return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      setError('Please select a valid image file (JPEG, PNG, GIF, WebP, or SVG)');
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await uploadAvatar(file);
      updateUser({ avatarUrl: result.avatarUrl });
      setSuccess('Avatar uploaded successfully!');

      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      setError((err as Error).message || 'Failed to upload avatar');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteAvatar = async () => {
    if (!user.avatarUrl) return;

    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      await deleteAvatar();
      updateUser({ avatarUrl: null });
      setSuccess('Avatar deleted successfully!');
    } catch (err) {
      setError((err as Error).message || 'Failed to delete avatar');
    } finally {
      setUploading(false);
    }
  };

  const triggerFileSelect = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (uploading) return;

    // Clear any previous value to ensure onChange fires even for the same file
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      {/* Avatar Display */}
      <div className="relative">
        <Avatar user={user} size="xl" className="w-32 h-32" />
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full">
            <span className="loading loading-spinner loading-md text-white"></span>
          </div>
        )}
      </div>

      {/* Upload Controls */}
      <div className="flex flex-col items-center space-y-2">
        <div className="flex gap-2">
          <button
            onClick={triggerFileSelect}
            disabled={uploading}
            className="btn btn-primary btn-sm"
          >
            {uploading ? 'Uploading...' : user.avatarUrl ? 'Change Avatar' : 'Upload Avatar'}
          </button>

          {user.avatarUrl && (
            <button
              onClick={handleDeleteAvatar}
              disabled={uploading}
              className="btn btn-outline btn-error btn-sm"
            >
              Delete
            </button>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="text-xs text-base-content/60 text-center">
          {user.avatarUrl ? (
            <span>Upload a new image or delete to use pixel avatar</span>
          ) : (
            <span>Upload an image or use the generated pixel avatar</span>
          )}
          <br />
          <span>Max size: 2MB • Formats: JPEG, PNG, GIF, WebP, SVG</span>
        </div>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="alert alert-error alert-sm">
          <span className="text-sm">{error}</span>
        </div>
      )}

      {success && (
        <div className="alert alert-success alert-sm">
          <span className="text-sm">{success}</span>
        </div>
      )}
    </div>
  );
};

export default AvatarUpload;
