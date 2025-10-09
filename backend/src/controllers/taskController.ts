import { Request, Response } from 'express';
import { TaskService } from '../services/taskService';
import { TaskStatus, Priority } from '../types';
import { ValidationError, NotFoundError } from '../utils/errors';

export class TaskController {
  /**
   * Create a new task
   */
  static async createTask(req: Request, res: Response): Promise<void> {
    try {
      const { leadId, subject, description, type, priority, assignedTo, dueDate, reminders } = req.body;
      const createdBy = req.user?.id;

      if (!createdBy) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const task = await TaskService.createTask({
        leadId,
        subject,
        description,
        type,
        priority: priority || Priority.MEDIUM,
        assignedTo,
        dueDate: new Date(dueDate),
        status: TaskStatus.PENDING,
        reminders: reminders || [],
        createdBy
      });

      res.status(201).json({
        success: true,
        data: task,
        message: 'Task created successfully'
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(400).json({ error: error.message });
      } else {
        console.error('Error creating task:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }

  /**
   * Get task by ID
   */
  static async getTask(req: Request, res: Response): Promise<void> {
    try {
      const { taskId } = req.params;
      const task = await TaskService.getTaskById(taskId);

      res.status(200).json({
        success: true,
        data: task
      });
    } catch (error) {
      if (error instanceof NotFoundError) {
        res.status(404).json({ error: error.message });
      } else {
        console.error('Error getting task:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }

  /**
   * Get tasks by lead ID
   */
  static async getTasksByLead(req: Request, res: Response): Promise<void> {
    try {
      const { leadId } = req.params;
      const tasks = await TaskService.getTasksByLeadId(leadId);

      res.status(200).json({
        success: true,
        data: tasks,
        count: tasks.length
      });
    } catch (error) {
      console.error('Error getting tasks by lead:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get tasks assigned to current user
   */
  static async getMyTasks(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { status } = req.query;

      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const tasks = await TaskService.getTasksByAssignee(
        userId, 
        status as TaskStatus
      );

      res.status(200).json({
        success: true,
        data: tasks,
        count: tasks.length
      });
    } catch (error) {
      console.error('Error getting user tasks:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get tasks assigned to a specific user
   */
  static async getTasksByAssignee(req: Request, res: Response): Promise<void> {
    try {
      const { assigneeId } = req.params;
      const { status } = req.query;

      const tasks = await TaskService.getTasksByAssignee(
        assigneeId, 
        status as TaskStatus
      );

      res.status(200).json({
        success: true,
        data: tasks,
        count: tasks.length
      });
    } catch (error) {
      console.error('Error getting tasks by assignee:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Update task
   */
  static async updateTask(req: Request, res: Response): Promise<void> {
    try {
      const { taskId } = req.params;
      const updates = req.body;
      const updatedBy = req.user?.id;

      if (!updatedBy) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      // Convert dueDate string to Date if provided
      if (updates.dueDate) {
        updates.dueDate = new Date(updates.dueDate);
      }

      const task = await TaskService.updateTask(taskId, updates, updatedBy);

      res.status(200).json({
        success: true,
        data: task,
        message: 'Task updated successfully'
      });
    } catch (error) {
      if (error instanceof NotFoundError) {
        res.status(404).json({ error: error.message });
      } else if (error instanceof ValidationError) {
        res.status(400).json({ error: error.message });
      } else {
        console.error('Error updating task:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }

  /**
   * Complete task
   */
  static async completeTask(req: Request, res: Response): Promise<void> {
    try {
      const { taskId } = req.params;
      const completedBy = req.user?.id;

      if (!completedBy) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const task = await TaskService.completeTask(taskId, completedBy);

      res.status(200).json({
        success: true,
        data: task,
        message: 'Task completed successfully'
      });
    } catch (error) {
      if (error instanceof NotFoundError) {
        res.status(404).json({ error: error.message });
      } else if (error instanceof ValidationError) {
        res.status(400).json({ error: error.message });
      } else {
        console.error('Error completing task:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }

  /**
   * Delete task
   */
  static async deleteTask(req: Request, res: Response): Promise<void> {
    try {
      const { taskId } = req.params;
      const deletedBy = req.user?.id;

      if (!deletedBy) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      await TaskService.deleteTask(taskId, deletedBy);

      res.status(200).json({
        success: true,
        message: 'Task deleted successfully'
      });
    } catch (error) {
      if (error instanceof NotFoundError) {
        res.status(404).json({ error: error.message });
      } else {
        console.error('Error deleting task:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }

  /**
   * Get overdue tasks
   */
  static async getOverdueTasks(req: Request, res: Response): Promise<void> {
    try {
      const { assigneeId } = req.query;
      const tasks = await TaskService.getOverdueTasks(assigneeId as string);

      res.status(200).json({
        success: true,
        data: tasks,
        count: tasks.length
      });
    } catch (error) {
      console.error('Error getting overdue tasks:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get upcoming tasks
   */
  static async getUpcomingTasks(req: Request, res: Response): Promise<void> {
    try {
      const { days = '7', assigneeId } = req.query;
      const tasks = await TaskService.getUpcomingTasks(
        parseInt(days as string), 
        assigneeId as string
      );

      res.status(200).json({
        success: true,
        data: tasks,
        count: tasks.length
      });
    } catch (error) {
      console.error('Error getting upcoming tasks:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get tasks by priority
   */
  static async getTasksByPriority(req: Request, res: Response): Promise<void> {
    try {
      const { priority } = req.params;
      const { assigneeId } = req.query;

      const tasks = await TaskService.getTasksByPriority(
        priority as Priority, 
        assigneeId as string
      );

      res.status(200).json({
        success: true,
        data: tasks,
        count: tasks.length
      });
    } catch (error) {
      console.error('Error getting tasks by priority:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get task statistics
   */
  static async getTaskStatistics(req: Request, res: Response): Promise<void> {
    try {
      const { assigneeId } = req.query;
      const stats = await TaskService.getTaskStatistics(assigneeId as string);

      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error getting task statistics:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Reassign task
   */
  static async reassignTask(req: Request, res: Response): Promise<void> {
    try {
      const { taskId } = req.params;
      const { newAssigneeId, reason } = req.body;
      const reassignedBy = req.user?.id;

      if (!reassignedBy) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      if (!newAssigneeId) {
        res.status(400).json({ error: 'New assignee ID is required' });
        return;
      }

      const task = await TaskService.reassignTask(taskId, newAssigneeId, reassignedBy, reason);

      res.status(200).json({
        success: true,
        data: task,
        message: 'Task reassigned successfully'
      });
    } catch (error) {
      if (error instanceof NotFoundError) {
        res.status(404).json({ error: error.message });
      } else {
        console.error('Error reassigning task:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }
}