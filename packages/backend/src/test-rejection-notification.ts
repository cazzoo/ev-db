import { NotificationService } from './services/notificationService';

async function testRejectionNotification() {
  console.log('🧪 Testing rejection notification with actionUrl...');
  
  try {
    // Queue a test rejection notification with proper userId
    const notificationId = await NotificationService.queueNotification({
      userId: 3, // Use a valid user ID
      channel: 'IN_APP',
      eventType: 'contribution.rejected',
      recipient: 'user@example.com',
      subject: 'Contribution Rejected',
      content: 'Your contribution has been rejected. Please check the feedback and resubmit.',
      metadata: {
        contributionId: 999,
        vehicleData: { make: 'Test', model: 'Vehicle' },
        rejectionComment: 'Missing required specifications',
        timestamp: new Date().toISOString()
      }
    });
    
    console.log(`✅ Test rejection notification queued with ID: ${notificationId}`);
    
    // Wait a moment for the processor to pick it up
    console.log('⏳ Waiting for notification processor to process it...');
    console.log('📋 Check the database to see if actionUrl is included');
    
  } catch (error) {
    console.error('❌ Error creating test rejection notification:', error);
  }
}

testRejectionNotification().then(() => {
  console.log('✅ Test completed - check the backend logs and database for results');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
