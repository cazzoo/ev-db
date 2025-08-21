import { db } from '../db';
import { inAppNotifications, users } from '../db/schema';
import { eq } from 'drizzle-orm';

// Script to create test notifications for testing the notification system
async function createTestNotifications() {
  console.log('🧪 Creating test notifications...\n');

  try {
    // Get the first user (admin) for testing
    const [testUser] = await db
      .select()
      .from(users)
      .limit(1);

    if (!testUser) {
      console.error('❌ No users found in database. Please create a user first.');
      return;
    }

    console.log(`📧 Creating notifications for user: ${testUser.email} (ID: ${testUser.id})`);

    // Create test notifications with different types and priorities
    const testNotifications = [
      {
        userId: testUser.id,
        title: '✅ Contribution Approved!',
        content: 'Great news! Your contribution "Tesla Model 3 2023" has been approved and is now live in the database.',
        eventType: 'contribution.approved',
        notificationType: 'success',
        category: 'contribution',
        priority: 'high',
        actionUrl: '/contributions/1',
        metadata: JSON.stringify({
          contributionId: 1,
          contributionTitle: 'Tesla Model 3 2023',
        }),
        isRead: false,
        createdAt: new Date(),
      },
      {
        userId: testUser.id,
        title: '👍 Your contribution received an upvote',
        content: 'Someone upvoted your contribution "BMW i4 2024". Community feedback helps improve the quality of our database!',
        eventType: 'contribution.vote_received',
        notificationType: 'success',
        category: 'contribution',
        priority: 'normal',
        actionUrl: '/contributions/2',
        metadata: JSON.stringify({
          contributionId: 2,
          voteType: 'upvote',
          contributionTitle: 'BMW i4 2024',
        }),
        isRead: false,
        createdAt: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
      },
      {
        userId: testUser.id,
        title: '⚠️ Low Credits Warning',
        content: 'Your credit balance is running low (8 credits remaining). Consider contributing more vehicle data to earn additional credits.',
        eventType: 'user.low_credits',
        notificationType: 'warning',
        category: 'user',
        priority: 'high',
        actionUrl: '/contribute',
        metadata: JSON.stringify({
          currentCredits: 8,
          threshold: 10,
        }),
        isRead: false,
        createdAt: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
      },
      {
        userId: testUser.id,
        title: '📋 New Features Available!',
        content: 'Check out the latest updates including improved search functionality and new vehicle categories.',
        eventType: 'system.changelog',
        notificationType: 'info',
        category: 'changelog',
        priority: 'normal',
        actionUrl: '/changelog',
        metadata: JSON.stringify({
          version: '2.1.0',
        }),
        isRead: false,
        createdAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
      },
      {
        userId: testUser.id,
        title: '❌ Contribution Needs Revision',
        content: 'Your contribution "Audi e-tron GT 2024" needs some revisions before it can be approved. Please check the feedback and resubmit.',
        eventType: 'contribution.rejected',
        notificationType: 'warning',
        category: 'contribution',
        priority: 'high',
        actionUrl: '/contributions/3',
        metadata: JSON.stringify({
          contributionId: 3,
          contributionTitle: 'Audi e-tron GT 2024',
          adminMessage: 'Please provide more accurate range specifications.',
        }),
        isRead: true, // This one is read
        readAt: new Date(Date.now() - 10 * 60 * 1000),
        createdAt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
      },
      {
        userId: testUser.id,
        title: '💰 Credits Added to Your Account',
        content: 'You have received 25 credits for your approved contribution. Your new balance is 33 credits.',
        eventType: 'user.credit_topup',
        notificationType: 'success',
        category: 'user',
        priority: 'normal',
        actionUrl: '/dashboard',
        metadata: JSON.stringify({
          creditsAdded: 25,
          newBalance: 33,
          reason: 'for approved contribution',
        }),
        isRead: true, // This one is read
        readAt: new Date(Date.now() - 45 * 60 * 1000),
        createdAt: new Date(Date.now() - 90 * 60 * 1000), // 1.5 hours ago
      },
      {
        userId: testUser.id,
        title: '🔧 Scheduled Maintenance Notice',
        content: 'We will be performing scheduled maintenance tomorrow from 2:00 AM to 4:00 AM UTC. The service may be temporarily unavailable.',
        eventType: 'system.maintenance',
        notificationType: 'warning',
        category: 'maintenance',
        priority: 'high',
        actionUrl: null,
        metadata: JSON.stringify({
          maintenanceStart: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          duration: '2 hours',
        }),
        isRead: false,
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      },
    ];

    // Insert all test notifications
    for (const notification of testNotifications) {
      await db.insert(inAppNotifications).values(notification);
    }

    console.log(`✅ Created ${testNotifications.length} test notifications successfully!`);
    console.log('\n📊 Notification Summary:');
    console.log(`   • ${testNotifications.filter(n => !n.isRead).length} unread notifications`);
    console.log(`   • ${testNotifications.filter(n => n.isRead).length} read notifications`);
    console.log(`   • ${testNotifications.filter(n => n.priority === 'high').length} high priority`);
    console.log(`   • ${testNotifications.filter(n => n.priority === 'normal').length} normal priority`);
    console.log('\n🎯 Test scenarios covered:');
    console.log('   • Contribution approved (with action URL)');
    console.log('   • Contribution rejected (with action URL)');
    console.log('   • Vote received (with action URL)');
    console.log('   • Low credits warning');
    console.log('   • Credit top-up confirmation');
    console.log('   • System changelog');
    console.log('   • Maintenance alert');
    console.log('   • Mix of read/unread states');
    console.log('   • Different priorities and categories');
    console.log('\n🔗 You can now test:');
    console.log('   1. Notification bell showing unread count');
    console.log('   2. Notifications ordered by newest first');
    console.log('   3. Clicking on contribution notifications navigates to /contributions/:id');
    console.log('   4. Contextual actions (mark as read, delete) on hover');
    console.log('   5. Different notification types and styling');

  } catch (error) {
    console.error('❌ Failed to create test notifications:', error);
    throw error;
  }
}

// Clean up test notifications
async function cleanupTestNotifications() {
  console.log('🧹 Cleaning up test notifications...\n');

  try {
    const result = await db
      .delete(inAppNotifications)
      .where(eq(inAppNotifications.eventType, 'contribution.approved'))
      .returning();

    // Also clean up other test notifications by checking for test-specific content
    await db.execute(`
      DELETE FROM in_app_notifications 
      WHERE content LIKE '%Tesla Model 3 2023%' 
         OR content LIKE '%BMW i4 2024%' 
         OR content LIKE '%Audi e-tron GT 2024%'
         OR title LIKE '%test%'
    `);

    console.log('✅ Test notifications cleaned up successfully!');
  } catch (error) {
    console.error('❌ Failed to cleanup test notifications:', error);
    throw error;
  }
}

// Export functions
export { createTestNotifications, cleanupTestNotifications };

// Run if called directly
if (require.main === module) {
  const action = process.argv[2];
  
  if (action === 'cleanup') {
    cleanupTestNotifications()
      .then(() => {
        console.log('\n✅ Cleanup completed successfully!');
        process.exit(0);
      })
      .catch((error) => {
        console.error('\n❌ Cleanup failed:', error);
        process.exit(1);
      });
  } else {
    createTestNotifications()
      .then(() => {
        console.log('\n✅ Test notifications created successfully!');
        console.log('\n🌐 Open http://localhost:5173 and check the notification bell!');
        process.exit(0);
      })
      .catch((error) => {
        console.error('\n❌ Test notification creation failed:', error);
        process.exit(1);
      });
  }
}
