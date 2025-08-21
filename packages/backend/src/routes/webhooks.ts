import { Hono } from 'hono';
import { adminHybridAuth, noCacheMiddleware } from '../middleware/auth';

const webhooksRouter = new Hono();

// Get all webhooks
webhooksRouter.get('/', adminHybridAuth, noCacheMiddleware, async (c) => {
  try {

    const { WebhookService } = await import('../services/webhookService');
    const webhooks = await WebhookService.getAllWebhooks();

    return c.json({ webhooks });
  } catch (error) {
    console.error('Error fetching webhooks:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Create webhook
webhooksRouter.post('/', adminHybridAuth, noCacheMiddleware, async (c) => {
  try {
    const webhookData = await c.req.json();
    const { WebhookService } = await import('../services/webhookService');
    const webhook = await WebhookService.createWebhook(webhookData);

    return c.json({ webhook }, 201);
  } catch (error) {
    console.error('Error creating webhook:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get webhook by ID
webhooksRouter.get('/:id', adminHybridAuth, noCacheMiddleware, async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    if (isNaN(id)) {
      return c.json({ error: 'Invalid webhook ID' }, 400);
    }

    const { WebhookService } = await import('../services/webhookService');
    const webhook = await WebhookService.getWebhookById(id);

    if (!webhook) {
      return c.json({ error: 'Webhook not found' }, 404);
    }

    return c.json({ webhook });
  } catch (error) {
    console.error('Error fetching webhook:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Update webhook
webhooksRouter.put('/:id', adminHybridAuth, noCacheMiddleware, async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    if (isNaN(id)) {
      return c.json({ error: 'Invalid webhook ID' }, 400);
    }

    const webhookData = await c.req.json();
    const { WebhookService } = await import('../services/webhookService');
    const webhook = await WebhookService.updateWebhook(id, webhookData);

    return c.json({ webhook });
  } catch (error) {
    console.error('Error updating webhook:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Delete webhook
webhooksRouter.delete('/:id', adminHybridAuth, noCacheMiddleware, async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    if (isNaN(id)) {
      return c.json({ error: 'Invalid webhook ID' }, 400);
    }

    const { WebhookService } = await import('../services/webhookService');
    await WebhookService.deleteWebhook(id);

    return c.json({ message: 'Webhook deleted successfully' });
  } catch (error) {
    console.error('Error deleting webhook:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Test webhook
webhooksRouter.post('/:id/test', adminHybridAuth, noCacheMiddleware, async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    if (isNaN(id)) {
      return c.json({ error: 'Invalid webhook ID' }, 400);
    }

    const { WebhookService } = await import('../services/webhookService');
    const result = await WebhookService.testWebhook(id);

    return c.json(result);
  } catch (error) {
    console.error('Error testing webhook:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Test webhook configuration (without saving)
webhooksRouter.post('/test-config', adminHybridAuth, noCacheMiddleware, async (c) => {
  try {

    const webhookConfig = await c.req.json();

    // Validate required fields
    if (!webhookConfig.url || !webhookConfig.method) {
      return c.json({ error: 'URL and method are required' }, 400);
    }

    const { WebhookService } = await import('../services/webhookService');
    const result = await WebhookService.testWebhookConfig(webhookConfig);

    return c.json(result);
  } catch (error) {
    console.error('Error testing webhook configuration:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default webhooksRouter;
