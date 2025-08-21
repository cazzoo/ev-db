import { Hono } from 'hono';
import { getUserInfo, jwtAuth } from '../middleware/auth';
import { adminAuth } from '../middleware/adminAuth';
import { ChangelogService } from '../services/changelogService';
import { z } from 'zod';

const changelogsRouter = new Hono();

// Validation schemas
const createChangelogSchema = z.object({
  version: z.string().min(1).max(50),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  releaseDate: z.string().datetime(),
  entries: z.array(z.object({
    category: z.enum(['feature', 'bugfix', 'improvement', 'breaking', 'security', 'deprecated']),
    title: z.string().min(1).max(200),
    description: z.string().min(1).max(1000),
    sortOrder: z.number().optional(),
  })),
  isPublished: z.boolean().optional(),
  sendNotification: z.boolean().optional(),
});

const updateChangelogSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  releaseDate: z.string().datetime().optional(),
  isPublished: z.boolean().optional(),
});

const createEntrySchema = z.object({
  category: z.enum(['feature', 'bugfix', 'improvement', 'breaking', 'security', 'deprecated']),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(1000),
  sortOrder: z.number().optional(),
});

// Public routes (no authentication required)

// Get all published changelogs
changelogsRouter.get('/public', async (c) => {
  try {
    const page = parseInt(c.req.query('page') || '1');
    const limit = Math.min(parseInt(c.req.query('limit') || '20'), 100);

    const result = await ChangelogService.getChangelogs(page, limit, true);

    return c.json(result);
  } catch (error) {
    console.error('Error fetching public changelogs:', error);
    return c.json({ error: 'Failed to fetch changelogs' }, 500);
  }
});

// Get specific published changelog by version
changelogsRouter.get('/public/:version', async (c) => {
  try {
    const version = c.req.param('version');

    // First get by version (we need to add this method)
    const result = await ChangelogService.getChangelogs(1, 1000, true);
    const changelog = result.changelogs.find(c => c.version === version);

    if (!changelog) {
      return c.json({ error: 'Changelog not found' }, 404);
    }

    return c.json(changelog);
  } catch (error) {
    console.error('Error fetching changelog:', error);
    return c.json({ error: 'Failed to fetch changelog' }, 500);
  }
});

// Get latest published changelog
changelogsRouter.get('/public/latest', async (c) => {
  try {
    const changelog = await ChangelogService.getLatestChangelog();

    if (!changelog) {
      return c.json({ error: 'No published changelog found' }, 404);
    }

    return c.json(changelog);
  } catch (error) {
    console.error('Error fetching latest changelog:', error);
    return c.json({ error: 'Failed to fetch latest changelog' }, 500);
  }
});

// Admin routes (require admin authentication)
changelogsRouter.use('/admin/*', ...adminAuth);

// Create new changelog
changelogsRouter.post('/admin', async (c) => {
  try {
    const userInfo = getUserInfo(c);
    const body = await c.req.json();

    const validatedData = createChangelogSchema.parse(body);

    const changelogData = {
      ...validatedData,
      releaseDate: new Date(validatedData.releaseDate),
    };

    if (!userInfo.userId) {
      return c.json({ error: 'User ID not found' }, 400);
    }

    const changelogId = await ChangelogService.createChangelog(changelogData, userInfo.userId);

    return c.json({
      message: 'Changelog created successfully',
      changelogId,
    });
  } catch (error) {
    console.error('Error creating changelog:', error);
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Validation error', details: error.errors }, 400);
    }
    return c.json({
      error: error instanceof Error ? error.message : 'Failed to create changelog'
    }, 500);
  }
});

// Get all changelogs (including unpublished)
changelogsRouter.get('/admin', async (c) => {
  try {
    const page = parseInt(c.req.query('page') || '1');
    const limit = Math.min(parseInt(c.req.query('limit') || '20'), 100);

    const result = await ChangelogService.getChangelogs(page, limit, false);

    return c.json(result);
  } catch (error) {
    console.error('Error fetching changelogs:', error);
    return c.json({ error: 'Failed to fetch changelogs' }, 500);
  }
});

