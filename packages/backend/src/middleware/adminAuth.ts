import { Context, Next } from 'hono';
import { jwt } from 'hono/jwt';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// JWT middleware for authentication
export const jwtAuth = jwt({ secret: JWT_SECRET });

// Admin role check middleware (use after jwtAuth)
export const adminOnly = async (c: Context, next: Next) => {
  const payload = c.get('jwtPayload');
  
  if (!payload) {
    return c.json({ error: 'Unauthorized: No valid token' }, 401);
  }
  
  if (payload.role !== 'ADMIN') {
    return c.json({ error: 'Unauthorized: Admin access required' }, 403);
  }
  
  await next();
};

// Moderator or Admin role check middleware (use after jwtAuth)
export const moderatorOrAdmin = async (c: Context, next: Next) => {
  const payload = c.get('jwtPayload');
  
  if (!payload) {
    return c.json({ error: 'Unauthorized: No valid token' }, 401);
  }
  
  if (payload.role !== 'ADMIN' && payload.role !== 'MODERATOR') {
    return c.json({ error: 'Unauthorized: Admin or Moderator access required' }, 403);
  }
  
  await next();
};

// Combined JWT + Admin middleware for convenience
export const adminAuth = [jwtAuth, adminOnly];

// Combined JWT + Moderator/Admin middleware for convenience
export const moderatorAuth = [jwtAuth, moderatorOrAdmin];
