import { Hono } from 'hono';
import { db } from './db';
import { vehicles, contributions, users } from './db/schema';
import { faker } from '@faker-js/faker';
import { jwt } from 'hono/jwt';

const seedRouter = new Hono();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Middleware to protect routes
const adminAuth = jwt({ secret: JWT_SECRET });
const userAuth = jwt({ secret: JWT_SECRET });

seedRouter.post('/vehicles', adminAuth, async (c) => {
  const payload = c.get('jwtPayload');
  if (payload.role !== 'ADMIN') {
    return c.json({ error: 'Unauthorized: Admin access required' }, 403);
  }

  try {
    const newVehicles = [];
    for (let i = 0; i < 10; i++) {
      newVehicles.push({
        make: faker.vehicle.manufacturer(),
        model: faker.vehicle.model(),
        year: faker.date.past({ years: 10 }).getFullYear(),
        batteryCapacity: faker.number.int({ min: 40, max: 120 }),
        range: faker.number.int({ min: 200, max: 600 }),
        chargingSpeed: faker.number.int({ min: 50, max: 250 }),
      });
    }

    await db.insert(vehicles).values(newVehicles);

    return c.json({ message: 'Successfully seeded 10 vehicles.' }, 201);
  } catch (error) {
    console.error('Error seeding vehicles:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default seedRouter;

// Seed random contributions - available to any authenticated user in dev mode
seedRouter.post('/contributions', userAuth, async (c) => {
  try {
    const payload = c.get('jwtPayload');
    const requesterRole = payload.role as 'MEMBER' | 'MODERATOR' | 'ADMIN';
    const requesterId = payload.userId as number;
    const { count } = await c.req.json().catch(() => ({ count: 10 }));

    const allUsers = await db.select({ id: users.id, role: users.role }).from(users);
    if (allUsers.length === 0) {
      return c.json({ error: 'No users found to associate contributions with.' }, 400);
    }

    // Determine eligible target users based on role
    let eligibleUsers: { id: number; role: string }[];
    if (requesterRole === 'ADMIN') {
      eligibleUsers = allUsers;
    } else if (requesterRole === 'MODERATOR') {
      eligibleUsers = allUsers.filter(u => u.role !== 'ADMIN');
    } else {
      eligibleUsers = allUsers.filter(u => u.id === requesterId); // self only
    }

    const effectiveCount = Math.max(1, Number(count) || 10);
    const newContributions = Array.from({ length: effectiveCount }).map(() => {
      const randomUser = eligibleUsers[Math.floor(Math.random() * eligibleUsers.length)];
      return {
        userId: randomUser.id,
        vehicleData: {
          make: faker.vehicle.manufacturer(),
          model: faker.vehicle.model(),
          year: faker.date.past({ years: 10 }).getFullYear(),
          batteryCapacity: faker.number.int({ min: 40, max: 120 }),
          range: faker.number.int({ min: 200, max: 600 }),
          chargingSpeed: faker.number.int({ min: 50, max: 250 }),
        },
        status: 'PENDING' as const,
        createdAt: new Date(),
      };
    });

    await db.insert(contributions).values(newContributions as any);

    return c.json({ message: `Successfully seeded ${newContributions.length} contributions.` }, 201);
  } catch (error) {
    console.error('Error seeding contributions:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});