// Get specific changelog by ID
changelogsRouter.get('/admin/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));

    if (isNaN(id)) {
      return c.json({ error: 'Invalid changelog ID' }, 400);
    }

    const changelog = await ChangelogService.getChangelog(id);

    if (!changelog) {
      return c.json({ error: 'Changelog not found' }, 404);
    }

    return c.json(changelog);
  } catch (error) {
    console.error('Error fetching changelog:', error);
    return c.json({ error: 'Failed to fetch changelog' }, 500);
  }
});

// Update changelog
changelogsRouter.put('/admin/:id', async (c) => {
  try {
    const userInfo = getUserInfo(c);
    const id = parseInt(c.req.param('id'));
    const body = await c.req.json();

    if (isNaN(id)) {
      return c.json({ error: 'Invalid changelog ID' }, 400);
    }

    const validatedData = updateChangelogSchema.parse(body);

    const updateData = {
      ...validatedData,
      releaseDate: validatedData.releaseDate ? new Date(validatedData.releaseDate) : undefined,
    };

    if (!userInfo.userId) {
      return c.json({ error: 'User ID not found' }, 400);
    }

    await ChangelogService.updateChangelog(id, updateData, userInfo.userId);

    return c.json({ message: 'Changelog updated successfully' });
  } catch (error) {
    console.error('Error updating changelog:', error);
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Validation error', details: error.errors }, 400);
    }
    return c.json({
      error: error instanceof Error ? error.message : 'Failed to update changelog'
    }, 500);
  }
});

// Delete changelog
changelogsRouter.delete('/admin/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));

    if (isNaN(id)) {
      return c.json({ error: 'Invalid changelog ID' }, 400);
    }

    await ChangelogService.deleteChangelog(id);

    return c.json({ message: 'Changelog deleted successfully' });
  } catch (error) {
    console.error('Error deleting changelog:', error);
    return c.json({ error: 'Failed to delete changelog' }, 500);
  }
});

// Add entry to changelog
changelogsRouter.post('/admin/:id/entries', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    const body = await c.req.json();

    if (isNaN(id)) {
      return c.json({ error: 'Invalid changelog ID' }, 400);
    }

    const validatedData = createEntrySchema.parse(body);

    const entryId = await ChangelogService.addChangelogEntry(id, validatedData);

    return c.json({
      message: 'Changelog entry added successfully',
      entryId,
    });
  } catch (error) {
    console.error('Error adding changelog entry:', error);
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Validation error', details: error.errors }, 400);
    }
    return c.json({
      error: error instanceof Error ? error.message : 'Failed to add changelog entry'
    }, 500);
  }
});

// Update changelog entry
changelogsRouter.put('/admin/entries/:entryId', async (c) => {
  try {
    const entryId = parseInt(c.req.param('entryId'));
    const body = await c.req.json();

    if (isNaN(entryId)) {
      return c.json({ error: 'Invalid entry ID' }, 400);
    }

    const validatedData = createEntrySchema.partial().parse(body);

    await ChangelogService.updateChangelogEntry(entryId, validatedData);

    return c.json({ message: 'Changelog entry updated successfully' });
  } catch (error) {
    console.error('Error updating changelog entry:', error);
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Validation error', details: error.errors }, 400);
    }
    return c.json({
      error: error instanceof Error ? error.message : 'Failed to update changelog entry'
    }, 500);
  }
});

// Delete changelog entry
changelogsRouter.delete('/admin/entries/:entryId', async (c) => {
  try {
    const entryId = parseInt(c.req.param('entryId'));

    if (isNaN(entryId)) {
      return c.json({ error: 'Invalid entry ID' }, 400);
    }

    await ChangelogService.deleteChangelogEntry(entryId);

    return c.json({ message: 'Changelog entry deleted successfully' });
  } catch (error) {
    console.error('Error deleting changelog entry:', error);
    return c.json({ error: 'Failed to delete changelog entry' }, 500);
  }
});

export { changelogsRouter };
