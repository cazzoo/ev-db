import { AdminNotificationService } from '../services/adminNotificationService';

// Script to test AdminNotificationService methods
async function testAdminNotificationService() {
  console.log('🔍 Testing AdminNotificationService...\n');

  try {
    console.log('1️⃣ Testing getScheduledNotifications...');
    const scheduledResult = await AdminNotificationService.getScheduledNotifications(1, 10);
    console.log('Scheduled notifications result:', JSON.stringify(scheduledResult, null, 2));

    console.log('\n2️⃣ Testing getNotificationAnalytics...');
    const analyticsResult = await AdminNotificationService.getNotificationAnalytics();
    console.log('Analytics result:', JSON.stringify(analyticsResult, null, 2));

    console.log('\n3️⃣ Testing getNotificationAnalytics with date range...');
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    const endDate = new Date();
    const analyticsWithDateResult = await AdminNotificationService.getNotificationAnalytics(startDate, endDate);
    console.log('Analytics with date range result:', JSON.stringify(analyticsWithDateResult, null, 2));

  } catch (error) {
    console.error('❌ Error in AdminNotificationService test:', error);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
if (require.main === module) {
  testAdminNotificationService()
    .then(() => {
      console.log('\n✅ AdminNotificationService test completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ AdminNotificationService test failed:', error);
      process.exit(1);
    });
}

export { testAdminNotificationService };
