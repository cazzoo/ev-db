import { Hono } from 'hono';
import { apiKeyAuth } from './middleware/apiKeyAuth';
import { adminAuth, jwtAuth } from './middleware/adminAuth';
import { rateLimitMiddleware } from './middleware/rateLimiting';
import {
  getVehicleImages,
  createImageContribution,
  getPendingImageContributions,
  approveImageContribution,
  rejectImageContribution,
  deleteVehicleImage,
  updateImageOrder
} from './services/imageService';
import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

const imagesRouter = new Hono();

// Apply rate limiting to all image routes
imagesRouter.use('*', rateLimitMiddleware);

// Apply API key authentication to all routes
imagesRouter.use('*', apiKeyAuth);

// Get images for a specific vehicle
imagesRouter.get('/vehicle/:vehicleId', async (c) => {
  const vehicleId = Number(c.req.param('vehicleId'));
  if (isNaN(vehicleId)) {
    return c.json({ error: 'Invalid vehicle ID' }, 400);
  }

  try {
    const images = await getVehicleImages(vehicleId);
    return c.json(images);
  } catch (error) {
    console.error('Error fetching vehicle images:', error);
    return c.json({ error: 'Failed to fetch images' }, 500);
  }
});

// Submit an image contribution (authenticated users)
imagesRouter.post('/contribute', jwtAuth, async (c) => {
  try {
    const payload = c.get('jwtPayload');
    const userId = payload?.userId;
    if (!userId) {
      return c.json({ error: 'Authentication required' }, 401);
    }

    const body = await c.req.parseBody();
    const file = body.image as File;
    const vehicleId = Number(body.vehicleId);
    const contributionId = body.contributionId ? Number(body.contributionId) : undefined;
    const altText = body.altText as string;
    const caption = body.caption as string;

    if (!file) {
      return c.json({ error: 'No image file provided' }, 400);
    }

    if (isNaN(vehicleId)) {
      return c.json({ error: 'Invalid vehicle ID' }, 400);
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return c.json({ error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed.' }, 400);
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return c.json({ error: 'File too large. Maximum size is 10MB.' }, 400);
    }

    // Generate unique filename
    const fileExtension = path.extname(file.name);
    const filename = `${randomUUID()}${fileExtension}`;

    // Create temp directory for pending contributions
    const tempDir = path.join(process.cwd(), 'uploads', 'temp');
    await fs.mkdir(tempDir, { recursive: true });

    const tempPath = path.join(tempDir, filename);

    // Save file to temp location
    const arrayBuffer = await file.arrayBuffer();
    await fs.writeFile(tempPath, new Uint8Array(arrayBuffer));

    // Get image dimensions (basic implementation)
    let width: number | undefined;
    let height: number | undefined;

    // For now, we'll skip dimension detection to keep it simple
    // In a production app, you'd use a library like sharp or jimp

    // Create image contribution record
    const contribution = await createImageContribution({
      userId,
      vehicleId,
      contributionId, // Link to the specific vehicle contribution proposal
      filename,
      originalFilename: file.name,
      path: `temp/${filename}`, // Store relative path for URL construction
      altText,
      caption,
      fileSize: file.size,
      mimeType: file.type,
      width,
      height
    });

    return c.json({
      message: 'Image submitted for review',
      contributionId: contribution.id
    });

  } catch (error) {
    console.error('Error submitting image contribution:', error);
    return c.json({ error: 'Failed to submit image' }, 500);
  }
});

// Get pending image contributions (authenticated users can view for contribution review)
imagesRouter.get('/contributions/pending', jwtAuth, async (c) => {
  try {
    const contributions = await getPendingImageContributions();
    return c.json(contributions);
  } catch (error) {
    console.error('Error fetching pending contributions:', error);
    return c.json({ error: 'Failed to fetch contributions' }, 500);
  }
});

// Approve an image contribution (admin only)
imagesRouter.post('/contributions/:id/approve', ...adminAuth, async (c) => {
  try {
    const contributionId = Number(c.req.param('id'));
    const userId = c.get('userId') as number;
    const body = await c.req.json();
    const displayOrder = body.displayOrder;

    if (isNaN(contributionId)) {
      return c.json({ error: 'Invalid contribution ID' }, 400);
    }

    const vehicleImage = await approveImageContribution(contributionId, userId, displayOrder);
    return c.json({
      message: 'Image approved successfully',
      image: vehicleImage
    });

  } catch (error) {
    console.error('Error approving image contribution:', error);
    return c.json({ error: (error as Error).message || 'Failed to approve image' }, 500);
  }
});

// Reject an image contribution (admin only)
imagesRouter.post('/contributions/:id/reject', ...adminAuth, async (c) => {
  try {
    const contributionId = Number(c.req.param('id'));
    const userId = c.get('userId') as number;
    const body = await c.req.json();
    const reason = body.reason;

    if (isNaN(contributionId)) {
      return c.json({ error: 'Invalid contribution ID' }, 400);
    }

    await rejectImageContribution(contributionId, userId, reason);
    return c.json({ message: 'Image rejected successfully' });

  } catch (error) {
    console.error('Error rejecting image contribution:', error);
    return c.json({ error: (error as Error).message || 'Failed to reject image' }, 500);
  }
});

// Delete a vehicle image (admin only)
imagesRouter.delete('/:id', ...adminAuth, async (c) => {
  try {
    const imageId = Number(c.req.param('id'));

    if (isNaN(imageId)) {
      return c.json({ error: 'Invalid image ID' }, 400);
    }

    await deleteVehicleImage(imageId);
    return c.json({ message: 'Image deleted successfully' });

  } catch (error) {
    console.error('Error deleting image:', error);
    return c.json({ error: (error as Error).message || 'Failed to delete image' }, 500);
  }
});

// Update image display order (admin only)
imagesRouter.put('/vehicle/:vehicleId/order', ...adminAuth, async (c) => {
  try {
    const vehicleId = Number(c.req.param('vehicleId'));
    const body = await c.req.json();
    const imageOrders = body.imageOrders;

    if (isNaN(vehicleId)) {
      return c.json({ error: 'Invalid vehicle ID' }, 400);
    }

    if (!Array.isArray(imageOrders)) {
      return c.json({ error: 'Invalid image orders data' }, 400);
    }

    await updateImageOrder(vehicleId, imageOrders);
    return c.json({ message: 'Image order updated successfully' });

  } catch (error) {
    console.error('Error updating image order:', error);
    return c.json({ error: 'Failed to update image order' }, 500);
  }
});

export { imagesRouter };
