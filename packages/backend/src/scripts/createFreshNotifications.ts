import { db } from '../db';
import { inAppNotifications } from '../db/schema';

// Script to create fresh unread notifications for testing
async function createFreshNotifications() {
  console.log('🆕 Creating fresh unread notifications for testing...\n');

  try {
    // Create fresh test notifications
    const freshNotifications = [
      {
        userId: 1,
        title: '🎉 New Contribution Approved!',
        content: 'Your latest contribution "Porsche Taycan 2024" has been approved and is now live!',
        eventType: 'contribution.approved',
        notificationType: 'success',
        category: 'contribution',
        priority: 'high',
        actionUrl: '/contributions/1',
        metadata: JSON.stringify({
          contributionId: 1,
          contributionTitle: 'Porsche Taycan 2024',
        }),
        isRead: false,
        createdAt: new Date(),
      },
      {
        userId: 1,
        title: '👍 Another Upvote!',
        content: 'Your contribution "Mercedes EQS 2024" received another upvote from the community!',
        eventType: 'contribution.vote_received',
        notificationType: 'success',
        category: 'contribution',
        priority: 'normal',
        actionUrl: '/contributions/2',
        metadata: JSON.stringify({
          contributionId: 2,
          voteType: 'upvote',
          contributionTitle: 'Mercedes EQS 2024',
        }),
        isRead: false,
        createdAt: new Date(Date.now() - 2 * 60 * 1000), // 2 minutes ago
      },
      {
        userId: 1,
        title: '⚠️ Credits Running Low',
        content: 'You have only 5 credits remaining. Consider contributing more data to earn credits!',
        eventType: 'user.low_credits',
        notificationType: 'warning',
        category: 'user',
        priority: 'high',
        actionUrl: '/contribute',
        metadata: JSON.stringify({
          currentCredits: 5,
          threshold: 10,
        }),
        isRead: false,
        createdAt: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
      },
    ];

    // Insert fresh notifications
    for (const notification of freshNotifications) {
      await db.insert(inAppNotifications).values(notification);
    }

    console.log(`✅ Created ${freshNotifications.length} fresh unread notifications!`);
    console.log('\n📋 Fresh notifications:');
    freshNotifications.forEach((notif, index) => {
      console.log(`   ${index + 1}. ${notif.title} → ${notif.actionUrl}`);
    });

    console.log('\n🔗 Test these URLs by clicking notifications:');
    console.log('   • /contributions/1 (should show contribution detail)');
    console.log('   • /contributions/2 (should show contribution detail)');
    console.log('   • /contribute (should show contribute page)');

    console.log('\n🌐 Open http://localhost:5173 and check the notification bell!');
    console.log('📝 Open browser console to see debug logs when clicking notifications.');

  } catch (error) {
    console.error('❌ Failed to create fresh notifications:', error);
    throw error;
  }
}

// Run the script
if (require.main === module) {
  createFreshNotifications()
    .then(() => {
      console.log('\n✅ Fresh notifications created successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Fresh notification creation failed:', error);
      process.exit(1);
    });
}

export { createFreshNotifications };
