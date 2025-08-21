import { db } from '../db';
import { adminSettings, adminSettingsAudit, users } from '../db/schema';
import { eq, and, desc } from 'drizzle-orm';
import * as crypto from 'crypto';

// Encryption configuration
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const ENCRYPTION_KEY = process.env.SETTINGS_ENCRYPTION_KEY || 'default-key-change-in-production-32-chars';

// Ensure encryption key is 32 bytes
const getEncryptionKey = (): Buffer => {
  const key = ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32);
  return Buffer.from(key, 'utf8');
};

// Encrypt sensitive values (simple base64 encoding for now - in production use proper encryption)
export const encryptValue = (value: string): string => {
  // For development, we'll use simple base64 encoding
  // In production, implement proper AES encryption
  const encoded = Buffer.from(value, 'utf8').toString('base64');
  return JSON.stringify({ encrypted: encoded });
};

// Decrypt sensitive values
export const decryptValue = (encryptedData: string): string => {
  try {
    const { encrypted } = JSON.parse(encryptedData);
    return Buffer.from(encrypted, 'base64').toString('utf8');
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt value');
  }
};

// Validation rules interface
interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  min?: number;
  max?: number;
  enum?: string[];
}

// Validate setting value based on data type and rules
export const validateSettingValue = (
  value: any,
  dataType: string,
  validationRules?: string
): { isValid: boolean; error?: string } => {
  if (value === null || value === undefined) {
    const rules: ValidationRule = validationRules ? JSON.parse(validationRules) : {};
    if (rules.required) {
      return { isValid: false, error: 'Value is required' };
    }
    return { isValid: true };
  }

  const rules: ValidationRule = validationRules ? JSON.parse(validationRules) : {};

  switch (dataType) {
    case 'STRING':
    case 'PASSWORD':
      if (typeof value !== 'string') {
        return { isValid: false, error: 'Value must be a string' };
      }
      if (rules.minLength && value.length < rules.minLength) {
        return { isValid: false, error: `Value must be at least ${rules.minLength} characters` };
      }
      if (rules.maxLength && value.length > rules.maxLength) {
        return { isValid: false, error: `Value must be at most ${rules.maxLength} characters` };
      }
      if (rules.pattern && value.length > 0 && !new RegExp(rules.pattern).test(value)) {
        return { isValid: false, error: 'Value does not match required pattern' };
      }
      if (rules.enum && !rules.enum.includes(value)) {
        return { isValid: false, error: `Value must be one of: ${rules.enum.join(', ')}` };
      }
      break;

    case 'NUMBER':
      const numValue = typeof value === 'string' ? parseFloat(value) : value;
      if (isNaN(numValue)) {
        return { isValid: false, error: 'Value must be a number' };
      }
      if (rules.min !== undefined && numValue < rules.min) {
        return { isValid: false, error: `Value must be at least ${rules.min}` };
      }
      if (rules.max !== undefined && numValue > rules.max) {
        return { isValid: false, error: `Value must be at most ${rules.max}` };
      }
      break;

    case 'BOOLEAN':
      if (typeof value !== 'boolean' && value !== 'true' && value !== 'false') {
        return { isValid: false, error: 'Value must be a boolean' };
      }
      break;

    case 'JSON':
      if (typeof value === 'string') {
        try {
          JSON.parse(value);
        } catch {
          return { isValid: false, error: 'Value must be valid JSON' };
        }
      } else if (typeof value !== 'object') {
        return { isValid: false, error: 'Value must be a JSON object or valid JSON string' };
      }
      break;

    default:
      return { isValid: false, error: 'Invalid data type' };
  }

  return { isValid: true };
};

// Get all settings by category
export const getSettingsByCategory = async (category?: string) => {
  const query = db.select().from(adminSettings).where(eq(adminSettings.isActive, true));

  if (category) {
    query.where(and(eq(adminSettings.isActive, true), eq(adminSettings.category, category)));
  }

  const settings = await query.orderBy(adminSettings.category, adminSettings.key);

  // Decrypt encrypted values
  return settings.map(setting => ({
    ...setting,
    value: setting.isEncrypted && setting.value
      ? decryptValue(setting.value)
      : setting.value
  }));
};

