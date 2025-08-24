import { Hono } from 'hono';
import { GitChangelogService } from '../services/gitChangelogService';
import { ChangelogFormatterService } from '../services/changelogFormatterService';
import { AutoChangelogService } from '../services/autoChangelogService';
import { getUserInfo } from '../middleware/auth';
import { adminAuth } from '../middleware/adminAuth';

// Note: zod is not available in current dependencies, using basic validation
const validateGenerateChangelog = (data: any) => {
  const errors: string[] = [];
  if (data.version && (typeof data.version !== 'string' || data.version.length > 50)) {
    errors.push('version must be a string with max 50 characters');
  }
  if (data.title && (typeof data.title !== 'string' || data.title.length > 200)) {
    errors.push('title must be a string with max 200 characters');
  }
  if (data.description && (typeof data.description !== 'string' || data.description.length > 2000)) {
    errors.push('description must be a string with max 2000 characters');
  }
  return errors;
};

export const gitChangelogsRouter = new Hono();

// Public routes

// Get changelog in markdown format
gitChangelogsRouter.get('/markdown/:version', async (c) => {
  try {
    const version = c.req.param('version');
    const includeMetadata = c.req.query('metadata') === 'true';
    const includeCommitHashes = c.req.query('commits') === 'true';

    const formatter = new ChangelogFormatterService();
    const markdown = await formatter.generateMarkdown(version, {
      includeMetadata,
      includeCommitHashes,
      groupByCategory: true,
    });

    c.header('Content-Type', 'text/markdown; charset=utf-8');
    return c.text(markdown);
  } catch (error) {
    console.error('Error generating markdown changelog:', error);
    if (error instanceof Error && error.message.includes('not found')) {
      return c.json({ error: 'Changelog not found' }, 404);
    }
    return c.json({ error: 'Failed to generate markdown changelog' }, 500);
  }
});

// Get full changelog in markdown format
gitChangelogsRouter.get('/markdown', async (c) => {
  try {
    const includeMetadata = c.req.query('metadata') === 'true';
    const includeCommitHashes = c.req.query('commits') === 'true';

    const formatter = new ChangelogFormatterService();
    const markdown = await formatter.generateFullMarkdown({
      includeMetadata,
      includeCommitHashes,
      groupByCategory: true,
    });

    c.header('Content-Type', 'text/markdown; charset=utf-8');
    return c.text(markdown);
  } catch (error) {
    console.error('Error generating full markdown changelog:', error);
    return c.json({ error: 'Failed to generate markdown changelog' }, 500);
  }
});

// Export changelog in various formats
gitChangelogsRouter.get('/export/:format', async (c) => {
  try {
    const format = c.req.param('format');
    const version = c.req.query('version');
    const formatter = new ChangelogFormatterService();

    switch (format.toLowerCase()) {
      case 'json':
        const jsonData = await formatter.generateJSON(version || undefined);
        c.header('Content-Type', 'application/json');
        return c.json(jsonData);

      case 'rss':
        const rssData = await formatter.generateRSS();
        c.header('Content-Type', 'application/rss+xml; charset=utf-8');
        return c.text(rssData);

      case 'markdown':
      case 'md':
        const markdownData = version
          ? await formatter.generateMarkdown(version)
          : await formatter.generateFullMarkdown();
        c.header('Content-Type', 'text/markdown; charset=utf-8');
        return c.text(markdownData);

      default:
        return c.json({ error: 'Unsupported format. Supported: json, rss, markdown, md' }, 400);
    }
  } catch (error) {
    console.error('Error exporting changelog:', error);
    return c.json({ error: 'Failed to export changelog' }, 500);
  }
});

// Admin routes (require admin authentication)
gitChangelogsRouter.use('/admin/*', ...adminAuth);

// Generate changelog from Git commits
gitChangelogsRouter.post('/admin/generate', async (c) => {
  try {
    const userInfo = getUserInfo(c);
    const body = await c.req.json();

    // Basic validation
    const validationErrors = validateGenerateChangelog(body);
    if (validationErrors.length > 0) {
      return c.json({ error: 'Validation error', details: validationErrors }, 400);
    }

    if (!userInfo.userId) {
      return c.json({ error: 'User ID not found' }, 400);
    }

    const gitService = new GitChangelogService();
    const result = await gitService.generateChangelogFromGit(
      {
        version: body.version,
        title: body.title,
        description: body.description,
        releaseDate: body.releaseDate ? new Date(body.releaseDate) : undefined,
        includeUnreleased: body.includeUnreleased,
      },
      userInfo.userId
    );

    return c.json({
      message: 'Changelog generated successfully from Git commits',
      ...result,
    });
  } catch (error) {
    console.error('Error generating changelog from Git:', error);
    return c.json({
      error: error instanceof Error ? error.message : 'Failed to generate changelog'
    }, 500);
  }
});

