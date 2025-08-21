import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getNotificationPreferences,
  updateNotificationPreference,
  batchUpdatePreferences,
  resetPreferencesToDefaults,
  NotificationPreference,
  UpdatePreferenceRequest,
  PREFERENCE_GROUPS,
  NOTIFICATION_CHANNELS,
  isChannelAvailable,
  getChannelInfo
} from '../services/notificationPreferencesApi';

const NotificationPreferencesPage: React.FC = () => {
  const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<Map<string, boolean>>(new Map());
  const navigate = useNavigate();

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const userPreferences = await getNotificationPreferences();
      setPreferences(userPreferences);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load preferences');
    } finally {
      setIsLoading(false);
    }
  };

  const getPreferenceKey = (channel: string, eventType: string): string => {
    return `${channel}:${eventType}`;
  };

  const isPreferenceEnabled = (channel: string, eventType: string): boolean => {
    const key = getPreferenceKey(channel, eventType);
    
    // Check pending changes first
    if (pendingChanges.has(key)) {
      return pendingChanges.get(key)!;
    }
    
    // Check existing preferences
    const preference = preferences.find(p => p.channel === channel && p.eventType === eventType);
    return preference ? preference.enabled : false;
  };

  const handlePreferenceChange = (channel: string, eventType: string, enabled: boolean) => {
    const key = getPreferenceKey(channel, eventType);
    const currentValue = isPreferenceEnabled(channel, eventType);
    
    if (enabled === currentValue && !pendingChanges.has(key)) {
      return; // No change
    }
    
    const newPendingChanges = new Map(pendingChanges);
    
    // Check if this change reverts to the original value
    const originalPreference = preferences.find(p => p.channel === channel && p.eventType === eventType);
    const originalValue = originalPreference ? originalPreference.enabled : false;
    
    if (enabled === originalValue) {
      // Revert to original, remove from pending changes
      newPendingChanges.delete(key);
    } else {
      // Add to pending changes
      newPendingChanges.set(key, enabled);
    }
    
    setPendingChanges(newPendingChanges);
    setHasChanges(newPendingChanges.size > 0);
    setError(null);
    setSuccess(null);
  };

  const handleSaveChanges = async () => {
    if (!hasChanges) return;

    try {
      setIsSaving(true);
      setError(null);
      setSuccess(null);

      const updates: UpdatePreferenceRequest[] = [];
      
      for (const [key, enabled] of pendingChanges) {
        const [channel, eventType] = key.split(':');
        updates.push({
          channel: channel as any,
          eventType,
          enabled,
        });
      }

      await batchUpdatePreferences(updates);
      
      // Reload preferences to get the updated state
      await loadPreferences();
      
      setPendingChanges(new Map());
      setHasChanges(false);
      setSuccess('Notification preferences updated successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save preferences');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetToDefaults = async () => {
    if (!confirm('Are you sure you want to reset all notification preferences to their default values?')) {
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      setSuccess(null);

      await resetPreferencesToDefaults();
      await loadPreferences();
      
      setPendingChanges(new Map());
      setHasChanges(false);
      setSuccess('Notification preferences reset to defaults!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset preferences');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscardChanges = () => {
    setPendingChanges(new Map());
    setHasChanges(false);
    setError(null);
    setSuccess(null);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center py-12">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Notification Preferences</h1>
          <p className="text-base-content/60 mt-1">
            Configure how and when you receive notifications
          </p>
        </div>
        <button
          onClick={() => navigate('/settings')}
          className="btn btn-ghost btn-sm"
        >
          ← Back to Settings
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

      {/* Save/Discard Changes Bar */}
      {hasChanges && (
        <div className="alert alert-info mb-6">
          <div className="flex items-center justify-between w-full">
            <span>You have unsaved changes to your notification preferences.</span>
            <div className="flex gap-2">
              <button
                onClick={handleDiscardChanges}
                className="btn btn-ghost btn-sm"
                disabled={isSaving}
              >
                Discard
              </button>
              <button
                onClick={handleSaveChanges}
                className="btn btn-primary btn-sm"
                disabled={isSaving}
              >
                {isSaving ? (
                  <span className="loading loading-spinner loading-sm"></span>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notification Channels Header */}
      <div className="card bg-base-100 shadow-sm border border-base-200 mb-6">
        <div className="card-body">
          <h2 className="card-title mb-4">Available Channels</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {NOTIFICATION_CHANNELS.filter(channel => isChannelAvailable(channel.value)).map(channel => (
              <div key={channel.value} className="flex items-center gap-3 p-3 bg-base-50 rounded-lg">
                <div className="text-2xl">{channel.icon}</div>
                <div>
                  <div className="font-medium">{channel.label}</div>
                  <div className="text-sm text-base-content/60">{channel.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Preference Groups */}
      <div className="space-y-6">
        {PREFERENCE_GROUPS.map(group => (
          <div key={group.category} className="card bg-base-100 shadow-sm border border-base-200">
            <div className="card-body">
              <div className="mb-4">
                <h2 className="card-title">{group.label}</h2>
                <p className="text-sm text-base-content/60">{group.description}</p>
              </div>

              <div className="space-y-4">
                {group.eventTypes.map(eventType => (
                  <div key={eventType.eventType} className="border border-base-200 rounded-lg p-4">
                    <div className="mb-3">
                      <h3 className="font-medium">{eventType.label}</h3>
                      <p className="text-sm text-base-content/60">{eventType.description}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {NOTIFICATION_CHANNELS.filter(channel => isChannelAvailable(channel.value)).map(channel => (
                        <div key={channel.value} className="flex items-center justify-between p-2 bg-base-50 rounded">
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{channel.icon}</span>
                            <span className="text-sm font-medium">{channel.label}</span>
                          </div>
                          <input
                            type="checkbox"
                            className="toggle toggle-sm"
                            checked={isPreferenceEnabled(channel.value, eventType.eventType)}
                            onChange={(e) => handlePreferenceChange(channel.value, eventType.eventType, e.target.checked)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center mt-8 pt-6 border-t border-base-200">
        <button
          onClick={handleResetToDefaults}
          className="btn btn-outline btn-sm"
          disabled={isSaving}
        >
          Reset to Defaults
        </button>
        
        <div className="flex gap-2">
          <button
            onClick={() => navigate('/settings')}
            className="btn btn-ghost"
          >
            Cancel
          </button>
          {hasChanges && (
            <button
              onClick={handleSaveChanges}
              className="btn btn-primary"
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationPreferencesPage;
