import { BaseModel } from './BaseModel';
import { Task as TaskType, TaskTable, TaskStatus, TaskType as TaskTypeEnum, Priority } from '../types';

export class Task extends BaseModel {
  protected static override tableName = 'tasks';

  static async findByLeadId(leadId: string): Promise<TaskTable[]> {
    return this.query.where('lead_id', leadId).orderBy('due_date', 'asc');
  }

  static async findByAssignee(assigneeId: string): Promise<TaskTable[]> {
    return this.query.where('assigned_to', assigneeId).orderBy('due_date', 'asc');
  }

  static async findByStatus(status: TaskStatus): Promise<TaskTable[]> {
    return this.query.where('status', status).orderBy('due_date', 'asc');
  }

  static async findOverdueTasks(): Promise<TaskTable[]> {
    return this.query
      .where('due_date', '<', new Date())
      .whereIn('status', ['pending', 'in_progress'])
      .orderBy('due_date', 'asc');
  }

  static async findUpcomingTasks(days: number = 7): Promise<TaskTable[]> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    
    return this.query
      .where('due_date', '>=', new Date())
      .where('due_date', '<=', futureDate)
      .whereIn('status', ['pending', 'in_progress'])
      .orderBy('due_date', 'asc');
  }

  static async createTask(taskData: Omit<TaskType, 'id' | 'createdAt' | 'updatedAt' | 'completedAt'>): Promise<TaskTable> {
    const dbData: Partial<TaskTable> = {
      lead_id: taskData.leadId,
      subject: taskData.subject,
      description: taskData.description,
      type: taskData.type,
      priority: taskData.priority,
      assigned_to: taskData.assignedTo,
      due_date: taskData.dueDate,
      status: taskData.status,
      reminders: taskData.reminders.length > 0 ? JSON.stringify(taskData.reminders) : null,
      created_by: taskData.createdBy
    };

    return this.create(dbData);
  }

  static async updateTask(id: string, taskData: Partial<TaskType>): Promise<TaskTable> {
    const dbData: Partial<TaskTable> = {};
    
    if (taskData.subject) dbData.subject = taskData.subject;
    if (taskData.description) dbData.description = taskData.description;
    if (taskData.type) dbData.type = taskData.type;
    if (taskData.priority) dbData.priority = taskData.priority;
    if (taskData.assignedTo) dbData.assigned_to = taskData.assignedTo;
    if (taskData.dueDate) dbData.due_date = taskData.dueDate;
    if (taskData.status) dbData.status = taskData.status;
    if (taskData.reminders) dbData.reminders = JSON.stringify(taskData.reminders);
    
    // Set completed_at when task is marked as completed
    if (taskData.status === 'completed' && !taskData.completedAt) {
      dbData.completed_at = new Date();
    }

    return this.update(id, dbData);
  }

  static async completeTask(id: string): Promise<TaskTable> {
    return this.update(id, {
      status: 'completed',
      completed_at: new Date()
    });
  }

  static async getTasksByPriority(priority: Priority): Promise<TaskTable[]> {
    return this.query
      .where('priority', priority)
      .whereIn('status', ['pending', 'in_progress'])
      .orderBy('due_date', 'asc');
  }

  static async getTaskStatistics(assigneeId?: string): Promise<{
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    overdue: number;
  }> {
    let query = this.query;
    
    if (assigneeId) {
      query = query.where('assigned_to', assigneeId);
    }
    
    const [
      total,
      pending,
      inProgress,
      completed,
      overdue
    ] = await Promise.all([
      query.clone().count('* as count').first(),
      query.clone().where('status', 'pending').count('* as count').first(),
      query.clone().where('status', 'in_progress').count('* as count').first(),
      query.clone().where('status', 'completed').count('* as count').first(),
      query.clone()
        .where('due_date', '<', new Date())
        .whereIn('status', ['pending', 'in_progress'])
        .count('* as count').first()
    ]);
    
    return {
      total: parseInt(total?.['count'] as string) || 0,
      pending: parseInt(pending?.['count'] as string) || 0,
      inProgress: parseInt(inProgress?.['count'] as string) || 0,
      completed: parseInt(completed?.['count'] as string) || 0,
      overdue: parseInt(overdue?.['count'] as string) || 0
    };
  }

  static transformToTaskType(dbTask: TaskTable): TaskType {
    return {
      id: dbTask.id,
      leadId: dbTask.lead_id,
      subject: dbTask.subject,
      description: dbTask.description,
      type: dbTask.type,
      priority: dbTask.priority,
      assignedTo: dbTask.assigned_to,
      dueDate: dbTask.due_date,
      status: dbTask.status,
      reminders: dbTask.reminders ? JSON.parse(dbTask.reminders) : [],
      createdAt: dbTask.created_at,
      updatedAt: dbTask.updated_at,
      completedAt: dbTask.completed_at,
      createdBy: dbTask.created_by
    };
  }
}