// Get single setting by category and key
export const getSetting = async (category: string, key: string) => {
  const [setting] = await db.select()
    .from(adminSettings)
    .where(and(
      eq(adminSettings.category, category),
      eq(adminSettings.key, key),
      eq(adminSettings.isActive, true)
    ))
    .limit(1);

  if (!setting) {
    return null;
  }

  return {
    ...setting,
    value: setting.isEncrypted && setting.value
      ? decryptValue(setting.value)
      : setting.value
  };
};

// Update setting value with validation and audit trail
export const updateSetting = async (
  settingId: number,
  newValue: any,
  userId: number,
  ipAddress?: string,
  userAgent?: string
) => {
  // Get current setting
  const [currentSetting] = await db.select()
    .from(adminSettings)
    .where(eq(adminSettings.id, settingId))
    .limit(1);

  if (!currentSetting) {
    throw new Error('Setting not found');
  }

  // Validate new value
  const validation = validateSettingValue(
    newValue,
    currentSetting.dataType,
    currentSetting.validationRules
  );

  if (!validation.isValid) {
    throw new Error(validation.error || 'Invalid value');
  }

  // Prepare value for storage
  let valueToStore = newValue;
  if (currentSetting.dataType === 'JSON' && typeof newValue === 'object') {
    valueToStore = JSON.stringify(newValue);
  } else if (typeof newValue !== 'string') {
    valueToStore = String(newValue);
  }

  // Encrypt if needed
  if (currentSetting.isEncrypted) {
    valueToStore = encryptValue(valueToStore);
  }

  const now = new Date();

  // Update setting
  await db.update(adminSettings)
    .set({
      value: valueToStore,
      updatedAt: now,
      updatedBy: userId,
      version: currentSetting.version + 1
    })
    .where(eq(adminSettings.id, settingId));

  // Create audit record
  await db.insert(adminSettingsAudit).values({
    settingId: settingId,
    oldValue: currentSetting.value,
    newValue: valueToStore,
    action: 'UPDATE',
    changedBy: userId,
    changedAt: now,
    ipAddress,
    userAgent
  });

  return { success: true };
};

// Get audit trail for a setting
export const getSettingAuditTrail = async (settingId: number, limit = 50) => {
  const auditRecords = await db.select({
    id: adminSettingsAudit.id,
    oldValue: adminSettingsAudit.oldValue,
    newValue: adminSettingsAudit.newValue,
    action: adminSettingsAudit.action,
    changedAt: adminSettingsAudit.changedAt,
    ipAddress: adminSettingsAudit.ipAddress,
    userAgent: adminSettingsAudit.userAgent,
    changedByEmail: users.email
  })
  .from(adminSettingsAudit)
  .leftJoin(users, eq(adminSettingsAudit.changedBy, users.id))
  .where(eq(adminSettingsAudit.settingId, settingId))
  .orderBy(desc(adminSettingsAudit.changedAt))
  .limit(limit);

  return auditRecords;
};

// Export settings for backup
export const exportSettings = async () => {
  const settings = await db.select().from(adminSettings).where(eq(adminSettings.isActive, true));

  return {
    exportedAt: new Date().toISOString(),
    version: '1.0',
    settings: settings.map(setting => ({
      category: setting.category,
      key: setting.key,
      value: setting.isEncrypted ? '[ENCRYPTED]' : setting.value,
      dataType: setting.dataType,
      description: setting.description,
      validationRules: setting.validationRules,
      defaultValue: setting.defaultValue
    }))
  };
};

