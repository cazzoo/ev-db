import { Hono } from 'hono';
import { adminAuth } from './middleware/adminAuth';
import { apiKeyAuth } from './middleware/apiKeyAuth';
import {
  getAllCustomFields,
  getCustomFieldSuggestions,
  searchCustomFields,
  getCustomFieldById,
  createCustomField,
  updateCustomField,
  deleteCustomField,
  CreateCustomFieldData,
  UpdateCustomFieldData
} from './services/customFieldsService';

const customFieldsRouter = new Hono();

// Public endpoints (with API key auth)

// Get custom fields for form suggestions (most used first)
customFieldsRouter.get('/suggestions', apiKeyAuth, async (c) => {
  try {
    const limit = Number(c.req.query('limit')) || 10;
    const suggestions = await getCustomFieldSuggestions(Math.min(limit, 50)); // Cap at 50

    return c.json({
      suggestions: suggestions.map(field => ({
        id: field.id,
        name: field.name,
        key: field.key,
        fieldType: field.fieldType,
        usageCount: field.usageCount,
        validationRules: field.validationRules ? JSON.parse(field.validationRules) : null
      }))
    });
  } catch (error) {
    console.error('Error fetching custom field suggestions:', error);
    return c.json({ error: 'Failed to fetch suggestions' }, 500);
  }
});

// Search custom fields for autocomplete
customFieldsRouter.get('/search', apiKeyAuth, async (c) => {
  try {
    const query = c.req.query('q') || '';
    const limit = Number(c.req.query('limit')) || 20;

    if (!query.trim()) {
      return c.json({ results: [] });
    }

    const results = await searchCustomFields(query, Math.min(limit, 50));

    return c.json({
      results: results.map(field => ({
        id: field.id,
        name: field.name,
        key: field.key,
        fieldType: field.fieldType,
        usageCount: field.usageCount
      }))
    });
  } catch (error) {
    console.error('Error searching custom fields:', error);
    return c.json({ error: 'Failed to search custom fields' }, 500);
  }
});

// Get all custom fields (basic info for public use)
customFieldsRouter.get('/', apiKeyAuth, async (c) => {
  try {
    const sortBy = (c.req.query('sortBy') as 'name' | 'usageCount' | 'createdAt') || 'usageCount';
    const sortOrder = (c.req.query('sortOrder') as 'asc' | 'desc') || 'desc';
    const search = c.req.query('search');

    const fields = await getAllCustomFields(sortBy, sortOrder, search);

    return c.json({
      fields: fields.map(field => ({
        id: field.id,
        name: field.name,
        key: field.key,
        fieldType: field.fieldType,
        usageCount: field.usageCount,
        isVisibleOnCard: field.isVisibleOnCard,
        isVisibleOnDetails: field.isVisibleOnDetails
      }))
    });
  } catch (error) {
    console.error('Error fetching custom fields:', error);
    return c.json({ error: 'Failed to fetch custom fields' }, 500);
  }
});

// Admin endpoints (require admin authentication)

// Get all custom fields with full details (admin only)
customFieldsRouter.get('/admin', ...adminAuth, async (c) => {
  try {
    const sortBy = (c.req.query('sortBy') as 'name' | 'usageCount' | 'createdAt') || 'usageCount';
    const sortOrder = (c.req.query('sortOrder') as 'asc' | 'desc') || 'desc';
    const search = c.req.query('search');

    const fields = await getAllCustomFields(sortBy, sortOrder, search);

    return c.json({
      fields: fields.map(field => ({
        ...field,
        validationRules: field.validationRules ? JSON.parse(field.validationRules) : null
      }))
    });
  } catch (error) {
    console.error('Error fetching custom fields for admin:', error);
    return c.json({ error: 'Failed to fetch custom fields' }, 500);
  }
});

