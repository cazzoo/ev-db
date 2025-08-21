import { db } from './db';
import { notificationQueue, inAppNotifications } from './db/schema';
import { eq, desc } from 'drizzle-orm';

async function checkNotifications() {
  console.log('🔍 Checking notification queue...');

  try {
    // Check pending notifications
    const pending = await db.select().from(notificationQueue)
      .where(eq(notificationQueue.status, 'PENDING'))
      .orderBy(desc(notificationQueue.id))
      .limit(10);

    console.log(`📋 Pending notifications: ${pending.length}`);

    if (pending.length > 0) {
      console.log('Pending notifications:');
      pending.forEach(n => {
        console.log(`  - ID: ${n.id}, Channel: ${n.channel}, Event: ${n.eventType}, UserID: ${n.userId}, Status: ${n.status}`);
      });
    }

    // Check failed notifications
    const failed = await db.select().from(notificationQueue)
      .where(eq(notificationQueue.status, 'FAILED'))
      .orderBy(desc(notificationQueue.id))
      .limit(5);

    console.log(`❌ Failed notifications: ${failed.length}`);

    if (failed.length > 0) {
      console.log('Recent failed notifications:');
      failed.forEach(n => {
        console.log(`  - ID: ${n.id}, Channel: ${n.channel}, Event: ${n.eventType}, UserID: ${n.userId}, Error: ${n.errorMessage}`);
      });
    }

    // Check in-app notifications
    const inApp = await db.select().from(inAppNotifications)
      .orderBy(desc(inAppNotifications.id))
      .limit(10);

    console.log(`📱 In-app notifications: ${inApp.length}`);

    if (inApp.length > 0) {
      console.log('Recent in-app notifications:');
      inApp.forEach(n => {
        console.log(`  - ID: ${n.id}, UserID: ${n.userId}, Title: ${n.title}, Read: ${n.isRead}, Event: ${n.eventType}, ActionURL: ${n.actionUrl || 'null'}, Created: ${new Date(n.createdAt).toLocaleString()}`);
      });
    }

  } catch (error) {
    console.error('❌ Error checking notifications:', error);
  }
}

checkNotifications().then(() => {
  console.log('✅ Check completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});
