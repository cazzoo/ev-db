import { db } from '../db';
import { changelogs, changelogEntries } from '../db/schema';

// Script to create test changelogs
async function createTestChangelogs() {
  console.log('📋 Creating test changelogs...\n');

  try {
    // Create test changelogs
    const testChangelogs = [
      {
        version: '2.1.0',
        title: 'Enhanced Notification System',
        description: 'Major update introducing comprehensive notification system with user preferences and admin management.',
        releaseDate: new Date(),
        isPublished: true,
        publishedAt: new Date(),
        notificationSent: false,
        createdBy: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        version: '2.0.5',
        title: 'Bug Fixes and Performance Improvements',
        description: 'Various bug fixes and performance optimizations based on user feedback.',
        releaseDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 1 week ago
        isPublished: true,
        publishedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        notificationSent: true,
        createdBy: 1,
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      },
      {
        version: '2.0.0',
        title: 'Major Platform Update',
        description: 'Complete redesign with new features, improved performance, and better user experience.',
        releaseDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 1 month ago
        isPublished: true,
        publishedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        notificationSent: true,
        createdBy: 1,
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      },
    ];

    // Insert changelogs and get their IDs
    const insertedChangelogs = [];
    for (const changelog of testChangelogs) {
      const [inserted] = await db.insert(changelogs).values(changelog).returning();
      insertedChangelogs.push(inserted);
    }

    console.log(`✅ Created ${insertedChangelogs.length} test changelogs`);

    // Create changelog entries for each changelog
    const changelogEntryData = [
      // v2.1.0 entries
      {
        changelogId: insertedChangelogs[0].id,
        category: 'feature',
        title: 'In-App Notification System',
        description: 'Added comprehensive in-app notifications with real-time updates and user preferences.',
        sortOrder: 1,
        createdAt: new Date(),
      },
      {
        changelogId: insertedChangelogs[0].id,
        category: 'feature',
        title: 'Admin Notification Management',
        description: 'Administrators can now create, schedule, and manage notifications for users.',
        sortOrder: 2,
        createdAt: new Date(),
      },
      {
        changelogId: insertedChangelogs[0].id,
        category: 'feature',
        title: 'Notification Preferences',
        description: 'Users can customize their notification preferences by channel and event type.',
        sortOrder: 3,
        createdAt: new Date(),
      },
      {
        changelogId: insertedChangelogs[0].id,
        category: 'improvement',
        title: 'Enhanced User Experience',
        description: 'Improved notification bell with contextual actions and better visual indicators.',
        sortOrder: 4,
        createdAt: new Date(),
      },
      {
        changelogId: insertedChangelogs[0].id,
        category: 'improvement',
        title: 'Performance Optimization',
        description: 'Added database indexes for faster notification queries and better performance.',
        sortOrder: 5,
        createdAt: new Date(),
      },

      // v2.0.5 entries
      {
        changelogId: insertedChangelogs[1].id,
        category: 'bugfix',
        title: 'Fixed Contribution Voting',
        description: 'Resolved issue where contribution votes were not being properly recorded.',
        sortOrder: 1,
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      },
      {
        changelogId: insertedChangelogs[1].id,
        category: 'bugfix',
        title: 'Search Performance',
        description: 'Fixed slow search queries when filtering by multiple criteria.',
        sortOrder: 2,
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      },
      {
        changelogId: insertedChangelogs[1].id,
        category: 'improvement',
        title: 'Mobile Responsiveness',
        description: 'Improved mobile layout and touch interactions across the platform.',
        sortOrder: 3,
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      },

      // v2.0.0 entries
      {
        changelogId: insertedChangelogs[2].id,
        category: 'feature',
        title: 'New Dashboard Design',
        description: 'Completely redesigned dashboard with improved navigation and user experience.',
        sortOrder: 1,
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      },
      {
        changelogId: insertedChangelogs[2].id,
        category: 'feature',
        title: 'Advanced Search',
        description: 'Added advanced search functionality with filters and sorting options.',
        sortOrder: 2,
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      },
      {
        changelogId: insertedChangelogs[2].id,
        category: 'feature',
        title: 'Contribution System',
        description: 'Introduced community contribution system for adding and updating vehicle data.',
        sortOrder: 3,
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      },
      {
        changelogId: insertedChangelogs[2].id,
        category: 'improvement',
        title: 'Performance Boost',
        description: 'Significantly improved page load times and overall application performance.',
        sortOrder: 4,
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      },
      {
        changelogId: insertedChangelogs[2].id,
        category: 'improvement',
        title: 'Security Enhancements',
        description: 'Enhanced security measures and improved authentication system.',
        sortOrder: 5,
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      },
    ];

    // Insert changelog entries
    for (const entry of changelogEntryData) {
      await db.insert(changelogEntries).values(entry);
    }

    console.log(`✅ Created ${changelogEntryData.length} changelog entries`);

    console.log('\n📋 Test changelogs created:');
    insertedChangelogs.forEach((changelog, index) => {
      const entryCount = changelogEntryData.filter(e => e.changelogId === changelog.id).length;
      console.log(`   ${index + 1}. v${changelog.version} - ${changelog.title} (${entryCount} entries)`);
    });

    console.log('\n🌐 You can now access:');
    console.log('   • http://localhost:5173/changelog - View all changelogs');
    console.log('   • http://localhost:3000/api/changelogs/public - API endpoint');
    console.log('   • http://localhost:3000/api/changelogs/public/latest - Latest changelog');

  } catch (error) {
    console.error('❌ Failed to create test changelogs:', error);
    throw error;
  }
}

// Clean up test changelogs
async function cleanupTestChangelogs() {
  console.log('🧹 Cleaning up test changelogs...\n');

  try {
    // Delete changelog entries first (due to foreign key constraints)
    await db.delete(changelogEntries);
    console.log('✅ Deleted changelog entries');

    // Delete changelogs
    await db.delete(changelogs);
    console.log('✅ Deleted changelogs');

    console.log('\n✅ Test changelogs cleaned up successfully!');
  } catch (error) {
    console.error('❌ Failed to cleanup test changelogs:', error);
    throw error;
  }
}

// Export functions
export { createTestChangelogs, cleanupTestChangelogs };

// Run if called directly
if (require.main === module) {
  const action = process.argv[2];
  
  if (action === 'cleanup') {
    cleanupTestChangelogs()
      .then(() => {
        console.log('\n✅ Cleanup completed successfully!');
        process.exit(0);
      })
      .catch((error) => {
        console.error('\n❌ Cleanup failed:', error);
        process.exit(1);
      });
  } else {
    createTestChangelogs()
      .then(() => {
        console.log('\n✅ Test changelogs created successfully!');
        process.exit(0);
      })
      .catch((error) => {
        console.error('\n❌ Test changelog creation failed:', error);
        process.exit(1);
      });
  }
}