// Get single custom field by ID (admin only)
customFieldsRouter.get('/admin/:id', ...adminAuth, async (c) => {
  try {
    const id = Number(c.req.param('id'));
    if (isNaN(id)) {
      return c.json({ error: 'Invalid field ID' }, 400);
    }

    const field = await getCustomFieldById(id);
    if (!field) {
      return c.json({ error: 'Custom field not found' }, 404);
    }

    return c.json({
      field: {
        ...field,
        validationRules: field.validationRules ? JSON.parse(field.validationRules) : null
      }
    });
  } catch (error) {
    console.error('Error fetching custom field:', error);
    return c.json({ error: 'Failed to fetch custom field' }, 500);
  }
});

// Create new custom field (admin only)
customFieldsRouter.post('/admin', ...adminAuth, async (c) => {
  try {
    const payload = c.get('jwtPayload');
    const body = await c.req.json();

    const { name, fieldType, validationRules, isVisibleOnCard, isVisibleOnDetails, displayOrder } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return c.json({ error: 'Field name is required' }, 400);
    }

    const createData: CreateCustomFieldData = {
      name: name.trim(),
      fieldType: fieldType || 'TEXT',
      validationRules: validationRules ? JSON.stringify(validationRules) : undefined,
      isVisibleOnCard: Boolean(isVisibleOnCard),
      isVisibleOnDetails: isVisibleOnDetails !== false, // Default to true
      displayOrder: Number(displayOrder) || 0,
      createdBy: payload.userId
    };

    const newField = await createCustomField(createData);

    return c.json({
      message: 'Custom field created successfully',
      field: {
        ...newField,
        validationRules: newField.validationRules ? JSON.parse(newField.validationRules) : null
      }
    }, 201);
  } catch (error) {
    console.error('Error creating custom field:', error);
    if (error.message.includes('already exists')) {
      return c.json({ error: error.message }, 409);
    }
    return c.json({ error: 'Failed to create custom field' }, 500);
  }
});

// Update custom field (admin only)
customFieldsRouter.put('/admin/:id', ...adminAuth, async (c) => {
  try {
    const id = Number(c.req.param('id'));
    if (isNaN(id)) {
      return c.json({ error: 'Invalid field ID' }, 400);
    }

    const body = await c.req.json();
    const { name, fieldType, validationRules, isVisibleOnCard, isVisibleOnDetails, displayOrder } = body;

    const updateData: UpdateCustomFieldData = {};

    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        return c.json({ error: 'Field name must be a non-empty string' }, 400);
      }
      updateData.name = name.trim();
    }

    if (fieldType !== undefined) updateData.fieldType = fieldType;
    if (validationRules !== undefined) updateData.validationRules = JSON.stringify(validationRules);
    if (isVisibleOnCard !== undefined) updateData.isVisibleOnCard = Boolean(isVisibleOnCard);
    if (isVisibleOnDetails !== undefined) updateData.isVisibleOnDetails = Boolean(isVisibleOnDetails);
    if (displayOrder !== undefined) updateData.displayOrder = Number(displayOrder);

    const updatedField = await updateCustomField(id, updateData);

    if (!updatedField) {
      return c.json({ error: 'Custom field not found' }, 404);
    }

    return c.json({
      message: 'Custom field updated successfully',
      field: {
        ...updatedField,
        validationRules: updatedField.validationRules ? JSON.parse(updatedField.validationRules) : null
      }
    });
  } catch (error) {
    console.error('Error updating custom field:', error);
    if (error.message.includes('already exists')) {
      return c.json({ error: error.message }, 409);
    }
    return c.json({ error: 'Failed to update custom field' }, 500);
  }
});

// Delete custom field (admin only)
customFieldsRouter.delete('/admin/:id', ...adminAuth, async (c) => {
  try {
    const id = Number(c.req.param('id'));
    if (isNaN(id)) {
      return c.json({ error: 'Invalid field ID' }, 400);
    }

    const deleted = await deleteCustomField(id);

    if (!deleted) {
      return c.json({ error: 'Custom field not found' }, 404);
    }

    return c.json({ message: 'Custom field deleted successfully' });
  } catch (error) {
    console.error('Error deleting custom field:', error);
    if (error.message.includes('Cannot delete')) {
      return c.json({ error: error.message }, 409);
    }
    return c.json({ error: 'Failed to delete custom field' }, 500);
  }
});

export default customFieldsRouter;
