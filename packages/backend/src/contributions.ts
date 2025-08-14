import { Hono } from 'hono';
import { db, sqlClient } from './db';
import { contributions, users, contributionReviews, vehicles } from './db/schema';
import { eq, and, count, sql } from 'drizzle-orm';
import { jwt } from 'hono/jwt';
import { apiKeyAuth } from './middleware/apiKeyAuth';
import { moderatorAuth } from './middleware/adminAuth';
import { rateLimitMiddleware } from './middleware/rateLimiting';
import { checkForDuplicate, deductContributionCredit, VehicleData } from './services/vehicleDuplicateService';

const contributionsRouter = new Hono();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Middleware to protect routes for authenticated users
const userAuth = jwt({ secret: JWT_SECRET });

// Real-time duplicate check endpoint (for UI feedback)
contributionsRouter.post('/check-duplicate', userAuth, async (c) => {
  try {
    const { make, model, year, batteryCapacity, range, chargingSpeed } = await c.req.json();

    if (!make || !model || !year) {
      return c.json({ error: 'Make, model, and year are required' }, 400);
    }

    const vehicleData = { make, model, year, batteryCapacity, range, chargingSpeed };
    const duplicateCheck = await checkForDuplicate(vehicleData as VehicleData);

    return c.json(duplicateCheck);
  } catch (error) {
    return c.json({ isDuplicate: false, error: 'Failed to check for duplicates' }, 500);
  }
});

// Apply API key authentication and rate limiting to all contribution routes
contributionsRouter.use('*', apiKeyAuth, rateLimitMiddleware);

// Ensure columns exist for change tracking (idempotent in dev)
let ensured = false;
const ensureChangeColumns = async () => {
  if (ensured) return;
  try { await sqlClient.execute("ALTER TABLE contributions ADD COLUMN change_type text"); } catch (e) {}
  try { await sqlClient.execute("ALTER TABLE contributions ADD COLUMN target_vehicle_id integer"); } catch (e) {}
  try { await sqlClient.execute("ALTER TABLE vehicles ADD COLUMN description text"); } catch (e) {}
  try {
    console.log('Adding cancelled_at column to contributions table...');
    await sqlClient.execute("ALTER TABLE contributions ADD COLUMN cancelled_at integer");
    console.log('Column added successfully!');
  } catch (e: any) {
    if (e.message && e.message.includes('duplicate column name')) {
      console.log('cancelled_at column already exists');
    }
  }

  // Fix any NULL changeType values (from manual migrations)
  try {
    console.log('Fixing NULL changeType values...');
    await sqlClient.execute("UPDATE contributions SET change_type = 'NEW' WHERE change_type IS NULL");
    console.log('NULL changeType values fixed!');
  } catch (e: any) {
    console.log('Error fixing NULL changeType values:', e.message);
  }

  ensured = true;
}

