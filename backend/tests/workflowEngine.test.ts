import { workflowEngine } from '../src/services/workflowEngine';
import { workflowService } from '../src/services/workflowService';
import { leadService } from '../src/services/leadService';
import { LeadStatus, LeadChannel, BusinessType } from '../src/types';

// Mock external services
jest.mock('../src/services/emailService');
jest.mock('../src/services/taskService');
jest.mock('../src/services/notificationService');
jest.mock('../src/services/routingService');

describe('WorkflowEngine', () => {
  let testLeadId: string;
  let testWorkflowId: string;

  beforeEach(async () => {
    // Create a test lead
    const testLead = await leadService.createLead({
      company: {
        name: 'Test Company',
        industry: 'Technology'
      },
      contact: {
        name: 'Test User',
        email: 'test@example.com'
      },
      source: {
        channel: LeadChannel.WEBSITE
      },
      status: LeadStatus.NEW,
      qualification: {
        businessType: BusinessType.B2B
      },
      createdBy: 'test-user'
    });
    testLeadId = testLead.id;

    // Create a test workflow
    const workflow = await workflowService.createWorkflow({
      name: 'Test Workflow',
      description: 'Test workflow for unit tests',
      trigger: {
        event: 'lead_created',
        conditions: [
          {
            field: 'status',
            operator: 'equals',
            value: LeadStatus.NEW
          }
        ]
      },
      actions: [
        {
          type: 'send_email',
          parameters: {
            templateId: 'test-template',
            variables: { subject: 'Test Email' }
          }
        },
        {
          type: 'create_task',
          parameters: {
            subject: 'Test Task',
            description: 'Test task description',
            type: 'call',
            priority: 'medium'
          }
        }
      ],
      isActive: true,
      priority: 10,
      createdBy: 'test-user'
    });
    testWorkflowId = workflow.id;
  });

  describe('executeTriggeredWorkflows', () => {
    it('should execute workflows for matching events', async () => {
      await workflowEngine.executeTriggeredWorkflows(
        'lead_created',
        testLeadId,
        'test-user',
        { testContext: true }
      );

      // Check that workflow execution was created
      const { executions } = await workflowService.getWorkflowExecutions({
        leadId: testLeadId
      });

      expect(executions.length).toBeGreaterThan(0);
      expect(executions[0].status).toBe('pending');
    });

    it('should not execute workflows for non-matching conditions', async () => {
      // Update lead status to not match workflow conditions
      await leadService.updateLead(testLeadId, {
        status: LeadStatus.QUALIFIED
      }, 'test-user');

      const initialExecutions = await workflowService.getWorkflowExecutions({
        leadId: testLeadId
      });
      const initialCount = initialExecutions.executions.length;

      await workflowEngine.executeTriggeredWorkflows(
        'lead_created',
        testLeadId,
        'test-user'
      );

      const finalExecutions = await workflowService.getWorkflowExecutions({
        leadId: testLeadId
      });

      // Should not create new executions since conditions don't match
      expect(finalExecutions.executions.length).toBe(initialCount);
    });
  });

  describe('executeWorkflow', () => {
    it('should execute a specific workflow', async () => {
      const execution = await workflowEngine.executeWorkflow(
        testWorkflowId,
        testLeadId,
        'test-user',
        { manual: true }
      );

      expect(execution).toBeDefined();
      expect(execution.workflowId).toBe(testWorkflowId);
      expect(execution.leadId).toBe(testLeadId);
      expect(execution.status).toBe('pending');
      expect(execution.context).toEqual({ manual: true });
    });

    it('should throw error for inactive workflow', async () => {
      // Deactivate the workflow
      await workflowService.updateWorkflow(testWorkflowId, {
        isActive: false
      });

      await expect(
        workflowEngine.executeWorkflow(testWorkflowId, testLeadId, 'test-user')
      ).rejects.toThrow('Workflow not found or inactive');
    });

    it('should throw error for non-existent workflow', async () => {
      await expect(
        workflowEngine.executeWorkflow('non-existent-id', testLeadId, 'test-user')
      ).rejects.toThrow('Workflow not found or inactive');
    });
  });

  describe('condition evaluation', () => {
    it('should evaluate equals condition correctly', async () => {
      const workflow = await workflowService.createWorkflow({
        name: 'Equals Test Workflow',
        description: 'Test equals condition',
        trigger: {
          event: 'manual',
          conditions: [
            {
              field: 'status',
              operator: 'equals',
              value: LeadStatus.NEW
            }
          ]
        },
        actions: [
          {
            type: 'send_notification',
            parameters: {
              recipientId: 'test-user',
              message: 'Test notification'
            }
          }
        ],
        isActive: true,
        priority: 5,
        createdBy: 'test-user'
      });

      await workflowEngine.executeTriggeredWorkflows(
        'manual',
        testLeadId,
        'test-user'
      );

      const { executions } = await workflowService.getWorkflowExecutions({
        workflowId: workflow.id
      });

      expect(executions.length).toBeGreaterThan(0);
    });

    it('should evaluate greater_than condition correctly', async () => {
      const workflow = await workflowService.createWorkflow({
        name: 'Greater Than Test Workflow',
        description: 'Test greater than condition',
        trigger: {
          event: 'score_changed',
          conditions: [
            {
              field: 'newScore',
              operator: 'greater_than',
              value: 50
            }
          ]
        },
        actions: [
          {
            type: 'send_notification',
            parameters: {
              recipientId: 'test-user',
              message: 'High score notification'
            }
          }
        ],
        isActive: true,
        priority: 5,
        createdBy: 'test-user'
      });

      await workflowEngine.executeTriggeredWorkflows(
        'score_changed',
        testLeadId,
        'test-user',
        { newScore: 75 }
      );

      const { executions } = await workflowService.getWorkflowExecutions({
        workflowId: workflow.id
      });

      expect(executions.length).toBeGreaterThan(0);
    });

    it('should handle AND/OR logical operators', async () => {
      const workflow = await workflowService.createWorkflow({
        name: 'Logical Operators Test Workflow',
        description: 'Test AND/OR conditions',
        trigger: {
          event: 'manual',
          conditions: [
            {
              field: 'status',
              operator: 'equals',
              value: LeadStatus.NEW
            },
            {
              field: 'company.industry',
              operator: 'equals',
              value: 'Technology',
              logicalOperator: 'AND'
            }
          ]
        },
        actions: [
          {
            type: 'send_notification',
            parameters: {
              recipientId: 'test-user',
              message: 'Conditions met'
            }
          }
        ],
        isActive: true,
        priority: 5,
        createdBy: 'test-user'
      });

      await workflowEngine.executeTriggeredWorkflows(
        'manual',
        testLeadId,
        'test-user'
      );

      const { executions } = await workflowService.getWorkflowExecutions({
        workflowId: workflow.id
      });

      expect(executions.length).toBeGreaterThan(0);
    });
  });

  describe('action execution', () => {
    it('should handle action delays', async () => {
      const workflow = await workflowService.createWorkflow({
        name: 'Delayed Action Workflow',
        description: 'Test action delays',
        trigger: {
          event: 'manual'
        },
        actions: [
          {
            type: 'send_notification',
            parameters: {
              recipientId: 'test-user',
              message: 'Immediate notification'
            }
          },
          {
            type: 'send_notification',
            parameters: {
              recipientId: 'test-user',
              message: 'Delayed notification'
            },
            delay: 0.1 // 0.1 minutes = 6 seconds
          }
        ],
        isActive: true,
        priority: 5,
        createdBy: 'test-user'
      });

      const startTime = Date.now();
      
      await workflowEngine.executeWorkflow(
        workflow.id,
        testLeadId,
        'test-user'
      );

      // Wait for workflow to complete
      await new Promise(resolve => setTimeout(resolve, 8000)); // 8 seconds

      const execution = await workflowService.getWorkflowExecutionById(
        (await workflowService.getWorkflowExecutions({ workflowId: workflow.id })).executions[0].id
      );

      expect(execution?.status).toBe('completed');
      expect(execution?.executedActions.length).toBe(2);
      
      const endTime = Date.now();
      expect(endTime - startTime).toBeGreaterThan(6000); // Should take at least 6 seconds
    }, 15000); // Increase timeout for this test

    it('should handle action failures gracefully', async () => {
      const workflow = await workflowService.createWorkflow({
        name: 'Failing Action Workflow',
        description: 'Test action failure handling',
        trigger: {
          event: 'manual'
        },
        actions: [
          {
            type: 'send_email',
            parameters: {
              templateId: 'non-existent-template' // This should fail
            }
          },
          {
            type: 'send_notification',
            parameters: {
              recipientId: 'test-user',
              message: 'This should still execute'
            }
          }
        ],
        isActive: true,
        priority: 5,
        createdBy: 'test-user'
      });

      await workflowEngine.executeWorkflow(
        workflow.id,
        testLeadId,
        'test-user'
      );

      // Wait for workflow to complete
      await new Promise(resolve => setTimeout(resolve, 2000));

      const execution = await workflowService.getWorkflowExecutionById(
        (await workflowService.getWorkflowExecutions({ workflowId: workflow.id })).executions[0].id
      );

      expect(execution?.status).toBe('completed');
      expect(execution?.executedActions.length).toBe(2);
      expect(execution?.executedActions[0].status).toBe('failed');
      expect(execution?.executedActions[1].status).toBe('completed');
    });
  });

  afterEach(async () => {
    // Clean up test data
    try {
      if (testWorkflowId) {
        await workflowService.deleteWorkflow(testWorkflowId);
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  });
});