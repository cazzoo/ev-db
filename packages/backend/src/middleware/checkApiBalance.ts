import { Context, Next } from 'hono';
import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';

export const checkApiBalance = async (c: Context, next: Next) => {
  const payload = c.get('jwtPayload');
  const userId = payload.userId;

  if (!userId) {
    return c.json({ error: 'Unauthorized: User ID not found in token' }, 401);
  }

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

  if (!user) {
    return c.json({ error: 'Unauthorized: User not found' }, 401);
  }

  // Admins and Moderators have unlimited API calls
  if (user.role === 'ADMIN' || user.role === 'MODERATOR') {
    await next();
    return;
  }

  // For regular members, check balance
  if (user.appCurrencyBalance <= 0) {
    return c.json({ error: 'Payment Required: Insufficient API balance' }, 402);
  }

  // Deduct 1 credit for the API call
  await db.update(users).set({ appCurrencyBalance: user.appCurrencyBalance - 1 }).where(eq(users.id, userId));

  await next();
};