// Submit a new contribution (Authenticated users only)
contributionsRouter.post('/', userAuth, async (c) => {
  await ensureChangeColumns();
  const payload = c.get('jwtPayload');
  const userId = payload.userId;
  const userRole = payload.role || 'MEMBER';

  const { vehicleData, changeType, targetVehicleId } = await c.req.json();

  if (!vehicleData) {
    return c.json({ error: 'Vehicle data is required for contribution' }, 400);
  }

  // Validate required fields
  if (!vehicleData.make || !vehicleData.model || !vehicleData.year) {
    return c.json({ error: 'Make, model, and year are required' }, 400);
  }

  try {
    // Validate target vehicle for UPDATE contributions
    if (changeType === 'UPDATE') {
      if (!targetVehicleId) {
        return c.json({ error: 'Target vehicle ID is required for updates' }, 400);
      }

      // Check if target vehicle exists
      const [targetVehicle] = await db.select().from(vehicles).where(eq(vehicles.id, targetVehicleId)).limit(1);
      if (!targetVehicle) {
        return c.json({ error: 'Cannot find target vehicle' }, 404);
      }
    }

    // Only check for duplicates on NEW contributions (not updates)
    if (changeType !== 'UPDATE') {
      try {
        const duplicateCheck = await checkForDuplicate(vehicleData as VehicleData);

        if (duplicateCheck.isDuplicate) {
          return c.json({
            error: 'Duplicate vehicle detected',
            message: duplicateCheck.message,
            existingVehicle: duplicateCheck.existingVehicle,
            suggestions: duplicateCheck.suggestions
          }, 409); // HTTP 409 Conflict
        }
      } catch (duplicateError) {
        // Continue with submission if duplicate check fails
      }
    }

    // Check credits and deduct if user is not admin/moderator
    // Since we exempted this endpoint from auto-deduction, we need to handle it manually
    // TODO: Re-enable credit deduction once server issues are resolved
    /*
    const apiKeyInfo = c.get('apiKeyInfo' as any);
    if (apiKeyInfo) {
      // This is an API request, check and deduct credits
      const creditDeducted = await deductContributionCredit(apiKeyInfo.userId, apiKeyInfo.userRole);
      if (!creditDeducted) {
        return c.json({
          error: 'Insufficient credits. Please purchase more credits to continue using the API.'
        }, 402);
      }
    }
    // For UI requests (JWT auth), we don't deduct credits for contributions
    // Credits are only deducted for API usage
    */

    const newContribution = await db.insert(contributions).values({
      userId: userId,
      vehicleData: vehicleData,
      status: 'PENDING',
      changeType: changeType === 'UPDATE' ? 'UPDATE' : 'NEW',
      targetVehicleId: targetVehicleId || null,
      createdAt: new Date(),
    }).returning();

    return c.json({ message: 'Contribution submitted successfully', contribution: newContribution[0] }, 201);
  } catch (error) {
    console.error('Error submitting contribution:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get all pending contributions (Public)
contributionsRouter.get('/pending', async (c) => {
  await ensureChangeColumns();
  const pendingContributions = await db
    .select({
      id: contributions.id,
      userId: contributions.userId,
      userEmail: users.email,
      changeType: contributions.changeType,
      targetVehicleId: contributions.targetVehicleId,
      vehicleData: contributions.vehicleData,
      status: contributions.status,
      createdAt: contributions.createdAt,
      approvedAt: contributions.approvedAt,
      rejectedAt: contributions.rejectedAt,
      cancelledAt: contributions.cancelledAt,
      votes: count(contributionReviews.id),
    })
    .from(contributions)
    .leftJoin(contributionReviews, eq(contributions.id, contributionReviews.contributionId))
    .leftJoin(users, eq(contributions.userId, users.id))
    .where(eq(contributions.status, 'PENDING'))
    .groupBy(contributions.id, users.email);
  return c.json(pendingContributions);
});

// Get all contributions (for finding related proposals) (Public)
contributionsRouter.get('/all', async (c) => {
  await ensureChangeColumns();
  const allContributions = await db
    .select({
      id: contributions.id,
      userId: contributions.userId,
      userEmail: users.email,
      changeType: contributions.changeType,
      targetVehicleId: contributions.targetVehicleId,
      vehicleData: contributions.vehicleData,
      status: contributions.status,
      createdAt: contributions.createdAt,
      approvedAt: contributions.approvedAt,
      rejectedAt: contributions.rejectedAt,
      cancelledAt: contributions.cancelledAt,
      votes: count(contributionReviews.id),
    })
    .from(contributions)
    .leftJoin(contributionReviews, eq(contributions.id, contributionReviews.contributionId))
    .leftJoin(users, eq(contributions.userId, users.id))
    .groupBy(contributions.id, users.email)
    .orderBy(contributions.createdAt);
  return c.json(allContributions);
});

// Get contributions by the authenticated user
contributionsRouter.get('/my', userAuth, async (c) => {
  await ensureChangeColumns();
  const payload = c.get('jwtPayload');
  const userId = payload.userId;

  const userContributions = await db
    .select({
      id: contributions.id,
      userId: contributions.userId,
      changeType: contributions.changeType,
      targetVehicleId: contributions.targetVehicleId,
      vehicleData: contributions.vehicleData,
      status: contributions.status,
      createdAt: contributions.createdAt,
      approvedAt: contributions.approvedAt,
      rejectedAt: contributions.rejectedAt,
      cancelledAt: contributions.cancelledAt,
      votes: count(contributionReviews.id),
    })
    .from(contributions)
    .leftJoin(contributionReviews, eq(contributions.id, contributionReviews.contributionId))
    .where(eq(contributions.userId, userId))
    .groupBy(contributions.id);

  return c.json(userContributions);
});

// Vote on a contribution (Authenticated users only)
contributionsRouter.post('/:id/vote', userAuth, async (c) => {
  await ensureChangeColumns();
  const payload = c.get('jwtPayload');
  const userId = payload.userId;
  const contributionId = Number(c.req.param('id'));

  if (isNaN(contributionId)) {
    return c.json({ error: 'Invalid contribution ID' }, 400);
  }

  try {
    // Prevent self-vote
    const [target] = await db.select().from(contributions).where(eq(contributions.id, contributionId)).limit(1);
    if (target && target.userId === userId) {
      return c.json({ error: 'You cannot vote on your own contribution' }, 403);
    }

    // Check if user has already voted on this contribution
    const existingVote = await db.select().from(contributionReviews).where(
      and(eq(contributionReviews.contributionId, contributionId), eq(contributionReviews.userId, userId))
    ).limit(1);

    if (existingVote.length > 0) {
      return c.json({ error: 'You have already voted on this contribution' }, 409);
    }

    // Record the vote
    await db.insert(contributionReviews).values({
      contributionId,
      userId,
      vote: 1, // +1 for upvote
    });

    return c.json({ message: 'Vote recorded successfully' }, 200);
  } catch (error) {
    console.error('Error voting on contribution:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Approve a contribution (Admin/Moderator only)
contributionsRouter.post('/:id/approve', userAuth, async (c) => {
  await ensureChangeColumns();
  const payload = c.get('jwtPayload');
  if (payload.role !== 'ADMIN' && payload.role !== 'MODERATOR') {
    return c.json({ error: 'Unauthorized: Admin or Moderator access required' }, 403);
  }

  const contributionId = Number(c.req.param('id'));
  if (isNaN(contributionId)) {
    return c.json({ error: 'Invalid contribution ID' }, 400);
  }

  try {
    const [contribution] = await db.select().from(contributions).where(eq(contributions.id, contributionId)).limit(1);

    if (!contribution) {
      return c.json({ error: 'Contribution not found' }, 404);
    }

    if (contribution.status !== 'PENDING') {
      return c.json({ error: 'Contribution is not pending' }, 400);
    }

    const vehicleData = contribution.vehicleData as any; // Type assertion for JSON data
    if ((contribution as any).changeType === 'UPDATE' && (contribution as any).targetVehicleId) {
      // Validate that target vehicle still exists before updating
      const [targetVehicle] = await db.select().from(vehicles).where(eq(vehicles.id, (contribution as any).targetVehicleId as number)).limit(1);
      if (!targetVehicle) {
        return c.json({ error: 'Cannot find target vehicle for update' }, 404);
      }

      // Update existing vehicle
      await db.update(vehicles).set(vehicleData).where(eq(vehicles.id, (contribution as any).targetVehicleId as number));
    } else {
      // Insert new vehicle
      await db.insert(vehicles).values(vehicleData);
    }

    // Update contribution status
    await db.update(contributions).set({ status: 'APPROVED', approvedAt: new Date() }).where(eq(contributions.id, contributionId));

    // Award app currency to the contributor
    await db.update(users).set({ appCurrencyBalance: sql`app_currency_balance + 10` }).where(eq(users.id, contribution.userId)); // Award 10 credits

    return c.json({ message: 'Contribution approved successfully' }, 200);
  } catch (error) {
    console.error('Error approving contribution:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Reject a contribution (Admin/Moderator only)
contributionsRouter.post('/:id/reject', userAuth, async (c) => {
  await ensureChangeColumns();
  const payload = c.get('jwtPayload');
  if (payload.role !== 'ADMIN' && payload.role !== 'MODERATOR') {
    return c.json({ error: 'Unauthorized: Admin or Moderator access required' }, 403);
  }

  const contributionId = Number(c.req.param('id'));
  if (isNaN(contributionId)) {
    return c.json({ error: 'Invalid contribution ID' }, 400);
  }

  try {
    const [contribution] = await db.select().from(contributions).where(eq(contributions.id, contributionId)).limit(1);

    if (!contribution) {
      return c.json({ error: 'Contribution not found' }, 404);
    }

    if (contribution.status !== 'PENDING') {
      return c.json({ error: 'Contribution is not pending' }, 400);
    }

    // Update contribution status
    await db.update(contributions).set({ status: 'REJECTED', rejectedAt: new Date() }).where(eq(contributions.id, contributionId));

    return c.json({ message: 'Contribution rejected successfully' }, 200);
  } catch (error) {
    console.error('Error rejecting contribution:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Cancel a contribution (owner only) if still pending
contributionsRouter.post('/:id/cancel', userAuth, async (c) => {
  const payload = c.get('jwtPayload');
  const userId = payload.userId;
  const contributionId = Number(c.req.param('id'));

  if (isNaN(contributionId)) {
    return c.json({ error: 'Invalid contribution ID' }, 400);
  }

  try {
    const [contribution] = await db.select().from(contributions).where(eq(contributions.id, contributionId)).limit(1);
    if (!contribution) {
      return c.json({ error: 'Contribution not found' }, 404);
    }
    if (contribution.userId !== userId) {
      return c.json({ error: 'You can only cancel your own contributions' }, 403);
    }
    if (contribution.status !== 'PENDING') {
      return c.json({ error: 'Only pending contributions can be canceled' }, 400);
    }

    // Update contribution status to CANCELLED with cancelledAt timestamp
    await db.update(contributions)
      .set({ status: 'CANCELLED', cancelledAt: new Date() })
      .where(eq(contributions.id, contributionId));

    return c.json({ message: 'Contribution cancelled successfully' }, 200);
  } catch (error) {
    console.error('Error cancelling contribution:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Update a contribution (owner only) if still pending
contributionsRouter.put('/:id', userAuth, async (c) => {
  await ensureChangeColumns();
  const payload = c.get('jwtPayload');
  const userId = payload.userId;
  const contributionId = Number(c.req.param('id'));

  if (isNaN(contributionId)) {
    return c.json({ error: 'Invalid contribution ID' }, 400);
  }

  const { vehicleData, changeType, targetVehicleId } = await c.req.json();

  if (!vehicleData) {
    return c.json({ error: 'Vehicle data is required for contribution' }, 400);
  }

  // Validate required fields
  if (!vehicleData.make || !vehicleData.model || !vehicleData.year) {
    return c.json({ error: 'Make, model, and year are required' }, 400);
  }

  try {
    const [contribution] = await db.select().from(contributions).where(eq(contributions.id, contributionId)).limit(1);
    if (!contribution) {
      return c.json({ error: 'Contribution not found' }, 404);
    }
    if (contribution.userId !== userId) {
      return c.json({ error: 'You can only update your own contributions' }, 403);
    }
    if (contribution.status !== 'PENDING') {
      return c.json({ error: 'Only pending contributions can be updated' }, 400);
    }

    // Validate target vehicle for UPDATE contributions
    if ((changeType || contribution.changeType) === 'UPDATE') {
      const finalTargetVehicleId = targetVehicleId || contribution.targetVehicleId;
      if (!finalTargetVehicleId) {
        return c.json({ error: 'Target vehicle ID is required for updates' }, 400);
      }

      // Check if target vehicle exists
      const [targetVehicle] = await db.select().from(vehicles).where(eq(vehicles.id, finalTargetVehicleId)).limit(1);
      if (!targetVehicle) {
        return c.json({ error: 'Cannot find target vehicle' }, 404);
      }
    }

    // Update contribution data while preserving votes and other metadata
    await db.update(contributions)
      .set({
        vehicleData: vehicleData,
        changeType: changeType || contribution.changeType,
        targetVehicleId: targetVehicleId || contribution.targetVehicleId
      })
      .where(eq(contributions.id, contributionId));

    return c.json({ message: 'Contribution updated successfully' }, 200);
  } catch (error) {
    console.error('Error updating contribution:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default contributionsRouter;
