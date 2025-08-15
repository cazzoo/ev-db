import { Hono } from 'hono';
import { db } from './db';
import { users, vehicles, contributions, contributionReviews, imageContributions } from './db/schema';
import { eq, like, or, count, desc, asc, sql, and, isNotNull } from 'drizzle-orm';
import { adminAuth } from './middleware/adminAuth';
import bcrypt from 'bcryptjs';
import { promises as fs } from 'fs';
import path from 'path';

const adminRouter = new Hono();

// Apply admin authentication to all routes
adminRouter.use('*', ...adminAuth);

// Get all users with pagination, search, and filtering
adminRouter.get('/users', async (c) => {
  try {
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '10');
    const search = c.req.query('search') || '';
    const role = c.req.query('role') || '';
    const sortBy = c.req.query('sortBy') || 'id';
    const sortOrder = c.req.query('sortOrder') || 'asc';

    const offset = (page - 1) * limit;

    // Build where conditions
    let whereConditions = [];

    if (search) {
      whereConditions.push(
        or(
          like(users.email, `%${search}%`),
          like(users.id, `%${search}%`)
        )
      );
    }

    if (role && (role === 'ADMIN' || role === 'MODERATOR' || role === 'MEMBER')) {
      whereConditions.push(eq(users.role, role as 'ADMIN' | 'MODERATOR' | 'MEMBER'));
    }

    // Get total count
    const totalQuery = db.select({ count: count() }).from(users);
    if (whereConditions.length > 0) {
      totalQuery.where(whereConditions.length === 1 ? whereConditions[0] : or(...whereConditions));
    }
    const [{ count: total }] = await totalQuery;

    // Get users with pagination
    let query = db.select({
      id: users.id,
      email: users.email,
      role: users.role,
      appCurrencyBalance: users.appCurrencyBalance,
      avatarUrl: users.avatarUrl,
    }).from(users);

    if (whereConditions.length > 0) {
      query = query.where(whereConditions.length === 1 ? whereConditions[0] : or(...whereConditions));
    }

    // Apply sorting
    const orderBy = sortOrder === 'desc' ? desc : asc;
    switch (sortBy) {
      case 'email':
        query = query.orderBy(orderBy(users.email));
        break;
      case 'role':
        query = query.orderBy(orderBy(users.role));
        break;
      case 'appCurrencyBalance':
        query = query.orderBy(orderBy(users.appCurrencyBalance));
        break;
      default:
        query = query.orderBy(orderBy(users.id));
    }

    const userList = await query.limit(limit).offset(offset);

    return c.json({
      users: userList,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get specific user by ID
adminRouter.get('/users/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    if (isNaN(id)) {
      return c.json({ error: 'Invalid user ID' }, 400);
    }

    const user = await db.select({
      id: users.id,
      email: users.email,
      role: users.role,
      appCurrencyBalance: users.appCurrencyBalance,
      avatarUrl: users.avatarUrl,
    }).from(users).where(eq(users.id, id)).limit(1);

    if (user.length === 0) {
      return c.json({ error: 'User not found' }, 404);
    }

    return c.json(user[0]);
  } catch (error) {
    console.error('Error fetching user:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Update user
adminRouter.put('/users/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    if (isNaN(id)) {
      return c.json({ error: 'Invalid user ID' }, 400);
    }

    const { email, role, appCurrencyBalance, password } = await c.req.json();

    // Validate role
    if (role && !['MEMBER', 'MODERATOR', 'ADMIN'].includes(role)) {
      return c.json({ error: 'Invalid role' }, 400);
    }

    // Validate email format
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return c.json({ error: 'Invalid email format' }, 400);
    }

    // Check if email is already taken by another user
    if (email) {
      const existingUser = await db.select().from(users)
        .where(eq(users.email, email)).limit(1);
      if (existingUser.length > 0 && existingUser[0].id !== id) {
        return c.json({ error: 'Email already taken' }, 409);
      }
    }

    // Prepare update data
    const updateData: any = {};
    if (email !== undefined) updateData.email = email;
    if (role !== undefined) updateData.role = role;
    if (appCurrencyBalance !== undefined) updateData.appCurrencyBalance = parseInt(appCurrencyBalance);
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const updatedUser = await db.update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning({
        id: users.id,
        email: users.email,
        role: users.role,
        appCurrencyBalance: users.appCurrencyBalance,
        avatarUrl: users.avatarUrl,
      });

    if (updatedUser.length === 0) {
      return c.json({ error: 'User not found' }, 404);
    }

    return c.json({ message: 'User updated successfully', user: updatedUser[0] });
  } catch (error) {
    console.error('Error updating user:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Delete user
adminRouter.delete('/users/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    if (isNaN(id)) {
      return c.json({ error: 'Invalid user ID' }, 400);
    }

    // Prevent admin from deleting themselves
    const payload = c.get('jwtPayload');
    if (payload.userId === id) {
      return c.json({ error: 'Cannot delete your own account' }, 400);
    }

    const deletedUser = await db.delete(users)
      .where(eq(users.id, id))
      .returning({ id: users.id, email: users.email });

    if (deletedUser.length === 0) {
      return c.json({ error: 'User not found' }, 404);
    }

    return c.json({ message: 'User deleted successfully', user: deletedUser[0] });
  } catch (error) {
    console.error('Error deleting user:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Bulk operations
adminRouter.post('/users/bulk', async (c) => {
  try {
    const { action, userIds, role, balance } = await c.req.json();

    if (!action || !userIds || !Array.isArray(userIds)) {
      return c.json({ error: 'Invalid request: action and userIds array required' }, 400);
    }

    // Prevent admin from performing bulk operations on themselves
    const payload = c.get('jwtPayload');
    if (userIds.includes(payload.userId)) {
      return c.json({ error: 'Cannot perform bulk operations on your own account' }, 400);
    }

    let result;

    switch (action) {
      case 'delete':
        result = await db.delete(users)
          .where(eq(users.id, userIds[0])) // Start with first ID
          .returning({ id: users.id, email: users.email });

        // Delete remaining users one by one (SQLite limitation)
        for (let i = 1; i < userIds.length; i++) {
          const additionalResult = await db.delete(users)
            .where(eq(users.id, userIds[i]))
            .returning({ id: users.id, email: users.email });
          result.push(...additionalResult);
        }
        break;

      case 'updateRole':
        if (!role || !['MEMBER', 'MODERATOR', 'ADMIN'].includes(role)) {
          return c.json({ error: 'Invalid role' }, 400);
        }

        result = [];
        for (const userId of userIds) {
          const updated = await db.update(users)
            .set({ role })
            .where(eq(users.id, userId))
            .returning({ id: users.id, email: users.email, role: users.role });
          result.push(...updated);
        }
        break;

      case 'updateBalance':
        if (balance === undefined || isNaN(parseInt(balance))) {
          return c.json({ error: 'Invalid balance' }, 400);
        }

        result = [];
        for (const userId of userIds) {
          const updated = await db.update(users)
            .set({ appCurrencyBalance: parseInt(balance) })
            .where(eq(users.id, userId))
            .returning({ id: users.id, email: users.email, appCurrencyBalance: users.appCurrencyBalance });
          result.push(...updated);
        }
        break;

      default:
        return c.json({ error: 'Invalid action' }, 400);
    }

    return c.json({
      message: `Bulk ${action} completed successfully`,
      affectedUsers: result.length,
      users: result
    });
  } catch (error) {
    console.error('Error performing bulk operation:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get user statistics for admin dashboard
adminRouter.get('/stats', async (c) => {
  try {
    // Get total user count
    const [{ totalUsers }] = await db.select({ totalUsers: count() }).from(users);

    // Get user count by role
    const roleStats = await db.select({
      role: users.role,
      count: count(),
    }).from(users).groupBy(users.role);

    // Get users with highest balances
    const topBalances = await db.select({
      id: users.id,
      email: users.email,
      appCurrencyBalance: users.appCurrencyBalance,
    }).from(users).orderBy(desc(users.appCurrencyBalance)).limit(5);

    // Calculate total app currency in circulation
    const [{ totalCurrency }] = await db.select({
      totalCurrency: sql<number>`sum(${users.appCurrencyBalance})`
    }).from(users);

    return c.json({
      totalUsers,
      roleStats: roleStats.reduce((acc, stat) => {
        acc[stat.role] = stat.count;
        return acc;
      }, {} as Record<string, number>),
      topBalances,
      totalCurrency: totalCurrency || 0,
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Delete user avatar (Admin only)
adminRouter.delete('/users/:id/avatar', async (c) => {
  const payload = c.get('jwtPayload');
  if (payload.role !== 'ADMIN') {
    return c.json({ error: 'Unauthorized: Admin access required' }, 403);
  }

  const userId = Number(c.req.param('id'));
  if (isNaN(userId)) {
    return c.json({ error: 'Invalid user ID' }, 400);
  }

  try {
    // Get current avatar URL
    const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (user.length === 0) {
      return c.json({ error: 'User not found' }, 404);
    }

    const currentAvatarUrl = user[0].avatarUrl;
    if (currentAvatarUrl) {
      // Extract filename from URL and delete file
      const filename = currentAvatarUrl.split('/').pop();
      if (filename) {
        const path = require('path');
        const fs = require('fs');
        const uploadsDir = path.join(process.cwd(), 'uploads');
        const filepath = path.join(uploadsDir, filename);
        if (fs.existsSync(filepath)) {
          fs.unlinkSync(filepath);
        }
      }
    }

    // Remove avatar URL from database
    await db.update(users)
      .set({ avatarUrl: null })
      .where(eq(users.id, userId));

    return c.json({ message: 'Avatar deleted successfully' });
  } catch (error) {
    console.error('Error deleting user avatar:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Clean up orphaned contributions (Admin only)
adminRouter.delete('/cleanup-orphaned-contributions', async (c) => {
  const payload = c.get('jwtPayload');
  if (payload.role !== 'ADMIN') {
    return c.json({ error: 'Unauthorized: Admin access required' }, 403);
  }

  try {
    // Find UPDATE contributions that reference non-existent vehicles
    const orphanedContributions = await db.select({
      id: contributions.id,
      targetVehicleId: contributions.targetVehicleId
    })
    .from(contributions)
    .leftJoin(vehicles, eq(contributions.targetVehicleId, vehicles.id))
    .where(
      and(
        eq(contributions.changeType, 'UPDATE'),
        isNotNull(contributions.targetVehicleId),
        sql`${vehicles.id} IS NULL`
      )
    );

    if (orphanedContributions.length === 0) {
      return c.json({
        message: 'No orphaned contributions found',
        cleanedCount: 0
      });
    }

    // Delete the orphaned contributions
    const orphanedIds = orphanedContributions.map(c => c.id);
    let deletedCount = 0;

    for (const id of orphanedIds) {
      // First delete any reviews for this contribution
      await db.delete(contributionReviews).where(eq(contributionReviews.contributionId, id));
      // Then delete the contribution
      await db.delete(contributions).where(eq(contributions.id, id));
      deletedCount++;
    }

    return c.json({
      message: `Successfully cleaned up ${deletedCount} orphaned contributions`,
      cleanedCount: deletedCount,
      orphanedContributions: orphanedContributions.map(c => ({
        contributionId: c.id,
        missingVehicleId: c.targetVehicleId
      }))
    });
  } catch (error) {
    console.error('Error cleaning up orphaned contributions:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Development-only endpoints for wiping data
// Wipe all vehicles (Dev mode only)
adminRouter.delete('/dev/wipe-vehicles', async (c) => {
  // Check if running in development mode
  if (process.env.NODE_ENV === 'production') {
    return c.json({ error: 'This endpoint is only available in development mode' }, 403);
  }

  const payload = c.get('jwtPayload');
  if (payload.role !== 'ADMIN') {
    return c.json({ error: 'Unauthorized: Admin access required' }, 403);
  }

  try {
    console.log('🗑️ Starting vehicle wipe process...');

    // First, get all image contributions to clean up files
    const allImageContribs = await db.select().from(imageContributions);
    console.log(`   📁 Found ${allImageContribs.length} image files to clean up`);

    // Clean up physical image files
    let filesDeleted = 0;
    for (const image of allImageContribs) {
      try {
        const filePath = path.join(process.cwd(), 'uploads', image.path);
        await fs.unlink(filePath);
        filesDeleted++;
      } catch (fileError) {
        console.warn(`   ⚠️ Could not delete file ${image.path}:`, fileError);
        // Continue even if file deletion fails
      }
    }
    console.log(`   🗂️ Deleted ${filesDeleted} physical image files`);

    // Delete all image contributions (they reference vehicles)
    const deletedImageContribs = await db.delete(imageContributions).returning({ id: imageContributions.id });
    console.log(`   ✅ Deleted ${deletedImageContribs.length} image contribution records`);

    // Then, delete all contributions (they may reference vehicles via targetVehicleId)
    const deletedContribs = await db.delete(contributions).returning({ id: contributions.id });
    console.log(`   ✅ Deleted ${deletedContribs.length} contributions`);

    // Finally, delete all vehicles (vehicleImages will cascade automatically)
    const deletedVehicles = await db.delete(vehicles).returning({ id: vehicles.id });
    console.log(`   ✅ Deleted ${deletedVehicles.length} vehicles`);

    return c.json({
      message: `Successfully wiped ${deletedVehicles.length} vehicles, ${deletedContribs.length} contributions, ${deletedImageContribs.length} image contributions, and ${filesDeleted} image files`,
      deletedCounts: {
        vehicles: deletedVehicles.length,
        contributions: deletedContribs.length,
        imageContributions: deletedImageContribs.length,
        imageFiles: filesDeleted
      }
    });
  } catch (error) {
    console.error('Error wiping vehicles:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Wipe all contributions (Dev mode only)
adminRouter.delete('/dev/wipe-contributions', async (c) => {
  // Check if running in development mode
  if (process.env.NODE_ENV === 'production') {
    return c.json({ error: 'This endpoint is only available in development mode' }, 403);
  }

  const payload = c.get('jwtPayload');
  if (payload.role !== 'ADMIN') {
    return c.json({ error: 'Unauthorized: Admin access required' }, 403);
  }

  try {
    console.log('🗑️ Starting contributions wipe process...');

    // First, get all image contributions to clean up files
    const allImageContribs = await db.select().from(imageContributions);
    console.log(`   📁 Found ${allImageContribs.length} image files to clean up`);

    // Clean up physical image files
    let filesDeleted = 0;
    for (const image of allImageContribs) {
      try {
        const filePath = path.join(process.cwd(), 'uploads', image.path);
        await fs.unlink(filePath);
        filesDeleted++;
      } catch (fileError) {
        console.warn(`   ⚠️ Could not delete file ${image.path}:`, fileError);
        // Continue even if file deletion fails
      }
    }
    console.log(`   🗂️ Deleted ${filesDeleted} physical image files`);

    // Delete all image contributions (they reference contributions)
    const deletedImageContribs = await db.delete(imageContributions).returning({ id: imageContributions.id });
    console.log(`   ✅ Deleted ${deletedImageContribs.length} image contribution records`);

    // Delete all contribution reviews to avoid foreign key constraint
    const deletedReviews = await db.delete(contributionReviews).returning({ id: contributionReviews.id });
    console.log(`   ✅ Deleted ${deletedReviews.length} contribution reviews`);

    // Finally delete all contributions
    const deletedContributions = await db.delete(contributions).returning({ id: contributions.id });
    console.log(`   ✅ Deleted ${deletedContributions.length} contributions`);

    return c.json({
      message: `Successfully wiped ${deletedContributions.length} contributions, ${deletedReviews.length} reviews, ${deletedImageContribs.length} image contributions, and ${filesDeleted} image files`,
      deletedCounts: {
        contributions: deletedContributions.length,
        reviews: deletedReviews.length,
        imageContributions: deletedImageContribs.length,
        imageFiles: filesDeleted
      }
    });
  } catch (error) {
    console.error('Error wiping contributions:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default adminRouter;
