import { Hono } from 'hono';
import { db, sqlClient } from './db';
import { contributions, users, contributionReviews, vehicles, imageContributions, vehicleImages, moderationLogs } from './db/schema';
import { eq, and, count, sql, or } from 'drizzle-orm';
import { jwt } from 'hono/jwt';
import { apiKeyAuth } from './middleware/apiKeyAuth';
import { moderatorAuth } from './middleware/adminAuth';
import { rateLimitMiddleware } from './middleware/rateLimiting';
import { checkForDuplicate, deductContributionCredit, VehicleData } from './services/vehicleDuplicateService';
import { promises as fs } from 'fs';
import path from 'path';

// Base URL for serving images - can be configured via environment variable
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

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
  try {
    console.log('Ensuring moderation_logs table exists...');
    await sqlClient.execute(`CREATE TABLE IF NOT EXISTS moderation_logs (
      id INTEGER PRIMARY KEY,
      target_type TEXT NOT NULL DEFAULT 'CONTRIBUTION',
      target_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      moderator_id INTEGER NOT NULL,
      comment TEXT,
      created_at INTEGER NOT NULL
    )`);
  } catch (e: any) {
    console.log('moderation_logs table ensure error:', e.message);
  }
  // New moderation fields
  try {
    console.log('Ensuring rejection_comment column exists...');
    await sqlClient.execute("ALTER TABLE contributions ADD COLUMN rejection_comment text");
  } catch (e: any) {
    if (e.message && e.message.includes('duplicate column name')) {
      console.log('rejection_comment column already exists');
    }
  }
  try {
    console.log('Ensuring rejected_by column exists...');
    await sqlClient.execute("ALTER TABLE contributions ADD COLUMN rejected_by integer");
  } catch (e: any) {
    if (e.message && e.message.includes('duplicate column name')) {
      console.log('rejected_by column already exists');
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
      rejectionComment: (contributions as any).rejectionComment,
      rejectedBy: (contributions as any).rejectedBy,
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
      rejectionComment: (contributions as any).rejectionComment,
      rejectedBy: (contributions as any).rejectedBy,
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
      rejectionComment: (contributions as any).rejectionComment,
      rejectedBy: (contributions as any).rejectedBy,
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
    let finalVehicleId: number;

    if ((contribution as any).changeType === 'UPDATE' && (contribution as any).targetVehicleId) {
      // Validate that target vehicle still exists before updating
      const [targetVehicle] = await db.select().from(vehicles).where(eq(vehicles.id, (contribution as any).targetVehicleId as number)).limit(1);
      if (!targetVehicle) {
        return c.json({ error: 'Cannot find target vehicle for update' }, 404);
      }

      // Update existing vehicle
      await db.update(vehicles).set(vehicleData).where(eq(vehicles.id, (contribution as any).targetVehicleId as number));
      finalVehicleId = (contribution as any).targetVehicleId as number;
    } else {
      // Insert new vehicle and get the ID
      const [newVehicle] = await db.insert(vehicles).values(vehicleData).returning({ id: vehicles.id });
      finalVehicleId = newVehicle.id;
    }

    // Update contribution status
    await db.update(contributions).set({ status: 'APPROVED', approvedAt: new Date() }).where(eq(contributions.id, contributionId));

    // Approve associated image contributions
    const associatedImages = await db
      .select()
      .from(imageContributions)
      .where(eq(imageContributions.contributionId, contributionId));

    console.log(`✅ Found ${associatedImages.length} associated images to approve for contribution ${contributionId}`);

    // Move images from temp to permanent location and approve them
    for (const image of associatedImages) {
      try {
        // Move file from temp to permanent location
        const tempPath = path.join(process.cwd(), 'uploads', image.path);
        const permanentRelativePath = image.path.replace('temp/', 'vehicles/');
        const permanentPath = path.join(process.cwd(), 'uploads', permanentRelativePath);

        // Ensure vehicles directory exists
        await fs.mkdir(path.dirname(permanentPath), { recursive: true });

        // Move the file
        await fs.rename(tempPath, permanentPath);
        console.log(`   📁 Moved ${image.path} to ${permanentRelativePath}`);

        // Use the final vehicle ID (either updated existing or newly created)
        const targetVehicleId = finalVehicleId;

        // Get the next display order for this vehicle
        const existingImages = await db
          .select({ displayOrder: vehicleImages.displayOrder })
          .from(vehicleImages)
          .where(eq(vehicleImages.vehicleId, targetVehicleId))
          .orderBy(sql`display_order DESC`)
          .limit(1);

        const nextDisplayOrder = existingImages.length > 0 ? existingImages[0].displayOrder + 1 : 0;

        // Create a new record in vehicle_images table
        await db.insert(vehicleImages).values({
          vehicleId: targetVehicleId,
          filename: image.filename,
          path: permanentRelativePath,
          url: `${BASE_URL}/uploads/${permanentRelativePath}`,
          altText: image.altText,
          caption: image.caption,
          displayOrder: nextDisplayOrder,
          fileSize: image.fileSize,
          mimeType: image.mimeType,
          width: image.width,
          height: image.height,
          uploadedBy: image.userId,
          uploadedAt: new Date(),
          isApproved: true,
          approvedBy: payload.userId, // The admin/moderator who approved it
          approvedAt: new Date()
        });

        console.log(`   ✅ Created vehicle_images record for vehicle ${targetVehicleId} with display order ${nextDisplayOrder}`);

        // Update image contribution status to APPROVED (keep for audit trail)
        await db
          .update(imageContributions)
          .set({
            status: 'APPROVED',
            reviewedBy: payload.userId,
            reviewedAt: new Date(),
            path: permanentRelativePath // Update to permanent path
          })
          .where(eq(imageContributions.id, image.id));
      } catch (fileError) {
        console.error(`   ❌ Error processing image ${image.path}:`, fileError);
        // Mark image as rejected if file operations fail
        await db
          .update(imageContributions)
          .set({
            status: 'REJECTED',
            reviewedAt: new Date(),
            rejectionReason: 'File processing error during approval'
          })
          .where(eq(imageContributions.id, image.id));
      }
    }

    // Award app currency to the contributor
    await db.update(users).set({ appCurrencyBalance: sql`app_currency_balance + 10` }).where(eq(users.id, contribution.userId)); // Award 10 credits

    const imageApprovalMessage = associatedImages.length > 0
      ? ` and ${associatedImages.length} associated image(s) approved`
      : '';

    return c.json({
      message: `Contribution approved successfully${imageApprovalMessage}`,
      imagesApproved: associatedImages.length
    }, 200);
  } catch (error) {
    console.error('Error approving contribution:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Simple HTML escape to prevent XSS in stored comments
const escapeHtml = (unsafe: string) => unsafe
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

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

  // Parse and validate rejection comment
  let body: any = {};
  try { body = await c.req.json(); } catch {}
  const rawComment: string = (body?.comment || '').toString();
  const comment = rawComment.trim();
  if (!comment || comment.length < 10) {
    return c.json({ error: 'Rejection comment is required and must be at least 10 characters.' }, 400);
  }
  const sanitizedComment = escapeHtml(comment);

  try {
    const [contribution] = await db.select().from(contributions).where(eq(contributions.id, contributionId)).limit(1);

    if (!contribution) {
      return c.json({ error: 'Contribution not found' }, 404);
    }

    if (contribution.status !== 'PENDING') {
      return c.json({ error: 'Contribution is not pending' }, 400);
    }

    // Find and clean up associated image contributions
    const associatedImages = await db
      .select()
      .from(imageContributions)
      .where(eq(imageContributions.contributionId, contributionId));

    console.log(`🗑️ Found ${associatedImages.length} associated images to clean up for contribution ${contributionId}`);

    // Delete image files and update their status
    for (const image of associatedImages) {
      try {
        // Delete the physical file
        const filePath = path.join(process.cwd(), 'uploads', image.path);
        await fs.unlink(filePath);
        console.log(`   ✅ Deleted file: ${image.path}`);
      } catch (fileError) {
        console.warn(`   ⚠️ Could not delete file ${image.path}:`, fileError);
        // Continue even if file deletion fails
      }

      // Update image contribution status to REJECTED
      await db
        .update(imageContributions)
        .set({
          status: 'REJECTED',
          reviewedAt: new Date(),
          rejectionReason: 'Associated vehicle contribution was rejected'
        })
        .where(eq(imageContributions.id, image.id));
    }

    // Update contribution status and store moderation fields
    await db.update(contributions)
      .set({
        status: 'REJECTED',
        rejectedAt: new Date(),
        rejectionComment: sanitizedComment,
        rejectedBy: payload.userId
      })
      .where(eq(contributions.id, contributionId));

    // Send notification email (dev stub)
    try {
      const [contributor] = await db.select({ id: users.id, email: users.email }).from(users).where(eq(users.id, contribution.userId)).limit(1);
      if (contributor?.email) {
        const { sendContributionRejectionEmail } = await import('./services/emailService');
        await sendContributionRejectionEmail(contributor.email, contribution.vehicleData as any, comment);
      }
    } catch (emailErr) {
      console.warn('Email notification failed:', emailErr);
    }

    // Audit log + moderation log row
    console.log(`AUDIT: Contribution ${contributionId} rejected by user ${payload.userId} at ${new Date().toISOString()} with reason: ${comment}`);
    try {
      await db.insert(moderationLogs).values({
        targetType: 'CONTRIBUTION',
        targetId: contributionId,
        action: 'REJECT',
        moderatorId: payload.userId,
        comment: sanitizedComment,
        createdAt: new Date(),
      });
    } catch (logErr) {
      console.warn('Failed to persist moderation log:', logErr);
    }

    const imageCleanupMessage = associatedImages.length > 0
      ? ` and ${associatedImages.length} associated image(s) cleaned up`
      : '';

    return c.json({
      message: `Contribution rejected successfully${imageCleanupMessage}`,
      imagesCleanedUp: associatedImages.length,
      rejectionComment: sanitizedComment
    }, 200);
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

    // Find and clean up associated image contributions
    const associatedImages = await db
      .select()
      .from(imageContributions)
      .where(eq(imageContributions.contributionId, contributionId));

    console.log(`🗑️ Found ${associatedImages.length} associated images to clean up for cancelled contribution ${contributionId}`);

    // Delete image files and update their status
    for (const image of associatedImages) {
      try {
        // Delete the physical file
        const filePath = path.join(process.cwd(), 'uploads', image.path);
        await fs.unlink(filePath);
        console.log(`   ✅ Deleted file: ${image.path}`);
      } catch (fileError) {
        console.warn(`   ⚠️ Could not delete file ${image.path}:`, fileError);
        // Continue even if file deletion fails
      }

      // Update image contribution status to CANCELLED
      await db
        .update(imageContributions)
        .set({
          status: 'CANCELLED',
          reviewedAt: new Date(),
          rejectionReason: 'Associated vehicle contribution was cancelled'
        })
        .where(eq(imageContributions.id, image.id));
    }

    // Update contribution status to CANCELLED with cancelledAt timestamp
    await db.update(contributions)
      .set({ status: 'CANCELLED', cancelledAt: new Date() })
      .where(eq(contributions.id, contributionId));

// Resubmit a rejected contribution (owner only): clone into new PENDING proposal keeping vehicleData
contributionsRouter.post('/:id/resubmit', userAuth, async (c) => {
  await ensureChangeColumns();
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
      return c.json({ error: 'You can only resubmit your own contributions' }, 403);
    }
    if (contribution.status !== 'REJECTED') {
      return c.json({ error: 'Only rejected contributions can be resubmitted' }, 400);
    }

    // Create a fresh pending contribution with same payload; clear moderation fields
    const [newContribution] = await db.insert(contributions).values({
      userId: contribution.userId,
      vehicleData: contribution.vehicleData,
      status: 'PENDING',
      changeType: contribution.changeType,
      targetVehicleId: contribution.targetVehicleId,
      createdAt: new Date(),
    }).returning();

    return c.json({ message: 'Contribution resubmitted successfully', contribution: newContribution }, 201);
  } catch (error) {
    console.error('Error resubmitting contribution:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

    const imageCleanupMessage = associatedImages.length > 0
      ? ` and ${associatedImages.length} associated image(s) cleaned up`
      : '';

    return c.json({
      message: `Contribution cancelled successfully${imageCleanupMessage}`,
      imagesCleanedUp: associatedImages.length
    }, 200);
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
