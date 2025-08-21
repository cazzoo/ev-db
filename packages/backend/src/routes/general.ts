import { Hono } from 'hono';
import { apiKeyAuth } from '../middleware/apiKeyAuth';
import { rateLimitMiddleware } from '../middleware/rateLimiting';

const generalRouter = new Hono();

// API test endpoint for external API key validation (with rate limiting)
generalRouter.get('/test', apiKeyAuth, rateLimitMiddleware, async (c) => {
  const apiKeyInfo = c.get('apiKeyInfo' as any);
  return c.json({
    message: 'API key is valid and working!',
    keyId: apiKeyInfo?.keyId,
    userId: apiKeyInfo?.userId,
    userRole: apiKeyInfo?.userRole,
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint (no authentication required)
generalRouter.get('/health', async (c) => {
  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// API information endpoint (no authentication required)
generalRouter.get('/info', async (c) => {
  return c.json({
    name: 'EV Database API',
    version: process.env.npm_package_version || '1.0.0',
    description: 'API for managing electric vehicle data and contributions',
    documentation: '/api/docs',
    endpoints: {
      auth: '/api/auth',
      vehicles: '/api/vehicles',
      contributions: '/api/contributions',
      admin: '/api/admin',
      apiKeys: '/api/apikeys',
      webhooks: '/api/admin/webhooks',
      users: '/api/users',
      images: '/api/images'
    }
  });
});

export default generalRouter;
