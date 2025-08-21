import { Context, Next } from 'hono';
import { getSetting } from '../services/settingsService';

/**
 * Maintenance mode middleware
 * Checks if maintenance mode is enabled and restricts access for regular users
 * Allows admins and moderators to continue using the system
 */
export const maintenanceModeMiddleware = async (c: Context, next: Next) => {
  try {
    // Get maintenance mode setting
    const maintenanceSetting = await getSetting('SYSTEM', 'maintenance_mode');
    const isMaintenanceMode = maintenanceSetting?.value === 'true';

    if (!isMaintenanceMode) {
      // Maintenance mode is disabled, allow all requests
      await next();
      return;
    }

    // Maintenance mode is enabled, check user role
    let userRole: string | null = null;

    // Check if this is a frontend request with JWT
    const frontendSecret = c.req.header('X-Frontend-Secret');
    const FRONTEND_SECRET = process.env.FRONTEND_SECRET || 'frontend-secret-key-change-in-production-12345';

    if (frontendSecret === FRONTEND_SECRET) {
      // Frontend request - check JWT payload
      const payload = c.get('jwtPayload');
      userRole = payload?.role || null;
    } else {
      // API request - check API key info
      const apiKeyInfo = c.get('apiKeyInfo' as any);
      userRole = apiKeyInfo?.userRole || null;
    }

    // Allow admins and moderators to bypass maintenance mode
    if (userRole === 'ADMIN' || userRole === 'MODERATOR') {
      await next();
      return;
    }

    // Block regular users and unauthenticated requests
    return c.json({
      error: 'Service temporarily unavailable',
      message: 'The system is currently under maintenance. Please try again later.',
      maintenanceMode: true
    }, 503);

  } catch (error) {
    console.error('Error checking maintenance mode:', error);
    // If we can't check maintenance mode, allow the request to proceed
    // This prevents the system from being completely locked if there's a database issue
    await next();
  }
};

/**
 * Contribution-specific maintenance mode middleware
 * Only blocks contribution-related actions for regular users
 * Allows read-only access to other parts of the system
 */
export const contributionMaintenanceModeMiddleware = async (c: Context, next: Next) => {
  try {
    // Get maintenance mode setting
    const maintenanceSetting = await getSetting('SYSTEM', 'maintenance_mode');
    const isMaintenanceMode = maintenanceSetting?.value === 'true';

    if (!isMaintenanceMode) {
      // Maintenance mode is disabled, allow all requests
      await next();
      return;
    }

    // Maintenance mode is enabled, check user role
    let userRole: string | null = null;

    // Check if this is a frontend request with JWT
    const frontendSecret = c.req.header('X-Frontend-Secret');
    const FRONTEND_SECRET = process.env.FRONTEND_SECRET || 'frontend-secret-key-change-in-production-12345';

    if (frontendSecret === FRONTEND_SECRET) {
      // Frontend request - check JWT payload
      const payload = c.get('jwtPayload');
      userRole = payload?.role || null;
    } else {
      // API request - check API key info
      const apiKeyInfo = c.get('apiKeyInfo' as any);
      userRole = apiKeyInfo?.userRole || null;
    }

    // Allow admins and moderators to bypass maintenance mode
    if (userRole === 'ADMIN' || userRole === 'MODERATOR') {
      await next();
      return;
    }

    // Block contribution actions for regular users
    return c.json({
      error: 'Contribution system temporarily unavailable',
      message: 'The contribution system is currently under maintenance. Admins and moderators can still access the system.',
      maintenanceMode: true
    }, 503);

  } catch (error) {
    console.error('Error checking contribution maintenance mode:', error);
    // If we can't check maintenance mode, allow the request to proceed
    await next();
  }
};
