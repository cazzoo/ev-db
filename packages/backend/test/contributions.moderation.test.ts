import { describe, it, expect, beforeAll } from 'vitest';
import { Hono } from 'hono';
import crypto from 'crypto';
import { db } from '../src/db';
import { users, contributions } from '../src/db/schema';

const JWT_SECRET = 'your-secret-key';

// Create HS256 JWT
function signJwt(payload: any, secret: string) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const enc = (obj: any) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const data = `${enc(header)}.${enc(payload)}`;
  const sig = crypto.createHmac('sha256', secret).update(data).digest('base64url');
  return `${data}.${sig}`;
}

async function buildApp() {
  process.env.JWT_SECRET = JWT_SECRET;
  const { default: contributionsRouter } = await import('../src/contributions');
  const app = new Hono();
  app.route('/contributions', contributionsRouter);
  return app;
}

describe('Moderation logs endpoint and rejection workflow', () => {
  let app: Hono;
  let contributorId: number;
  let moderatorId: number;
  let contributionId: number;

  beforeAll(async () => {
    app = await buildApp();
    // Seed users
    const [contribUser] = await db.insert(users).values({ email: 'c@example.com', password: 'x', role: 'MEMBER' }).returning({ id: users.id });
    const [modUser] = await db.insert(users).values({ email: 'm@example.com', password: 'x', role: 'MODERATOR' }).returning({ id: users.id });
    contributorId = contribUser.id as unknown as number;
    moderatorId = modUser.id as unknown as number;
    // Seed a pending contribution
    const vehicle = { make: 'Test', model: 'One', year: 2024 } as any;
    const [cRow] = await db.insert(contributions).values({ userId: contributorId, vehicleData: vehicle, status: 'PENDING', changeType: 'NEW', createdAt: new Date() }).returning({ id: contributions.id });
    contributionId = cRow.id as unknown as number;
  });

  it('rejects unauthorized users for moderation logs', async () => {
    const res = await app.request(`/contributions/${contributionId}/moderation-logs`);
    expect(res.status).toBe(401); // No Authorization header
  });

  it('requires comment for rejection and then creates moderation log', async () => {
    const modToken = signJwt({ userId: moderatorId, role: 'MODERATOR' }, JWT_SECRET);

    // Too short comment
    let res = await app.request(`/contributions/${contributionId}/reject`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${modToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ comment: 'short' })
    });
    expect(res.status).toBe(400);

    // Valid rejection
    res = await app.request(`/contributions/${contributionId}/reject`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${modToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ comment: 'Insufficient details, please provide battery specs.' })
    });
    expect(res.status).toBe(200);

    // Fetch logs as owner
    const ownerToken = signJwt({ userId: contributorId, role: 'MEMBER' }, JWT_SECRET);
    const logsRes = await app.request(`/contributions/${contributionId}/moderation-logs`, {
      headers: { 'Authorization': `Bearer ${ownerToken}` }
    });
    expect(logsRes.status).toBe(200);
    const data = await logsRes.json();
    expect(Array.isArray(data.logs)).toBe(true);
    expect(data.logs.length).toBeGreaterThanOrEqual(1);
    expect(data.logs[0].action).toBe('REJECT');
  });
});

