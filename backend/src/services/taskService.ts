import { Task } from '../models/Task';
import { Activity } from '../models/Activity';
import { Task as TaskType, TaskTable, TaskStatus, Priority, Reminder, ActivityType } from '../types';
import { ValidationError, NotFoundError } from '../utils/errors';
import { NotificationService } from './notificationService';
import { ReminderScheduler } from './reminderScheduler';
import { workflowTrigger } from './workflowTrigger';

export class TaskService {
  /**
   * Create a new task
   */
  static async createTask(taskData: Omit<TaskType, 'id' | 'createdAt' | 'updatedAt' | 'completedAt'>): Promise<TaskType> {
    // Validate required fields
    if (!taskData.leadId || !taskData.subject || !taskData.assignedTo || !taskData.dueDate) {
      throw new ValidationError('Missing required fields: leadId, subject, assignedTo, dueDate');
    }

    // Validate due date is in the future
    if (new Date(taskData.dueDate) <= new Date()) {
      throw new ValidationError('Due date must be in the future');
    }

    // Create the task
    const dbTask = await Task.createTask(taskData);
    const task = Task.transformToTaskType(dbTask);

    // Log activity for task creation
    await Activity.logTaskCreated(
      taskData.leadId,
      taskData.createdBy,
      task.id,
      {
        subject: task.subject,
        type: task.type,
        priority: task.priority,
        dueDate: task.dueDate,
        assignedTo: task.assignedTo
      }
    );

    // Schedule reminders if provided
    if (taskData.reminders && taskData.reminders.length > 0) {
      ReminderScheduler.scheduleTaskReminders(task);
    }

    return task;
  }

  /**
   * Get task by ID
   */
  static async getTaskById(taskId: string): Promise<TaskType> {
    const dbTask = await Task.findById(taskId);
    if (!dbTask) {
      throw new NotFoundError('Task not found');
    }
    return Task.transformToTaskType(dbTask);
  }

  /**
   * Get tasks by lead ID
   */
  static async getTasksByLeadId(leadId: string): Promise<TaskType[]> {
    const dbTasks = await Task.findByLeadId(leadId);
    return dbTasks.map(task => Task.transformToTaskType(task));
  }

  /**
   * Get tasks assigned to a user
   */
  static async getTasksByAssignee(assigneeId: string, status?: TaskStatus): Promise<TaskType[]> {
    let dbTasks: TaskTable[];
    
    if (status) {
      dbTasks = await Task.query
        .where('assigned_to', assigneeId)
        .where('status', status)
        .orderBy('due_date', 'asc');
    } else {
      dbTasks = await Task.findByAssignee(assigneeId);
    }
    
    return dbTasks.map(task => Task.transformToTaskType(task));
  }

  /**
   * Update task
   */
  static async updateTask(taskId: string, updates: Partial<TaskType>, updatedBy: string): Promise<TaskType> {
    const existingTask = await Task.findById(taskId);
    if (!existingTask) {
      throw new NotFoundError('Task not found');
    }

    // Validate due date if being updated
    if (updates.dueDate && new Date(updates.dueDate) <= new Date()) {
      throw new ValidationError('Due date must be in the future');
    }

    const dbTask = await Task.updateTask(taskId, updates);
    const task = Task.transformToTaskType(dbTask);

    // Log activity for task update
    await Activity.createActivity({
      leadId: existingTask.lead_id,
      type: ActivityType.TASK_UPDATED,
      subject: 'Task updated',
      details: { taskId, updates },
      performedBy: updatedBy,
      performedAt: new Date(),
      relatedEntities: [{ type: 'task', id: taskId }]
    });

    // Reschedule reminders if they were updated
    if (updates.reminders) {
      ReminderScheduler.rescheduleTaskReminders(task);
    }

    return task;
  }

  /**
   * Complete a task
   */
  static async completeTask(taskId: string, completedBy: string): Promise<TaskType> {
    const existingTask = await Task.findById(taskId);
    if (!existingTask) {
      throw new NotFoundError('Task not found');
    }

    if (existingTask.status === 'completed') {
      throw new ValidationError('Task is already completed');
    }

    const dbTask = await Task.completeTask(taskId);
    const task = Task.transformToTaskType(dbTask);

    // Log activity for task completion
    await Activity.logTaskCompleted(existingTask.lead_id, completedBy, taskId);

    // Clear any pending reminders for completed task
    ReminderScheduler.clearTaskReminders(taskId);

    // Trigger workflow automation for task completion
    try {
      await workflowTrigger.onTaskCompleted(
        existingTask.lead_id,
        completedBy,
        taskId,
        task
      );
    } catch (error) {
      console.warn('Failed to trigger task completion workflows:', error);
    }

    return task;
  }

