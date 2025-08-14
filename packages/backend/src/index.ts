import { Hono, Context, Next } from 'hono'
import { serve } from '@hono/node-server'
import { db, sqlClient } from './db'
import { readFile } from 'fs/promises'
import path from 'path'
import { users, vehicles, contributions, apiKeys, apiUsage } from './db/schema'
import auth from './auth'
import vehiclesRouter from './vehicles'
import contributionsRouter from './contributions'
import seedRouter from './seed'
import adminRouter from './admin'
import { jwt } from 'hono/jwt'
import { cors } from 'hono/cors'
import { count, eq, sql, and, isNotNull } from 'drizzle-orm'
import crypto from 'crypto'
import { apiKeyAuth } from './middleware/apiKeyAuth'
import { rateLimitMiddleware, getRateLimitStatus } from './middleware/rateLimiting'

// Simple migration function to add avatar_url column if it doesn't exist
const runMigrations = async () => {
  try {
    console.log('Checking for avatar_url column...');
    // Check if avatar_url column exists
    const result = await sqlClient.execute(`PRAGMA table_info(users)`);
    const columns = result.rows || [];
    console.log('Users table columns:', columns.map((col: any) => col.name));
    const hasAvatarUrl = columns.some((col: any) => col.name === 'avatar_url');

    if (!hasAvatarUrl) {
      console.log('Adding avatar_url column to users table...');
      await sqlClient.execute(`ALTER TABLE users ADD COLUMN avatar_url text`);
      console.log('Migration completed: avatar_url column added');
    } else {
      console.log('avatar_url column already exists');
    }
  } catch (error) {
    console.error('Migration error:', error);
  }
}

