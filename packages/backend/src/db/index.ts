import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';

export const sqlClient = createClient({ url: 'file:sqlite.db' });
export const db = drizzle(sqlClient, { schema });
