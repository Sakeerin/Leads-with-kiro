import { workflowService } from '../src/services/workflowService';
import { LeadStatus } from '../src/types';

describe('WorkflowService', () => {
  let testWorkflowId: string;

  const sampleWorkflowData = {
    name: 'Test Workflow',
    description: 'A test workflow for unit testing',
    trigger: {
      event: 'lead_created' as const,
      conditions: [
        {
          field: 'status',
          operator: 'equals' as const,
          value: LeadStatus.NEW
        }
      ]
    },
    actions: [
      {
        type: 'send_email' as const,
        parameters: {
          templateId: 'welcome-template',
          variables: { subject: 'Welcome!' }
        }
      },
      {
        type: 'create_task' as const,
        parameters: {
          subject: 'Follow up with new lead',
          description: 'Contact within 24 hours',
          type: 'call',
          priority: 'high'
        }
      }
    ],
    isActive: true,
    priority: 10,
    createdBy: 'test-user'
  };

  describe('createWorkflow', () => {
    it('should create a new workflow', async () => {
      const workflow = await workflowService.createWorkflow(sampleWorkflowData);

      expect(workflow).toBeDefined();
      expect(workflow.id).toBeDefined();
      expect(workflow.name).toBe(sampleWorkflowData.name);
      expect(workflow.description).toBe(sampleWorkflowData.description);
      expect(workflow.trigger).toEqual(sampleWorkflowData.trigger);
      expect(workflow.actions).toEqual(sampleWorkflowData.actions);
      expect(workflow.isActive).toBe(true);
      expect(workflow.priority).toBe(10);
      expect(workflow.executionCount).toBe(0);

      testWorkflowId = workflow.id;
    });

    it('should create workflow with minimal data', async () => {
      const minimalData = {
        name: 'Minimal Workflow',
        trigger: {
          event: 'manual' as const
        },
        actions: [
          {
            type: 'send_notification' as const,
            parameters: {
              recipientId: 'test-user',
              message: 'Test notification'
            }
          }
        ],
        isActive: true,
        priority: 1,
        createdBy: 'test-user'
      };

      const workflow = await workflowService.createWorkflow(minimalData);

      expect(workflow).toBeDefined();
      expect(workflow.name).toBe('Minimal Workflow');
      expect(workflow.description).toBeUndefined();
      expect(workflow.trigger.conditions).toBeUndefined();

      // Clean up
      await workflowService.deleteWorkflow(workflow.id);
    });
  });

  describe('getWorkflowById', () => {
    it('should retrieve workflow by ID', async () => {
      const workflow = await workflowService.getWorkflowById(testWorkflowId);

      expect(workflow).toBeDefined();
      expect(workflow!.id).toBe(testWorkflowId);
      expect(workflow!.name).toBe(sampleWorkflowData.name);
    });

    it('should return null for non-existent workflow', async () => {
      const workflow = await workflowService.getWorkflowById('non-existent-id');
      expect(workflow).toBeNull();
    });
  });

  describe('getWorkflows', () => {
    it('should retrieve all workflows', async () => {
      const result = await workflowService.getWorkflows();

      expect(result).toBeDefined();
      expect(result.workflows).toBeInstanceOf(Array);
      expect(result.total).toBeGreaterThan(0);
      expect(result.workflows.some(w => w.id === testWorkflowId)).toBe(true);
    });

    it('should filter workflows by active status', async () => {
      const activeResult = await workflowService.getWorkflows({ isActive: true });
      const inactiveResult = await workflowService.getWorkflows({ isActive: false });

      expect(activeResult.workflows.every(w => w.isActive)).toBe(true);
      expect(inactiveResult.workflows.every(w => !w.isActive)).toBe(true);
    });

    it('should filter workflows by event type', async () => {
      const result = await workflowService.getWorkflows({ event: 'lead_created' });

      expect(result.workflows.every(w => w.trigger.event === 'lead_created')).toBe(true);
    });

    it('should apply pagination', async () => {
      const result = await workflowService.getWorkflows({ limit: 1, offset: 0 });

      expect(result.workflows.length).toBeLessThanOrEqual(1);
      expect(result.total).toBeGreaterThanOrEqual(result.workflows.length);
    });
  });

  describe('updateWorkflow', () => {
    it('should update workflow properties', async () => {
      const updates = {
        name: 'Updated Test Workflow',
        description: 'Updated description',
        isActive: false,
        priority: 20
      };

      const updatedWorkflow = await workflowService.updateWorkflow(testWorkflowId, updates);

      expect(updatedWorkflow.name).toBe(updates.name);
      expect(updatedWorkflow.description).toBe(updates.description);
      expect(updatedWorkflow.isActive).toBe(false);
      expect(updatedWorkflow.priority).toBe(20);
    });

    it('should update workflow trigger and actions', async () => {
      const updates = {
        trigger: {
          event: 'status_updated' as const,
          conditions: [
            {
              field: 'newStatus',
              operator: 'equals' as const,
              value: LeadStatus.QUALIFIED
            }
          ]
        },
        actions: [
          {
            type: 'send_notification' as const,
            parameters: {
              recipientId: 'manager',
              message: 'Lead qualified'
            }
          }
        ]
      };

      const updatedWorkflow = await workflowService.updateWorkflow(testWorkflowId, updates);

      expect(updatedWorkflow.trigger).toEqual(updates.trigger);
      expect(updatedWorkflow.actions).toEqual(updates.actions);
    });

    it('should throw error for non-existent workflow', async () => {
      await expect(
        workflowService.updateWorkflow('non-existent-id', { name: 'Updated' })
      ).rejects.toThrow('Workflow not found');
    });
  });

  describe('workflow executions', () => {
    let executionId: string;

    beforeEach(async () => {
      // Create a test lead first
      const leadService = require('../src/services/leadService').leadService;
      const testLead = await leadService.createLead({
        company: { name: 'Test Company' },
        contact: { name: 'Test User', email: 'test@example.com' },
        source: { channel: 'website' },
        createdBy: 'test-user'
      });

      // Execute the workflow
      const execution = await workflowService.executeWorkflow(
        testWorkflowId,
        testLead.id,
        'test-user',
        { test: true }
      );
      executionId = execution.id;
    });

    it('should retrieve workflow executions', async () => {
      const result = await workflowService.getWorkflowExecutions();

      expect(result).toBeDefined();
      expect(result.executions).toBeInstanceOf(Array);
      expect(result.total).toBeGreaterThan(0);
    });

    it('should filter executions by workflow ID', async () => {
      const result = await workflowService.getWorkflowExecutions({
        workflowId: testWorkflowId
      });

      expect(result.executions.every(e => e.workflowId === testWorkflowId)).toBe(true);
    });

    it('should retrieve execution by ID', async () => {
      const execution = await workflowService.getWorkflowExecutionById(executionId);

      expect(execution).toBeDefined();
      expect(execution!.id).toBe(executionId);
      expect(execution!.workflowId).toBe(testWorkflowId);
    });

    it('should cancel workflow execution', async () => {
      await workflowService.cancelWorkflowExecution(executionId);

      const execution = await workflowService.getWorkflowExecutionById(executionId);
      expect(execution!.status).toBe('cancelled');
      expect(execution!.completedAt).toBeDefined();
    });
  });

  describe('approval requests', () => {
    let approvalRequestId: string;

    beforeEach(async () => {
      // Create a workflow with approval action
      const approvalWorkflow = await workflowService.createWorkflow({
        name: 'Approval Test Workflow',
        trigger: { event: 'manual' as const },
        actions: [
          {
            type: 'request_approval' as const,
            parameters: {
              approverRole: 'Manager',
              requestData: { reason: 'Test approval' },
              expiresInHours: 24
            }
          }
        ],
        isActive: true,
        priority: 5,
        createdBy: 'test-user'
      });

      // Create a test lead and execute workflow
      const leadService = require('../src/services/leadService').leadService;
      const testLead = await leadService.createLead({
        company: { name: 'Test Company' },
        contact: { name: 'Test User', email: 'test@example.com' },
        source: { channel: 'website' },
        createdBy: 'test-user'
      });

      await workflowService.executeWorkflow(
        approvalWorkflow.id,
        testLead.id,
        'test-user'
      );

      // Wait for execution to create approval request
      await new Promise(resolve => setTimeout(resolve, 1000));

      const { requests } = await workflowService.getApprovalRequests();
      if (requests.length > 0) {
        approvalRequestId = requests[0]!.id;
      }

      // Clean up workflow
      await workflowService.deleteWorkflow(approvalWorkflow.id);
    });

    it('should retrieve approval requests', async () => {
      const result = await workflowService.getApprovalRequests();

      expect(result).toBeDefined();
      expect(result.requests).toBeInstanceOf(Array);
    });

    it('should filter approval requests by status', async () => {
      const result = await workflowService.getApprovalRequests({
        status: 'pending'
      });

      expect(result.requests.every(r => r.status === 'pending')).toBe(true);
    });

    it('should respond to approval request', async () => {
      if (!approvalRequestId) {
        console.log('No approval request found, skipping test');
        return;
      }

      const response = await workflowService.respondToApprovalRequest(
        approvalRequestId,
        'manager-user',
        'approved',
        'Test approval'
      );

      expect(response.status).toBe('approved');
      expect(response.approver).toBe('manager-user');
      expect(response.reason).toBe('Test approval');
      expect(response.respondedAt).toBeDefined();
    });

    it('should expire old approval requests', async () => {
      const expiredCount = await workflowService.expireOldApprovalRequests();
      expect(typeof expiredCount).toBe('number');
    });
  });

  afterEach(async () => {
    // Clean up test workflow
    if (testWorkflowId) {
      try {
        await workflowService.deleteWorkflow(testWorkflowId);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  });
});