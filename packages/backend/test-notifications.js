const { db } = require('./dist/db');
const { notificationQueue, inAppNotifications } = require('./dist/db/schema');
const { eq } = require('drizzle-orm');

async function checkNotifications() {
  console.log('🔍 Checking notification queue...');
  
  try {
    // Check pending notifications
    const pending = await db.select().from(notificationQueue).where(eq(notificationQueue.status, 'PENDING')).limit(10);
    console.log(`📋 Pending notifications: ${pending.length}`);
    
    if (pending.length > 0) {
      console.log('Pending notifications:');
      pending.forEach(n => {
        console.log(`  - ID: ${n.id}, Channel: ${n.channel}, Event: ${n.eventType}, UserID: ${n.userId}, Status: ${n.status}`);
      });
    }
    
    // Check in-app notifications
    const inApp = await db.select().from(inAppNotifications).limit(10);
    console.log(`📱 In-app notifications: ${inApp.length}`);
    
    if (inApp.length > 0) {
      console.log('Recent in-app notifications:');
      inApp.forEach(n => {
        console.log(`  - ID: ${n.id}, UserID: ${n.userId}, Title: ${n.title}, Read: ${n.isRead}`);
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
