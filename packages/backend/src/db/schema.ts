import { integer, sqliteTable, text, index } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: integer('id').primaryKey(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  role: text('role', { enum: ['MEMBER', 'MODERATOR', 'ADMIN'] }).notNull().default('MEMBER'),
  appCurrencyBalance: integer('app_currency_balance').notNull().default(0),
  avatarUrl: text('avatar_url'),
  theme: text('theme').default('light'),
});

export const vehicles = sqliteTable('vehicles', {
  id: integer('id').primaryKey(),
  make: text('make').notNull(),
  model: text('model').notNull(),
  year: integer('year').notNull(),
  batteryCapacity: integer('battery_capacity'), // in kWh
  range: integer('range'), // in km
  chargingSpeed: integer('charging_speed'), // in kW
  description: text('description'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  createdAtIdx: index('vehicles_created_at_idx').on(table.createdAt),
  makeModelIdx: index('vehicles_make_model_idx').on(table.make, table.model),
}));

export const vehicleImages = sqliteTable('vehicle_images', {
  id: integer('id').primaryKey(),
  vehicleId: integer('vehicle_id').notNull().references(() => vehicles.id, { onDelete: 'cascade' }),
  filename: text('filename').notNull(), // Original filename
  path: text('path').notNull(), // Relative path from uploads directory
  url: text('url').notNull(), // Full URL to access the image
  altText: text('alt_text'), // Alternative text for accessibility
  caption: text('caption'), // Optional caption
  displayOrder: integer('display_order').notNull().default(0), // Order in carousel
  fileSize: integer('file_size'), // File size in bytes
  mimeType: text('mime_type'), // MIME type (image/jpeg, image/png, etc.)
  width: integer('width'), // Image width in pixels
  height: integer('height'), // Image height in pixels
  uploadedBy: integer('uploaded_by').references(() => users.id), // User who uploaded
  uploadedAt: integer('uploaded_at', { mode: 'timestamp' }).notNull(),
  isApproved: integer('is_approved', { mode: 'boolean' }).notNull().default(false),
  approvedBy: integer('approved_by').references(() => users.id),
  approvedAt: integer('approved_at', { mode: 'timestamp' }),
});

