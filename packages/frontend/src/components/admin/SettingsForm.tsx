import { useState } from 'react';
import { AdminSetting } from '../../services/api';
import {
  ExclamationTriangleIcon,
  InformationCircleIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline';

interface SettingsFormProps {
  settings: AdminSetting[];
  category: string;
  onSettingChange: (settingId: number, value: any) => void;
  unsavedChanges: Record<number, any>;
}

const SettingsForm = ({ settings, category, onSettingChange, unsavedChanges }: SettingsFormProps) => {
  const [showPasswords, setShowPasswords] = useState<Record<number, boolean>>({});
  const [validationErrors, setValidationErrors] = useState<Record<number, string>>({});

  const categorySettings = settings.filter(setting => setting.category === category);

  const validateSetting = (setting: AdminSetting, value: any): string | null => {
    if (!setting.validationRules) return null;

    try {
      const rules = JSON.parse(setting.validationRules);

      // Required validation
      if (rules.required && (!value || value === '')) {
        return 'This field is required';
      }

      // Skip other validations if value is empty and not required
      if (!value || value === '') return null;

      // String validations
      if (setting.dataType === 'STRING' || setting.dataType === 'PASSWORD') {
        if (rules.minLength && value.length < rules.minLength) {
          return `Must be at least ${rules.minLength} characters`;
        }
        if (rules.maxLength && value.length > rules.maxLength) {
          return `Must be at most ${rules.maxLength} characters`;
        }
        if (rules.pattern && !new RegExp(rules.pattern).test(value)) {
          return 'Invalid format';
        }
        if (rules.enum && !rules.enum.includes(value)) {
          return `Must be one of: ${rules.enum.join(', ')}`;
        }
      }

      // Number validations
      if (setting.dataType === 'NUMBER') {
        const numValue = parseFloat(value);
        if (isNaN(numValue)) {
          return 'Must be a valid number';
        }
        if (rules.min !== undefined && numValue < rules.min) {
          return `Must be at least ${rules.min}`;
        }
        if (rules.max !== undefined && numValue > rules.max) {
          return `Must be at most ${rules.max}`;
        }
      }

      // JSON validation
      if (setting.dataType === 'JSON' && typeof value === 'string') {
        try {
          JSON.parse(value);
        } catch {
          return 'Must be valid JSON';
        }
      }

      return null;
    } catch {
      return null; // Invalid validation rules, skip validation
    }
  };

  const handleSettingChange = (setting: AdminSetting, value: any) => {
    // Validate the new value
    const error = validateSetting(setting, value);
    setValidationErrors(prev => ({
      ...prev,
      [setting.id]: error || ''
    }));

    // Call parent handler
    onSettingChange(setting.id, value);
  };

  const togglePasswordVisibility = (settingId: number) => {
    setShowPasswords(prev => ({
      ...prev,
      [settingId]: !prev[settingId]
    }));
  };

  const getCurrentValue = (setting: AdminSetting) => {
    return unsavedChanges[setting.id] !== undefined
      ? unsavedChanges[setting.id]
      : setting.value;
  };

  const renderSettingInput = (setting: AdminSetting) => {
    const currentValue = getCurrentValue(setting);
    const hasError = validationErrors[setting.id];
    const inputClass = `input input-bordered w-full ${hasError ? 'input-error' : ''}`;

    switch (setting.dataType) {
      case 'BOOLEAN':
        return (
          <div className="form-control">
            <label className="label cursor-pointer justify-start gap-4">
              <input
                type="checkbox"
                className="toggle toggle-primary"
                checked={currentValue === 'true' || currentValue === true}
                onChange={(e) => handleSettingChange(setting, e.target.checked)}
              />
              <span className="label-text">
                {currentValue === 'true' || currentValue === true ? 'Enabled' : 'Disabled'}
              </span>
            </label>
          </div>
        );

      case 'NUMBER':
        return (
          <input
            type="number"
            className={inputClass}
            value={currentValue || ''}
            onChange={(e) => handleSettingChange(setting, e.target.value)}
            placeholder={setting.defaultValue || 'Enter number...'}
          />
        );

      case 'PASSWORD':
        return (
          <div className="relative">
            <input
              type={showPasswords[setting.id] ? 'text' : 'password'}
              className={`${inputClass} pr-12`}
              value={currentValue || ''}
              onChange={(e) => handleSettingChange(setting, e.target.value)}
              placeholder="Enter password..."
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 transform -translate-y-1/2 btn btn-ghost btn-sm btn-square"
              onClick={() => togglePasswordVisibility(setting.id)}
            >
              {showPasswords[setting.id] ? (
                <EyeSlashIcon className="h-4 w-4" />
              ) : (
                <EyeIcon className="h-4 w-4" />
              )}
            </button>
          </div>
        );

      case 'JSON':
        return (
          <div className="space-y-2">
            <textarea
              className={`textarea textarea-bordered w-full h-32 ${hasError ? 'textarea-error' : ''}`}
              value={typeof currentValue === 'object' ? JSON.stringify(currentValue, null, 2) : currentValue || ''}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value);
                  handleSettingChange(setting, parsed);
                } catch {
                  handleSettingChange(setting, e.target.value);
                }
              }}
              placeholder={setting.defaultValue || '{}'}
            />
            <div className="text-xs text-base-content/60">
              <InformationCircleIcon className="h-4 w-4 inline mr-1" />
              Enter valid JSON format
            </div>
          </div>
        );

      default:
        return (
          <input
            type="text"
            className={inputClass}
            value={currentValue || ''}
            onChange={(e) => handleSettingChange(setting, e.target.value)}
            placeholder={setting.defaultValue || 'Enter value...'}
          />
        );
    }
  };

  const getSettingDisplayName = (key: string) => {
    return key
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  };

  const getCategoryDescription = (category: string) => {
    const descriptions = {
      NOTIFICATIONS: 'Configure system notifications and user alerts',
      WEBHOOKS: 'Manage webhook endpoints and event triggers',
      EMAIL: 'Configure SMTP settings and email templates',
      API: 'Manage API rate limits and key settings',
      SYSTEM: 'Application-wide defaults and system preferences'
    };
    return descriptions[category as keyof typeof descriptions] || '';
  };

  if (categorySettings.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-base-content/60">
          No settings found for this category
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Category Description */}
      <div className="bg-base-200 p-4 rounded-lg">
        <p className="text-sm text-base-content/70">
          {getCategoryDescription(category)}
        </p>
      </div>

      {/* Settings */}
      {categorySettings.map((setting) => (
        <div key={setting.id} className="form-control space-y-2">
          <label className="label">
            <span className="label-text font-medium">
              {getSettingDisplayName(setting.key)}
              {setting.validationRules && JSON.parse(setting.validationRules).required && (
                <span className="text-error ml-1">*</span>
              )}
            </span>
            {setting.description && (
              <span className="label-text-alt text-base-content/60 max-w-xs text-right">
                {setting.description}
              </span>
            )}
          </label>

          {renderSettingInput(setting)}

          {/* Validation Error */}
          {validationErrors[setting.id] && (
            <div className="flex items-center gap-2 text-error text-sm">
              <ExclamationTriangleIcon className="h-4 w-4" />
              {validationErrors[setting.id]}
            </div>
          )}

          {/* Default Value Info */}
          {setting.defaultValue && (
            <div className="text-xs text-base-content/50">
              Default: {setting.defaultValue}
            </div>
          )}

          {/* Setting Metadata */}
          <div className="flex justify-between text-xs text-base-content/40">
            <span>Type: {setting.dataType}</span>
            <span>Version: {setting.version}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default SettingsForm;
