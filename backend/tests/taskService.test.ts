import { TaskService } from '../src/services/taskService';
import { Task } from '../src/models/Task';
import { Activity } from '../src/models/Activity';
import { TaskType, TaskStatus, Priority, ActivityType } from '../src/types';
import { ValidationError, NotFoundError } from '../src/utils/errors';

// Mock the models
jest.mock('../src/models/Task');
jest.mock('../src/models/Activity');

const MockedTask = Task as jest.Mocked<typeof Task>;
const MockedActivity = Activity as jest.Mocked<typeof Activity>;

describe('TaskService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createTask', () => {
    const mockTaskData = {
      leadId: 'lead-123',
      subject: 'Follow up call',
      description: 'Call to discuss proposal',
      type: 'call' as const,
      priority: Priority.HIGH,
      assignedTo: 'user-123',
      dueDate: new Date('2024-12-31'),
      status: TaskStatus.PENDING,
      reminders: [],
      createdBy: 'user-456'
    };

    const mockDbTask = {
      id: 'task-123',
      lead_id: 'lead-123',
      subject: 'Follow up call',
      description: 'Call to discuss proposal',
      type: 'call',
      priority: 'high',
      assigned_to: 'user-123',
      due_date: new Date('2024-12-31'),
      status: 'pending',
      reminders: null,
      created_at: new Date(),
      updated_at: new Date(),
      completed_at: null,
      created_by: 'user-456'
    };

    it('should create a task successfully', async () => {
      MockedTask.createTask.mockResolvedValue(mockDbTask);
      MockedTask.transformToTaskType.mockReturnValue({
        id: 'task-123',
        leadId: 'lead-123',
        subject: 'Follow up call',
        description: 'Call to discuss proposal',
        type: 'call',
        priority: Priority.HIGH,
        assignedTo: 'user-123',
        dueDate: new Date('2024-12-31'),
        status: TaskStatus.PENDING,
        reminders: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user-456'
      });
      MockedActivity.logTaskCreated.mockResolvedValue({} as any);

      const result = await TaskService.createTask(mockTaskData);

      expect(MockedTask.createTask).toHaveBeenCalledWith(mockTaskData);
      expect(MockedActivity.logTaskCreated).toHaveBeenCalledWith(
        'lead-123',
        'user-456',
        'task-123',
        expect.any(Object)
      );
      expect(result.id).toBe('task-123');
    });

    it('should throw ValidationError for missing required fields', async () => {
      const invalidData = { ...mockTaskData, subject: '' };

      await expect(TaskService.createTask(invalidData)).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for past due date', async () => {
      const invalidData = { ...mockTaskData, dueDate: new Date('2020-01-01') };

      await expect(TaskService.createTask(invalidData)).rejects.toThrow(ValidationError);
    });
  });

  describe('getTaskById', () => {
    it('should return task when found', async () => {
      const mockDbTask = {
        id: 'task-123',
        lead_id: 'lead-123',
        subject: 'Test task',
        type: 'call',
        priority: 'medium',
        assigned_to: 'user-123',
        due_date: new Date(),
        status: 'pending',
        reminders: null,
        created_at: new Date(),
        updated_at: new Date(),
        completed_at: null,
        created_by: 'user-456'
      };

      MockedTask.findById.mockResolvedValue(mockDbTask);
      MockedTask.transformToTaskType.mockReturnValue({
        id: 'task-123',
        leadId: 'lead-123',
        subject: 'Test task',
        type: 'call',
        priority: Priority.MEDIUM,
        assignedTo: 'user-123',
        dueDate: new Date(),
        status: TaskStatus.PENDING,
        reminders: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user-456'
      });

      const result = await TaskService.getTaskById('task-123');

      expect(MockedTask.findById).toHaveBeenCalledWith('task-123');
      expect(result.id).toBe('task-123');
    });

    it('should throw NotFoundError when task not found', async () => {
      MockedTask.findById.mockResolvedValue(null);

      await expect(TaskService.getTaskById('nonexistent')).rejects.toThrow(NotFoundError);
    });
  });

  describe('completeTask', () => {
    const mockDbTask = {
      id: 'task-123',
      lead_id: 'lead-123',
      subject: 'Test task',
      type: 'call',
      priority: 'medium',
      assigned_to: 'user-123',
      due_date: new Date(),
      status: 'pending',
      reminders: null,
      created_at: new Date(),
      updated_at: new Date(),
      completed_at: null,
      created_by: 'user-456'
    };

    it('should complete task successfully', async () => {
      MockedTask.findById.mockResolvedValue(mockDbTask);
      MockedTask.completeTask.mockResolvedValue({
        ...mockDbTask,
        status: 'completed',
        completed_at: new Date()
      });
      MockedTask.transformToTaskType.mockReturnValue({
        id: 'task-123',
        leadId: 'lead-123',
        subject: 'Test task',
        type: 'call',
        priority: Priority.MEDIUM,
        assignedTo: 'user-123',
        dueDate: new Date(),
        status: TaskStatus.COMPLETED,
        reminders: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: new Date(),
        createdBy: 'user-456'
      });
      MockedActivity.logTaskCompleted.mockResolvedValue({} as any);

      const result = await TaskService.completeTask('task-123', 'user-789');

      expect(MockedTask.completeTask).toHaveBeenCalledWith('task-123');
      expect(MockedActivity.logTaskCompleted).toHaveBeenCalledWith('lead-123', 'user-789', 'task-123');
      expect(result.status).toBe(TaskStatus.COMPLETED);
    });

    it('should throw NotFoundError when task not found', async () => {
      MockedTask.findById.mockResolvedValue(null);

      await expect(TaskService.completeTask('nonexistent', 'user-789')).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError when task already completed', async () => {
      MockedTask.findById.mockResolvedValue({
        ...mockDbTask,
        status: 'completed'
      });

      await expect(TaskService.completeTask('task-123', 'user-789')).rejects.toThrow(ValidationError);
    });
  });

  describe('getTasksByLeadId', () => {
    it('should return tasks for a lead', async () => {
      const mockDbTasks = [
        {
          id: 'task-1',
          lead_id: 'lead-123',
          subject: 'Task 1',
          type: 'call',
          priority: 'high',
          assigned_to: 'user-123',
          due_date: new Date(),
          status: 'pending',
          reminders: null,
          created_at: new Date(),
          updated_at: new Date(),
          completed_at: null,
          created_by: 'user-456'
        }
      ];

      MockedTask.findByLeadId.mockResolvedValue(mockDbTasks);
      MockedTask.transformToTaskType.mockReturnValue({
        id: 'task-1',
        leadId: 'lead-123',
        subject: 'Task 1',
        type: 'call',
        priority: Priority.HIGH,
        assignedTo: 'user-123',
        dueDate: new Date(),
        status: TaskStatus.PENDING,
        reminders: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user-456'
      });

      const result = await TaskService.getTasksByLeadId('lead-123');

      expect(MockedTask.findByLeadId).toHaveBeenCalledWith('lead-123');
      expect(result).toHaveLength(1);
      expect(result[0].leadId).toBe('lead-123');
    });
  });

  describe('getOverdueTasks', () => {
    it('should return overdue tasks', async () => {
      const mockOverdueTasks = [
        {
          id: 'task-1',
          lead_id: 'lead-123',
          subject: 'Overdue task',
          type: 'call',
          priority: 'high',
          assigned_to: 'user-123',
          due_date: new Date('2023-01-01'),
          status: 'pending',
          reminders: null,
          created_at: new Date(),
          updated_at: new Date(),
          completed_at: null,
          created_by: 'user-456'
        }
      ];

      MockedTask.findOverdueTasks.mockResolvedValue(mockOverdueTasks);
      MockedTask.transformToTaskType.mockReturnValue({
        id: 'task-1',
        leadId: 'lead-123',
        subject: 'Overdue task',
        type: 'call',
        priority: Priority.HIGH,
        assignedTo: 'user-123',
        dueDate: new Date('2023-01-01'),
        status: TaskStatus.PENDING,
        reminders: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user-456'
      });

      const result = await TaskService.getOverdueTasks();

      expect(MockedTask.findOverdueTasks).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });
  });

  describe('getTaskStatistics', () => {
    it('should return task statistics', async () => {
      const mockStats = {
        total: 10,
        pending: 5,
        inProgress: 3,
        completed: 2,
        overdue: 1
      };

      MockedTask.getTaskStatistics.mockResolvedValue(mockStats);

      const result = await TaskService.getTaskStatistics('user-123');

      expect(MockedTask.getTaskStatistics).toHaveBeenCalledWith('user-123');
      expect(result).toEqual(mockStats);
    });
  });

  describe('reassignTask', () => {
    const mockDbTask = {
      id: 'task-123',
      lead_id: 'lead-123',
      subject: 'Test task',
      type: 'call',
      priority: 'medium',
      assigned_to: 'user-123',
      due_date: new Date(),
      status: 'pending',
      reminders: null,
      created_at: new Date(),
      updated_at: new Date(),
      completed_at: null,
      created_by: 'user-456'
    };

    it('should reassign task successfully', async () => {
      MockedTask.findById.mockResolvedValue(mockDbTask);
      MockedTask.updateTask.mockResolvedValue({
        ...mockDbTask,
        assigned_to: 'user-789'
      });
      MockedTask.transformToTaskType.mockReturnValue({
        id: 'task-123',
        leadId: 'lead-123',
        subject: 'Test task',
        type: 'call',
        priority: Priority.MEDIUM,
        assignedTo: 'user-789',
        dueDate: new Date(),
        status: TaskStatus.PENDING,
        reminders: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user-456'
      });
      MockedActivity.createActivity.mockResolvedValue({} as any);

      const result = await TaskService.reassignTask('task-123', 'user-789', 'user-admin', 'Workload balancing');

      expect(MockedTask.updateTask).toHaveBeenCalledWith('task-123', { assignedTo: 'user-789' });
      expect(MockedActivity.createActivity).toHaveBeenCalledWith(expect.objectContaining({
        leadId: 'lead-123',
        type: ActivityType.LEAD_REASSIGNED,
        subject: 'Task reassigned'
      }));
      expect(result.assignedTo).toBe('user-789');
    });
  });
});