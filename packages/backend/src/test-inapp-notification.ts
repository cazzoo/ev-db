import { NotificationService } from './services/notificationService';

async function testInAppNotification() {
  console.log('🧪 Testing IN_APP notification...');
  
  try {
    // Queue a test IN_APP notification with proper userId
    const notificationId = await NotificationService.queueNotification({
      userId: 3, // Use a valid user ID
      channel: 'IN_APP',
      eventType: 'contribution.approved',
      recipient: 'user@example.com',
      subject: 'Test Notification',
      content: 'This is a test notification to verify the IN_APP handler works correctly.',
      metadata: {
        contributionId: 999,
        vehicleData: { make: 'Test', model: 'Vehicle' },
        timestamp: new Date().toISOString()
      }
    });
    
    console.log(`✅ Test notification queued with ID: ${notificationId}`);
    
    // Wait a moment for the processor to pick it up
    console.log('⏳ Waiting for notification processor to process it...');
    
  } catch (error) {
    console.error('❌ Error creating test notification:', error);
  }
}

testInAppNotification().then(() => {
  console.log('✅ Test completed - check the backend logs for processing results');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