// Preview changelog without creating it
gitChangelogsRouter.post('/admin/preview', async (c) => {
  try {
    const body = await c.req.json();

    // Basic validation
    const validationErrors = validateGenerateChangelog(body);
    if (validationErrors.length > 0) {
      return c.json({ error: 'Validation error', details: validationErrors }, 400);
    }

    const gitService = new GitChangelogService();
    const preview = await gitService.previewChangelog({
      version: body.version,
      includeUnreleased: body.includeUnreleased,
    });

    return c.json(preview);
  } catch (error) {
    console.error('Error previewing changelog:', error);
    return c.json({
      error: error instanceof Error ? error.message : 'Failed to preview changelog'
    }, 500);
  }
});

// Sync Git commits to database
gitChangelogsRouter.post('/admin/sync-commits', async (c) => {
  try {
    const body = await c.req.json();

    // Basic validation for sync commits
    if (body.maxCount && (typeof body.maxCount !== 'number' || body.maxCount < 1 || body.maxCount > 1000)) {
      return c.json({ error: 'maxCount must be a number between 1 and 1000' }, 400);
    }

    const gitService = new GitChangelogService();
    const syncedCount = await gitService.syncCommitsToDatabase({
      since: body.since,
      maxCount: body.maxCount,
    });

    return c.json({
      message: 'Git commits synced successfully',
      syncedCount,
    });
  } catch (error) {
    console.error('Error syncing Git commits:', error);
    return c.json({
      error: error instanceof Error ? error.message : 'Failed to sync Git commits'
    }, 500);
  }
});

// Get processed Git commits
gitChangelogsRouter.get('/admin/commits', async (c) => {
  try {
    const page = parseInt(c.req.query('page') || '1');
    const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);
    const category = c.req.query('category') as any;
    const isPublic = c.req.query('public') === 'true' ? true :
                     c.req.query('public') === 'false' ? false : undefined;
    const version = c.req.query('version');

    const gitService = new GitChangelogService();
    const result = await gitService.getGitCommits(page, limit, {
      category,
      isPublic,
      version,
    });

    return c.json(result);
  } catch (error) {
    console.error('Error fetching Git commits:', error);
    return c.json({ error: 'Failed to fetch Git commits' }, 500);
  }
});

// Update Git commit properties
gitChangelogsRouter.put('/admin/commits/:hash', async (c) => {
  try {
    const hash = c.req.param('hash');
    const body = await c.req.json();

    // Basic validation for update commit
    const validCategories = ['feature', 'bugfix', 'improvement', 'breaking', 'security', 'deprecated', 'chore', 'docs', 'test'];
    if (body.category && !validCategories.includes(body.category)) {
      return c.json({ error: 'Invalid category' }, 400);
    }
    if (body.isPublic !== undefined && typeof body.isPublic !== 'boolean') {
      return c.json({ error: 'isPublic must be a boolean' }, 400);
    }
    if (body.isBreakingChange !== undefined && typeof body.isBreakingChange !== 'boolean') {
      return c.json({ error: 'isBreakingChange must be a boolean' }, 400);
    }

    const gitService = new GitChangelogService();
    await gitService.updateCommit(hash, body);

    return c.json({
      message: 'Commit updated successfully',
    });
  } catch (error) {
    console.error('Error updating commit:', error);
    return c.json({
      error: error instanceof Error ? error.message : 'Failed to update commit'
    }, 500);
  }
});

// Get commits since last release
gitChangelogsRouter.get('/admin/commits/unreleased', async (c) => {
  try {
    const gitService = new GitChangelogService();
    const commits = await gitService.getCommitsSinceLastRelease();

    return c.json({
      commits,
      count: commits.length,
    });
  } catch (error) {
    console.error('Error fetching unreleased commits:', error);
    return c.json({ error: 'Failed to fetch unreleased commits' }, 500);
  }
});

// Auto-processing endpoints

// Trigger auto-processing of commits
gitChangelogsRouter.post('/admin/auto-process', async (c) => {
  try {
    const autoService = new AutoChangelogService();
    const result = await autoService.processNewCommits();

    return c.json({
      message: 'Auto-processing completed successfully',
      ...result,
    });
  } catch (error) {
    console.error('Error in auto-processing:', error);
    return c.json({
      error: error instanceof Error ? error.message : 'Failed to auto-process commits'
    }, 500);
  }
});

// Get auto-processing statistics
gitChangelogsRouter.get('/admin/auto-stats', async (c) => {
  try {
    const autoService = new AutoChangelogService();
    const stats = await autoService.getProcessingStats();

    return c.json(stats);
  } catch (error) {
    console.error('Error fetching auto-processing stats:', error);
    return c.json({ error: 'Failed to fetch processing statistics' }, 500);
  }
});

// Create versioned changelog from unreleased entries
gitChangelogsRouter.post('/admin/create-version', async (c) => {
  try {
    const body = await c.req.json();

    if (!body.version || typeof body.version !== 'string') {
      return c.json({ error: 'Version is required and must be a string' }, 400);
    }

    const autoService = new AutoChangelogService();
    const changelogId = await autoService.createVersionedChangelog(
      body.version,
      body.title
    );

    return c.json({
      message: 'Versioned changelog created successfully',
      changelogId,
      version: body.version,
    });
  } catch (error) {
    console.error('Error creating versioned changelog:', error);
    return c.json({
      error: error instanceof Error ? error.message : 'Failed to create versioned changelog'
    }, 500);
  }
});
