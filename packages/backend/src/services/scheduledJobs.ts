import { AutomatedNotifications } from './automatedNotifications';
import { AdminNotificationService } from './adminNotificationService';
import { AutoChangelogService } from './autoChangelogService';

// Simple in-memory job scheduler
class JobScheduler {
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private isRunning = false;

  start() {
    if (this.isRunning) {
      console.log('Job scheduler is already running');
      return;
    }

    this.isRunning = true;
    console.log('Starting job scheduler...');

    // Check for low credits every hour
    this.scheduleJob('low-credits-check', () => {
      AutomatedNotifications.checkAndSendLowCreditsWarnings();
    }, 60 * 60 * 1000); // 1 hour

    // Process scheduled notifications every 5 minutes
    this.scheduleJob('process-scheduled-notifications', () => {
      AdminNotificationService.processScheduledNotifications();
    }, 5 * 60 * 1000); // 5 minutes

    // Send delayed welcome notifications every 10 minutes
    this.scheduleJob('delayed-welcome-notifications', () => {
      AutomatedNotifications.sendDelayedWelcomeNotifications();
    }, 10 * 60 * 1000); // 10 minutes

    // Process Git commits into changelog entries every 5 minutes
    this.scheduleJob('auto-changelog-processing', async () => {
      const autoChangelogService = new AutoChangelogService();
      await autoChangelogService.processNewCommits();
    }, 5 * 60 * 1000); // 5 minutes

    console.log('Job scheduler started successfully');
  }

  stop() {
    if (!this.isRunning) {
      console.log('Job scheduler is not running');
      return;
    }

    console.log('Stopping job scheduler...');

    for (const [jobName, interval] of this.intervals) {
      clearInterval(interval);
      console.log(`Stopped job: ${jobName}`);
    }

    this.intervals.clear();
    this.isRunning = false;
    console.log('Job scheduler stopped');
  }

  private scheduleJob(name: string, job: () => void, intervalMs: number) {
    // Run immediately
    this.runJobSafely(name, job);

    // Then schedule to run at intervals
    const interval = setInterval(() => {
      this.runJobSafely(name, job);
    }, intervalMs);

    this.intervals.set(name, interval);
    console.log(`Scheduled job '${name}' to run every ${intervalMs / 1000} seconds`);
  }

  private runJobSafely(name: string, job: () => void) {
    try {
      console.log(`Running job: ${name}`);
      job();
    } catch (error) {
      console.error(`Error running job '${name}':`, error);
    }
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      activeJobs: Array.from(this.intervals.keys()),
      jobCount: this.intervals.size,
    };
  }
}

// Export singleton instance
export const jobScheduler = new JobScheduler();

// Auto-start in production
if (process.env.NODE_ENV === 'production') {
  jobScheduler.start();
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, stopping job scheduler...');
  jobScheduler.stop();
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, stopping job scheduler...');
  jobScheduler.stop();
});

// Manual job triggers for testing/admin use
export const ManualJobTriggers = {
  async triggerLowCreditsCheck() {
    console.log('Manually triggering low credits check...');
    await AutomatedNotifications.checkAndSendLowCreditsWarnings();
  },

  async triggerScheduledNotifications() {
    console.log('Manually triggering scheduled notifications processing...');
    await AdminNotificationService.processScheduledNotifications();
  },

  async triggerWelcomeNotifications() {
    console.log('Manually triggering delayed welcome notifications...');
    await AutomatedNotifications.sendDelayedWelcomeNotifications();
  },

  async triggerAutoChangelogProcessing() {
    console.log('Manually triggering auto-changelog processing...');
    const autoChangelogService = new AutoChangelogService();
    const result = await autoChangelogService.processNewCommits();
    console.log('Auto-changelog result:', result);
    return result;
  },

  async sendTestMaintenanceAlert() {
    console.log('Sending test maintenance alert...');
    const scheduledTime = new Date();
    scheduledTime.setHours(scheduledTime.getHours() + 2); // 2 hours from now

    await AutomatedNotifications.sendMaintenanceAlert(
      'Scheduled Maintenance',
      'We will be performing scheduled maintenance to improve system performance and add new features.',
      scheduledTime,
      '2 hours'
    );
  },

  getSchedulerStatus() {
    return jobScheduler.getStatus();
  },

  startScheduler() {
    jobScheduler.start();
  },

  stopScheduler() {
    jobScheduler.stop();
  }
};
