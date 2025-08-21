import { Context, Next } from 'hono';
import { jwt } from 'hono/jwt';
import { apiKeyAuth } from './apiKeyAuth';
import { rateLimitMiddleware } from './rateLimiting';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const FRONTEND_SECRET = process.env.FRONTEND_SECRET || 'frontend-secret-key-change-in-production-12345';

/**
 * Standard JWT authentication middleware
 * Used for frontend-only routes that require user authentication
 */
export const jwtAuth = jwt({ secret: JWT_SECRET });

/**
 * Hybrid authentication middleware that supports both JWT (frontend) and API key (external) authentication
 * This is the standard authentication pattern for most API routes
 *
 * @param options Configuration options for the hybrid auth
 * @param options.requireAdmin Whether to require admin role (default: false)
 * @param options.requireModerator Whether to require moderator or admin role (default: false)
 * @param options.enableRateLimit Whether to enable rate limiting for API key requests (default: true)
 */
export const hybridAuth = (options: {
  requireAdmin?: boolean;
  requireModerator?: boolean;
  enableRateLimit?: boolean;
} = {}) => {
  const { requireAdmin = false, requireModerator = false, enableRateLimit = true } = options;

  return async (c: Context, next: Next) => {
    // Check if this is a frontend request first
    const frontendSecret = c.req.header('X-Frontend-Secret');

    if (frontendSecret === FRONTEND_SECRET) {
      // For frontend requests, use JWT authentication (no rate limiting)
      const jwtMiddleware = jwt({ secret: JWT_SECRET });

      try {
        let authPassed = false;
        await jwtMiddleware(c, async () => {
          // Check role requirements for JWT requests
          const payload = c.get('jwtPayload');

          if (requireAdmin && payload?.role !== 'ADMIN') {
            throw new Error('Admin access required');
          }

          if (requireModerator && payload?.role !== 'ADMIN' && payload?.role !== 'MODERATOR') {
            throw new Error('Admin or Moderator access required');
          }

          authPassed = true;
          await next();
        });

        // If we get here and authPassed is false, it means JWT failed
        if (!authPassed) {
          return c.json({ error: 'Invalid or expired JWT token' }, 401);
        }
      } catch (error) {
        // Handle both JWT errors and role requirement errors
        if (error instanceof Error) {
          if (error.message === 'Admin access required') {
            return c.json({ error: 'Admin access required' }, 403);
          }
          if (error.message === 'Admin or Moderator access required') {
            return c.json({ error: 'Admin or Moderator access required' }, 403);
          }
        }
        return c.json({ error: 'Invalid or expired JWT token' }, 401);
      }
    } else {
      // For external requests, use API key authentication
      try {
        await apiKeyAuth(c, async () => {
          // Check role requirements for API key requests
          const apiKeyInfo = c.get('apiKeyInfo' as any);

          if (requireAdmin && apiKeyInfo?.userRole !== 'ADMIN') {
            throw new Error('Admin access required');
          }

          if (requireModerator && apiKeyInfo?.userRole !== 'ADMIN' && apiKeyInfo?.userRole !== 'MODERATOR') {
            throw new Error('Admin or Moderator access required');
          }

          // Apply rate limiting if enabled
          if (enableRateLimit) {
            await rateLimitMiddleware(c, next);
          } else {
            await next();
          }
        });
      } catch (error) {
        // Handle role requirement errors
        if (error instanceof Error) {
          if (error.message === 'Admin access required') {
            return c.json({ error: 'Admin access required' }, 403);
          }
          if (error.message === 'Admin or Moderator access required') {
            return c.json({ error: 'Admin or Moderator access required' }, 403);
          }
        }
        return c.json({ error: 'API key authentication failed' }, 401);
      }
    }
  };
};

/**
 * Admin-only hybrid authentication
 * Convenience wrapper for hybridAuth with admin requirement
 */
export const adminHybridAuth = hybridAuth({ requireAdmin: true });

/**
 * Moderator or Admin hybrid authentication
 * Convenience wrapper for hybridAuth with moderator requirement
 */
export const moderatorHybridAuth = hybridAuth({ requireModerator: true });

/**
 * Hybrid authentication without rate limiting
 * Useful for high-frequency endpoints that shouldn't be rate limited
 */
export const hybridAuthNoRateLimit = hybridAuth({ enableRateLimit: false });

/**
 * Get user information from either JWT payload or API key info
 * Helper function to extract user data consistently across authentication methods
 */
export const getUserInfo = (c: Context): {
  userId: number | null;
  userRole: string | null;
  isJWT: boolean;
  isAPIKey: boolean;
} => {
  const payload = c.get('jwtPayload');
  const apiKeyInfo = c.get('apiKeyInfo' as any);

  if (payload) {
    return {
      userId: payload.userId,
      userRole: payload.role,
      isJWT: true,
      isAPIKey: false,
    };
  }

  if (apiKeyInfo) {
    return {
      userId: apiKeyInfo.userId,
      userRole: apiKeyInfo.userRole,
      isJWT: false,
      isAPIKey: true,
    };
  }

  return {
    userId: null,
    userRole: null,
    isJWT: false,
    isAPIKey: false,
  };
};

/**
 * Middleware to prevent caching of API responses
 * Useful for dynamic endpoints that should always return fresh data
 */
export const noCacheMiddleware = async (c: Context, next: Next) => {
  await next();
  c.header('Cache-Control', 'no-cache, no-store, must-revalidate');
  c.header('Pragma', 'no-cache');
  c.header('Expires', '0');
};

/**
 * Frontend-only authentication middleware
 * Only allows requests with valid frontend secret + JWT token
 * Rejects all API key requests
 */
export const frontendOnlyAuth = async (c: Context, next: Next) => {
  const frontendSecret = c.req.header('X-Frontend-Secret');

  if (frontendSecret !== FRONTEND_SECRET) {
    return c.json({ error: 'This endpoint is only accessible from the frontend application' }, 403);
  }

  const jwtMiddleware = jwt({ secret: JWT_SECRET });
  await jwtMiddleware(c, next);
};

/**
 * API key only authentication middleware
 * Only allows requests with valid API keys
 * Rejects all frontend requests
 */
export const apiKeyOnlyAuth = async (c: Context, next: Next) => {
  const frontendSecret = c.req.header('X-Frontend-Secret');

  if (frontendSecret === FRONTEND_SECRET) {
    return c.json({ error: 'This endpoint is only accessible via API key authentication' }, 403);
  }

  await apiKeyAuth(c, next);
};
