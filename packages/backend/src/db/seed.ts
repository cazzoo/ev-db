import { db } from './index';
import { users } from './schema';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';

export const seedUsers = async () => {
  console.log('Seeding users...');

  const seedData = [
    {
      email: 'admin@example.com',
      password: 'password',
      role: 'ADMIN',
    },
    {
      email: 'moderator@example.com',
      password: 'password',
      role: 'MODERATOR',
    },
    {
      email: 'user@example.com',
      password: 'password',
      role: 'MEMBER',
    },
  ];

  for (const userData of seedData) {
    const existingUser = await db.select().from(users).where(eq(users.email, userData.email)).limit(1);

    if (existingUser.length === 0) {
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      await db.insert(users).values({
        email: userData.email,
        password: hashedPassword,
        role: userData.role as 'ADMIN' | 'MODERATOR' | 'MEMBER',
        appCurrencyBalance: 100, // Give some starting currency for development
      });
      console.log(`User ${userData.email} seeded.`);
    } else {
      console.log(`User ${userData.email} already exists. Skipping.`);
    }
  }

  console.log('User seeding complete.');
};
