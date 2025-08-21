import { db } from '../db';

// Script to add database indexes for notification system optimization
async function addNotificationIndexes() {
  console.log('📊 Adding database indexes for notification system optimization...\n');

  try {
    // Indexes for in_app_notifications table
    console.log('1️⃣ Adding indexes for in_app_notifications table...');
    
    await db.run(`CREATE INDEX IF NOT EXISTS in_app_notifications_user_id_idx ON in_app_notifications(user_id)`);
    console.log('   ✅ user_id index added');
    
    await db.run(`CREATE INDEX IF NOT EXISTS in_app_notifications_is_read_idx ON in_app_notifications(is_read)`);
    console.log('   ✅ is_read index added');
    
    await db.run(`CREATE INDEX IF NOT EXISTS in_app_notifications_created_at_idx ON in_app_notifications(created_at)`);
    console.log('   ✅ created_at index added');
    
    await db.run(`CREATE INDEX IF NOT EXISTS in_app_notifications_event_type_idx ON in_app_notifications(event_type)`);
    console.log('   ✅ event_type index added');
    
    await db.run(`CREATE INDEX IF NOT EXISTS in_app_notifications_user_read_idx ON in_app_notifications(user_id, is_read)`);
    console.log('   ✅ user_id + is_read composite index added');
    
    await db.run(`CREATE INDEX IF NOT EXISTS in_app_notifications_expires_at_idx ON in_app_notifications(expires_at)`);
    console.log('   ✅ expires_at index added');

    // Indexes for user_notification_preferences table
    console.log('\n2️⃣ Adding indexes for user_notification_preferences table...');
    
    await db.run(`CREATE INDEX IF NOT EXISTS user_notification_preferences_user_id_idx ON user_notification_preferences(user_id)`);
    console.log('   ✅ user_id index added');
    
    await db.run(`CREATE INDEX IF NOT EXISTS user_notification_preferences_user_channel_event_idx ON user_notification_preferences(user_id, channel, event_type)`);
    console.log('   ✅ user_id + channel + event_type composite index added');
    
    await db.run(`CREATE INDEX IF NOT EXISTS user_notification_preferences_enabled_idx ON user_notification_preferences(enabled)`);
    console.log('   ✅ enabled index added');

    // Indexes for scheduled_notifications table
    console.log('\n3️⃣ Adding indexes for scheduled_notifications table...');
    
    await db.run(`CREATE INDEX IF NOT EXISTS scheduled_notifications_status_idx ON scheduled_notifications(status)`);
    console.log('   ✅ status index added');
    
    await db.run(`CREATE INDEX IF NOT EXISTS scheduled_notifications_scheduled_at_idx ON scheduled_notifications(scheduled_at)`);
    console.log('   ✅ scheduled_at index added');
    
    await db.run(`CREATE INDEX IF NOT EXISTS scheduled_notifications_status_scheduled_idx ON scheduled_notifications(status, scheduled_at)`);
    console.log('   ✅ status + scheduled_at composite index added');
    
    await db.run(`CREATE INDEX IF NOT EXISTS scheduled_notifications_created_by_idx ON scheduled_notifications(created_by)`);
    console.log('   ✅ created_by index added');

    // Indexes for notification_analytics table
    console.log('\n4️⃣ Adding indexes for notification_analytics table...');
    
    await db.run(`CREATE INDEX IF NOT EXISTS notification_analytics_notification_id_idx ON notification_analytics(notification_id)`);
    console.log('   ✅ notification_id index added');
    
    await db.run(`CREATE INDEX IF NOT EXISTS notification_analytics_user_id_idx ON notification_analytics(user_id)`);
    console.log('   ✅ user_id index added');
    
    await db.run(`CREATE INDEX IF NOT EXISTS notification_analytics_event_type_idx ON notification_analytics(event_type)`);
    console.log('   ✅ event_type index added');
    
    await db.run(`CREATE INDEX IF NOT EXISTS notification_analytics_action_idx ON notification_analytics(action)`);
    console.log('   ✅ action index added');
    
    await db.run(`CREATE INDEX IF NOT EXISTS notification_analytics_created_at_idx ON notification_analytics(created_at)`);
    console.log('   ✅ created_at index added');

    // Indexes for changelogs table
    console.log('\n5️⃣ Adding indexes for changelogs table...');
    
    await db.run(`CREATE INDEX IF NOT EXISTS changelogs_is_published_idx ON changelogs(is_published)`);
    console.log('   ✅ is_published index added');
    
    await db.run(`CREATE INDEX IF NOT EXISTS changelogs_release_date_idx ON changelogs(release_date)`);
    console.log('   ✅ release_date index added');
    
    await db.run(`CREATE INDEX IF NOT EXISTS changelogs_published_release_idx ON changelogs(is_published, release_date)`);
    console.log('   ✅ is_published + release_date composite index added');

    // Indexes for changelog_entries table
    console.log('\n6️⃣ Adding indexes for changelog_entries table...');
    
    await db.run(`CREATE INDEX IF NOT EXISTS changelog_entries_changelog_id_idx ON changelog_entries(changelog_id)`);
    console.log('   ✅ changelog_id index added');
    
    await db.run(`CREATE INDEX IF NOT EXISTS changelog_entries_category_idx ON changelog_entries(category)`);
    console.log('   ✅ category index added');
    
    await db.run(`CREATE INDEX IF NOT EXISTS changelog_entries_sort_order_idx ON changelog_entries(sort_order)`);
    console.log('   ✅ sort_order index added');

    // Indexes for notification_templates table
    console.log('\n7️⃣ Adding indexes for notification_templates table...');
    
    await db.run(`CREATE INDEX IF NOT EXISTS notification_templates_event_type_idx ON notification_templates(event_type)`);
    console.log('   ✅ event_type index added');
    
    await db.run(`CREATE INDEX IF NOT EXISTS notification_templates_category_idx ON notification_templates(category)`);
    console.log('   ✅ category index added');
    
    await db.run(`CREATE INDEX IF NOT EXISTS notification_templates_is_active_idx ON notification_templates(is_active)`);
    console.log('   ✅ is_active index added');

    // Indexes for webhook_configurations table (for webhook integration)
    console.log('\n8️⃣ Adding indexes for webhook_configurations table...');
    
    await db.run(`CREATE INDEX IF NOT EXISTS webhook_configurations_created_by_idx ON webhook_configurations(created_by)`);
    console.log('   ✅ created_by index added');
    
    await db.run(`CREATE INDEX IF NOT EXISTS webhook_configurations_is_enabled_idx ON webhook_configurations(is_enabled)`);
    console.log('   ✅ is_enabled index added');
    
    await db.run(`CREATE INDEX IF NOT EXISTS webhook_configurations_enabled_created_idx ON webhook_configurations(is_enabled, created_by)`);
    console.log('   ✅ is_enabled + created_by composite index added');

    console.log('\n✅ All notification system indexes added successfully!');
    console.log('\n📈 Database performance should be significantly improved for:');
    console.log('   • User notification queries');
    console.log('   • Notification preference lookups');
    console.log('   • Scheduled notification processing');
    console.log('   • Analytics data retrieval');
    console.log('   • Changelog queries');
    console.log('   • Webhook configuration lookups');

  } catch (error) {
    console.error('❌ Failed to add indexes:', error);
    throw error;
  }
}

