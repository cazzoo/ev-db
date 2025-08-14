import { Context, Next } from 'hono';
import { db } from '../db';
import { apiKeys, apiUsage, users } from '../db/schema';
import { eq, and, isNull, or, lt, sql } from 'drizzle-orm';

// Define which endpoints have zero credit cost
const ZERO_CREDIT_ENDPOINTS = new Set([
  '/api/test',
  '/api/apikeys',
  '/api/apikeys/usage/daily',
]);

const ZERO_CREDIT_PATTERNS = [
  /^\/api\/apikeys\/\d+\/revoke$/,
  /^\/api\/contributions\/\d+\/vote$/,
  /^\/api\/contributions\/\d+\/approve$/,
  /^\/api\/contributions\/\d+\/reject$/,
];

// Endpoints that should not consume credits (with method-specific rules)
const ZERO_CREDIT_ENDPOINTS_WITH_METHODS = new Map([
  ['/api/contributions', new Set(['POST'])], // POST to contributions should not auto-deduct credits
]);

// Check if endpoint should have zero credit cost
const isZeroCreditEndpoint = (path: string, method: string): boolean => {
  // Check exact matches
  if (ZERO_CREDIT_ENDPOINTS.has(path)) {
    return true;
  }

  // Check method-specific endpoints
  const allowedMethods = ZERO_CREDIT_ENDPOINTS_WITH_METHODS.get(path);
  if (allowedMethods && allowedMethods.has(method)) {
    return true;
  }

  // Check pattern matches
  return ZERO_CREDIT_PATTERNS.some(pattern => pattern.test(path));
};

// Special header that the frontend will use to identify itself
const FRONTEND_SECRET_HEADER = 'X-Frontend-Secret';
const FRONTEND_SECRET = process.env.FRONTEND_SECRET || 'frontend-secret-key-change-in-production-12345';

// API Key authentication middleware
export const apiKeyAuth = async (c: Context, next: Next) => {
  // Check if this is a frontend request (exempt from API key requirements)
  const frontendSecret = c.req.header(FRONTEND_SECRET_HEADER);
  if (frontendSecret === FRONTEND_SECRET) {
    // This is a legitimate frontend request - allow it to proceed without API key validation
    // Frontend requests are NOT logged to API usage statistics since they don't consume credits
    await next();
    return;
  }

  // For external API calls, require API key authentication
  const apiKey = c.req.header('X-API-Key') || c.req.header('Authorization')?.replace('Bearer ', '');

  if (!apiKey) {
    return c.json({
      error: 'API key required. Please provide your API key in the X-API-Key header or Authorization header.'
    }, 401);
  }

  try {
    // Validate API key
    const [keyRecord] = await db
      .select({
        id: apiKeys.id,
        userId: apiKeys.userId,
        expiresAt: apiKeys.expiresAt,
        revokedAt: apiKeys.revokedAt,
        userRole: users.role,
        userBalance: users.appCurrencyBalance,
      })
      .from(apiKeys)
      .leftJoin(users, eq(apiKeys.userId, users.id))
      .where(
        and(
          eq(apiKeys.key, apiKey),
          isNull(apiKeys.revokedAt), // Not revoked
          or(
            isNull(apiKeys.expiresAt), // No expiration
            sql`${apiKeys.expiresAt} > datetime('now')` // Not expired
          )
        )
      )
      .limit(1);

    if (!keyRecord) {
      return c.json({
        error: 'Invalid or expired API key. Please check your API key or generate a new one.'
      }, 401);
    }

    // Check if this endpoint has zero credit cost
    const isZeroCredit = isZeroCreditEndpoint(c.req.path, c.req.method);

    // Check if user has sufficient credits and deduct if necessary
    if (keyRecord.userRole !== 'ADMIN' && keyRecord.userRole !== 'MODERATOR' && !isZeroCredit) {
      if ((keyRecord.userBalance || 0) <= 0) {
        return c.json({
          error: 'Insufficient credits. Please purchase more credits to continue using the API.'
        }, 402);
      }

      // Deduct 1 credit for the API call
      await db
        .update(users)
        .set({ appCurrencyBalance: (keyRecord.userBalance || 0) - 1 })
        .where(eq(users.id, keyRecord.userId));
    }

    // Log API usage
    await db.insert(apiUsage).values({
      apiKeyId: keyRecord.id,
      userId: keyRecord.userId,
      usedAt: new Date(),
      path: c.req.path,
      method: c.req.method,
    });

    // Store API key info in context for potential use in handlers
    c.set('apiKeyInfo', {
      keyId: keyRecord.id,
      userId: keyRecord.userId,
      userRole: keyRecord.userRole,
    });

    await next();
  } catch (error) {
    console.error('API key validation error:', error);
    return c.json({ error: 'Internal server error during authentication' }, 500);
  }
};

// Middleware specifically for endpoints that should only be accessible via API keys (no frontend access)
export const apiKeyOnlyAuth = async (c: Context, next: Next) => {
  const apiKey = c.req.header('X-API-Key') || c.req.header('Authorization')?.replace('Bearer ', '');

  if (!apiKey) {
    return c.json({
      error: 'API key required. This endpoint is only accessible via API key authentication.'
    }, 401);
  }

  // Use the same validation logic as apiKeyAuth but without frontend exemption
  try {
    const [keyRecord] = await db
      .select({
        id: apiKeys.id,
        userId: apiKeys.userId,
        expiresAt: apiKeys.expiresAt,
        revokedAt: apiKeys.revokedAt,
        userRole: users.role,
        userBalance: users.appCurrencyBalance,
      })
      .from(apiKeys)
      .leftJoin(users, eq(apiKeys.userId, users.id))
      .where(
        and(
          eq(apiKeys.key, apiKey),
          isNull(apiKeys.revokedAt),
          or(
            isNull(apiKeys.expiresAt),
            sql`${apiKeys.expiresAt} > datetime('now')`
          )
        )
      )
      .limit(1);

    if (!keyRecord) {
      return c.json({
        error: 'Invalid or expired API key.'
      }, 401);
    }

    // Check if this endpoint has zero credit cost
    const isZeroCredit = isZeroCreditEndpoint(c.req.path, c.req.method);

    // Check credits and deduct if necessary
    if (keyRecord.userRole !== 'ADMIN' && keyRecord.userRole !== 'MODERATOR' && !isZeroCredit) {
      if ((keyRecord.userBalance || 0) <= 0) {
        return c.json({
          error: 'Insufficient credits.'
        }, 402);
      }

      await db
        .update(users)
        .set({ appCurrencyBalance: (keyRecord.userBalance || 0) - 1 })
        .where(eq(users.id, keyRecord.userId));
    }

    // Log usage
    await db.insert(apiUsage).values({
      apiKeyId: keyRecord.id,
      userId: keyRecord.userId,
      usedAt: new Date(),
      path: c.req.path,
      method: c.req.method,
    });

    c.set('apiKeyInfo', {
      keyId: keyRecord.id,
      userId: keyRecord.userId,
      userRole: keyRecord.userRole,
    });

    await next();
  } catch (error) {
    console.error('API key validation error:', error);
    return c.json({ error: 'Internal server error during authentication' }, 500);
  }
};