const app = new Hono().basePath('/api')
// Safety: ensure required tables exist (idempotent CREATE IF NOT EXISTS)
const ensureApiTables = async () => {
  // api_keys
  await sqlClient.execute(`
    CREATE TABLE IF NOT EXISTS api_keys (
      id integer primary key,
      user_id integer not null,
      key text not null unique,
      name text,
      expires_at integer,
      created_at integer not null,
      revoked_at integer
    );
  `)
  // api_usage - updated schema with nullable api_key_id and user_id
  await sqlClient.execute(`
    CREATE TABLE IF NOT EXISTS api_usage (
      id integer primary key,
      api_key_id integer,
      user_id integer,
      used_at integer not null,
      path text not null,
      method text not null
    );
  `)

  // Check if we need to migrate existing api_usage table
  try {
    const tableInfo = await sqlClient.execute(`PRAGMA table_info(api_usage)`);
    const columns = tableInfo.rows || [];
    const hasUserId = columns.some((col: any) => col.name === 'user_id');
    const apiKeyIdColumn = columns.find((col: any) => col.name === 'api_key_id');
    const apiKeyIdIsNullable = apiKeyIdColumn && apiKeyIdColumn.notnull === 0;

    if (!hasUserId || !apiKeyIdIsNullable) {
      console.log('Migrating api_usage table to add user_id column and make api_key_id nullable...');

      // Create new table with correct schema
      await sqlClient.execute(`
        CREATE TABLE api_usage_new (
          id integer primary key,
          api_key_id integer,
          user_id integer,
          used_at integer not null,
          path text not null,
          method text not null
        );
      `);

      // Copy existing data and populate user_id
      await sqlClient.execute(`
        INSERT INTO api_usage_new (id, api_key_id, user_id, used_at, path, method)
        SELECT
          au.id,
          au.api_key_id,
          ak.user_id,
          au.used_at,
          au.path,
          au.method
        FROM api_usage au
        LEFT JOIN api_keys ak ON au.api_key_id = ak.id
      `);

      // Drop old table and rename new one
      await sqlClient.execute(`DROP TABLE api_usage`);
      await sqlClient.execute(`ALTER TABLE api_usage_new RENAME TO api_usage`);

      console.log('api_usage table migration completed');
    }
  } catch (error) {
    console.warn('api_usage migration error (might be expected):', error);
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'; // Use a strong secret in production

// Apply CORS as the very first middleware to all routes
app.use('*', cors({
  origin: 'http://localhost:5173',
  allowHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Frontend-Secret'],
  allowMethods: ['GET', 'HEAD', 'PUT', 'POST', 'DELETE', 'PATCH'],
  credentials: true,
  maxAge: 86400,
}))



app.get('/', (c) => {
  return c.text('Hello Hono!')
})

// Secure users endpoint with API key authentication and rate limiting
app.get('/users', apiKeyAuth, rateLimitMiddleware, async (c) => {
  const allUsers = await db.select().from(users);
  return c.json(allUsers);
})

// Secure statistics endpoint with API key authentication and rate limiting
app.get('/stats', apiKeyAuth, rateLimitMiddleware, async (c) => {
  const [{ count: usersCount }] = await db.select({ count: count() }).from(users)
  const [{ count: vehiclesCount }] = await db.select({ count: count() }).from(vehicles)
  const [{ count: contributionsTotal }] = await db.select({ count: count() }).from(contributions)
  const [{ count: contributionsPending }] = await db
    .select({ count: count() })
    .from(contributions)
    .where(eq(contributions.status, 'PENDING'))
  const [{ count: contributionsApproved }] = await db
    .select({ count: count() })
    .from(contributions)
    .where(eq(contributions.status, 'APPROVED'))
  const [{ count: contributionsRejected }] = await db
    .select({ count: count() })
    .from(contributions)
    .where(eq(contributions.status, 'REJECTED'))

  // Count distinct contributors
  const [{ contributorsCount }] = await db
    .select({ contributorsCount: sql<number>`count(DISTINCT ${contributions.userId})` })
    .from(contributions)

  return c.json({
    usersCount,
    vehiclesCount,
    contributionsTotal,
    contributionsPending,
    contributionsApproved,
    contributionsRejected,
    contributorsCount,
  })
})

// API test endpoint for external API key validation (with rate limiting)
app.get('/test', apiKeyAuth, rateLimitMiddleware, async (c) => {
  const apiKeyInfo = c.get('apiKeyInfo' as any);
  return c.json({
    message: 'API key is valid and working!',
    keyId: apiKeyInfo?.keyId,
    userId: apiKeyInfo?.userId,
    userRole: apiKeyInfo?.userRole,
    timestamp: new Date().toISOString()
  });
});

app.route('/auth', auth)
app.route('/vehicles', vehiclesRouter)
app.route('/contributions', contributionsRouter)
app.route('/admin', adminRouter)

// API keys routes - hybrid authentication (JWT for frontend, API key for external)
const hybridAuth = async (c: Context, next: Next) => {
  // Check if this is a frontend request first
  const frontendSecret = c.req.header('X-Frontend-Secret');
  if (frontendSecret === (process.env.FRONTEND_SECRET || 'frontend-secret-key-change-in-production-12345')) {
    // For frontend requests, use JWT authentication (no rate limiting)
    const jwtMiddleware = jwt({ secret: JWT_SECRET });
    return jwtMiddleware(c, next);
  } else {
    // For external requests, use API key authentication with rate limiting
    await apiKeyAuth(c, async () => {
      await rateLimitMiddleware(c, next);
    });
    return;
  }
};

app.use('/apikeys/*', hybridAuth)

app.get('/apikeys', async (c) => {
  await ensureApiTables()

  // Get user ID from either JWT payload (frontend) or API key info (external)
  const payload = c.get('jwtPayload')
  const apiKeyInfo = c.get('apiKeyInfo' as any)
  const userId = payload?.userId || apiKeyInfo?.userId

  if (!userId) {
    return c.json({ error: 'User ID not found' }, 401)
  }

  const keys = await db.select().from(apiKeys).where(eq(apiKeys.userId, userId))
  return c.json(keys)
})

app.post('/apikeys', async (c) => {
  await ensureApiTables()

  // Get user ID from either JWT payload (frontend) or API key info (external)
  const payload = c.get('jwtPayload')
  const apiKeyInfo = c.get('apiKeyInfo' as any)
  const userId = payload?.userId || apiKeyInfo?.userId

  if (!userId) {
    return c.json({ error: 'User ID not found' }, 401)
  }

  const body = await c.req.json().catch(() => ({} as any))
  const name = body.name as string | undefined
  const expiresAt = body.expiresAt ? new Date(body.expiresAt) : undefined
  const raw = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '')
  const newKey = {
    userId,
    key: raw,
    name,
    expiresAt,
    createdAt: new Date(),
  }
  const inserted = await db.insert(apiKeys).values(newKey).returning()
  return c.json({ apiKey: inserted[0].key, id: inserted[0].id })
})

app.post('/apikeys/:id/revoke', async (c) => {
  await ensureApiTables()

  // Get user ID from either JWT payload (frontend) or API key info (external)
  const payload = c.get('jwtPayload')
  const apiKeyInfo = c.get('apiKeyInfo' as any)
  const userId = payload?.userId || apiKeyInfo?.userId

  if (!userId) {
    return c.json({ error: 'User ID not found' }, 401)
  }

  const id = Number(c.req.param('id'))
  if (isNaN(id)) return c.json({ error: 'Invalid id' }, 400)

  // Only allow users to revoke their own API keys
  const [existingKey] = await db.select().from(apiKeys).where(and(eq(apiKeys.id, id), eq(apiKeys.userId, userId))).limit(1)
  if (!existingKey) return c.json({ error: 'API key not found or not owned by user' }, 404)

  const updated = await db.update(apiKeys).set({ revokedAt: new Date() }).where(eq(apiKeys.id, id)).returning()
  if (updated.length === 0) return c.json({ error: 'Not found' }, 404)
  return c.json({ message: 'Revoked' })
})

// API usage by day - only counts external API calls (with API keys), not frontend requests
app.get('/apikeys/usage', async (c) => {
  await ensureApiTables()

  // Get user ID from either JWT payload (frontend) or API key info (external)
  const payload = c.get('jwtPayload')
  const apiKeyInfo = c.get('apiKeyInfo' as any)
  const userId = payload?.userId || apiKeyInfo?.userId

  if (!userId) {
    return c.json({ error: 'User ID not found' }, 401)
  }

  // Only count API usage from external API calls (those with apiKeyId)
  // This excludes frontend requests which have apiKeyId = null
  const usage = await db
    .select({
      day: sql<string>`date(${apiUsage.usedAt}, 'unixepoch')`,
      count: count(),
    })
    .from(apiUsage)
    .where(and(
      eq(apiUsage.userId, userId),
      isNotNull(apiUsage.apiKeyId) // Only external API calls, not frontend requests
    ))
    .groupBy(sql`date(${apiUsage.usedAt}, 'unixepoch')`)
  return c.json(usage)
})

// API usage by day per API key - shows usage breakdown by individual API keys
app.get('/apikeys/usage/stats', async (c) => {
  await ensureApiTables()

  // Get user ID from either JWT payload (frontend) or API key info (external)
  const payload = c.get('jwtPayload')
  const apiKeyInfo = c.get('apiKeyInfo' as any)
  const userId = payload?.userId || apiKeyInfo?.userId

  if (!userId) {
    return c.json({ error: 'User ID not found' }, 401)
  }

  // Get usage data grouped by API key and day
  const usage = await db
    .select({
      day: sql<string>`date(${apiUsage.usedAt}, 'unixepoch')`,
      apiKeyId: apiUsage.apiKeyId,
      apiKeyName: apiKeys.name,
      count: count(),
    })
    .from(apiUsage)
    .leftJoin(apiKeys, eq(apiUsage.apiKeyId, apiKeys.id))
    .where(and(
      eq(apiUsage.userId, userId),
      isNotNull(apiUsage.apiKeyId) // Only external API calls, not frontend requests
    ))
    .groupBy(sql`date(${apiUsage.usedAt}, 'unixepoch')`, apiUsage.apiKeyId)
    .orderBy(sql`date(${apiUsage.usedAt}, 'unixepoch')`)

  return c.json(usage)
})

// Debug endpoint to check API usage data - only shows external API calls
app.get('/apikeys/usage/debug', async (c) => {
  await ensureApiTables()

  // Get user ID from either JWT payload (frontend) or API key info (external)
  const payload = c.get('jwtPayload')
  const apiKeyInfo = c.get('apiKeyInfo' as any)
  const userId = payload?.userId || apiKeyInfo?.userId

  if (!userId) {
    return c.json({ error: 'User ID not found' }, 401)
  }

  // Get raw usage data - only external API calls (with apiKeyId)
  const rawUsage = await db
    .select()
    .from(apiUsage)
    .where(and(
      eq(apiUsage.userId, userId),
      isNotNull(apiUsage.apiKeyId) // Only external API calls
    ))
    .limit(10)

  // Get formatted usage data - only external API calls
  const formattedUsage = await db
    .select({
      day: sql<string>`date(${apiUsage.usedAt}, 'unixepoch')`,
      usedAt: apiUsage.usedAt,
      rawTimestamp: sql<number>`${apiUsage.usedAt}`,
      formattedDate: sql<string>`datetime(${apiUsage.usedAt}, 'unixepoch')`,
      count: count(),
    })
    .from(apiUsage)
    .where(and(
      eq(apiUsage.userId, userId),
      isNotNull(apiUsage.apiKeyId) // Only external API calls
    ))
    .groupBy(sql`date(${apiUsage.usedAt}, 'unixepoch')`)
    .limit(10)

  return c.json({
    userId,
    rawUsage: rawUsage.map(r => ({
      ...r,
      jsDate: new Date((r.usedAt as unknown as number) * 1000).toISOString(),
    })),
    formattedUsage,
    currentTimestamp: Math.floor(Date.now() / 1000),
    currentDate: new Date().toISOString(),
  })
})

// Rate limit status endpoint
app.get('/apikeys/rate-limit-status', async (c) => {
  // Get user ID from either JWT payload (frontend) or API key info (external)
  const payload = c.get('jwtPayload')
  const apiKeyInfo = c.get('apiKeyInfo' as any)
  const userId = payload?.userId || apiKeyInfo?.userId
  const userRole = payload?.role || apiKeyInfo?.userRole

  if (!userId) {
    return c.json({ error: 'User ID not found' }, 401)
  }

  const status = getRateLimitStatus(userId, userRole)
  return c.json(status)
})

if (process.env.NODE_ENV !== 'production') {
  app.route('/seed', seedRouter)
}

app.use('/protected/*', jwt({ secret: JWT_SECRET }))

app.get('/protected', (c) => {
  const payload = c.get('jwtPayload');
  return c.json({ message: 'You are authorized', payload });
})

const port = 3000

const startServer = async () => {
  // Ensure tables exist using bootstrap SQL if drizzle migrations not run
  try {
    const bootstrapPath = path.join(__dirname, 'db', 'drizzle', '0001_init.sql')
    const sql = await readFile(bootstrapPath, 'utf-8')
    await sqlClient.execute(sql)
    console.log('Database bootstrap migration applied (or already present).')
  } catch (e) {
    console.warn('Migration bootstrap skipped or failed:', e)
  }

  // Run additional migrations
  await runMigrations();

  // Apply theme column migration if needed
  try {
    await sqlClient.execute(`
      ALTER TABLE users ADD COLUMN theme TEXT DEFAULT 'light';
    `);
    console.log('Theme column migration applied.');
  } catch (e) {
    // Column might already exist, which is fine
    console.log('Theme column migration skipped (likely already exists).');
  }

  // Ensure API tables exist and are migrated
  await ensureApiTables();

  if (process.env.NODE_ENV !== 'production') {
    const { seedUsers } = await import('./db/seed');
    await seedUsers();
  }

  console.log(`Attempting to start server on port ${port}`)

  // Add error handling for the server
  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error)
  })

  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason)
  })

  try {
    console.log('About to call serve function...')
    const server = serve({
      fetch: app.fetch,
      port,
      hostname: 'localhost'
    })
    console.log('Serve function called successfully')
    console.log(`Server successfully started and listening on localhost:${port}`)

  } catch (error) {
    console.error('Error starting server:', error)
    throw error
  }
}

startServer();
