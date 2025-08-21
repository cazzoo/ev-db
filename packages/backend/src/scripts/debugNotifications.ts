import { db } from '../db';
import { inAppNotifications } from '../db/schema';
import { eq } from 'drizzle-orm';

// Script to debug notification data
async function debugNotifications() {
  console.log('🔍 Debugging notification data...\n');

  try {
    // Get all notifications for user ID 1
    const notifications = await db
      .select()
      .from(inAppNotifications)
      .where(eq(inAppNotifications.userId, 1))
      .limit(5);

    console.log(`Found ${notifications.length} notifications:`);
    
    notifications.forEach((notification, index) => {
      console.log(`\n${index + 1}. Notification ID: ${notification.id}`);
      console.log(`   Title: ${notification.title}`);
      console.log(`   Event Type: ${notification.eventType}`);
      console.log(`   Action URL: ${notification.actionUrl}`);
      console.log(`   Is Read: ${notification.isRead}`);
      console.log(`   Created At: ${notification.createdAt}`);
      console.log(`   Raw data:`, JSON.stringify(notification, null, 2));
    });

    // Test the API endpoint directly
    console.log('\n🌐 Testing API endpoint...');
    
    // Simulate the API call
    const apiResult = await db
      .select()
      .from(inAppNotifications)
      .where(eq(inAppNotifications.userId, 1))
      .limit(3);

    console.log('API result:', JSON.stringify(apiResult, null, 2));

  } catch (error) {
    console.error('❌ Failed to debug notifications:', error);
    throw error;
  }
}

// Run the debug script
if (require.main === module) {
  debugNotifications()
    .then(() => {
      console.log('\n✅ Debug completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Debug failed:', error);
      process.exit(1);
    });
}

export { debugNotifications };
