import { db } from '../db';
import { gitCommits, commitFilters, changelogs, changelogEntries } from '../db/schema';
import { eq, desc, and, inArray, isNull, or } from 'drizzle-orm';
import { GitCommitParser, GitCommit } from './gitCommitParser';
import { CommitCategorizationService, CategorizedCommit, CommitCategory } from './commitCategorizationService';

export interface GitChangelogOptions {
  version?: string;
  title?: string;
  description?: string;
  releaseDate?: Date;
  includeUnreleased?: boolean;
  filterRules?: string[]; // Filter rule IDs to apply
}

export interface GenerateChangelogResult {
  changelogId: number;
  entriesCreated: number;
  commitsProcessed: number;
  commitsSkipped: number;
}

export class GitChangelogService {
  private gitParser: GitCommitParser;
  private categorizer: CommitCategorizationService;

  constructor(repoPath?: string) {
    this.gitParser = new GitCommitParser(repoPath);
    this.categorizer = new CommitCategorizationService();
  }

  /**
   * Sync Git commits to database
   */
  async syncCommitsToDatabase(options: { since?: string; maxCount?: number } = {}): Promise<number> {
    try {
      console.log('🔄 Syncing Git commits to database...');
      
      const commits = await this.gitParser.parseCommits({
        since: options.since,
        maxCount: options.maxCount,
        includeMerges: false,
      });

      if (commits.length === 0) {
        console.log('ℹ️ No new commits found');
        return 0;
      }

      console.log(`📝 Processing ${commits.length} commits...`);
      
      const categorizedCommits = this.categorizer.categorizeCommits(commits);
      let syncedCount = 0;

      for (const commit of categorizedCommits) {
        try {
          // Check if commit already exists
          const existing = await db
            .select()
            .from(gitCommits)
            .where(eq(gitCommits.hash, commit.hash))
            .limit(1);

          if (existing.length > 0) {
            continue; // Skip existing commits
          }

          // Insert new commit
          await db.insert(gitCommits).values({
            hash: commit.hash,
            shortHash: commit.shortHash,
            author: commit.author,
            authorEmail: commit.authorEmail,
            date: commit.date,
            message: commit.message,
            subject: commit.subject,
            body: commit.body,
            filesChanged: JSON.stringify(commit.filesChanged),
            insertions: commit.insertions,
            deletions: commit.deletions,
            category: commit.category,
            isBreakingChange: commit.isBreakingChange,
            isPublic: commit.isPublic,
            processedAt: new Date(),
            createdAt: new Date(),
          });

          syncedCount++;
        } catch (error) {
          console.warn(`⚠️ Failed to sync commit ${commit.shortHash}:`, error);
        }
      }

      console.log(`✅ Synced ${syncedCount} new commits to database`);
      return syncedCount;
    } catch (error) {
      console.error('❌ Error syncing commits to database:', error);
      throw error;
    }
  }

  /**
   * Generate changelog from Git commits
   */
  async generateChangelogFromGit(
    options: GitChangelogOptions,
    createdBy: number
  ): Promise<GenerateChangelogResult> {
    try {
      console.log('🚀 Generating changelog from Git commits...');

      // First, sync latest commits
      await this.syncCommitsToDatabase();

      // Get commits for changelog
      const commits = await this.getCommitsForChangelog(options);
      
      if (commits.length === 0) {
        throw new Error('No commits found for changelog generation');
      }

      console.log(`📋 Found ${commits.length} commits for changelog`);

      // Create the changelog
      const version = options.version || await this.generateVersionNumber();
      const title = options.title || `Release ${version}`;
      const releaseDate = options.releaseDate || new Date();

      const [changelog] = await db.insert(changelogs).values({
        version,
        title,
        description: options.description,
        releaseDate,
        isPublished: false, // Start as draft
        createdBy,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();

      // Group commits by category
      const groupedCommits = this.categorizer.groupByCategory(commits);
      let entriesCreated = 0;
      let sortOrder = 0;

      // Create changelog entries for each category
      for (const [category, categoryCommits] of Object.entries(groupedCommits)) {
        if (categoryCommits.length === 0) continue;

        for (const commit of categoryCommits) {
          await db.insert(changelogEntries).values({
            changelogId: changelog.id,
            category: category as CommitCategory,
            title: commit.cleanTitle,
            description: commit.cleanDescription || commit.cleanTitle,
            sortOrder: sortOrder++,
            gitCommitHash: commit.hash,
            isAutoGenerated: true,
            createdAt: new Date(),
          });

          entriesCreated++;
        }
      }

      // Update commit versions
      await db
        .update(gitCommits)
        .set({ version })
        .where(inArray(gitCommits.hash, commits.map(c => c.hash)));

      console.log(`✅ Generated changelog with ${entriesCreated} entries`);

      return {
        changelogId: changelog.id,
        entriesCreated,
        commitsProcessed: commits.length,
        commitsSkipped: 0,
      };
    } catch (error) {
      console.error('❌ Error generating changelog from Git:', error);
      throw error;
    }
  }

  /**
   * Get commits for changelog based on options
   */
  private async getCommitsForChangelog(options: GitChangelogOptions): Promise<CategorizedCommit[]> {
    let query = db
      .select()
      .from(gitCommits)
      .where(
        and(
          eq(gitCommits.isPublic, true),
          options.includeUnreleased ? undefined : isNull(gitCommits.version)
        )
      )
      .orderBy(desc(gitCommits.date));

    const dbCommits = await query;

    // Convert database commits back to CategorizedCommit format
    return dbCommits.map(commit => ({
      hash: commit.hash,
      shortHash: commit.shortHash,
      author: commit.author,
      authorEmail: commit.authorEmail,
      date: commit.date,
      message: commit.message,
      subject: commit.subject,
      body: commit.body || undefined,
      filesChanged: JSON.parse(commit.filesChanged || '[]'),
      insertions: commit.insertions,
      deletions: commit.deletions,
      category: commit.category as CommitCategory,
      isBreakingChange: commit.isBreakingChange,
      isPublic: commit.isPublic,
      cleanTitle: this.extractCleanTitle(commit.subject),
      cleanDescription: commit.body || undefined,
    }));
  }

  /**
   * Extract clean title from commit subject
   */
  private extractCleanTitle(subject: string): string {
    let cleanTitle = subject.replace(/^[a-z]+(\([^)]*\))?!?:\s*/i, '');
    cleanTitle = cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1);
    return cleanTitle.replace(/\.$/, '');
  }

