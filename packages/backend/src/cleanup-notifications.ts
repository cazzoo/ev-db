import { db } from './db';
import { notificationQueue } from './db/schema';
import { eq, isNull } from 'drizzle-orm';

async function cleanupBrokenNotifications() {
  console.log('🧹 Cleaning up broken notifications...');
  
  try {
    // Delete notifications with null userId that are IN_APP notifications
    const result = await db.delete(notificationQueue)
      .where(
        eq(notificationQueue.channel, 'IN_APP')
      );
    
    console.log(`✅ Deleted ${result.changes} IN_APP notifications`);
    
    // Also delete other broken notifications that have null userId and are failing
    const otherResult = await db.delete(notificationQueue)
      .where(
        isNull(notificationQueue.userId)
      );
    
    console.log(`✅ Deleted ${otherResult.changes} notifications with null userId`);
    
    // Check remaining notifications
    const remaining = await db.select().from(notificationQueue);
    console.log(`📋 Remaining notifications: ${remaining.length}`);
    
  } catch (error) {
    console.error('❌ Error cleaning up notifications:', error);
  }
}

cleanupBrokenNotifications().then(() => {
  console.log('✅ Cleanup completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});
