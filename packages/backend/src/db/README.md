# Database Schema & Migrations

This directory contains the unified database schema and migration system for the EV Database backend.

## 📁 Structure

```
src/db/
├── schema.ts          # Complete database schema (22 tables)
├── index.ts          # Database connection and Drizzle setup
├── migrate.ts        # Migration runner script
├── seed.ts           # Database seeding script
└── README.md         # This file
```

## 🗄️ Database Schema

The database contains **22 tables** organized into these categories:

### Core Tables
- `users` - User accounts and authentication
- `vehicles` - Electric vehicle data
- `vehicle_images` - Vehicle image gallery

### Contribution System
- `contributions` - Vehicle data contributions
- `image_contributions` - Image contributions
- `contribution_reviews` - Community reviews
- `moderation_logs` - Moderation actions

### API & Authentication
- `api_keys` - API key management
- `api_usage` - API usage tracking

### Notification System
- `user_notification_preferences` - User notification settings
- `notification_queue` - Outgoing notifications
- `notification_history` - Sent notification history
- `in_app_notifications` - In-app notifications
- `notification_templates` - Admin notification templates
- `scheduled_notifications` - Scheduled notifications
- `notification_analytics` - Notification tracking

### Admin & Configuration
- `admin_settings` - System configuration
- `admin_settings_audit` - Configuration change audit
- `webhook_configurations` - Webhook endpoints

### Content Management
- `changelogs` - Release changelogs
- `changelog_entries` - Individual changelog items
- `rss_feed_items` - RSS feed content

## 🔄 Migration System

### Unified Approach
We use **Drizzle's official migration system** exclusively:

- **Schema Definition**: `schema.ts` (single source of truth)
- **Migration Generation**: `drizzle-kit generate:sqlite`
- **Migration Storage**: `../../drizzle/` directory
- **Migration Execution**: `migrate.ts` script

### Key Commands

```bash
# Generate new migration from schema changes
npx drizzle-kit generate:sqlite

# Run migrations on database
npx tsx src/db/migrate.ts

# Seed database with sample data
npx tsx src/db/seed.ts
```

### Migration Workflow

1. **Modify Schema**: Update `schema.ts` with your changes
2. **Generate Migration**: Run `drizzle-kit generate:sqlite`
3. **Review Migration**: Check generated SQL in `drizzle/` directory
4. **Apply Migration**: Run `migrate.ts` script
5. **Test Changes**: Verify database structure and functionality

## 🧹 Cleanup Completed

The following legacy migration approaches have been **removed**:

- ❌ `src/db/drizzle/` (custom migration directory)
- ❌ `src/db/migrations/` (manual migration files)
- ❌ `src/migrate.ts` (manual migration script)
- ❌ `src/migrate-images.ts` (manual image migration)

## ✅ Benefits of Unified System

1. **Single Source of Truth**: All schema in `schema.ts`
2. **Automatic Generation**: Drizzle generates migrations from schema
3. **Type Safety**: Full TypeScript support
4. **Version Control**: Proper migration versioning
5. **Rollback Support**: Built-in migration rollback
6. **No Conflicts**: No duplicate or conflicting migration files

## 🚀 Getting Started

For new developers:

```bash
# 1. Install dependencies
pnpm install

# 2. Run migrations (creates database)
npx tsx src/db/migrate.ts

# 3. Seed with sample data (optional)
npx tsx src/db/seed.ts

# 4. Start development server
pnpm dev
```

## 📝 Schema Changes

When making schema changes:

1. Edit `src/db/schema.ts`
2. Generate migration: `npx drizzle-kit generate:sqlite`
3. Review the generated SQL
4. Apply migration: `npx tsx src/db/migrate.ts`
5. Test your changes

**Note**: Always backup your database before applying migrations in production!
