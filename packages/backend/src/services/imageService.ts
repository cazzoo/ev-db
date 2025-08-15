import { db } from '../db';
import { vehicleImages, imageContributions } from '../db/schema';
import { eq, and, desc, asc } from 'drizzle-orm';
import { promises as fs } from 'fs';
import path from 'path';

// Base URL for serving images - can be configured via environment variable
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

export interface VehicleImage {
  id: number;
  vehicleId: number;
  filename: string;
  path: string;
  url: string;
  altText?: string;
  caption?: string;
  displayOrder: number;
  fileSize?: number;
  mimeType?: string;
  width?: number;
  height?: number;
  uploadedBy?: number;
  uploadedAt: Date;
  isApproved: boolean;
  approvedBy?: number;
  approvedAt?: Date;
}

export interface ImageContribution {
  id: number;
  userId: number;
  vehicleId: number;
  contributionId?: number;
  filename: string;
  originalFilename: string;
  path: string;
  altText?: string;
  caption?: string;
  fileSize?: number;
  mimeType?: string;
  width?: number;
  height?: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  submittedAt: Date;
  reviewedBy?: number;
  reviewedAt?: Date;
  rejectionReason?: string;
}

/**
 * Get all approved images for a vehicle, ordered by display order
 */
export async function getVehicleImages(vehicleId: number): Promise<VehicleImage[]> {
  const images = await db
    .select()
    .from(vehicleImages)
    .where(and(
      eq(vehicleImages.vehicleId, vehicleId),
      eq(vehicleImages.isApproved, true)
    ))
    .orderBy(asc(vehicleImages.displayOrder), asc(vehicleImages.uploadedAt));

  return images.map(img => ({
    ...img,
    uploadedAt: new Date(img.uploadedAt),
    approvedAt: img.approvedAt ? new Date(img.approvedAt) : undefined,
    isApproved: Boolean(img.isApproved)
  }));
}

/**
 * Get all images for multiple vehicles (for efficient loading)
 */
export async function getImagesForVehicles(vehicleIds: number[]): Promise<Record<number, VehicleImage[]>> {
  if (vehicleIds.length === 0) return {};

  const images = await db
    .select()
    .from(vehicleImages)
    .where(and(
      eq(vehicleImages.isApproved, true)
    ))
    .orderBy(asc(vehicleImages.displayOrder), asc(vehicleImages.uploadedAt));

  const imagesByVehicle: Record<number, VehicleImage[]> = {};

  images.forEach(img => {
    if (vehicleIds.includes(img.vehicleId)) {
      if (!imagesByVehicle[img.vehicleId]) {
        imagesByVehicle[img.vehicleId] = [];
      }
      imagesByVehicle[img.vehicleId].push({
        ...img,
        uploadedAt: new Date(img.uploadedAt),
        approvedAt: img.approvedAt ? new Date(img.approvedAt) : undefined,
        isApproved: Boolean(img.isApproved)
      });
    }
  });

  return imagesByVehicle;
}

/**
 * Create a new image contribution
 */
export async function createImageContribution(data: {
  userId: number;
  vehicleId: number;
  contributionId?: number;
  filename: string;
  originalFilename: string;
  path: string;
  altText?: string;
  caption?: string;
  fileSize?: number;
  mimeType?: string;
  width?: number;
  height?: number;
}): Promise<ImageContribution> {
  const [contribution] = await db
    .insert(imageContributions)
    .values({
      ...data,
      submittedAt: new Date(),
      status: 'PENDING'
    })
    .returning();

  return {
    ...contribution,
    submittedAt: new Date(contribution.submittedAt),
    reviewedAt: contribution.reviewedAt ? new Date(contribution.reviewedAt) : undefined
  };
}

/**
 * Get pending image contributions
 */
export async function getPendingImageContributions(): Promise<ImageContribution[]> {
  const contributions = await db
    .select()
    .from(imageContributions)
    .where(eq(imageContributions.status, 'PENDING'))
    .orderBy(desc(imageContributions.submittedAt));

  return contributions.map(contrib => ({
    ...contrib,
    submittedAt: new Date(contrib.submittedAt),
    reviewedAt: contrib.reviewedAt ? new Date(contrib.reviewedAt) : undefined
  }));
}

/**
 * Approve an image contribution
 */