  /**
   * Delete a task (soft delete by setting status to cancelled)
   */
  static async deleteTask(taskId: string, deletedBy: string): Promise<void> {
    const existingTask = await Task.findById(taskId);
    if (!existingTask) {
      throw new NotFoundError('Task not found');
    }

    await Task.updateTask(taskId, { status: TaskStatus.CANCELLED });

    // Log activity for task deletion
    await Activity.createActivity({
      leadId: existingTask.lead_id,
      type: ActivityType.TASK_CANCELLED,
      subject: 'Task cancelled',
      details: { taskId, reason: 'Task deleted' },
      performedBy: deletedBy,
      performedAt: new Date(),
      relatedEntities: [{ type: 'task', id: taskId }]
    });

    // Clear any pending reminders for cancelled task
    ReminderScheduler.clearTaskReminders(taskId);
  }

  /**
   * Get overdue tasks
   */
  static async getOverdueTasks(assigneeId?: string): Promise<TaskType[]> {
    let dbTasks = await Task.findOverdueTasks();
    
    if (assigneeId) {
      dbTasks = dbTasks.filter(task => task.assigned_to === assigneeId);
    }
    
    return dbTasks.map(task => Task.transformToTaskType(task));
  }

  /**
   * Get upcoming tasks (due within specified days)
   */
  static async getUpcomingTasks(days: number = 7, assigneeId?: string): Promise<TaskType[]> {
    let dbTasks = await Task.findUpcomingTasks(days);
    
    if (assigneeId) {
      dbTasks = dbTasks.filter(task => task.assigned_to === assigneeId);
    }
    
    return dbTasks.map(task => Task.transformToTaskType(task));
  }

  /**
   * Get tasks by priority
   */
  static async getTasksByPriority(priority: Priority, assigneeId?: string): Promise<TaskType[]> {
    let dbTasks = await Task.getTasksByPriority(priority);
    
    if (assigneeId) {
      dbTasks = dbTasks.filter(task => task.assigned_to === assigneeId);
    }
    
    return dbTasks.map(task => Task.transformToTaskType(task));
  }

  /**
   * Get task statistics
   */
  static async getTaskStatistics(assigneeId?: string): Promise<{
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    overdue: number;
  }> {
    return await Task.getTaskStatistics(assigneeId);
  }



  /**
   * Process reminder notifications (called by job queue)
   */
  static async processReminder(taskId: string, reminderId: string): Promise<void> {
    const task = await this.getTaskById(taskId);
    
    // Find the specific reminder
    const reminder = task.reminders.find(r => r.id === reminderId);
    if (!reminder || reminder.sent) {
      return; // Reminder already sent or not found
    }

    // Mark reminder as sent
    reminder.sent = true;
    reminder.sentAt = new Date();
    
    await Task.updateTask(taskId, { reminders: task.reminders });

    // Send notification via NotificationService
    await NotificationService.createTaskReminder(
      taskId,
      task.assignedTo,
      task.subject,
      task.dueDate
    );
  }

  /**
   * Reassign task to different user
   */
  static async reassignTask(taskId: string, newAssigneeId: string, reassignedBy: string, reason?: string): Promise<TaskType> {
    const existingTask = await Task.findById(taskId);
    if (!existingTask) {
      throw new NotFoundError('Task not found');
    }

    const oldAssigneeId = existingTask.assigned_to;
    const dbTask = await Task.updateTask(taskId, { assignedTo: newAssigneeId });
    const task = Task.transformToTaskType(dbTask);

    // Log activity for task reassignment
    await Activity.createActivity({
      leadId: existingTask.lead_id,
      type: ActivityType.LEAD_REASSIGNED, // Using existing enum value
      subject: 'Task reassigned',
      details: { 
        taskId, 
        oldAssignee: oldAssigneeId, 
        newAssignee: newAssigneeId, 
        reason 
      },
      performedBy: reassignedBy,
      performedAt: new Date(),
      relatedEntities: [{ type: 'task', id: taskId }]
    });

    return task;
  }
}