export const contributions = sqliteTable('contributions', {
  id: integer('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  vehicleData: text('vehicle_data', { mode: 'json' }).notNull(),
  status: text('status', { enum: ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'] }).notNull().default('PENDING'),
  changeType: text('change_type', { enum: ['NEW', 'UPDATE'] }).notNull().default('NEW'),
  targetVehicleId: integer('target_vehicle_id').references(() => vehicles.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  approvedAt: integer('approved_at', { mode: 'timestamp' }),
  rejectedAt: integer('rejected_at', { mode: 'timestamp' }),
  cancelledAt: integer('cancelled_at', { mode: 'timestamp' }),
  // New moderation fields
  rejectionComment: text('rejection_comment'),
  rejectedBy: integer('rejected_by').references(() => users.id),
});

export const imageContributions = sqliteTable('image_contributions', {
  id: integer('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  vehicleId: integer('vehicle_id').notNull().references(() => vehicles.id),
  contributionId: integer('contribution_id').references(() => contributions.id), // Link to specific proposal
  filename: text('filename').notNull(),
  originalFilename: text('original_filename').notNull(),
  path: text('path').notNull(), // Temporary path until approved
  altText: text('alt_text'),
  caption: text('caption'),
  fileSize: integer('file_size'),
  mimeType: text('mime_type'),
  width: integer('width'),
  height: integer('height'),
  status: text('status', { enum: ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'] }).notNull().default('PENDING'),
  submittedAt: integer('submitted_at', { mode: 'timestamp' }).notNull(),
  reviewedBy: integer('reviewed_by').references(() => users.id),
  reviewedAt: integer('reviewed_at', { mode: 'timestamp' }),
  rejectionReason: text('rejection_reason'),
});

export const contributionReviews = sqliteTable('contribution_reviews', {
  id: integer('id').primaryKey(),
  contributionId: integer('contribution_id').notNull().references(() => contributions.id),
  userId: integer('user_id').notNull().references(() => users.id),
  vote: integer('vote').notNull(), // +1 for upvote
});

// Moderation audit logs (currently used for contribution rejections)
export const moderationLogs = sqliteTable('moderation_logs', {
  id: integer('id').primaryKey(),
  targetType: text('target_type').notNull().default('CONTRIBUTION'),
  targetId: integer('target_id').notNull(),
  action: text('action', { enum: ['REJECT'] }).notNull(),
  moderatorId: integer('moderator_id').notNull().references(() => users.id),
  comment: text('comment'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const apiKeys = sqliteTable('api_keys', {
  id: integer('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  key: text('key').notNull().unique(),
  name: text('name'),
  expiresAt: integer('expires_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  revokedAt: integer('revoked_at', { mode: 'timestamp' }),
});

export const apiUsage = sqliteTable('api_usage', {
  id: integer('id').primaryKey(),
  apiKeyId: integer('api_key_id').references(() => apiKeys.id), // Made nullable for frontend usage
  userId: integer('user_id').references(() => users.id), // Direct user reference for frontend usage
  usedAt: integer('used_at', { mode: 'timestamp' }).notNull(),
  path: text('path').notNull(),
  method: text('method').notNull(),
});

export const adminSettings = sqliteTable('admin_settings', {
  id: integer('id').primaryKey(),
  category: text('category', {
    enum: [
      'NOTIFICATIONS', 'WEBHOOKS', 'EMAIL', 'API', 'SYSTEM',
      'PUSH_NOTIFICATIONS', 'SMS', 'TEAMS', 'SLACK', 'DISCORD',
      'GOTIFY', 'PUSHBULLET', 'FCM', 'APNS', 'WEB_PUSH', 'RSS'
    ]
  }).notNull(),
  key: text('key').notNull(),
  value: text('value'), // JSON string for complex values
  dataType: text('data_type', { enum: ['STRING', 'NUMBER', 'BOOLEAN', 'JSON', 'PASSWORD'] }).notNull().default('STRING'),
  description: text('description'),
  isEncrypted: integer('is_encrypted', { mode: 'boolean' }).notNull().default(false),
  validationRules: text('validation_rules'), // JSON string with validation rules
  defaultValue: text('default_value'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  version: integer('version').notNull().default(1),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  createdBy: integer('created_by').notNull().references(() => users.id),
  updatedBy: integer('updated_by').notNull().references(() => users.id),
});

export const adminSettingsAudit = sqliteTable('admin_settings_audit', {
  id: integer('id').primaryKey(),
  settingId: integer('setting_id').notNull().references(() => adminSettings.id),
  oldValue: text('old_value'),
  newValue: text('new_value'),
  action: text('action', { enum: ['CREATE', 'UPDATE', 'DELETE', 'ACTIVATE', 'DEACTIVATE'] }).notNull(),
  changedBy: integer('changed_by').notNull().references(() => users.id),
  changedAt: integer('changed_at', { mode: 'timestamp' }).notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
});

export const userNotificationPreferences = sqliteTable('user_notification_preferences', {
  id: integer('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  channel: text('channel', {
    enum: ['EMAIL', 'WEBHOOK', 'PUSH', 'SMS', 'IN_APP']
  }).notNull(),
  eventType: text('event_type', {
    enum: [
      'contribution.approved', 'contribution.rejected', 'contribution.submitted', 'contribution.vote_received',
      'user.registered', 'user.password_reset', 'user.account_updated', 'user.welcome',
      'user.low_credits', 'user.credit_topup',
      'system.maintenance', 'system.announcement', 'system.changelog',
      'admin.notification'
    ]
  }).notNull(),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  userIdIdx: index('user_notification_preferences_user_id_idx').on(table.userId),
  userChannelEventIdx: index('user_notification_preferences_user_channel_event_idx').on(table.userId, table.channel, table.eventType),
  enabledIdx: index('user_notification_preferences_enabled_idx').on(table.enabled),
}));

export const notificationQueue = sqliteTable('notification_queue', {
  id: integer('id').primaryKey(),
  userId: integer('user_id').references(() => users.id), // null for system notifications
  channel: text('channel').notNull(),
  eventType: text('event_type').notNull(),
  recipient: text('recipient').notNull(), // email, phone, webhook URL, etc.
  subject: text('subject'),
  content: text('content').notNull(),
  metadata: text('metadata'), // JSON string with additional data
  status: text('status', {
    enum: ['PENDING', 'PROCESSING', 'SENT', 'FAILED', 'CANCELLED', 'SKIPPED']
  }).notNull().default('PENDING'),
  attempts: integer('attempts').notNull().default(0),
  maxAttempts: integer('max_attempts').notNull().default(3),
  scheduledAt: integer('scheduled_at', { mode: 'timestamp' }).notNull(),
  sentAt: integer('sent_at', { mode: 'timestamp' }),
  failedAt: integer('failed_at', { mode: 'timestamp' }),
  errorMessage: text('error_message'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const notificationHistory = sqliteTable('notification_history', {
  id: integer('id').primaryKey(),
  queueId: integer('queue_id').references(() => notificationQueue.id),
  userId: integer('user_id').references(() => users.id),
  channel: text('channel').notNull(),
  eventType: text('event_type').notNull(),
  recipient: text('recipient').notNull(),
  subject: text('subject'),
  status: text('status').notNull(),
  sentAt: integer('sent_at', { mode: 'timestamp' }),
  responseData: text('response_data'), // JSON string with provider response
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const inAppNotifications = sqliteTable('in_app_notifications', {
  id: integer('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  title: text('title').notNull(),
  content: text('content').notNull(),
  eventType: text('event_type').notNull(),
  notificationType: text('notification_type', {
    enum: ['info', 'success', 'warning', 'error', 'announcement']
  }).notNull().default('info'),
  priority: text('priority', {
    enum: ['low', 'normal', 'high', 'urgent']
  }).notNull().default('normal'),
  category: text('category', {
    enum: ['system', 'contribution', 'user', 'admin', 'changelog', 'maintenance']
  }).notNull().default('system'),
  isRead: integer('is_read', { mode: 'boolean' }).notNull().default(false),
  readAt: integer('read_at', { mode: 'timestamp' }),
  actionUrl: text('action_url'),
  metadata: text('metadata'), // JSON string with additional data
  expiresAt: integer('expires_at', { mode: 'timestamp' }),
  createdBy: integer('created_by').references(() => users.id), // For admin-created notifications
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  userIdIdx: index('in_app_notifications_user_id_idx').on(table.userId),
  isReadIdx: index('in_app_notifications_is_read_idx').on(table.isRead),
  createdAtIdx: index('in_app_notifications_created_at_idx').on(table.createdAt),
  eventTypeIdx: index('in_app_notifications_event_type_idx').on(table.eventType),
  userReadIdx: index('in_app_notifications_user_read_idx').on(table.userId, table.isRead),
  expiresAtIdx: index('in_app_notifications_expires_at_idx').on(table.expiresAt),
}));

export const rssFeedItems = sqliteTable('rss_feed_items', {
  id: integer('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  eventType: text('event_type').notNull(),
  link: text('link').notNull(),
  guid: text('guid').notNull().unique(),
  pubDate: integer('pub_date', { mode: 'timestamp' }).notNull(),
  author: text('author'),
  category: text('category'),
  isPublished: integer('is_published', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// Admin notification templates
export const notificationTemplates = sqliteTable('notification_templates', {
  id: integer('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  eventType: text('event_type').notNull(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  notificationType: text('notification_type', {
    enum: ['info', 'success', 'warning', 'error', 'announcement']
  }).notNull().default('info'),
  category: text('category', {
    enum: ['system', 'contribution', 'user', 'admin', 'changelog', 'maintenance']
  }).notNull().default('system'),
  variables: text('variables'), // JSON array of available template variables
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdBy: integer('created_by').notNull().references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// Scheduled notifications
export const scheduledNotifications = sqliteTable('scheduled_notifications', {
  id: integer('id').primaryKey(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  notificationType: text('notification_type', {
    enum: ['info', 'success', 'warning', 'error', 'announcement']
  }).notNull().default('info'),
  targetAudience: text('target_audience', {
    enum: ['all_users', 'specific_roles', 'individual_users']
  }).notNull().default('all_users'),
  targetRoles: text('target_roles'), // JSON array of role names
  targetUserIds: text('target_user_ids'), // JSON array of user IDs
  scheduledAt: integer('scheduled_at', { mode: 'timestamp' }).notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }),
  status: text('status', {
    enum: ['pending', 'processing', 'sent', 'failed', 'cancelled']
  }).notNull().default('pending'),
  sentAt: integer('sent_at', { mode: 'timestamp' }),
  sentCount: integer('sent_count').notNull().default(0),
  failureCount: integer('failure_count').notNull().default(0),
  metadata: text('metadata'), // JSON string with additional data
  createdBy: integer('created_by').notNull().references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  statusIdx: index('scheduled_notifications_status_idx').on(table.status),
  scheduledAtIdx: index('scheduled_notifications_scheduled_at_idx').on(table.scheduledAt),
  statusScheduledIdx: index('scheduled_notifications_status_scheduled_idx').on(table.status, table.scheduledAt),
  createdByIdx: index('scheduled_notifications_created_by_idx').on(table.createdBy),
}));

// Changelogs
export const changelogs = sqliteTable('changelogs', {
  id: integer('id').primaryKey(),
  version: text('version').notNull().unique(),
  title: text('title').notNull(),
  description: text('description'),
  releaseDate: integer('release_date', { mode: 'timestamp' }).notNull(),
  isPublished: integer('is_published', { mode: 'boolean' }).notNull().default(false),
  publishedAt: integer('published_at', { mode: 'timestamp' }),
  notificationSent: integer('notification_sent', { mode: 'boolean' }).notNull().default(false),
  createdBy: integer('created_by').notNull().references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// Changelog entries (features, bugfixes, improvements)
export const changelogEntries = sqliteTable('changelog_entries', {
  id: integer('id').primaryKey(),
  changelogId: integer('changelog_id').notNull().references(() => changelogs.id),
  category: text('category', {
    enum: ['feature', 'bugfix', 'improvement', 'breaking', 'security', 'deprecated']
  }).notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// Notification analytics
export const notificationAnalytics = sqliteTable('notification_analytics', {
  id: integer('id').primaryKey(),
  notificationId: integer('notification_id').references(() => inAppNotifications.id),
  scheduledNotificationId: integer('scheduled_notification_id').references(() => scheduledNotifications.id),
  userId: integer('user_id').notNull().references(() => users.id),
  eventType: text('event_type').notNull(),
  action: text('action', {
    enum: ['delivered', 'read', 'clicked', 'dismissed', 'expired']
  }).notNull(),
  actionUrl: text('action_url'),
  userAgent: text('user_agent'),
  ipAddress: text('ip_address'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const webhookConfigurations = sqliteTable('webhook_configurations', {
  id: integer('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  url: text('url').notNull(),
  method: text('method').notNull().default('POST'), // POST, PUT, PATCH
  contentType: text('content_type').notNull().default('application/json'), // application/json, application/x-www-form-urlencoded

  // Authentication
  authType: text('auth_type').default('none'), // none, bearer, basic, api_key, custom
  authToken: text('auth_token'), // Bearer token or API key
  authUsername: text('auth_username'), // Basic auth username
  authPassword: text('auth_password'), // Basic auth password
  authHeaderName: text('auth_header_name'), // Custom header name for API key

  // Webhook configuration
  secret: text('secret'), // HMAC secret for signature verification
  timeout: integer('timeout').notNull().default(30), // Timeout in seconds
  retryAttempts: integer('retry_attempts').notNull().default(3),
  retryDelay: integer('retry_delay').notNull().default(5), // Delay between retries in seconds

  // Event filtering
  enabledEvents: text('enabled_events').notNull().default('[]'), // JSON array of event types
  eventFilters: text('event_filters'), // JSON object with additional filters

  // Custom headers and payload
  customHeaders: text('custom_headers'), // JSON object with custom headers
  payloadTemplate: text('payload_template'), // Custom payload template (Handlebars-like)

  // Status and metadata
  isEnabled: integer('is_enabled', { mode: 'boolean' }).notNull().default(true),
  lastTriggered: integer('last_triggered', { mode: 'timestamp' }),
  successCount: integer('success_count').notNull().default(0),
  failureCount: integer('failure_count').notNull().default(0),

  // Audit fields
  createdBy: integer('created_by').references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});