export async function approveImageContribution(
  contributionId: number,
  reviewerId: number,
  displayOrder?: number
): Promise<VehicleImage> {
  // Get the contribution
  const [contribution] = await db
    .select()
    .from(imageContributions)
    .where(eq(imageContributions.id, contributionId));

  if (!contribution) {
    throw new Error('Image contribution not found');
  }

  if (contribution.status !== 'PENDING') {
    throw new Error('Image contribution is not pending');
  }

  // Move the file from temp to permanent location
  const tempPath = contribution.path;
  const permanentPath = tempPath.replace('/temp/', '/vehicles/');
  const permanentDir = path.dirname(permanentPath);

  // Ensure directory exists
  await fs.mkdir(permanentDir, { recursive: true });
  await fs.rename(tempPath, permanentPath);

  // Create the vehicle image record
  const [vehicleImage] = await db
    .insert(vehicleImages)
    .values({
      vehicleId: contribution.vehicleId,
      filename: contribution.filename,
      path: permanentPath,
      url: `${BASE_URL}/uploads${permanentPath}`,
      altText: contribution.altText,
      caption: contribution.caption,
      displayOrder: displayOrder || 0,
      fileSize: contribution.fileSize,
      mimeType: contribution.mimeType,
      width: contribution.width,
      height: contribution.height,
      uploadedBy: contribution.userId,
      uploadedAt: Date.now(),
      isApproved: true,
      approvedBy: reviewerId,
      approvedAt: Date.now()
    })
    .returning();

  // Update the contribution status
  await db
    .update(imageContributions)
    .set({
      status: 'APPROVED',
      reviewedBy: reviewerId,
      reviewedAt: Date.now()
    })
    .where(eq(imageContributions.id, contributionId));

  return {
    ...vehicleImage,
    uploadedAt: new Date(vehicleImage.uploadedAt),
    approvedAt: new Date(vehicleImage.approvedAt!),
    isApproved: Boolean(vehicleImage.isApproved)
  };
}

/**
 * Reject an image contribution
 */
export async function rejectImageContribution(
  contributionId: number,
  reviewerId: number,
  reason?: string
): Promise<void> {
  const [contribution] = await db
    .select()
    .from(imageContributions)
    .where(eq(imageContributions.id, contributionId));

  if (!contribution) {
    throw new Error('Image contribution not found');
  }

  if (contribution.status !== 'PENDING') {
    throw new Error('Image contribution is not pending');
  }

  // Delete the temporary file
  try {
    await fs.unlink(contribution.path);
  } catch (error) {
    console.warn('Failed to delete temporary file:', contribution.path, error);
  }

  // Update the contribution status
  await db
    .update(imageContributions)
    .set({
      status: 'REJECTED',
      reviewedBy: reviewerId,
      reviewedAt: Date.now(),
      rejectionReason: reason
    })
    .where(eq(imageContributions.id, contributionId));
}

/**
 * Delete a vehicle image
 */
export async function deleteVehicleImage(imageId: number): Promise<void> {
  const [image] = await db
    .select()
    .from(vehicleImages)
    .where(eq(vehicleImages.id, imageId));

  if (!image) {
    throw new Error('Image not found');
  }

  // Delete the file
  try {
    await fs.unlink(image.path);
  } catch (error) {
    console.warn('Failed to delete image file:', image.path, error);
  }

  // Delete the database record
  await db
    .delete(vehicleImages)
    .where(eq(vehicleImages.id, imageId));
}

/**
 * Update image display order
 */
export async function updateImageOrder(vehicleId: number, imageOrders: { id: number; order: number }[]): Promise<void> {
  for (const { id, order } of imageOrders) {
    await db
      .update(vehicleImages)
      .set({ displayOrder: order })
      .where(and(
        eq(vehicleImages.id, id),
        eq(vehicleImages.vehicleId, vehicleId)
      ));
  }
}

/**
 * Clean up image contributions for a cancelled vehicle contribution
 * Removes pending image contributions and their associated files
 */
export async function cleanupImageContributions(vehicleId: number, userId: number): Promise<void> {
  try {
    // Get all pending image contributions for this vehicle by this user
    const pendingImages = await db
      .select()
      .from(imageContributions)
      .where(and(
        eq(imageContributions.vehicleId, vehicleId),
        eq(imageContributions.userId, userId),
        eq(imageContributions.status, 'PENDING')
      ));

    console.log(`Found ${pendingImages.length} pending image contributions to clean up`);

    // Delete the physical files
    for (const image of pendingImages) {
      try {
        const filePath = path.join(process.cwd(), 'uploads', image.path);
        await fs.unlink(filePath);
        console.log(`Deleted file: ${filePath}`);
      } catch (fileError) {
        console.warn(`Failed to delete file ${image.path}:`, fileError);
        // Continue with database cleanup even if file deletion fails
      }
    }

    // Remove the database records
    if (pendingImages.length > 0) {
      await db
        .delete(imageContributions)
        .where(and(
          eq(imageContributions.vehicleId, vehicleId),
          eq(imageContributions.userId, userId),
          eq(imageContributions.status, 'PENDING')
        ));

      console.log(`Cleaned up ${pendingImages.length} image contribution records`);
    }

  } catch (error) {
    console.error('Error cleaning up image contributions:', error);
    // Don't throw - we don't want to prevent contribution cancellation if image cleanup fails
  }
}
