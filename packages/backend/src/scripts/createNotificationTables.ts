import { db } from '../db';
import { sql } from 'drizzle-orm';

// Script to create all notification system tables
async function createNotificationTables() {
  console.log('🗄️ Creating notification system tables...\n');

  try {
    // Create in_app_notifications table
    console.log('1️⃣ Creating in_app_notifications table...');
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS in_app_notifications (
        id INTEGER PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        event_type TEXT NOT NULL,
        notification_type TEXT NOT NULL DEFAULT 'info',
        priority TEXT NOT NULL DEFAULT 'normal',
        category TEXT NOT NULL DEFAULT 'system',
        is_read INTEGER NOT NULL DEFAULT 0,
        read_at INTEGER,
        action_url TEXT,
        metadata TEXT,
        expires_at INTEGER,
        created_by INTEGER REFERENCES users(id),
        created_at INTEGER NOT NULL
      )
    `);
    console.log('   ✅ in_app_notifications table created');

    // Create user_notification_preferences table
    console.log('2️⃣ Creating user_notification_preferences table...');
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS user_notification_preferences (
        id INTEGER PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        channel TEXT NOT NULL,
        event_type TEXT NOT NULL,
        enabled INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);
    console.log('   ✅ user_notification_preferences table created');

    // Create scheduled_notifications table
    console.log('3️⃣ Creating scheduled_notifications table...');
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS scheduled_notifications (
        id INTEGER PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        notification_type TEXT NOT NULL DEFAULT 'info',
        target_audience TEXT NOT NULL DEFAULT 'all_users',
        target_roles TEXT,
        target_user_ids TEXT,
        scheduled_at INTEGER NOT NULL,
        expires_at INTEGER,
        status TEXT NOT NULL DEFAULT 'pending',
        sent_at INTEGER,
        sent_count INTEGER NOT NULL DEFAULT 0,
        failure_count INTEGER NOT NULL DEFAULT 0,
        metadata TEXT,
        created_by INTEGER NOT NULL REFERENCES users(id),
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);
    console.log('   ✅ scheduled_notifications table created');

    // Create notification_templates table
    console.log('4️⃣ Creating notification_templates table...');
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS notification_templates (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        event_type TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        notification_type TEXT NOT NULL DEFAULT 'info',
        category TEXT NOT NULL DEFAULT 'system',
        variables TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_by INTEGER NOT NULL REFERENCES users(id),
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);
    console.log('   ✅ notification_templates table created');

    // Create changelogs table
    console.log('5️⃣ Creating changelogs table...');
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS changelogs (
        id INTEGER PRIMARY KEY,
        version TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        description TEXT,
        release_date INTEGER NOT NULL,
        is_published INTEGER NOT NULL DEFAULT 0,
        published_at INTEGER,
        notification_sent INTEGER NOT NULL DEFAULT 0,
        created_by INTEGER NOT NULL REFERENCES users(id),
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);
    console.log('   ✅ changelogs table created');

    // Create changelog_entries table
    console.log('6️⃣ Creating changelog_entries table...');
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS changelog_entries (
        id INTEGER PRIMARY KEY,
        changelog_id INTEGER NOT NULL REFERENCES changelogs(id),
        category TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL
      )
    `);
    console.log('   ✅ changelog_entries table created');

    // Create notification_analytics table
    console.log('7️⃣ Creating notification_analytics table...');
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS notification_analytics (
        id INTEGER PRIMARY KEY,
        notification_id INTEGER REFERENCES in_app_notifications(id),
        scheduled_notification_id INTEGER REFERENCES scheduled_notifications(id),
        user_id INTEGER NOT NULL REFERENCES users(id),
        event_type TEXT NOT NULL,
        action TEXT NOT NULL,
        action_url TEXT,
        user_agent TEXT,
        ip_address TEXT,
        created_at INTEGER NOT NULL
      )
    `);
    console.log('   ✅ notification_analytics table created');

    console.log('\n✅ All notification system tables created successfully!');

    // Add indexes for performance
    console.log('\n📊 Adding performance indexes...');

    await db.run(sql`CREATE INDEX IF NOT EXISTS in_app_notifications_user_id_idx ON in_app_notifications(user_id)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS in_app_notifications_is_read_idx ON in_app_notifications(is_read)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS in_app_notifications_created_at_idx ON in_app_notifications(created_at)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS user_notification_preferences_user_id_idx ON user_notification_preferences(user_id)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS scheduled_notifications_status_idx ON scheduled_notifications(status)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS scheduled_notifications_scheduled_at_idx ON scheduled_notifications(scheduled_at)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS changelogs_is_published_idx ON changelogs(is_published)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS changelogs_release_date_idx ON changelogs(release_date)`);

    console.log('✅ Performance indexes added');

    console.log('\n🎉 Notification system database setup completed successfully!');

  } catch (error) {
    console.error('❌ Failed to create notification tables:', error);
    throw error;
  }
}

// Run the migration
if (require.main === module) {
  createNotificationTables()
    .then(() => {
      console.log('\n✅ Database migration completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Database migration failed:', error);
      process.exit(1);
    });
}

export { createNotificationTables };
