import { NotificationService } from './services/notificationService';

async function testEmailFix() {
  console.log('🧪 Testing EMAIL notification fix...');
  
  try {
    // Queue a test EMAIL notification with proper userId
    const notificationId = await NotificationService.queueNotification({
      userId: 3, // Use a valid user ID
      channel: 'EMAIL',
      eventType: 'contribution.approved',
      recipient: 'test@example.com',
      subject: 'Test Email Notification',
      content: 'This is a test email notification to verify the email service fix works correctly.',
      metadata: {
        contributionId: 999,
        vehicleData: { make: 'Test', model: 'Vehicle' },
        timestamp: new Date().toISOString()
      }
    });
    
    console.log(`✅ Test email notification queued with ID: ${notificationId}`);
    
    // Wait a moment for the processor to pick it up
    console.log('⏳ Waiting for notification processor to process it...');
    console.log('📋 Check the backend logs to see if the email error is resolved');
    
  } catch (error) {
    console.error('❌ Error creating test email notification:', error);
  }
}

testEmailFix().then(() => {
  console.log('✅ Test completed - check the backend logs for processing results');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
