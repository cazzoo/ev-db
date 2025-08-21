import { db } from '../db';
import { changelogs, changelogEntries, inAppNotifications, users } from '../db/schema';
import { eq, desc, sql, and, inArray } from 'drizzle-orm';
import { AdminNotificationService } from './adminNotificationService';

// Types for changelog management
export interface CreateChangelogRequest {
  version: string;
  title: string;
  description?: string;
  releaseDate: Date;
  entries: CreateChangelogEntryRequest[];
  isPublished?: boolean;
  sendNotification?: boolean;
}

export interface CreateChangelogEntryRequest {
  category: 'feature' | 'bugfix' | 'improvement' | 'breaking' | 'security' | 'deprecated';
  title: string;
  description: string;
  sortOrder?: number;
}

export interface UpdateChangelogRequest {
  title?: string;
  description?: string;
  releaseDate?: Date;
  isPublished?: boolean;
}

export interface ChangelogWithEntries {
  id: number;
  version: string;
  title: string;
  description?: string;
  releaseDate: Date;
  isPublished: boolean;
  publishedAt?: Date;
  notificationSent: boolean;
  createdBy: number;
  createdAt: Date;
  updatedAt: Date;
  entries: Array<{
    id: number;
    category: string;
    title: string;
    description: string;
    sortOrder: number;
  }>;
  author?: {
    id: number;
    email: string;
    name?: string;
  };
}

export class ChangelogService {

  // Create a new changelog with entries
  static async createChangelog(data: CreateChangelogRequest, createdBy: number): Promise<number> {
    const now = new Date();

    // Check if version already exists
    const existingChangelog = await db
      .select()
      .from(changelogs)
      .where(eq(changelogs.version, data.version))
      .limit(1);

    if (existingChangelog.length > 0) {
      throw new Error(`Changelog version ${data.version} already exists`);
    }

    // Create the changelog
    const [changelog] = await db.insert(changelogs).values({
      version: data.version,
      title: data.title,
      description: data.description,
      releaseDate: data.releaseDate,
      isPublished: data.isPublished || false,
      publishedAt: data.isPublished ? now : null,
      createdBy: createdBy,
      createdAt: now,
      updatedAt: now,
    }).returning();

    // Create changelog entries
    if (data.entries && data.entries.length > 0) {
      const entriesData = data.entries.map((entry, index) => ({
        changelogId: changelog.id,
        category: entry.category,
        title: entry.title,
        description: entry.description,
        sortOrder: entry.sortOrder || index,
        createdAt: now,
      }));

      await db.insert(changelogEntries).values(entriesData);
    }

    // Send notification if published and requested
    if (data.isPublished && data.sendNotification) {
      await this.sendChangelogNotification(changelog.id, createdBy);
    }

    return changelog.id;
  }

  // Update changelog
  static async updateChangelog(
    id: number,
    data: UpdateChangelogRequest,
    updatedBy: number
  ): Promise<void> {
    const now = new Date();

    // Get current changelog
    const [currentChangelog] = await db
      .select()
      .from(changelogs)
      .where(eq(changelogs.id, id));

    if (!currentChangelog) {
      throw new Error('Changelog not found');
    }

    // Prepare update data
    const updateData: any = {
      ...data,
      updatedAt: now,
    };

    // If publishing for the first time, set publishedAt
    if (data.isPublished && !currentChangelog.isPublished) {
      updateData.publishedAt = now;
    }

    // Update the changelog
    await db
      .update(changelogs)
      .set(updateData)
      .where(eq(changelogs.id, id));

    // Send notification if newly published
    if (data.isPublished && !currentChangelog.isPublished && !currentChangelog.notificationSent) {
      await this.sendChangelogNotification(id, updatedBy);
    }
  }

  // Add entry to changelog
  static async addChangelogEntry(
    changelogId: number,
    entry: CreateChangelogEntryRequest
  ): Promise<number> {
    const now = new Date();

    // Check if changelog exists
    const [changelog] = await db
      .select()
      .from(changelogs)
      .where(eq(changelogs.id, changelogId));

    if (!changelog) {
      throw new Error('Changelog not found');
    }

    // Get the next sort order if not provided
    let sortOrder = entry.sortOrder;
    if (sortOrder === undefined) {
      const maxOrder = await db
        .select({ maxOrder: sql<number>`max(sort_order)` })
        .from(changelogEntries)
        .where(eq(changelogEntries.changelogId, changelogId));

      sortOrder = (maxOrder[0].maxOrder || 0) + 1;
    }

    const [newEntry] = await db.insert(changelogEntries).values({
      changelogId,
      category: entry.category,
      title: entry.title,
      description: entry.description,
      sortOrder,
      createdAt: now,
    }).returning();

    // Update changelog's updatedAt
    await db
      .update(changelogs)
      .set({ updatedAt: now })
      .where(eq(changelogs.id, changelogId));

    return newEntry.id;
  }

