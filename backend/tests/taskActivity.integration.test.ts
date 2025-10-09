import request from 'supertest';
import { app } from '../src/index';
import { db } from '../src/config/database';
import { TaskStatus, Priority, ActivityType } from '../src/types';

describe('Task and Activity Integration Tests', () => {
  let authToken: string;
  let userId: string;
  let leadId: string;
  let taskId: string;

  beforeAll(async () => {
    // Clean up database
    await db.raw('TRUNCATE TABLE activities, tasks, leads, users CASCADE');

    // Create test user
    const userResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
        role: 'sales'
      });

    userId = userResponse.body.data.user.id;

    // Login to get token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123'
      });

    authToken = loginResponse.body.data.token;

    // Create test lead
    const leadResponse = await request(app)
      .post('/api/leads')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        companyName: 'Test Company',
        contactName: 'John Doe',
        contactEmail: 'john@testcompany.com',
        sourceChannel: 'web_form'
      });

    leadId = leadResponse.body.data.id;
  });

  afterAll(async () => {
    await db.destroy();
  });

  describe('Task Management', () => {
    it('should create a new task', async () => {
      const taskData = {
        leadId,
        subject: 'Follow up call',
        description: 'Call to discuss proposal details',
        type: 'call',
        priority: Priority.HIGH,
        assignedTo: userId,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
        reminders: [
          {
            id: 'reminder-1',
            type: 'email',
            scheduledAt: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(),
            sent: false
          }
        ]
      };

      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send(taskData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.subject).toBe('Follow up call');
      expect(response.body.data.status).toBe(TaskStatus.PENDING);
      expect(response.body.data.priority).toBe(Priority.HIGH);

      taskId = response.body.data.id;
    });

    it('should get task by ID', async () => {
      const response = await request(app)
        .get(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(taskId);
      expect(response.body.data.subject).toBe('Follow up call');
    });

    it('should get tasks by lead ID', async () => {
      const response = await request(app)
        .get(`/api/tasks/lead/${leadId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].leadId).toBe(leadId);
    });

    it('should get my tasks', async () => {
      const response = await request(app)
        .get('/api/tasks/my-tasks')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].assignedTo).toBe(userId);
    });

    it('should update task', async () => {
      const updateData = {
        subject: 'Updated follow up call',
        priority: Priority.MEDIUM,
        description: 'Updated description'
      };

      const response = await request(app)
        .put(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.subject).toBe('Updated follow up call');
      expect(response.body.data.priority).toBe(Priority.MEDIUM);
    });

    it('should complete task', async () => {
      const response = await request(app)
        .post(`/api/tasks/${taskId}/complete`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe(TaskStatus.COMPLETED);
      expect(response.body.data.completedAt).toBeDefined();
    });

    it('should get task statistics', async () => {
      const response = await request(app)
        .get('/api/tasks/statistics')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ assigneeId: userId });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.total).toBe(1);
      expect(response.body.data.completed).toBe(1);
    });

    it('should get overdue tasks', async () => {
      // Create an overdue task
      const overdueTaskData = {
        leadId,
        subject: 'Overdue task',
        type: 'call',
        priority: Priority.HIGH,
        assignedTo: userId,
        dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
        reminders: []
      };

      await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send(overdueTaskData);

      const response = await request(app)
        .get('/api/tasks/overdue')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('Activity Management', () => {
    it('should create a new activity', async () => {
      const activityData = {
        leadId,
        type: ActivityType.NOTE_ADDED,
        subject: 'Added important note',
        details: {
          note: 'This is an important note about the lead with @' + userId + ' mention'
        }
      };

      const response = await request(app)
        .post('/api/activities')
        .set('Authorization', `Bearer ${authToken}`)
        .send(activityData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.type).toBe(ActivityType.NOTE_ADDED);
      expect(response.body.data.subject).toBe('Added important note');
    });

    it('should add a note to lead', async () => {
      const noteData = {
        note: 'This is a test note with @' + userId + ' mention for follow-up'
      };

      const response = await request(app)
        .post(`/api/activities/lead/${leadId}/note`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(noteData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.type).toBe(ActivityType.NOTE_ADDED);
      expect(response.body.data.details.note).toContain('test note');
    });

    it('should log email activity', async () => {
      const emailData = {
        type: 'sent',
        subject: 'Proposal sent',
        to: 'john@testcompany.com',
        templateId: 'template-123'
      };

      const response = await request(app)
        .post(`/api/activities/lead/${leadId}/email`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(emailData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.type).toBe(ActivityType.EMAIL_SENT);
      expect(response.body.data.subject).toBe('Email sent: Proposal sent');
    });

    it('should log call activity', async () => {
      const callData = {
        type: 'made',
        duration: 300,
        outcome: 'Connected - interested in proposal',
        notes: 'Good conversation, will follow up next week'
      };

      const response = await request(app)
        .post(`/api/activities/lead/${leadId}/call`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(callData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.type).toBe(ActivityType.CALL_MADE);
      expect(response.body.data.details.duration).toBe(300);
    });

    it('should log meeting activity', async () => {
      const meetingData = {
        type: 'scheduled',
        title: 'Product Demo',
        scheduledAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        attendees: [userId, 'client-contact-id'],
        notes: 'Demo scheduled for next week'
      };

      const response = await request(app)
        .post(`/api/activities/lead/${leadId}/meeting`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(meetingData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.type).toBe(ActivityType.MEETING_SCHEDULED);
      expect(response.body.data.details.title).toBe('Product Demo');
    });

    it('should get lead timeline', async () => {
      const response = await request(app)
        .get(`/api/activities/lead/${leadId}/timeline`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: 50 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      
      // Check that activities are ordered by date (most recent first)
      const activities = response.body.data;
      for (let i = 1; i < activities.length; i++) {
        const current = new Date(activities[i].performedAt);
        const previous = new Date(activities[i - 1].performedAt);
        expect(current.getTime()).toBeLessThanOrEqual(previous.getTime());
      }

      // Check that user information is included
      expect(activities[0].user).toBeDefined();
      expect(activities[0].user.firstName).toBe('Test');
      expect(activities[0].user.lastName).toBe('User');
    });

    it('should get recent activities', async () => {
      const response = await request(app)
        .get('/api/activities/recent')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should get activities with filters', async () => {
      const response = await request(app)
        .get('/api/activities')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          leadId,
          type: ActivityType.NOTE_ADDED,
          limit: 10,
          offset: 0
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.total).toBeGreaterThan(0);
    });

    it('should search activities', async () => {
      const response = await request(app)
        .get('/api/activities/search')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          q: 'important note',
          leadId,
          limit: 10
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should get activity statistics', async () => {
      const response = await request(app)
        .get('/api/activities/statistics')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ leadId });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.totalActivities).toBeGreaterThan(0);
      expect(response.body.data.activitiesByType).toBeDefined();
      expect(response.body.data.topPerformers).toBeDefined();
    });

    it('should get activities by date range', async () => {
      const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // Yesterday
      const endDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // Tomorrow

      const response = await request(app)
        .get('/api/activities/date-range')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          startDate,
          endDate,
          leadId
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('Task and Activity Integration', () => {
    it('should create activity when task is created', async () => {
      const taskData = {
        leadId,
        subject: 'Integration test task',
        type: 'email',
        priority: Priority.LOW,
        assignedTo: userId,
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        reminders: []
      };

      // Create task
      const taskResponse = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send(taskData);

      expect(taskResponse.status).toBe(201);
      const newTaskId = taskResponse.body.data.id;

      // Check that activity was created
      const timelineResponse = await request(app)
        .get(`/api/activities/lead/${leadId}/timeline`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: 10 });

      const taskCreatedActivity = timelineResponse.body.data.find(
        (activity: any) => activity.type === ActivityType.TASK_CREATED && 
        activity.details.taskId === newTaskId
      );

      expect(taskCreatedActivity).toBeDefined();
      expect(taskCreatedActivity.subject).toBe('Task created');
    });

    it('should create activity when task is completed', async () => {
      // Create a new task
      const taskData = {
        leadId,
        subject: 'Task to complete',
        type: 'call',
        priority: Priority.MEDIUM,
        assignedTo: userId,
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        reminders: []
      };

      const taskResponse = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send(taskData);

      const newTaskId = taskResponse.body.data.id;

      // Complete the task
      await request(app)
        .post(`/api/tasks/${newTaskId}/complete`)
        .set('Authorization', `Bearer ${authToken}`);

      // Check that completion activity was created
      const timelineResponse = await request(app)
        .get(`/api/activities/lead/${leadId}/timeline`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: 10 });

      const taskCompletedActivity = timelineResponse.body.data.find(
        (activity: any) => activity.type === ActivityType.TASK_COMPLETED && 
        activity.details.taskId === newTaskId
      );

      expect(taskCompletedActivity).toBeDefined();
      expect(taskCompletedActivity.subject).toBe('Task completed');
    });
  });
});