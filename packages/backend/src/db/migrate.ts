import { migrate } from 'drizzle-orm/libsql/migrator';
import { db } from './index';

async function main() {
  // This will run migrations on the database, skipping the ones already applied
  await migrate(db, { migrationsFolder: './drizzle' });
}

main();
