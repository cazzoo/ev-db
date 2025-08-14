import { db } from './db';
import { sql } from 'drizzle-orm';

async function migrate() {
  try {
    console.log('Running migration: Add avatar_url column to users table...');

    // Check if column already exists
    const result = await db.run(sql`PRAGMA table_info(users)`);
    const columns = result.rows || [];
    const hasAvatarUrl = columns.some((col: any) => col.name === 'avatar_url');

    if (hasAvatarUrl) {
      console.log('Column avatar_url already exists, skipping migration.');
      return;
    }

    // Add the column
    await db.run(sql`ALTER TABLE users ADD COLUMN avatar_url text`);
    console.log('Migration completed successfully!');

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
