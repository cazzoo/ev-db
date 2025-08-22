import { Hono } from 'hono';
import { db } from './db';
import { vehicles, vehicleCustomFieldValues, customFields } from './db/schema';
import { eq, like, or, count, asc, desc } from 'drizzle-orm';
import { jwt } from 'hono/jwt';
import { apiKeyAuth } from './middleware/apiKeyAuth';
import { adminAuth } from './middleware/adminAuth';
import { rateLimitMiddleware } from './middleware/rateLimiting';
import { getVehicleSuggestions, getModelsForMake } from './services/vehicleSuggestionsService';
import { getVehicleImages, getImagesForVehicles } from './services/imageService';

const vehiclesRouter = new Hono();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'; // Should be the same as in index.ts

// Get custom field values for a vehicle
async function getVehicleCustomFields(vehicleId: number) {
  const customFieldValues = await db
    .select({
      fieldId: customFields.id,
      fieldName: customFields.name,
      fieldKey: customFields.key,
      fieldType: customFields.fieldType,
      value: vehicleCustomFieldValues.value,
      isVisibleOnCard: customFields.isVisibleOnCard,
      isVisibleOnDetails: customFields.isVisibleOnDetails,
      displayOrder: customFields.displayOrder
    })
    .from(vehicleCustomFieldValues)
    .innerJoin(customFields, eq(vehicleCustomFieldValues.customFieldId, customFields.id))
    .where(eq(vehicleCustomFieldValues.vehicleId, vehicleId))
    .orderBy(customFields.displayOrder, customFields.name);

  // Convert to a more convenient format
  const customFieldsMap: Record<string, any> = {};
  const customFieldsArray: any[] = [];

  for (const field of customFieldValues) {
    const processedValue = processCustomFieldValue(field.value, field.fieldType);

    customFieldsMap[field.fieldKey] = processedValue;
    customFieldsArray.push({
      id: field.fieldId,
      name: field.fieldName,
      key: field.fieldKey,
      type: field.fieldType,
      value: processedValue,
      isVisibleOnCard: field.isVisibleOnCard,
      isVisibleOnDetails: field.isVisibleOnDetails,
      displayOrder: field.displayOrder
    });
  }

  return {
    customFields: customFieldsMap, // For easy access by key
    customFieldsArray: customFieldsArray // For ordered display
  };
}

// Get custom field values for multiple vehicles (optimized for lists)
async function getCustomFieldsForVehicles(vehicleIds: number[], cardOnly: boolean = false) {
  if (vehicleIds.length === 0) {
    return {};
  }

  let query = db
    .select({
      vehicleId: vehicleCustomFieldValues.vehicleId,
      fieldId: customFields.id,
      fieldName: customFields.name,
      fieldKey: customFields.key,
      fieldType: customFields.fieldType,
      value: vehicleCustomFieldValues.value,
      isVisibleOnCard: customFields.isVisibleOnCard,
      isVisibleOnDetails: customFields.isVisibleOnDetails,
      displayOrder: customFields.displayOrder
    })
    .from(vehicleCustomFieldValues)
    .innerJoin(customFields, eq(vehicleCustomFieldValues.customFieldId, customFields.id))
    .where(eq(vehicleCustomFieldValues.vehicleId, vehicleIds[0])); // Start with first ID

  // Add OR conditions for other vehicle IDs
  if (vehicleIds.length > 1) {
    const orConditions = vehicleIds.slice(1).map(id => eq(vehicleCustomFieldValues.vehicleId, id));
    query = query.where(or(eq(vehicleCustomFieldValues.vehicleId, vehicleIds[0]), ...orConditions));
  }

  // Filter by visibility if needed
  if (cardOnly) {
    query = query.where(eq(customFields.isVisibleOnCard, true));
  }

  const results = await query.orderBy(customFields.displayOrder, customFields.name);

  // Group by vehicle ID
  const customFieldsByVehicle: Record<number, any> = {};

  for (const result of results) {
    if (!customFieldsByVehicle[result.vehicleId]) {
      customFieldsByVehicle[result.vehicleId] = {
        customFields: {},
        customFieldsArray: []
      };
    }

    const processedValue = processCustomFieldValue(result.value, result.fieldType);

    customFieldsByVehicle[result.vehicleId].customFields[result.fieldKey] = processedValue;
    customFieldsByVehicle[result.vehicleId].customFieldsArray.push({
      id: result.fieldId,
      name: result.fieldName,
      key: result.fieldKey,
      type: result.fieldType,
      value: processedValue,
      isVisibleOnCard: result.isVisibleOnCard,
      isVisibleOnDetails: result.isVisibleOnDetails,
      displayOrder: result.displayOrder
    });
  }

  return customFieldsByVehicle;
}

