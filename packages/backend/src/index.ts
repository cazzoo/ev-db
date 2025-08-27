import { Hono, Context, Next } from 'hono'
import { serve } from '@hono/node-server'
import { db, sqlClient } from './db'
import { readFile } from 'fs/promises'
import path from 'path'
import {
  users, vehicles, contributions, apiKeys, apiUsage,
  adminSettings, adminSettingsAudit, userNotificationPreferences,
  notificationQueue, notificationHistory, inAppNotifications, rssFeedItems,
  webhookConfigurations
} from './db/schema'
import { jwt } from 'hono/jwt'
import { cors } from 'hono/cors'
import { count, eq, sql, and, isNotNull } from 'drizzle-orm'
import crypto from 'crypto'
import { apiKeyAuth } from './middleware/apiKeyAuth'
import { rateLimitMiddleware, getRateLimitStatus } from './middleware/rateLimiting'
import { jwtAuth } from './middleware/auth'
import { serveStatic } from '@hono/node-server/serve-static'

// Import routers
import auth from './auth'
import vehiclesRouter from './vehicles'
import contributionsRouter from './contributions'
import seedRouter from './seed'
import adminRouter from './admin'
import { imagesRouter } from './images'
import customFieldsRouter from './customFields'
import apiKeysRouter from './routes/apiKeys'
import webhooksRouter from './routes/webhooks'
import usersRouter from './routes/users'
import generalRouter from './routes/general'
import notificationsRouter from './routes/notifications'
import { adminNotificationsRouter } from './routes/adminNotifications'
import { changelogsRouter } from './routes/changelogs'
import { gitChangelogsRouter } from './routes/gitChangelogs'
import { gitWebhooksRouter } from './routes/gitWebhooks'
import { jobScheduler } from './services/scheduledJobs'
// Import notification processor to ensure it starts
import './services/notificationProcessor'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'; // Use a strong secret in production

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
const staticApp = new Hono() // Separate app for static files without /api prefix

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

      // Copy data from old table
      await sqlClient.execute(`
        INSERT INTO api_usage_new (id, api_key_id, user_id, used_at, path, method)
        SELECT id, api_key_id, NULL, used_at, path, method FROM api_usage;
      `);

      // Drop old table and rename new one
      await sqlClient.execute(`DROP TABLE api_usage;`);
      await sqlClient.execute(`ALTER TABLE api_usage_new RENAME TO api_usage;`);

      console.log('Migration completed: api_usage table updated');
    }
  } catch (error) {
    console.error('Migration error for api_usage table:', error);
  }
}

// CORS configuration
app.use('*', cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Frontend-Secret'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
}))

// Basic routes
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

  // Count unique contributors
  const [{ count: contributorsCount }] = await db
    .select({ count: sql<number>`COUNT(DISTINCT ${contributions.userId})` })
    .from(contributions)

  return c.json({
    users: usersCount,
    vehicles: vehiclesCount,
    contributionsTotal,
    contributionsPending,
    contributionsApproved,
    contributionsRejected,
    contributorsCount,
  })
})

// Register all routers
app.route('/auth', auth)
app.route('/vehicles', vehiclesRouter)
app.route('/contributions', contributionsRouter)
app.route('/images', imagesRouter)
app.route('/custom-fields', customFieldsRouter)
app.route('/apikeys', apiKeysRouter)
// Mount specific admin routes BEFORE the general /admin route
app.route('/admin/webhooks', webhooksRouter)
app.route('/admin/notifications', adminNotificationsRouter)
app.route('/admin', adminRouter)
app.route('/changelogs', changelogsRouter)
app.route('/git-changelogs', gitChangelogsRouter)
app.route('/git-webhooks', gitWebhooksRouter)
app.route('/users', usersRouter)
app.route('/', notificationsRouter)
app.route('/', generalRouter)

// Public maintenance status endpoint (no auth required)
app.get('/maintenance-status', async (c) => {
  try {
    const { getSetting } = await import('./services/settingsService');
    const maintenanceSetting = await getSetting('SYSTEM', 'maintenance_mode');
    const isMaintenanceMode = maintenanceSetting?.value === 'true';

    return c.json({
      isMaintenanceMode,
      message: isMaintenanceMode
        ? 'The system is currently under maintenance. Please try again later.'
        : 'System is operational'
    });
  } catch (error) {
    console.error('Error checking maintenance status:', error);
    // If we can't check maintenance mode, assume it's off to prevent lockout
    return c.json({
      isMaintenanceMode: false,
      message: 'System is operational'
    });
  }
});

// Health check endpoint for CI/CD
app.get('/api/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  })
});

// Development seed routes
if (process.env.NODE_ENV !== 'production') {
  app.route('/seed', seedRouter)
}

// Protected route example
app.use('/protected/*', jwtAuth)
app.get('/protected', (c) => {
  const payload = c.get('jwtPayload');
  return c.json({ message: 'You are authorized', payload });
})

// Serve static files from uploads directory (on staticApp without /api prefix)
staticApp.get('/uploads/*', async (c) => {
  const requestPath = c.req.path;
  const filePath = requestPath.replace('/uploads/', '');
  console.log(`📁 Static file request: ${requestPath} -> ${filePath}`);

  const fs = await import('fs/promises');
  const path = await import('path');

  try {
    const fullPath = path.join(process.cwd(), 'uploads', filePath);
    console.log(`📁 Full path: ${fullPath}`);

    const fileBuffer = await fs.readFile(fullPath);
    const ext = path.extname(filePath).toLowerCase();

    // Set appropriate content type
    let contentType = 'application/octet-stream';
    if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
    else if (ext === '.png') contentType = 'image/png';
    else if (ext === '.gif') contentType = 'image/gif';
    else if (ext === '.svg') contentType = 'image/svg+xml';
    else if (ext === '.webp') contentType = 'image/webp';

    c.header('Content-Type', contentType);
    c.header('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year

    return c.body(fileBuffer);
  } catch (error) {
    console.error(`📁 Error serving file ${filePath}:`, error);
    return c.text('File not found', 404);
  }
});

const port = 3000

const startServer = async () => {
  // Ensure tables exist using bootstrap SQL if drizzle migrations not run
  try {
    await ensureApiTables()
    await runMigrations()
    console.log('✅ Database tables ensured')
  } catch (error) {
    console.error('❌ Error ensuring database tables:', error)
  }

  console.log(`🚀 Server is running on port ${port}`)
  console.log(`📖 API Documentation: http://localhost:${port}/api/info`)

  // Start both apps
  serve({
    fetch: app.fetch,
    port
  })

  // Start static file server on a different port or same port with different path
  serve({
    fetch: staticApp.fetch,
    port: port + 1
  })
}

startServer()

// Start job scheduler for automated notifications
console.log('Starting job scheduler for automated notifications...');
jobScheduler.start();

export default app
