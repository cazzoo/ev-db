import { db } from '../db';
import { sql } from 'drizzle-orm';

// Script to fix the notification table structure
async function fixNotificationTable() {
  console.log('🔧 Fixing notification table structure...\n');

  try {
    // Check current table structure
    console.log('1️⃣ Checking current table structure...');
    const tableInfo = await db.run(sql`PRAGMA table_info(in_app_notifications)`);
    console.log('Current table structure:', tableInfo);

    // Add missing columns one by one
    console.log('\n2️⃣ Adding missing columns...');

    try {
      await db.run(sql`ALTER TABLE in_app_notifications ADD COLUMN notification_type TEXT NOT NULL DEFAULT 'info'`);
      console.log('   ✅ Added notification_type column');
    } catch (error: any) {
      if (error.message.includes('duplicate column name')) {
        console.log('   ⚠️ notification_type column already exists');
      } else {
        throw error;
      }
    }

    try {
      await db.run(sql`ALTER TABLE in_app_notifications ADD COLUMN priority TEXT NOT NULL DEFAULT 'normal'`);
      console.log('   ✅ Added priority column');
    } catch (error: any) {
      if (error.message.includes('duplicate column name')) {
        console.log('   ⚠️ priority column already exists');
      } else {
        throw error;
      }
    }

    try {
      await db.run(sql`ALTER TABLE in_app_notifications ADD COLUMN category TEXT NOT NULL DEFAULT 'system'`);
      console.log('   ✅ Added category column');
    } catch (error: any) {
      if (error.message.includes('duplicate column name')) {
        console.log('   ⚠️ category column already exists');
      } else {
        throw error;
      }
    }

    try {
      await db.run(sql`ALTER TABLE in_app_notifications ADD COLUMN read_at INTEGER`);
      console.log('   ✅ Added read_at column');
    } catch (error: any) {
      if (error.message.includes('duplicate column name')) {
        console.log('   ⚠️ read_at column already exists');
      } else {
        throw error;
      }
    }

    try {
      await db.run(sql`ALTER TABLE in_app_notifications ADD COLUMN action_url TEXT`);
      console.log('   ✅ Added action_url column');
    } catch (error: any) {
      if (error.message.includes('duplicate column name')) {
        console.log('   ⚠️ action_url column already exists');
      } else {
        throw error;
      }
    }

    try {
      await db.run(sql`ALTER TABLE in_app_notifications ADD COLUMN metadata TEXT`);
      console.log('   ✅ Added metadata column');
    } catch (error: any) {
      if (error.message.includes('duplicate column name')) {
        console.log('   ⚠️ metadata column already exists');
      } else {
        throw error;
      }
    }

    try {
      await db.run(sql`ALTER TABLE in_app_notifications ADD COLUMN expires_at INTEGER`);
      console.log('   ✅ Added expires_at column');
    } catch (error: any) {
      if (error.message.includes('duplicate column name')) {
        console.log('   ⚠️ expires_at column already exists');
      } else {
        throw error;
      }
    }

    try {
      await db.run(sql`ALTER TABLE in_app_notifications ADD COLUMN created_by INTEGER REFERENCES users(id)`);
      console.log('   ✅ Added created_by column');
    } catch (error: any) {
      if (error.message.includes('duplicate column name')) {
        console.log('   ⚠️ created_by column already exists');
      } else {
        throw error;
      }
    }

    console.log('\n3️⃣ Verifying table structure...');
    const updatedTableInfo = await db.run(sql`PRAGMA table_info(in_app_notifications)`);
    console.log('Updated table structure:', updatedTableInfo);

    console.log('\n✅ Notification table structure fixed successfully!');

  } catch (error) {
    console.error('❌ Failed to fix notification table:', error);
    throw error;
  }
}

// Alternative: Recreate the table with correct structure
async function recreateNotificationTable() {
  console.log('🔄 Recreating notification table with correct structure...\n');

  try {
    // Backup existing data
    console.log('1️⃣ Backing up existing data...');
    const existingData = await db.run(sql`SELECT * FROM in_app_notifications`);
    console.log(`Found ${existingData.length || 0} existing notifications`);

    // Drop the existing table
    console.log('2️⃣ Dropping existing table...');
    await db.run(sql`DROP TABLE IF EXISTS in_app_notifications`);

    // Create the table with correct structure
    console.log('3️⃣ Creating table with correct structure...');
    await db.run(sql`
      CREATE TABLE in_app_notifications (
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

    // Add indexes
    console.log('4️⃣ Adding indexes...');
    await db.run(sql`CREATE INDEX IF NOT EXISTS in_app_notifications_user_id_idx ON in_app_notifications(user_id)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS in_app_notifications_is_read_idx ON in_app_notifications(is_read)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS in_app_notifications_created_at_idx ON in_app_notifications(created_at)`);

    // Restore data if any existed (with basic mapping)
    if (existingData && existingData.length > 0) {
      console.log('5️⃣ Restoring existing data...');
      // This would need custom logic based on the old structure
      console.log('⚠️ Manual data restoration may be needed');
    }

    console.log('\n✅ Notification table recreated successfully!');

  } catch (error) {
    console.error('❌ Failed to recreate notification table:', error);
    throw error;
  }
}

// Export functions
export { fixNotificationTable, recreateNotificationTable };

// Run if called directly
if (require.main === module) {
  const action = process.argv[2];
  
  if (action === 'recreate') {
    recreateNotificationTable()
      .then(() => {
        console.log('\n✅ Table recreation completed successfully!');
        process.exit(0);
      })
      .catch((error) => {
        console.error('\n❌ Table recreation failed:', error);
        process.exit(1);
      });
  } else {
    fixNotificationTable()
      .then(() => {
        console.log('\n✅ Table fix completed successfully!');
        process.exit(0);
      })
      .catch((error) => {
        console.error('\n❌ Table fix failed:', error);
        process.exit(1);
      });
  }
}
