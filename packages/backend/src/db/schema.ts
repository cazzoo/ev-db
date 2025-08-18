import { integer, sqliteTable, text, primaryKey } from 'drizzle-orm/sqlite-core';

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
});

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