  /**
   * Generate next version number
   */
  private async generateVersionNumber(): Promise<string> {
    try {
      // Get the latest version from changelogs
      const [latest] = await db
        .select()
        .from(changelogs)
        .orderBy(desc(changelogs.createdAt))
        .limit(1);

      if (!latest) {
        return 'v1.0.0';
      }

      // Simple version increment (patch version)
      const versionMatch = latest.version.match(/v?(\d+)\.(\d+)\.(\d+)/);
      if (versionMatch) {
        const [, major, minor, patch] = versionMatch;
        return `v${major}.${minor}.${parseInt(patch) + 1}`;
      }

      return 'v1.0.0';
    } catch (error) {
      console.warn('Failed to generate version number, using default:', error);
      return 'v1.0.0';
    }
  }

  /**
   * Get processed Git commits with pagination
   */
  async getGitCommits(
    page = 1,
    limit = 50,
    filters: { category?: CommitCategory; isPublic?: boolean; version?: string } = {}
  ): Promise<{
    commits: any[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const offset = (page - 1) * limit;
    const conditions = [];

    if (filters.category) {
      conditions.push(eq(gitCommits.category, filters.category));
    }
    if (filters.isPublic !== undefined) {
      conditions.push(eq(gitCommits.isPublic, filters.isPublic));
    }
    if (filters.version) {
      conditions.push(eq(gitCommits.version, filters.version));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get commits
    const commits = await db
      .select()
      .from(gitCommits)
      .where(whereClause)
      .orderBy(desc(gitCommits.date))
      .limit(limit)
      .offset(offset);

    // Get total count
    const [{ count }] = await db
      .select({ count: gitCommits.id })
      .from(gitCommits)
      .where(whereClause);

    return {
      commits,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit),
      },
    };
  }

  /**
   * Update commit visibility and categorization
   */
  async updateCommit(
    hash: string,
    updates: {
      category?: CommitCategory;
      isPublic?: boolean;
      isBreakingChange?: boolean;
    }
  ): Promise<void> {
    await db
      .update(gitCommits)
      .set(updates)
      .where(eq(gitCommits.hash, hash));
  }

  /**
   * Get commits since last release
   */
  async getCommitsSinceLastRelease(): Promise<CategorizedCommit[]> {
    const commits = await this.gitParser.getCommitsSinceLastRelease();
    return this.categorizer.categorizeCommits(commits);
  }

  /**
   * Preview changelog without creating it
   */
  async previewChangelog(options: GitChangelogOptions): Promise<{
    commits: CategorizedCommit[];
    groupedCommits: Record<CommitCategory, CategorizedCommit[]>;
    stats: { total: number; public: number; byCategory: Record<CommitCategory, number> };
  }> {
    // Sync latest commits first
    await this.syncCommitsToDatabase();
    
    const commits = await this.getCommitsForChangelog(options);
    const groupedCommits = this.categorizer.groupByCategory(commits);
    
    const stats = {
      total: commits.length,
      public: commits.filter(c => c.isPublic).length,
      byCategory: Object.entries(groupedCommits).reduce((acc, [category, commits]) => {
        acc[category as CommitCategory] = commits.length;
        return acc;
      }, {} as Record<CommitCategory, number>),
    };

    return { commits, groupedCommits, stats };
  }
}
