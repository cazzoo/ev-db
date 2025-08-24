import { Hono } from 'hono';
import { AutoChangelogService } from '../services/autoChangelogService';
import crypto from 'crypto';

export const gitWebhooksRouter = new Hono();

// GitHub webhook secret (should be set in environment variables)
const GITHUB_WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET || 'your-webhook-secret';

/**
 * Verify GitHub webhook signature
 */
function verifyGitHubSignature(payload: string, signature: string): boolean {
  if (!signature) {
    return false;
  }

  const expectedSignature = crypto
    .createHmac('sha256', GITHUB_WEBHOOK_SECRET)
    .update(payload, 'utf8')
    .digest('hex');

  const expectedSignatureWithPrefix = `sha256=${expectedSignature}`;
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignatureWithPrefix)
  );
}

/**
 * Verify GitLab webhook signature
 */
function verifyGitLabSignature(payload: string, token: string): boolean {
  const expectedToken = process.env.GITLAB_WEBHOOK_TOKEN || 'your-gitlab-token';
  return token === expectedToken;
}

// GitHub webhook endpoint
gitWebhooksRouter.post('/github', async (c) => {
  try {
    const signature = c.req.header('x-hub-signature-256') || '';
    const event = c.req.header('x-github-event') || '';
    const payload = await c.req.text();

    // Verify signature
    if (!verifyGitHubSignature(payload, signature)) {
      console.warn('⚠️ Invalid GitHub webhook signature');
      return c.json({ error: 'Invalid signature' }, 401);
    }

    // Only process push events
    if (event !== 'push') {
      console.log(`ℹ️ Ignoring GitHub event: ${event}`);
      return c.json({ message: 'Event ignored' }, 200);
    }

    const data = JSON.parse(payload);
    
    // Only process pushes to main/master branch
    const ref = data.ref;
    if (!ref.endsWith('/main') && !ref.endsWith('/master')) {
      console.log(`ℹ️ Ignoring push to branch: ${ref}`);
      return c.json({ message: 'Branch ignored' }, 200);
    }

    console.log('🔔 GitHub webhook: Processing push to main branch');

    // Trigger auto-processing
    const autoService = new AutoChangelogService();
    const result = await autoService.processNewCommits();

    console.log(`✅ GitHub webhook processed: ${result.entriesCreated} entries created`);

    return c.json({
      message: 'Webhook processed successfully',
      ...result,
    });

  } catch (error) {
    console.error('❌ Error processing GitHub webhook:', error);
    return c.json({
      error: error instanceof Error ? error.message : 'Webhook processing failed'
    }, 500);
  }
});

// GitLab webhook endpoint
gitWebhooksRouter.post('/gitlab', async (c) => {
  try {
    const token = c.req.header('x-gitlab-token') || '';
    const event = c.req.header('x-gitlab-event') || '';
    const payload = await c.req.text();

    // Verify token
    if (!verifyGitLabSignature(payload, token)) {
      console.warn('⚠️ Invalid GitLab webhook token');
      return c.json({ error: 'Invalid token' }, 401);
    }

    // Only process push events
    if (event !== 'Push Hook') {
      console.log(`ℹ️ Ignoring GitLab event: ${event}`);
      return c.json({ message: 'Event ignored' }, 200);
    }

    const data = JSON.parse(payload);
    
    // Only process pushes to main/master branch
    const ref = data.ref;
    if (!ref.endsWith('/main') && !ref.endsWith('/master')) {
      console.log(`ℹ️ Ignoring push to branch: ${ref}`);
      return c.json({ message: 'Branch ignored' }, 200);
    }

    console.log('🔔 GitLab webhook: Processing push to main branch');

    // Trigger auto-processing
    const autoService = new AutoChangelogService();
    const result = await autoService.processNewCommits();

    console.log(`✅ GitLab webhook processed: ${result.entriesCreated} entries created`);

    return c.json({
      message: 'Webhook processed successfully',
      ...result,
    });

  } catch (error) {
    console.error('❌ Error processing GitLab webhook:', error);
    return c.json({
      error: error instanceof Error ? error.message : 'Webhook processing failed'
    }, 500);
  }
});

// Generic Git webhook endpoint (for other Git providers)
gitWebhooksRouter.post('/generic', async (c) => {
  try {
    const secret = c.req.header('x-webhook-secret') || '';
    const expectedSecret = process.env.GENERIC_WEBHOOK_SECRET || 'your-generic-secret';

    // Simple secret verification
    if (secret !== expectedSecret) {
      console.warn('⚠️ Invalid generic webhook secret');
      return c.json({ error: 'Invalid secret' }, 401);
    }

    console.log('🔔 Generic webhook: Processing Git changes');

    // Trigger auto-processing
    const autoService = new AutoChangelogService();
    const result = await autoService.processNewCommits();

    console.log(`✅ Generic webhook processed: ${result.entriesCreated} entries created`);

    return c.json({
      message: 'Webhook processed successfully',
      ...result,
    });

  } catch (error) {
    console.error('❌ Error processing generic webhook:', error);
    return c.json({
      error: error instanceof Error ? error.message : 'Webhook processing failed'
    }, 500);
  }
});

// Webhook health check
gitWebhooksRouter.get('/health', async (c) => {
  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    webhooks: {
      github: '/api/git-webhooks/github',
      gitlab: '/api/git-webhooks/gitlab',
      generic: '/api/git-webhooks/generic',
    },
    environment: {
      hasGitHubSecret: !!process.env.GITHUB_WEBHOOK_SECRET,
      hasGitLabToken: !!process.env.GITLAB_WEBHOOK_TOKEN,
      hasGenericSecret: !!process.env.GENERIC_WEBHOOK_SECRET,
    },
  });
});

// Test webhook endpoint (for development)
gitWebhooksRouter.post('/test', async (c) => {
  try {
    console.log('🧪 Test webhook: Triggering auto-processing');

    const autoService = new AutoChangelogService();
    const result = await autoService.processNewCommits();

    return c.json({
      message: 'Test webhook processed successfully',
      ...result,
    });

  } catch (error) {
    console.error('❌ Error processing test webhook:', error);
    return c.json({
      error: error instanceof Error ? error.message : 'Test webhook failed'
    }, 500);
  }
});

// Webhook configuration info
gitWebhooksRouter.get('/config', async (c) => {
  return c.json({
    webhookUrls: {
      github: `${c.req.url.replace('/config', '/github')}`,
      gitlab: `${c.req.url.replace('/config', '/gitlab')}`,
      generic: `${c.req.url.replace('/config', '/generic')}`,
      test: `${c.req.url.replace('/config', '/test')}`,
    },
    setup: {
      github: {
        url: 'Set this URL in your GitHub repository webhook settings',
        contentType: 'application/json',
        secret: 'Set GITHUB_WEBHOOK_SECRET environment variable',
        events: ['push'],
      },
      gitlab: {
        url: 'Set this URL in your GitLab project webhook settings',
        token: 'Set GITLAB_WEBHOOK_TOKEN environment variable',
        events: ['Push events'],
      },
      generic: {
        url: 'Use for other Git providers',
        secret: 'Set GENERIC_WEBHOOK_SECRET environment variable',
        header: 'Send secret in x-webhook-secret header',
      },
    },
  });
});
