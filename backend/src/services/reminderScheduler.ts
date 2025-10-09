import { TaskService } from './taskService';
import { Task as TaskType, Reminder } from '../types';

export interface ScheduledReminder {
  id: string;
  taskId: string;
  reminderId: string;
  scheduledAt: Date;
  processed: boolean;
}

export class ReminderScheduler {
  private static scheduledReminders: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Schedule reminders for a task
   */
  static scheduleTaskReminders(task: TaskType): void {
    // Clear any existing reminders for this task
    this.clearTaskReminders(task.id);

    // Schedule each reminder
    task.reminders.forEach(reminder => {
      if (!reminder.sent && new Date(reminder.scheduledAt) > new Date()) {
        this.scheduleReminder(task.id, reminder);
      }
    });
  }

  /**
   * Schedule a single reminder
   */
  private static scheduleReminder(taskId: string, reminder: Reminder): void {
    const now = new Date();
    const scheduledTime = new Date(reminder.scheduledAt);
    const delay = scheduledTime.getTime() - now.getTime();

    if (delay <= 0) {
      // Reminder time has already passed, process immediately
      this.processReminder(taskId, reminder.id);
      return;
    }

    const timeoutId = setTimeout(() => {
      this.processReminder(taskId, reminder.id);
    }, delay);

    // Store the timeout ID for potential cancellation
    const reminderKey = `${taskId}-${reminder.id}`;
    this.scheduledReminders.set(reminderKey, timeoutId);

    console.log(`⏰ Reminder scheduled for task ${taskId} at ${scheduledTime.toISOString()}`);
  }

  /**
   * Process a reminder when it's due
   */
  private static async processReminder(taskId: string, reminderId: string): Promise<void> {
    try {
      await TaskService.processReminder(taskId, reminderId);
      
      // Remove from scheduled reminders
      const reminderKey = `${taskId}-${reminderId}`;
      this.scheduledReminders.delete(reminderKey);
      
      console.log(`✅ Reminder processed for task ${taskId}, reminder ${reminderId}`);
    } catch (error) {
      console.error(`❌ Error processing reminder for task ${taskId}:`, error);
    }
  }

  /**
   * Clear all reminders for a task
   */
  static clearTaskReminders(taskId: string): void {
    const keysToDelete: string[] = [];
    
    this.scheduledReminders.forEach((timeoutId, key) => {
      if (key.startsWith(`${taskId}-`)) {
        clearTimeout(timeoutId);
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => {
      this.scheduledReminders.delete(key);
    });

    if (keysToDelete.length > 0) {
      console.log(`🗑️ Cleared ${keysToDelete.length} reminders for task ${taskId}`);
    }
  }

  /**
   * Reschedule reminders for a task (used when task is updated)
   */
  static rescheduleTaskReminders(task: TaskType): void {
    this.clearTaskReminders(task.id);
    this.scheduleTaskReminders(task);
  }

  /**
   * Cancel a specific reminder
   */
  static cancelReminder(taskId: string, reminderId: string): void {
    const reminderKey = `${taskId}-${reminderId}`;
    const timeoutId = this.scheduledReminders.get(reminderKey);
    
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.scheduledReminders.delete(reminderKey);
      console.log(`❌ Cancelled reminder for task ${taskId}, reminder ${reminderId}`);
    }
  }

  /**
   * Get all scheduled reminders (for debugging/monitoring)
   */
  static getScheduledReminders(): Array<{
    taskId: string;
    reminderId: string;
    key: string;
  }> {
    const reminders: Array<{
      taskId: string;
      reminderId: string;
      key: string;
    }> = [];

    this.scheduledReminders.forEach((_, key) => {
      const [taskId, reminderId] = key.split('-');
      reminders.push({ taskId, reminderId, key });
    });

    return reminders;
  }

  /**
   * Initialize scheduler on application startup
   */
  static async initialize(): Promise<void> {
    console.log('🚀 Initializing Reminder Scheduler...');

    try {
      // In a real implementation, this would:
      // 1. Load all pending reminders from database
      // 2. Schedule them based on their scheduled times
      // 3. Handle reminders that were missed during downtime

      // For now, we'll just log that the scheduler is ready
      console.log('✅ Reminder Scheduler initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Reminder Scheduler:', error);
    }
  }

  /**
   * Shutdown scheduler gracefully
   */
  static shutdown(): void {
    console.log('🛑 Shutting down Reminder Scheduler...');
    
    // Clear all scheduled timeouts
    this.scheduledReminders.forEach((timeoutId) => {
      clearTimeout(timeoutId);
    });
    
    this.scheduledReminders.clear();
    console.log('✅ Reminder Scheduler shut down successfully');
  }

  /**
   * Process overdue reminders (can be called periodically)
   */
  static async processOverdueReminders(): Promise<void> {
    try {
      // In a real implementation, this would:
      // 1. Query database for reminders that should have been sent but weren't
      // 2. Process them and mark as sent
      // 3. Log any issues

      console.log('🔍 Checking for overdue reminders...');
      
      // TODO: Implement database query for overdue reminders
      // const overdueReminders = await this.getOverdueReminders();
      // for (const reminder of overdueReminders) {
      //   await this.processReminder(reminder.taskId, reminder.id);
      // }
      
    } catch (error) {
      console.error('❌ Error processing overdue reminders:', error);
    }
  }

  /**
   * Get statistics about scheduled reminders
   */
  static getStatistics(): {
    totalScheduled: number;
    upcomingIn24Hours: number;
    upcomingInWeek: number;
  } {
    const now = new Date();
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const inWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // In a real implementation, this would query the database
    // For now, return basic stats based on in-memory scheduled reminders
    return {
      totalScheduled: this.scheduledReminders.size,
      upcomingIn24Hours: 0, // Would need to check scheduled times
      upcomingInWeek: 0     // Would need to check scheduled times
    };
  }
}