// Process custom field value based on field type
function processCustomFieldValue(value: string | null, fieldType: string): any {
  if (value === null || value === undefined) {
    return null;
  }

  switch (fieldType) {
    case 'NUMBER':
      const num = parseFloat(value);
      return isNaN(num) ? null : num;
    case 'BOOLEAN':
      return value.toLowerCase() === 'true' || value === '1';
    case 'DATE':
      const date = new Date(value);
      return isNaN(date.getTime()) ? null : date.toISOString();
    case 'DROPDOWN':
    case 'TEXT':
    case 'URL':
    default:
      return value;
  }
}

// Apply API key authentication and rate limiting to all vehicle routes
vehiclesRouter.use('*', apiKeyAuth, rateLimitMiddleware);

// Get vehicle suggestions for autocomplete (makes and models)
vehiclesRouter.get('/suggestions', async (c) => {
  const suggestions = await getVehicleSuggestions();
  return c.json(suggestions);
});

// Get models for a specific make
vehiclesRouter.get('/suggestions/models/:make', async (c) => {
  const make = c.req.param('make');
  const models = await getModelsForMake(make);
  return c.json({ models });
});

// Get recent vehicles for spotlight sections
vehiclesRouter.get('/recent', async (c) => {
  try {
    const limit = Math.min(parseInt(c.req.query('limit') || '5'), 10); // Max 10 for spotlight

    // Get recent vehicles ordered by creation date
    const recentVehicles = await db.select()
      .from(vehicles)
      .orderBy(desc(vehicles.createdAt))
      .limit(limit);

    // Get images for these vehicles
    const vehicleIds = recentVehicles.map(v => v.id);
    const imagesByVehicle = await getImagesForVehicles(vehicleIds);

    // Combine vehicles with their images and add "isNew" flag
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const vehiclesWithImages = recentVehicles.map(vehicle => ({
      ...vehicle,
      images: imagesByVehicle[vehicle.id] || [],
      isNew: vehicle.createdAt && new Date(vehicle.createdAt) > sevenDaysAgo
    }));

    return c.json({
      vehicles: vehiclesWithImages,
      total: vehiclesWithImages.length
    });
  } catch (error) {
    console.error('Error fetching recent vehicles:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get all vehicles with images and pagination - now secured with API key
vehiclesRouter.get('/', async (c) => {
  try {
    // Parse query parameters
    const page = parseInt(c.req.query('page') || '1');
    const limit = Math.min(parseInt(c.req.query('limit') || '20'), 100); // Max 100 per page
    const search = c.req.query('search') || '';
    const make = c.req.query('make') || '';
    const year = c.req.query('year') ? parseInt(c.req.query('year')) : undefined;
    const sortBy = c.req.query('sortBy') || 'createdAt';
    const sortOrder = c.req.query('sortOrder') || 'desc';

    const offset = (page - 1) * limit;

    // Build where conditions for filtering
    const whereConditions = [];

    if (search) {
      whereConditions.push(
        or(
          like(vehicles.make, `%${search}%`),
          like(vehicles.model, `%${search}%`)
        )
      );
    }

    if (make) {
      whereConditions.push(eq(vehicles.make, make));
    }

    if (year) {
      whereConditions.push(eq(vehicles.year, year));
    }

    // Get total count for pagination
    let totalQuery = db.select({ count: count() }).from(vehicles);
    if (whereConditions.length > 0) {
      totalQuery = totalQuery.where(whereConditions.length === 1 ? whereConditions[0] : or(...whereConditions));
    }
    const [{ count: total }] = await totalQuery;

    // Build main query with pagination
    let query = db.select().from(vehicles);

    if (whereConditions.length > 0) {
      query = query.where(whereConditions.length === 1 ? whereConditions[0] : or(...whereConditions));
    }

    // Apply sorting
    const sortColumn = vehicles[sortBy as keyof typeof vehicles] || vehicles.id;
    query = query.orderBy(sortOrder === 'desc' ? desc(sortColumn) : asc(sortColumn));

    // Apply pagination
    const paginatedVehicles = await query.limit(limit).offset(offset);

    // Get images for paginated vehicles efficiently
    const vehicleIds = paginatedVehicles.map(v => v.id);
    const imagesByVehicle = await getImagesForVehicles(vehicleIds);

    // Get custom fields for paginated vehicles (only card-visible fields for performance)
    const customFieldsByVehicle = await getCustomFieldsForVehicles(vehicleIds, true);

    // Combine vehicles with their images and custom fields
    const vehiclesWithImages = paginatedVehicles.map(vehicle => ({
      ...vehicle,
      images: imagesByVehicle[vehicle.id] || [],
      ...(customFieldsByVehicle[vehicle.id] || { customFields: {}, customFieldsArray: [] })
    }));

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    return c.json({
      data: vehiclesWithImages,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext,
        hasPrev
      }
    });
  } catch (error) {
    console.error('Error fetching vehicles:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get a single vehicle by ID with images - now secured with API key
vehiclesRouter.get('/:id', async (c) => {
  const id = Number(c.req.param('id'));
  if (isNaN(id)) {
    return c.json({ error: 'Invalid vehicle ID' }, 400);
  }

  const vehicle = await db.select().from(vehicles).where(eq(vehicles.id, id)).limit(1);

  if (vehicle.length === 0) {
    return c.json({ error: 'Vehicle not found' }, 404);
  }

  // Get images for this vehicle
  const images = await getVehicleImages(id);

  // Get custom fields for this vehicle
  const customFieldsData = await getVehicleCustomFields(id);

  return c.json({
    ...vehicle[0],
    images,
    ...customFieldsData
  });
});

// Create a new vehicle (Admin only) - requires both API key and admin role
vehiclesRouter.post('/', ...adminAuth, async (c) => {
  const payload = c.get('jwtPayload');
  if (payload.role !== 'ADMIN') {
    return c.json({ error: 'Unauthorized: Admin access required' }, 403);
  }

  const { make, model, year, batteryCapacity, range, chargingSpeed } = await c.req.json();

  if (!make || !model || !year) {
    return c.json({ error: 'Make, model, and year are required' }, 400);
  }

  try {
    const newVehicle = await db.insert(vehicles).values({
      make,
      model,
      year,
      batteryCapacity,
      range,
      chargingSpeed,
      createdAt: new Date(),
    }).returning();

    return c.json({ message: 'Vehicle created successfully', vehicle: newVehicle[0] }, 201);
  } catch (error) {
    console.error('Error creating vehicle:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Update a vehicle (Admin only) - requires both API key and admin role
// TODO: Fix TypeScript issues and re-enable
/*
vehiclesRouter.put('/:id', ...adminAuth, async (c) => {
  const payload = c.get('jwtPayload');
  if (payload.role !== 'ADMIN') {
    return c.json({ error: 'Unauthorized: Admin access required' }, 403);
  }

  const idParam = c.req.param('id');
  const id = Number(idParam);
  if (isNaN(id)) {
    return c.json({ error: 'Invalid vehicle ID' }, 400);
  }

  const { make, model, year, batteryCapacity, range, chargingSpeed } = await c.req.json();

  try {
    const updatedVehicle = await db.update(vehicles).set({
      make,
      model,
      year,
      batteryCapacity,
      range,
      chargingSpeed,
    }).where(eq(vehicles.id, id)).returning();

    if (updatedVehicle.length === 0) {
      return c.json({ error: 'Vehicle not found' }, 404);
    }

    return c.json({ message: 'Vehicle updated successfully', vehicle: updatedVehicle[0] });
  } catch (error) {
    console.error('Error updating vehicle:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});
*/

// Delete a vehicle (Admin only) - requires both API key and admin role
// TODO: Fix TypeScript issues and re-enable
/*
vehiclesRouter.delete('/:id', ...adminAuth, async (c) => {
  const payload = c.get('jwtPayload');
  if (payload.role !== 'ADMIN') {
    return c.json({ error: 'Unauthorized: Admin access required' }, 403);
  }

  const idParam = c.req.param('id');
  const id = Number(idParam);
  if (isNaN(id)) {
    return c.json({ error: 'Invalid vehicle ID' }, 400);
  }

  try {
    const deletedVehicle = await db.delete(vehicles).where(eq(vehicles.id, id)).returning();

    if (deletedVehicle.length === 0) {
      return c.json({ error: 'Vehicle not found' }, 404);
    }

    return c.json({ message: 'Vehicle deleted successfully' });
  } catch (error) {
    console.error('Error deleting vehicle:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});
*/

export default vehiclesRouter;

// Export helper functions for testing and other modules
export { getVehicleCustomFields, getCustomFieldsForVehicles, processCustomFieldValue };
