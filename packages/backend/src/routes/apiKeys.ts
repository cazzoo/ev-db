import { Hono } from 'hono';
import { db } from '../db';
import { apiKeys, apiUsage, users } from '../db/schema';
import { eq, and, isNull, or, lt, sql, desc } from 'drizzle-orm';
import { hybridAuth, getUserInfo } from '../middleware/auth';
import { getRateLimitStatus } from '../middleware/rateLimiting';
import crypto from 'crypto';

const apiKeysRouter = new Hono();

// Apply hybrid authentication to all API key routes
apiKeysRouter.use('*', hybridAuth());

// Get user's API keys
apiKeysRouter.get('/', async (c) => {
  const { userId } = getUserInfo(c);

  if (!userId) {
    return c.json({ error: 'User ID not found' }, 401);
  }

  const userApiKeys = await db
    .select({
      id: apiKeys.id,
      name: apiKeys.name,
      key: apiKeys.key,
      expiresAt: apiKeys.expiresAt,
      createdAt: apiKeys.createdAt,
      revokedAt: apiKeys.revokedAt,
    })
    .from(apiKeys)
    .where(and(eq(apiKeys.userId, userId), isNull(apiKeys.revokedAt)));

  return c.json({ apiKeys: userApiKeys });
});

// Create new API key
apiKeysRouter.post('/', async (c) => {
  const { userId } = getUserInfo(c);

  if (!userId) {
    return c.json({ error: 'User ID not found' }, 401);
  }

  const { name, expiresAt } = await c.req.json();

  // Generate a secure API key
  const key = `evdb_${crypto.randomBytes(32).toString('hex')}`;

  const newApiKey = await db
    .insert(apiKeys)
    .values({
      userId,
      key,
      name: name || 'Unnamed API Key',
      expiresAt: expiresAt ? new Date(expiresAt).getTime() : null,
      createdAt: Date.now(),
    })
    .returning();

  return c.json({ apiKey: newApiKey[0] }, 201);
});

// Revoke API key
apiKeysRouter.delete('/:id/revoke', async (c) => {
  const { userId } = getUserInfo(c);

  if (!userId) {
    return c.json({ error: 'User ID not found' }, 401);
  }

  const keyId = parseInt(c.req.param('id'));
  if (isNaN(keyId)) {
    return c.json({ error: 'Invalid API key ID' }, 400);
  }

  // Check if the API key belongs to the user
  const apiKey = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.id, keyId), eq(apiKeys.userId, userId)))
    .limit(1);

  if (apiKey.length === 0) {
    return c.json({ error: 'API key not found' }, 404);
  }

  // Revoke the API key
  await db
    .update(apiKeys)
    .set({ revokedAt: Date.now() })
    .where(eq(apiKeys.id, keyId));

  return c.json({ message: 'API key revoked successfully' });
});

// Get API usage statistics
apiKeysRouter.get('/usage/daily', async (c) => {
  const { userId } = getUserInfo(c);

  if (!userId) {
    return c.json({ error: 'User ID not found' }, 401);
  }

  // Get usage for the last 30 days
  const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);

  const usage = await db
    .select({
      date: sql<string>`date(${apiUsage.usedAt} / 1000, 'unixepoch')`,
      count: sql<number>`count(*)`,
    })
    .from(apiUsage)
    .where(
      and(
        or(eq(apiUsage.userId, userId),
           sql`${apiUsage.apiKeyId} IN (SELECT id FROM ${apiKeys} WHERE user_id = ${userId})`),
        sql`${apiUsage.usedAt} > ${thirtyDaysAgo}`
      )
    )
    .groupBy(sql`date(${apiUsage.usedAt} / 1000, 'unixepoch')`)
    .orderBy(desc(sql`date(${apiUsage.usedAt} / 1000, 'unixepoch')`));

  return c.json({ usage });
});

// Get detailed API usage statistics per key
apiKeysRouter.get('/usage/stats', async (c) => {
  const { userId } = getUserInfo(c);

  if (!userId) {
    return c.json({ error: 'User ID not found' }, 401);
  }

  try {
    // Get usage for the last 30 days grouped by API key
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);

    const usageStats = await db
      .select({
        day: sql<string>`date(${apiUsage.usedAt} / 1000, 'unixepoch')`,
        apiKeyId: apiUsage.apiKeyId,
        apiKeyName: apiKeys.name,
        count: sql<number>`count(*)`,
      })
      .from(apiUsage)
      .leftJoin(apiKeys, eq(apiUsage.apiKeyId, apiKeys.id))
      .where(
        and(
          or(eq(apiUsage.userId, userId),
             sql`${apiUsage.apiKeyId} IN (SELECT id FROM ${apiKeys} WHERE user_id = ${userId})`),
          sql`${apiUsage.usedAt} > ${thirtyDaysAgo}`
        )
      )
      .groupBy(
        sql`date(${apiUsage.usedAt} / 1000, 'unixepoch')`,
        apiUsage.apiKeyId,
        apiKeys.name
      )
      .orderBy(
        desc(sql`date(${apiUsage.usedAt} / 1000, 'unixepoch')`),
        apiUsage.apiKeyId
      );

    return c.json(usageStats);
  } catch (error) {
    console.error('Error fetching API usage stats:', error);
    return c.json({ error: 'Failed to fetch API usage statistics' }, 500);
  }
});

// Rate limit status endpoint
apiKeysRouter.get('/rate-limit-status', async (c) => {
  const { userId, userRole } = getUserInfo(c);

  if (!userId) {
    return c.json({ error: 'User ID not found' }, 401);
  }

  const status = getRateLimitStatus(userId, userRole);
  return c.json(status);
});

export default apiKeysRouter;
