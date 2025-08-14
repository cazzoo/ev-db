import { Hono } from 'hono';
import { db } from './db';
import { vehicles } from './db/schema';
import { eq } from 'drizzle-orm';
import { jwt } from 'hono/jwt';
import { apiKeyAuth } from './middleware/apiKeyAuth';
import { adminAuth } from './middleware/adminAuth';
import { rateLimitMiddleware } from './middleware/rateLimiting';
import { getVehicleSuggestions, getModelsForMake } from './services/vehicleSuggestionsService';

const vehiclesRouter = new Hono();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'; // Should be the same as in index.ts

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

// Get all vehicles - now secured with API key
vehiclesRouter.get('/', async (c) => {
  const allVehicles = await db.select().from(vehicles);
  return c.json(allVehicles);
});

// Get a single vehicle by ID - now secured with API key
vehiclesRouter.get('/:id', async (c) => {
  const id = Number(c.req.param('id'));
  if (isNaN(id)) {
    return c.json({ error: 'Invalid vehicle ID' }, 400);
  }

  const vehicle = await db.select().from(vehicles).where(eq(vehicles.id, id)).limit(1);

  if (vehicle.length === 0) {
    return c.json({ error: 'Vehicle not found' }, 404);
  }

  return c.json(vehicle[0]);
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
