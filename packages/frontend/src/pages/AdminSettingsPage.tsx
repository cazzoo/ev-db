import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  fetchAdminSettings,
  bulkUpdateAdminSettings,
  exportAdminSettings,
  importAdminSettings,
  seedDefaultAdminSettings,
  AdminSetting,
  SettingsExport
} from '../services/api';
import {
  Cog6ToothIcon,
  BellIcon,
  EnvelopeIcon,
  GlobeAltIcon,
  ServerIcon,
  ComputerDesktopIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  DevicePhoneMobileIcon,
  RssIcon

} from '@heroicons/react/24/outline';
import SettingsForm from '../components/admin/SettingsForm';
import SettingsAuditTrail from '../components/admin/SettingsAuditTrail';
import WebhookManagement from '../components/admin/WebhookManagement';

const AdminSettingsPage = () => {
  const [settings, setSettings] = useState<AdminSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('NOTIFICATIONS');
  const [unsavedChanges, setUnsavedChanges] = useState<Record<number, any>>({});
  const [saving, setSaving] = useState(false);
  const [auditTrailOpen, setAuditTrailOpen] = useState(false);
  const [selectedSettingForAudit, setSelectedSettingForAudit] = useState<{ id: number; name: string } | null>(null);

  const categories = [
    {
      id: 'NOTIFICATIONS',
      name: 'Notifications',
      icon: BellIcon,
      description: 'General notification settings and preferences'
    },
    {
      id: 'EMAIL',
      name: 'Email',
      icon: EnvelopeIcon,
      description: 'SMTP email configuration for sending notifications'
    },
    {
      id: 'WEBHOOKS',
      name: 'Webhooks',
      icon: GlobeAltIcon,
      description: 'Manage custom webhooks for different notification targets'
    },
    {
      id: 'SMS',
      name: 'SMS',
      icon: DevicePhoneMobileIcon,
      description: 'SMS notifications via Twilio or AWS SNS'
    },
    {
      id: 'RSS',
      name: 'RSS/Atom Feeds',
      icon: RssIcon,
      description: 'RSS and Atom feed generation for public updates'
    },
    {
      id: 'API',
      name: 'API',
      icon: ServerIcon,
      description: 'API configuration and rate limiting settings'
    },
    {
      id: 'SYSTEM',
      name: 'System',
      icon: ComputerDesktopIcon,
      description: 'System-wide configuration and maintenance settings'
    },
  ];

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await fetchAdminSettings();
      setSettings(data.settings);
      setError(null);
    } catch (err) {
      setError((err as Error).message || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSettingChange = (settingId: number, value: any) => {
    setUnsavedChanges(prev => ({
      ...prev,
      [settingId]: value
    }));
  };

  const handleSaveChanges = async () => {
    if (Object.keys(unsavedChanges).length === 0) return;

    try {
      setSaving(true);
      const updates = Object.entries(unsavedChanges).map(([id, value]) => ({
        id: parseInt(id),
        value
      }));

      await bulkUpdateAdminSettings(updates);
      setSuccessMessage('Settings updated successfully');
      setUnsavedChanges({});
      await loadSettings(); // Reload to get updated values
    } catch (err) {
      setError((err as Error).message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleDiscardChanges = () => {
    setUnsavedChanges({});
  };

  const handleExportSettings = async () => {
    try {
      const exportData = await exportAdminSettings();
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `admin-settings-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setSuccessMessage('Settings exported successfully');
    } catch (err) {
      setError((err as Error).message || 'Failed to export settings');
    }
  };

  const handleImportSettings = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const importData: SettingsExport = JSON.parse(text);

      if (!importData.settings || !Array.isArray(importData.settings)) {
        throw new Error('Invalid settings file format');
      }

      await importAdminSettings(importData.settings);
      setSuccessMessage('Settings imported successfully');
      await loadSettings();
    } catch (err) {
      setError((err as Error).message || 'Failed to import settings');
    }

    // Reset file input
    event.target.value = '';
  };

  const handleSeedDefaults = async () => {
    try {
      await seedDefaultAdminSettings();
      setSuccessMessage('Default settings seeded successfully');
      await loadSettings();
    } catch (err) {
      setError((err as Error).message || 'Failed to seed default settings');
    }
  };

  const getSettingsByCategory = (category: string) => {
    return settings.filter(setting => setting.category === category);
  };

  const handleShowAuditTrail = (settingId: number, settingKey: string) => {
    setSelectedSettingForAudit({ id: settingId, name: settingKey });
    setAuditTrailOpen(true);
  };

  const handleCloseAuditTrail = () => {
    setAuditTrailOpen(false);
    setSelectedSettingForAudit(null);
  };



  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  const hasUnsavedChanges = Object.keys(unsavedChanges).length > 0;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Admin Settings</h1>
          <p className="text-base-content/70 mt-2">Configure application-wide settings and preferences</p>
        </div>
        <div className="flex gap-2">
          <Link to="/admin/dashboard" className="btn btn-ghost">
            <Cog6ToothIcon className="h-5 w-5" />
            Back to Dashboard
          </Link>
        </div>
      </div>

      {/* Notification System Info */}
      <div className="alert alert-info mb-6">
        <BellIcon className="h-5 w-5" />
        <div>
          <h3 className="font-semibold">Flexible Notification System</h3>
          <div className="text-sm mt-1">
            Configure core notification settings and create unlimited custom webhooks for different targets
            (Teams, Slack, Discord, custom endpoints, etc.). Use the <strong>Webhooks</strong> tab to manage
            your webhook configurations.
            <div className="mt-2">
              <span className="text-primary">📖 Documentation in /docs/NOTIFICATION_SYSTEM.md</span>
            </div>
          </div>
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="alert alert-success mb-6">
          <span>{successMessage}</span>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="alert alert-error mb-6">
          <span>{error}</span>
        </div>
      )}

      {/* Unsaved Changes Warning */}
      {hasUnsavedChanges && (
        <div className="alert alert-warning mb-6">
          <ExclamationTriangleIcon className="h-5 w-5" />
          <span>You have unsaved changes</span>
          <div className="flex gap-2">
            <button
              className="btn btn-sm btn-primary"
              onClick={handleSaveChanges}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              className="btn btn-sm btn-ghost"
              onClick={handleDiscardChanges}
            >
              Discard
            </button>
          </div>
        </div>
      )}

      {/* Import/Export Actions */}
      <div className="card bg-base-100 shadow-xl mb-6">
        <div className="card-body">
          <h2 className="card-title">Settings Management</h2>
          <div className="flex flex-wrap gap-4 mt-4">
            <button
              className="btn btn-outline btn-primary"
              onClick={handleExportSettings}
            >
              <ArrowDownTrayIcon className="h-5 w-5" />
              Export Settings
            </button>
            <label className="btn btn-outline btn-secondary">
              <ArrowUpTrayIcon className="h-5 w-5" />
              Import Settings
              <input
                type="file"
                accept=".json"
                onChange={handleImportSettings}
                className="hidden"
              />
            </label>
            <button
              className="btn btn-outline btn-accent"
              onClick={handleSeedDefaults}
            >
              Seed Defaults
            </button>
          </div>
        </div>
      </div>

      {/* Settings Tabs */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <div className="tabs tabs-bordered mb-6">
            {categories.map((category) => {
              const Icon = category.icon;
              return (
                <button
                  key={category.id}
                  className={`tab tab-lg ${activeTab === category.id ? 'tab-active' : ''}`}
                  onClick={() => setActiveTab(category.id)}
                >
                  <Icon className="h-5 w-5 mr-2" />
                  {category.name}
                </button>
              );
            })}
          </div>

          {/* Settings Content */}
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-semibold">
                {categories.find(c => c.id === activeTab)?.name} Settings
              </h3>
              <p className="text-sm text-base-content/60 mt-1">
                {categories.find(c => c.id === activeTab)?.description}
              </p>
            </div>
            {activeTab !== 'WEBHOOKS' && (
              <button
                className="btn btn-sm btn-outline"
                onClick={() => {
                  const categorySettings = getSettingsByCategory(activeTab);
                  if (categorySettings.length > 0) {
                    handleShowAuditTrail(categorySettings[0].id, `${activeTab} Category`);
                  }
                }}
              >
                <ClockIcon className="h-4 w-4" />
                View Audit Trail
              </button>
            )}
          </div>

          {activeTab === 'WEBHOOKS' ? (
            <WebhookManagement />
          ) : (
            <SettingsForm
              settings={settings}
              category={activeTab}
              onSettingChange={handleSettingChange}
              unsavedChanges={unsavedChanges}
            />
          )}
        </div>
      </div>

      {/* Audit Trail Modal */}
      {selectedSettingForAudit && (
        <SettingsAuditTrail
          settingId={selectedSettingForAudit.id}
          settingName={selectedSettingForAudit.name}
          isOpen={auditTrailOpen}
          onClose={handleCloseAuditTrail}
        />
      )}
    </div>
  );
};

export default AdminSettingsPage;