  // Get changelog with entries
  static async getChangelog(id: number): Promise<ChangelogWithEntries | null> {
    // Get changelog
    const [changelog] = await db
      .select({
        id: changelogs.id,
        version: changelogs.version,
        title: changelogs.title,
        description: changelogs.description,
        releaseDate: changelogs.releaseDate,
        isPublished: changelogs.isPublished,
        publishedAt: changelogs.publishedAt,
        notificationSent: changelogs.notificationSent,
        createdBy: changelogs.createdBy,
        createdAt: changelogs.createdAt,
        updatedAt: changelogs.updatedAt,
        authorEmail: users.email,
      })
      .from(changelogs)
      .leftJoin(users, eq(changelogs.createdBy, users.id))
      .where(eq(changelogs.id, id));

    if (!changelog) {
      return null;
    }

    // Get entries
    const entries = await db
      .select()
      .from(changelogEntries)
      .where(eq(changelogEntries.changelogId, id))
      .orderBy(changelogEntries.sortOrder);

    return {
      ...changelog,
      entries,
      author: changelog.authorEmail ? {
        id: changelog.createdBy,
        email: changelog.authorEmail,
        name: changelog.authorEmail, // Use email as name since users table doesn't have name field
      } : undefined,
    };
  }

  // Get all changelogs with pagination
  static async getChangelogs(
    page = 1,
    limit = 20,
    publishedOnly = false
  ): Promise<{
    changelogs: ChangelogWithEntries[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const offset = (page - 1) * limit;
    const conditions = publishedOnly ? [eq(changelogs.isPublished, true)] : [];

    // Get changelogs
    let query = db
      .select({
        id: changelogs.id,
        version: changelogs.version,
        title: changelogs.title,
        description: changelogs.description,
        releaseDate: changelogs.releaseDate,
        isPublished: changelogs.isPublished,
        publishedAt: changelogs.publishedAt,
        notificationSent: changelogs.notificationSent,
        createdBy: changelogs.createdBy,
        createdAt: changelogs.createdAt,
        updatedAt: changelogs.updatedAt,
        authorEmail: users.email,
      })
      .from(changelogs)
      .leftJoin(users, eq(changelogs.createdBy, users.id));

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const changelogResults = await query
      .orderBy(desc(changelogs.releaseDate))
      .limit(limit)
      .offset(offset);

    // Get entries for each changelog
    const changelogIds = changelogResults.map(c => c.id);
    const allEntries = changelogIds.length > 0 ? await db
      .select()
      .from(changelogEntries)
      .where(inArray(changelogEntries.changelogId, changelogIds))
      .orderBy(changelogEntries.sortOrder) : [];

    // Group entries by changelog ID
    const entriesByChangelog = allEntries.reduce((acc, entry) => {
      if (!acc[entry.changelogId]) {
        acc[entry.changelogId] = [];
      }
      acc[entry.changelogId].push(entry);
      return acc;
    }, {} as Record<number, typeof allEntries>);

    // Combine changelogs with their entries
    const changelogsWithEntries: ChangelogWithEntries[] = changelogResults.map(changelog => ({
      ...changelog,
      entries: entriesByChangelog[changelog.id] || [],
      author: changelog.authorEmail ? {
        id: changelog.createdBy,
        email: changelog.authorEmail,
        name: changelog.authorEmail, // Use email as name since users table doesn't have name field
      } : undefined,
    }));

    // Get total count
    let countQuery = db
      .select({ count: sql<number>`count(*)` })
      .from(changelogs);

    if (conditions.length > 0) {
      countQuery = countQuery.where(and(...conditions));
    }

    const totalCount = await countQuery;

    return {
      changelogs: changelogsWithEntries,
      pagination: {
        page,
        limit,
        total: totalCount[0].count,
        totalPages: Math.ceil(totalCount[0].count / limit),
      },
    };
  }

  // Delete changelog
  static async deleteChangelog(id: number): Promise<void> {
    // Delete entries first
    await db.delete(changelogEntries).where(eq(changelogEntries.changelogId, id));

    // Delete changelog
    await db.delete(changelogs).where(eq(changelogs.id, id));
  }

  // Send changelog notification to all users
  private static async sendChangelogNotification(changelogId: number, createdBy: number): Promise<void> {
    const changelog = await this.getChangelog(changelogId);
    if (!changelog) {
      throw new Error('Changelog not found');
    }

    // Create notification for all users
    await AdminNotificationService.createNotification({
      title: `📋 New Release: ${changelog.version}`,
      content: `${changelog.title}\n\n${changelog.description || 'Check out the latest updates and improvements!'}`,
      notificationType: 'info',
      targetAudience: 'all_users',
      actionUrl: `/changelog/${changelog.version}`,
      metadata: {
        changelogId: changelog.id,
        version: changelog.version,
        releaseDate: changelog.releaseDate,
      },
    }, createdBy);

    // Mark notification as sent
    await db
      .update(changelogs)
      .set({ notificationSent: true })
      .where(eq(changelogs.id, changelogId));
  }

  // Get latest published changelog
  static async getLatestChangelog(): Promise<ChangelogWithEntries | null> {
    const [latest] = await db
      .select()
      .from(changelogs)
      .where(eq(changelogs.isPublished, true))
      .orderBy(desc(changelogs.releaseDate))
      .limit(1);

    if (!latest) {
      return null;
    }

    return this.getChangelog(latest.id);
  }

  // Update entry
  static async updateChangelogEntry(
    entryId: number,
    data: Partial<CreateChangelogEntryRequest>
  ): Promise<void> {
    await db
      .update(changelogEntries)
      .set(data)
      .where(eq(changelogEntries.id, entryId));
  }

  // Delete entry
  static async deleteChangelogEntry(entryId: number): Promise<void> {
    await db.delete(changelogEntries).where(eq(changelogEntries.id, entryId));
  }
}