// Create or update setting
export const createOrUpdateSetting = async (
  category: string,
  key: string,
  value: any,
  dataType: string,
  description: string,
  userId: number,
  options: {
    isEncrypted?: boolean;
    validationRules?: string;
    defaultValue?: string;
  } = {}
) => {
  const now = new Date();

  // Check if setting exists
  const [existingSetting] = await db.select()
    .from(adminSettings)
    .where(and(
      eq(adminSettings.category, category),
      eq(adminSettings.key, key)
    ))
    .limit(1);

  // Validate value
  const validation = validateSettingValue(value, dataType, options.validationRules);
  if (!validation.isValid) {
    throw new Error(validation.error || 'Invalid value');
  }

  // Prepare value for storage
  let valueToStore = value;
  if (dataType === 'JSON' && typeof value === 'object') {
    valueToStore = JSON.stringify(value);
  } else if (typeof value !== 'string') {
    valueToStore = String(value);
  }

  // Encrypt if needed
  if (options.isEncrypted) {
    valueToStore = encryptValue(valueToStore);
  }

  if (existingSetting) {
    // Update existing setting
    await db.update(adminSettings)
      .set({
        value: valueToStore,
        dataType,
        description,
        isEncrypted: options.isEncrypted || false,
        validationRules: options.validationRules,
        defaultValue: options.defaultValue,
        updatedAt: now,
        updatedBy: userId,
        version: existingSetting.version + 1
      })
      .where(eq(adminSettings.id, existingSetting.id));

    // Create audit record
    await db.insert(adminSettingsAudit).values({
      settingId: existingSetting.id,
      oldValue: existingSetting.value,
      newValue: valueToStore,
      action: 'UPDATE',
      changedBy: userId,
      changedAt: now
    });

    return existingSetting.id;
  } else {
    // Create new setting
    const [newSetting] = await db.insert(adminSettings).values({
      category,
      key,
      value: valueToStore,
      dataType,
      description,
      isEncrypted: options.isEncrypted || false,
      validationRules: options.validationRules,
      defaultValue: options.defaultValue,
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
      updatedBy: userId
    }).returning();

    // Create audit record
    await db.insert(adminSettingsAudit).values({
      settingId: newSetting.id,
      oldValue: null,
      newValue: valueToStore,
      action: 'CREATE',
      changedBy: userId,
      changedAt: now
    });

    return newSetting.id;
  }
};

