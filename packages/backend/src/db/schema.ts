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
});

export const contributionReviews = sqliteTable('contribution_reviews', {
  id: integer('id').primaryKey(),
  contributionId: integer('contribution_id').notNull().references(() => contributions.id),
  userId: integer('user_id').notNull().references(() => users.id),
  vote: integer('vote').notNull(), // +1 for upvote
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
