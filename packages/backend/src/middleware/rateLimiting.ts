import { Context, Next } from 'hono';

// Rate limiting configuration
interface RateLimitConfig {
  requests: number;  // Number of requests allowed
  window: number;    // Time window in seconds
  burst?: number;    // Optional burst limit (requests per minute)
}

const RATE_LIMITS: Record<string, RateLimitConfig | null> = {
  // No limits for frontend requests and admin/moderator users
  frontend: null,
  ADMIN: null,
  MODERATOR: null,
  
  // Regular member limits
  MEMBER: {
    requests: 1000,  // 1000 requests per hour
    window: 3600,    // 1 hour
    burst: 20        // max 20 requests per minute for burst protection
  },
  
  // Special limits for test endpoint
  test: {
    requests: 100,   // 100 test requests per hour (generous for testing)
    window: 3600,
  }
};

// In-memory store for rate limiting (use Redis in production for multi-instance)
interface RateLimitEntry {
  count: number;
  resetTime: number;
  burstCount?: number;
  burstResetTime?: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Clean up every minute

export const rateLimitMiddleware = async (c: Context, next: Next) => {
  // Check if this is a frontend request (exempt from rate limiting)
  const frontendSecret = c.req.header('X-Frontend-Secret');
  const FRONTEND_SECRET = process.env.FRONTEND_SECRET || 'frontend-secret-key-change-in-production-12345';
  
  if (frontendSecret === FRONTEND_SECRET) {
    // Frontend requests are not rate limited
    await next();
    return;
  }

  // Get user information from API key validation
  const apiKeyInfo = c.get('apiKeyInfo' as any);
  if (!apiKeyInfo) {
    // If no API key info, this request should have been blocked by auth middleware
    await next();
    return;
  }

  const userId = apiKeyInfo.userId;
  const userRole = apiKeyInfo.userRole;
  const path = c.req.path;

  // Determine rate limit configuration
  let rateLimitConfig: RateLimitConfig | null = null;
  
  // Check for role-based exemptions
  if (userRole === 'ADMIN' || userRole === 'MODERATOR') {
    rateLimitConfig = RATE_LIMITS[userRole];
  } else if (path === '/api/test') {
    rateLimitConfig = RATE_LIMITS.test;
  } else {
    rateLimitConfig = RATE_LIMITS.MEMBER;
  }

  // If no rate limit configured, allow request
  if (!rateLimitConfig) {
    await next();
    return;
  }

  const now = Date.now();
  const windowMs = rateLimitConfig.window * 1000;
  const rateLimitKey = `rate_limit:${userId}`;
  const burstKey = `burst_limit:${userId}`;

  // Get or create rate limit entry
  let entry = rateLimitStore.get(rateLimitKey);
  if (!entry || entry.resetTime < now) {
    entry = {
      count: 0,
      resetTime: now + windowMs,
      burstCount: 0,
      burstResetTime: now + 60000, // 1 minute for burst
    };
    rateLimitStore.set(rateLimitKey, entry);
  }

  // Check burst limit if configured
  if (rateLimitConfig.burst) {
    if (entry.burstResetTime! < now) {
      entry.burstCount = 0;
      entry.burstResetTime = now + 60000;
    }

    if (entry.burstCount! >= rateLimitConfig.burst) {
      return c.json({
        error: 'Rate limit exceeded: Too many requests per minute',
        retryAfter: Math.ceil((entry.burstResetTime! - now) / 1000),
        limit: rateLimitConfig.burst,
        window: '1 minute'
      }, 429);
    }
  }

  // Check main rate limit
  if (entry.count >= rateLimitConfig.requests) {
    return c.json({
      error: 'Rate limit exceeded: Too many requests',
      retryAfter: Math.ceil((entry.resetTime - now) / 1000),
      limit: rateLimitConfig.requests,
      window: `${rateLimitConfig.window} seconds`
    }, 429);
  }

  // Increment counters
  entry.count++;
  if (rateLimitConfig.burst) {
    entry.burstCount = (entry.burstCount || 0) + 1;
  }

  // Add rate limit headers
  c.header('X-RateLimit-Limit', rateLimitConfig.requests.toString());
  c.header('X-RateLimit-Remaining', (rateLimitConfig.requests - entry.count).toString());
  c.header('X-RateLimit-Reset', Math.ceil(entry.resetTime / 1000).toString());

  if (rateLimitConfig.burst) {
    c.header('X-RateLimit-Burst-Limit', rateLimitConfig.burst.toString());
    c.header('X-RateLimit-Burst-Remaining', (rateLimitConfig.burst - (entry.burstCount || 0)).toString());
  }

  await next();
};

// Utility function to get current rate limit status for a user
export const getRateLimitStatus = (userId: number, userRole: string) => {
  if (userRole === 'ADMIN' || userRole === 'MODERATOR') {
    return { unlimited: true };
  }

  const rateLimitKey = `rate_limit:${userId}`;
  const entry = rateLimitStore.get(rateLimitKey);
  const config = RATE_LIMITS.MEMBER;

  if (!entry || !config) {
    return {
      limit: config?.requests || 0,
      remaining: config?.requests || 0,
      resetTime: Date.now() + (config?.window || 3600) * 1000
    };
  }

  return {
    limit: config.requests,
    remaining: Math.max(0, config.requests - entry.count),
    resetTime: entry.resetTime
  };
};