// Default settings configuration
export const DEFAULT_SETTINGS = [
  // Notification Settings
  {
    category: 'NOTIFICATIONS',
    key: 'enable_user_notifications',
    value: 'true',
    dataType: 'BOOLEAN',
    description: 'Enable notifications for users',
    validationRules: JSON.stringify({ required: true })
  },
  {
    category: 'NOTIFICATIONS',
    key: 'enable_admin_notifications',
    value: 'true',
    dataType: 'BOOLEAN',
    description: 'Enable notifications for administrators',
    validationRules: JSON.stringify({ required: true })
  },
  {
    category: 'NOTIFICATIONS',
    key: 'notification_email',
    value: 'admin@evdb.com',
    dataType: 'STRING',
    description: 'Email address for system notifications',
    validationRules: JSON.stringify({
      required: true,
      pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$'
    })
  },

  // Webhook Configuration
  {
    category: 'WEBHOOKS',
    key: 'webhook_enabled',
    value: 'false',
    dataType: 'BOOLEAN',
    description: 'Enable webhook notifications'
  },
  {
    category: 'WEBHOOKS',
    key: 'webhook_url',
    value: '',
    dataType: 'STRING',
    description: 'Webhook endpoint URL'
  },
  {
    category: 'WEBHOOKS',
    key: 'webhook_secret',
    value: '',
    dataType: 'PASSWORD',
    description: 'Webhook secret for authentication',
    isEncrypted: true
  },
  {
    category: 'WEBHOOKS',
    key: 'webhook_events',
    value: JSON.stringify(['contribution.approved', 'contribution.rejected', 'user.registered']),
    dataType: 'JSON',
    description: 'Events that trigger webhook notifications'
  },
  {
    category: 'WEBHOOKS',
    key: 'webhook_format',
    value: 'json',
    dataType: 'STRING',
    description: 'Webhook payload format (json, form-data)',
    validationRules: JSON.stringify({
      enum: ['json', 'form-data']
    })
  },
  {
    category: 'WEBHOOKS',
    key: 'webhook_timeout',
    value: '30',
    dataType: 'NUMBER',
    description: 'Webhook request timeout in seconds',
    validationRules: JSON.stringify({
      min: 5,
      max: 300
    })
  },

  // Email Settings
  {
    category: 'EMAIL',
    key: 'smtp_host',
    value: 'localhost',
    dataType: 'STRING',
    description: 'SMTP server hostname',
    validationRules: JSON.stringify({ required: true })
  },
  {
    category: 'EMAIL',
    key: 'smtp_port',
    value: '587',
    dataType: 'NUMBER',
    description: 'SMTP server port',
    validationRules: JSON.stringify({
      required: true,
      min: 1,
      max: 65535
    })
  },
  {
    category: 'EMAIL',
    key: 'smtp_user',
    value: '',
    dataType: 'STRING',
    description: 'SMTP username'
  },
  {
    category: 'EMAIL',
    key: 'smtp_password',
    value: '',
    dataType: 'PASSWORD',
    description: 'SMTP password',
    isEncrypted: true
  },
  {
    category: 'EMAIL',
    key: 'from_email',
    value: 'noreply@evdb.com',
    dataType: 'STRING',
    description: 'From email address',
    validationRules: JSON.stringify({
      required: true,
      pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$'
    })
  },
  {
    category: 'EMAIL',
    key: 'from_name',
    value: 'EV Database',
    dataType: 'STRING',
    description: 'From name for emails',
    validationRules: JSON.stringify({ required: true })
  },

  // API Configuration
  {
    category: 'API',
    key: 'default_rate_limit',
    value: '100',
    dataType: 'NUMBER',
    description: 'Default API rate limit per hour',
    validationRules: JSON.stringify({
      required: true,
      min: 1,
      max: 10000
    })
  },
  {
    category: 'API',
    key: 'max_api_keys_per_user',
    value: '5',
    dataType: 'NUMBER',
    description: 'Maximum API keys per user',
    validationRules: JSON.stringify({
      required: true,
      min: 1,
      max: 50
    })
  },
  {
    category: 'API',
    key: 'api_key_expiry_days',
    value: '365',
    dataType: 'NUMBER',
    description: 'Default API key expiry in days',
    validationRules: JSON.stringify({
      required: true,
      min: 1,
      max: 3650
    })
  },

  // System Preferences
  {
    category: 'SYSTEM',
    key: 'maintenance_mode',
    value: 'false',
    dataType: 'BOOLEAN',
    description: 'Enable maintenance mode'
  },
  {
    category: 'SYSTEM',
    key: 'app_name',
    value: 'EV Database',
    dataType: 'STRING',
    description: 'Application name',
    validationRules: JSON.stringify({
      required: true,
      minLength: 1,
      maxLength: 100
    })
  },
  {
    category: 'SYSTEM',
    key: 'max_file_size',
    value: '10485760',
    dataType: 'NUMBER',
    description: 'Maximum file upload size in bytes (10MB)',
    validationRules: JSON.stringify({
      required: true,
      min: 1024,
      max: 104857600
    })
  },
  {
    category: 'SYSTEM',
    key: 'allowed_file_types',
    value: JSON.stringify(['image/jpeg', 'image/png', 'image/webp']),
    dataType: 'JSON',
    description: 'Allowed file types for uploads'
  },

  // Microsoft Teams Integration
  {
    category: 'TEAMS',
    key: 'teams_enabled',
    value: 'false',
    dataType: 'BOOLEAN',
    description: 'Enable Microsoft Teams notifications'
  },
  {
    category: 'TEAMS',
    key: 'teams_webhook_url',
    value: '',
    dataType: 'STRING',
    description: 'Microsoft Teams webhook URL',
    validationRules: JSON.stringify({
      pattern: '^https://.*\\.webhook\\.office\\.com/.*'
    })
  },
  {
    category: 'TEAMS',
    key: 'teams_events',
    value: JSON.stringify(['contribution.approved', 'contribution.rejected']),
    dataType: 'JSON',
    description: 'Events that trigger Teams notifications'
  },

  // Slack Integration
  {
    category: 'SLACK',
    key: 'slack_enabled',
    value: 'false',
    dataType: 'BOOLEAN',
    description: 'Enable Slack notifications'
  },
  {
    category: 'SLACK',
    key: 'slack_webhook_url',
    value: '',
    dataType: 'STRING',
    description: 'Slack webhook URL',
    validationRules: JSON.stringify({
      pattern: '^https://hooks\\.slack\\.com/.*'
    })
  },
  {
    category: 'SLACK',
    key: 'slack_channel',
    value: '#general',
    dataType: 'STRING',
    description: 'Default Slack channel for notifications'
  },
  {
    category: 'SLACK',
    key: 'slack_bot_token',
    value: '',
    dataType: 'PASSWORD',
    description: 'Slack bot token for advanced features',
    isEncrypted: true
  },
  {
    category: 'SLACK',
    key: 'slack_events',
    value: JSON.stringify(['contribution.approved', 'contribution.rejected', 'system.announcement']),
    dataType: 'JSON',
    description: 'Events that trigger Slack notifications'
  },

  // Discord Integration
  {
    category: 'DISCORD',
    key: 'discord_enabled',
    value: 'false',
    dataType: 'BOOLEAN',
    description: 'Enable Discord notifications'
  },
  {
    category: 'DISCORD',
    key: 'discord_webhook_url',
    value: '',
    dataType: 'STRING',
    description: 'Discord webhook URL',
    validationRules: JSON.stringify({
      pattern: '^https://discord(app)?\\.com/api/webhooks/.*'
    })
  },
  {
    category: 'DISCORD',
    key: 'discord_username',
    value: 'EV Database',
    dataType: 'STRING',
    description: 'Discord bot username for notifications'
  },
  {
    category: 'DISCORD',
    key: 'discord_events',
    value: JSON.stringify(['contribution.approved', 'contribution.rejected']),
    dataType: 'JSON',
    description: 'Events that trigger Discord notifications'
  },

  // Gotify Push Notifications
  {
    category: 'GOTIFY',
    key: 'gotify_enabled',
    value: 'false',
    dataType: 'BOOLEAN',
    description: 'Enable Gotify push notifications'
  },
  {
    category: 'GOTIFY',
    key: 'gotify_server_url',
    value: '',
    dataType: 'STRING',
    description: 'Gotify server URL',
    validationRules: JSON.stringify({
      pattern: '^https?://.*'
    })
  },
  {
    category: 'GOTIFY',
    key: 'gotify_app_token',
    value: '',
    dataType: 'PASSWORD',
    description: 'Gotify application token',
    isEncrypted: true
  },
  {
    category: 'GOTIFY',
    key: 'gotify_priority',
    value: '5',
    dataType: 'NUMBER',
    description: 'Default notification priority (0-10)',
    validationRules: JSON.stringify({
      min: 0,
      max: 10
    })
  },

  // Pushbullet Integration
  {
    category: 'PUSHBULLET',
    key: 'pushbullet_enabled',
    value: 'false',
    dataType: 'BOOLEAN',
    description: 'Enable Pushbullet notifications'
  },
  {
    category: 'PUSHBULLET',
    key: 'pushbullet_access_token',
    value: '',
    dataType: 'PASSWORD',
    description: 'Pushbullet access token',
    isEncrypted: true
  },
  {
    category: 'PUSHBULLET',
    key: 'pushbullet_device_iden',
    value: '',
    dataType: 'STRING',
    description: 'Target device identifier (optional)'
  },

  // Firebase Cloud Messaging
  {
    category: 'FCM',
    key: 'fcm_enabled',
    value: 'false',
    dataType: 'BOOLEAN',
    description: 'Enable Firebase Cloud Messaging'
  },
  {
    category: 'FCM',
    key: 'fcm_server_key',
    value: '',
    dataType: 'PASSWORD',
    description: 'FCM server key',
    isEncrypted: true
  },
  {
    category: 'FCM',
    key: 'fcm_project_id',
    value: '',
    dataType: 'STRING',
    description: 'Firebase project ID'
  },

  // Apple Push Notification Service
  {
    category: 'APNS',
    key: 'apns_enabled',
    value: 'false',
    dataType: 'BOOLEAN',
    description: 'Enable Apple Push Notifications'
  },
  {
    category: 'APNS',
    key: 'apns_key_id',
    value: '',
    dataType: 'STRING',
    description: 'APNs key ID'
  },
  {
    category: 'APNS',
    key: 'apns_team_id',
    value: '',
    dataType: 'STRING',
    description: 'Apple Developer Team ID'
  },
  {
    category: 'APNS',
    key: 'apns_private_key',
    value: '',
    dataType: 'PASSWORD',
    description: 'APNs private key (p8 format)',
    isEncrypted: true
  },
  {
    category: 'APNS',
    key: 'apns_bundle_id',
    value: 'com.evdb.app',
    dataType: 'STRING',
    description: 'iOS app bundle identifier'
  },

  // Web Push Notifications
  {
    category: 'WEB_PUSH',
    key: 'web_push_enabled',
    value: 'false',
    dataType: 'BOOLEAN',
    description: 'Enable Web Push notifications'
  },
  {
    category: 'WEB_PUSH',
    key: 'vapid_public_key',
    value: '',
    dataType: 'STRING',
    description: 'VAPID public key for Web Push'
  },
  {
    category: 'WEB_PUSH',
    key: 'vapid_private_key',
    value: '',
    dataType: 'PASSWORD',
    description: 'VAPID private key for Web Push',
    isEncrypted: true
  },
  {
    category: 'WEB_PUSH',
    key: 'vapid_subject',
    value: 'mailto:admin@evdb.com',
    dataType: 'STRING',
    description: 'VAPID subject (email or URL)',
    validationRules: JSON.stringify({
      pattern: '^(mailto:|https?://)'
    })
  },

  // SMS Notifications (Twilio)
  {
    category: 'SMS',
    key: 'sms_enabled',
    value: 'false',
    dataType: 'BOOLEAN',
    description: 'Enable SMS notifications'
  },
  {
    category: 'SMS',
    key: 'sms_provider',
    value: 'twilio',
    dataType: 'STRING',
    description: 'SMS provider (twilio, aws_sns)',
    validationRules: JSON.stringify({
      enum: ['twilio', 'aws_sns']
    })
  },
  {
    category: 'SMS',
    key: 'twilio_account_sid',
    value: '',
    dataType: 'STRING',
    description: 'Twilio Account SID'
  },
  {
    category: 'SMS',
    key: 'twilio_auth_token',
    value: '',
    dataType: 'PASSWORD',
    description: 'Twilio Auth Token',
    isEncrypted: true
  },
  {
    category: 'SMS',
    key: 'twilio_phone_number',
    value: '',
    dataType: 'STRING',
    description: 'Twilio phone number (from)',
    validationRules: JSON.stringify({
      pattern: '^\\+[1-9]\\d{1,14}$'
    })
  },
  {
    category: 'SMS',
    key: 'aws_sns_access_key',
    value: '',
    dataType: 'PASSWORD',
    description: 'AWS SNS Access Key ID',
    isEncrypted: true
  },
  {
    category: 'SMS',
    key: 'aws_sns_secret_key',
    value: '',
    dataType: 'PASSWORD',
    description: 'AWS SNS Secret Access Key',
    isEncrypted: true
  },
  {
    category: 'SMS',
    key: 'aws_sns_region',
    value: 'us-east-1',
    dataType: 'STRING',
    description: 'AWS SNS region'
  },

  // RSS/Atom Feeds
  {
    category: 'RSS',
    key: 'rss_enabled',
    value: 'true',
    dataType: 'BOOLEAN',
    description: 'Enable RSS/Atom feeds'
  },
  {
    category: 'RSS',
    key: 'rss_title',
    value: 'EV Database Updates',
    dataType: 'STRING',
    description: 'RSS feed title'
  },
  {
    category: 'RSS',
    key: 'rss_description',
    value: 'Latest updates from the EV Database',
    dataType: 'STRING',
    description: 'RSS feed description'
  },
  {
    category: 'RSS',
    key: 'rss_max_items',
    value: '50',
    dataType: 'NUMBER',
    description: 'Maximum items in RSS feed',
    validationRules: JSON.stringify({
      min: 10,
      max: 200
    })
  },
  {
    category: 'RSS',
    key: 'rss_events',
    value: JSON.stringify(['contribution.approved', 'system.announcement']),
    dataType: 'JSON',
    description: 'Events to include in RSS feed'
  }
];

// Seed default settings
export const seedDefaultSettings = async (adminUserId: number) => {
  console.log('Seeding default admin settings...');

  for (const setting of DEFAULT_SETTINGS) {
    try {
      await createOrUpdateSetting(
        setting.category,
        setting.key,
        setting.value,
        setting.dataType,
        setting.description,
        adminUserId,
        {
          isEncrypted: setting.isEncrypted,
          validationRules: setting.validationRules
        }
      );
    } catch (error) {
      console.warn(`Failed to seed setting ${setting.category}.${setting.key}:`, error);
    }
  }

  console.log('Default admin settings seeded successfully.');
};
