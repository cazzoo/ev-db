import { NotificationService } from './notificationService';

// Notification queue processor
export class NotificationProcessor {
  private static isRunning = false;
  private static intervalId: NodeJS.Timeout | null = null;
  private static readonly PROCESS_INTERVAL = 30000; // 30 seconds

  // Start the notification processor
  static start(): void {
    if (this.isRunning) {
      console.log('Notification processor is already running');
      return;
    }

    console.log('Starting notification processor...');
    this.isRunning = true;

    // Process immediately
    this.processQueue();

    // Set up interval processing
    this.intervalId = setInterval(() => {
      this.processQueue();
    }, this.PROCESS_INTERVAL);

    console.log(`Notification processor started with ${this.PROCESS_INTERVAL}ms interval`);
  }

  // Stop the notification processor
  static stop(): void {
    if (!this.isRunning) {
      console.log('Notification processor is not running');
      return;
    }

    console.log('Stopping notification processor...');
    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    console.log('Notification processor stopped');
  }

  // Process the notification queue
  private static async processQueue(): Promise<void> {
    try {
      await NotificationService.processPendingNotifications(50);
    } catch (error) {
      console.error('Error processing notification queue:', error);
    }
  }

  // Get processor status
  static getStatus(): { isRunning: boolean; interval: number } {
    return {
      isRunning: this.isRunning,
      interval: this.PROCESS_INTERVAL,
    };
  }
}

// Auto-start the processor in non-test environments
if (process.env.NODE_ENV !== 'test') {
  // Start after a short delay to ensure database is ready
  setTimeout(() => {
    NotificationProcessor.start();
  }, 5000);
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Received SIGINT, stopping notification processor...');
  NotificationProcessor.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Received SIGTERM, stopping notification processor...');
  NotificationProcessor.stop();
  process.exit(0);
});