// Analyze query performance
async function analyzeQueryPerformance() {
  console.log('\n🔍 Analyzing query performance...\n');

  try {
    // Test common notification queries
    console.log('1️⃣ Testing user notification query performance...');
    const startTime1 = Date.now();
    
    await db.run(`EXPLAIN QUERY PLAN SELECT * FROM in_app_notifications WHERE user_id = 1 AND is_read = 0 ORDER BY created_at DESC LIMIT 20`);
    
    const endTime1 = Date.now();
    console.log(`   ✅ Query plan analyzed in ${endTime1 - startTime1}ms`);

    console.log('\n2️⃣ Testing notification preferences query performance...');
    const startTime2 = Date.now();
    
    await db.run(`EXPLAIN QUERY PLAN SELECT * FROM user_notification_preferences WHERE user_id = 1 AND channel = 'IN_APP' AND event_type = 'user.welcome'`);
    
    const endTime2 = Date.now();
    console.log(`   ✅ Query plan analyzed in ${endTime2 - startTime2}ms`);

    console.log('\n3️⃣ Testing scheduled notifications query performance...');
    const startTime3 = Date.now();
    
    await db.run(`EXPLAIN QUERY PLAN SELECT * FROM scheduled_notifications WHERE status = 'pending' AND scheduled_at <= datetime('now')`);
    
    const endTime3 = Date.now();
    console.log(`   ✅ Query plan analyzed in ${endTime3 - startTime3}ms`);

    console.log('\n✅ Query performance analysis completed!');

  } catch (error) {
    console.error('❌ Query performance analysis failed:', error);
    throw error;
  }
}

// Clean up expired notifications
async function cleanupExpiredNotifications() {
  console.log('\n🧹 Cleaning up expired notifications...\n');

  try {
    const now = new Date();
    
    // Delete expired in-app notifications
    const result = await db.run(`DELETE FROM in_app_notifications WHERE expires_at IS NOT NULL AND expires_at < ?`, [now.getTime()]);
    console.log(`✅ Deleted ${result.changes} expired notifications`);

    // Delete old read notifications (older than 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const oldResult = await db.run(`DELETE FROM in_app_notifications WHERE is_read = 1 AND created_at < ?`, [thirtyDaysAgo.getTime()]);
    console.log(`✅ Deleted ${oldResult.changes} old read notifications`);

    console.log('\n✅ Notification cleanup completed!');

  } catch (error) {
    console.error('❌ Notification cleanup failed:', error);
    throw error;
  }
}

// Export functions
export { addNotificationIndexes, analyzeQueryPerformance, cleanupExpiredNotifications };

// Run if called directly
if (require.main === module) {
  addNotificationIndexes()
    .then(() => analyzeQueryPerformance())
    .then(() => cleanupExpiredNotifications())
    .then(() => {
      console.log('\n🎉 Database optimization completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Database optimization failed:', error);
      process.exit(1);
    });
}
