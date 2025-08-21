import { db } from '../db';
import { users, inAppNotifications, userNotificationPreferences } from '../db/schema';
import { eq } from 'drizzle-orm';
import { AutomatedNotifications } from '../services/automatedNotifications';
import { AdminNotificationService } from '../services/adminNotificationService';
import { ChangelogService } from '../services/changelogService';
import { NotificationService } from '../services/notificationService';

// Test script for the comprehensive notification system
async function testNotificationSystem() {
  console.log('🧪 Starting Notification System Tests...\n');

  try {
    // Test 1: Create a test user
    console.log('1️⃣ Creating test user...');
    const [testUser] = await db.insert(users).values({
      email: 'test@evdatabase.com',
      password: 'hashed_password',
      role: 'MEMBER',
      name: 'Test User',
      appCurrencyBalance: 5, // Low credits for testing
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    console.log(`✅ Test user created: ${testUser.email} (ID: ${testUser.id})\n`);

    // Test 2: Welcome notification
    console.log('2️⃣ Testing welcome notification...');
    await AutomatedNotifications.sendWelcomeNotification(testUser.id);
    console.log('✅ Welcome notification sent\n');

    // Test 3: Low credits warning
    console.log('3️⃣ Testing low credits warning...');
    await AutomatedNotifications.sendLowCreditsWarning(testUser.id);
    console.log('✅ Low credits warning sent\n');

    // Test 4: Credit top-up confirmation
    console.log('4️⃣ Testing credit top-up confirmation...');
    await AutomatedNotifications.sendCreditTopUpConfirmation(
      testUser.id,
      50,
      'for testing purposes',
      55
    );
    console.log('✅ Credit top-up confirmation sent\n');

    // Test 5: Contribution vote notification
    console.log('5️⃣ Testing contribution vote notification...');
    await AutomatedNotifications.sendContributionVoteNotification({
      contributionId: 1,
      voterId: 2,
      voteType: 'upvote',
      contributorId: testUser.id,
    });
    console.log('✅ Contribution vote notification sent\n');

    // Test 6: Admin notification
    console.log('6️⃣ Testing admin notification...');
    const adminNotificationIds = await AdminNotificationService.createNotification({
      title: 'Test Admin Notification',
      content: 'This is a test notification from the admin panel.',
      notificationType: 'info',
      targetAudience: 'individual_users',
      targetUserIds: [testUser.id],
      actionUrl: '/dashboard',
      metadata: { testMode: true },
    }, 1);
    console.log(`✅ Admin notification sent to ${adminNotificationIds.length} users\n`);

    // Test 7: Scheduled notification
    console.log('7️⃣ Testing scheduled notification...');
    const scheduledTime = new Date();
    scheduledTime.setMinutes(scheduledTime.getMinutes() + 1); // 1 minute from now
    
    const scheduledId = await AdminNotificationService.scheduleNotification({
      title: 'Test Scheduled Notification',
      content: 'This notification was scheduled for future delivery.',
      notificationType: 'announcement',
      targetAudience: 'individual_users',
      targetUserIds: [testUser.id],
      scheduledAt: scheduledTime.toISOString(),
    }, 1);
    console.log(`✅ Notification scheduled (ID: ${scheduledId})\n`);

    // Test 8: Changelog creation and notification
    console.log('8️⃣ Testing changelog notification...');
    const changelogId = await ChangelogService.createChangelog({
      version: '1.0.0-test',
      title: 'Test Release',
      description: 'This is a test changelog entry.',
      releaseDate: new Date(),
      entries: [
        {
          category: 'feature',
          title: 'Test Feature',
          description: 'Added a new test feature for demonstration.',
        },
        {
          category: 'bugfix',
          title: 'Test Bug Fix',
          description: 'Fixed a test bug that was causing issues.',
        },
      ],
      isPublished: true,
      sendNotification: true,
    }, 1);
    console.log(`✅ Changelog created and notification sent (ID: ${changelogId})\n`);

    // Test 9: Maintenance alert
    console.log('9️⃣ Testing maintenance alert...');
    const maintenanceTime = new Date();
    maintenanceTime.setHours(maintenanceTime.getHours() + 2);
    
    await AutomatedNotifications.sendMaintenanceAlert(
      'Scheduled Maintenance',
      'We will be performing scheduled maintenance to improve system performance.',
      maintenanceTime,
      '2 hours'
    );
    console.log('✅ Maintenance alert sent\n');

    // Test 10: Notification preferences
    console.log('🔟 Testing notification preferences...');
    
    // Set some preferences
    await db.insert(userNotificationPreferences).values([
      {
        userId: testUser.id,
        channel: 'IN_APP',
        eventType: 'user.welcome',
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        userId: testUser.id,
        channel: 'EMAIL',
        eventType: 'user.welcome',
        enabled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    console.log('✅ Notification preferences set\n');

    // Test 11: Check notifications in database
    console.log('1️⃣1️⃣ Checking notifications in database...');
    const notifications = await db
      .select()
      .from(inAppNotifications)
      .where(eq(inAppNotifications.userId, testUser.id))
      .orderBy(inAppNotifications.createdAt);
    
    console.log(`✅ Found ${notifications.length} notifications for test user:`);
    notifications.forEach((notification, index) => {
      console.log(`   ${index + 1}. ${notification.title} (${notification.eventType}) - Read: ${notification.isRead}`);
    });
    console.log();

    // Test 12: Process scheduled notifications
    console.log('1️⃣2️⃣ Testing scheduled notification processing...');
    await AdminNotificationService.processScheduledNotifications();
    console.log('✅ Scheduled notifications processed\n');

    // Test 13: Notification analytics
    console.log('1️⃣3️⃣ Testing notification analytics...');
    const analytics = await AdminNotificationService.getNotificationAnalytics();
    console.log('✅ Analytics retrieved:');
    console.log(`   Total sent: ${analytics.totalSent}`);
    console.log(`   Total read: ${analytics.totalRead}`);
    console.log(`   Read rate: ${analytics.readRate}%`);
    console.log(`   Click rate: ${analytics.clickRate}%`);
    console.log();

    // Test 14: Cleanup test data
    console.log('1️⃣4️⃣ Cleaning up test data...');
    
    // Delete test notifications
    await db.delete(inAppNotifications).where(eq(inAppNotifications.userId, testUser.id));
    
    // Delete test preferences
    await db.delete(userNotificationPreferences).where(eq(userNotificationPreferences.userId, testUser.id));
    
    // Delete test changelog
    await ChangelogService.deleteChangelog(changelogId);
    
    // Delete test user
    await db.delete(users).where(eq(users.id, testUser.id));
    
    console.log('✅ Test data cleaned up\n');

    console.log('🎉 All notification system tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

// Performance test
async function performanceTest() {
  console.log('⚡ Starting Performance Tests...\n');

  try {
    // Test bulk notification creation
    console.log('1️⃣ Testing bulk notification performance...');
    const startTime = Date.now();
    
    // Create 100 test notifications
    const bulkNotifications = Array.from({ length: 100 }, (_, i) => ({
      userId: 1, // Assuming admin user exists
      title: `Performance Test Notification ${i + 1}`,
      content: `This is test notification number ${i + 1} for performance testing.`,
      eventType: 'system.announcement',
      notificationType: 'info' as const,
      category: 'system' as const,
      priority: 'normal' as const,
      isRead: false,
      createdAt: new Date(),
    }));

    await db.insert(inAppNotifications).values(bulkNotifications);
    
    const endTime = Date.now();
    console.log(`✅ Created 100 notifications in ${endTime - startTime}ms\n`);

    // Test bulk query performance
    console.log('2️⃣ Testing bulk query performance...');
    const queryStartTime = Date.now();
    
    const notifications = await db
      .select()
      .from(inAppNotifications)
      .where(eq(inAppNotifications.userId, 1))
      .limit(50);
    
    const queryEndTime = Date.now();
    console.log(`✅ Queried ${notifications.length} notifications in ${queryEndTime - queryStartTime}ms\n`);

    // Cleanup performance test data
    await db.delete(inAppNotifications).where(eq(inAppNotifications.userId, 1));
    console.log('✅ Performance test data cleaned up\n');

    console.log('⚡ Performance tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Performance test failed:', error);
    throw error;
  }
}

// Run tests
async function runAllTests() {
  try {
    await testNotificationSystem();
    console.log('\n' + '='.repeat(50) + '\n');
    await performanceTest();
  } catch (error) {
    console.error('Test suite failed:', error);
    process.exit(1);
  }
}

// Export for use in other scripts
export { testNotificationSystem, performanceTest, runAllTests };

// Run if called directly
if (require.main === module) {
  runAllTests().then(() => {
    console.log('\n🎉 All tests completed successfully!');
    process.exit(0);
  }).catch((error) => {
    console.error('\n❌ Tests failed:', error);
    process.exit(1);
  });
}
