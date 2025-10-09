import { workflowService } from '../services/workflowService';
import { workflowEngine } from '../services/workflowEngine';
import { workflowTrigger } from '../services/workflowTrigger';
import { leadService } from '../services/leadService';
import { LeadStatus, LeadChannel, BusinessType } from '../types';

async function demonstrateWorkflowSystem() {
  console.log('🔄 Workflow Automation System Demo');
  console.log('=====================================\n');

  try {
    // 1. Create sample workflows
    console.log('1. Creating sample workflows...');
    
    // Workflow for new lead welcome sequence
    const welcomeWorkflow = await workflowService.createWorkflow({
      name: 'New Lead Welcome Sequence',
      description: 'Automated welcome email and task creation for new leads',
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
            templateId: 'welcome-template',
            variables: {
              subject: 'Welcome to our lead management system'
            }
          }
        },
        {
          type: 'create_task',
          parameters: {
            subject: 'Initial contact with new lead',
            description: 'Make first contact within 24 hours',
            type: 'call',
            priority: 'high',
            dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          },
          delay: 5 // 5 minutes delay
        }
      ],
      isActive: true,
      priority: 10,
      createdBy: 'demo-user'
    });

    console.log(`✅ Created welcome workflow: ${welcomeWorkflow.id}`);

    // Workflow for high-score lead assignment
    const highScoreWorkflow = await workflowService.createWorkflow({
      name: 'High Score Lead Assignment',
      description: 'Automatically assign high-scoring leads to senior sales reps',
      trigger: {
        event: 'score_changed',
        conditions: [
          {
            field: 'newScore',
            operator: 'greater_than',
            value: 80
          },
          {
            field: 'scoreBand',
            operator: 'equals',
            value: 'HOT',
            logicalOperator: 'AND'
          }
        ]
      },
      actions: [
        {
          type: 'request_approval',
          parameters: {
            approverRole: 'Manager',
            requestData: {
              reason: 'High-scoring lead requires senior rep assignment',
              recommendedAction: 'Assign to senior sales representative'
            },
            expiresInHours: 2
          }
        },
        {
          type: 'send_notification',
          parameters: {
            recipientId: 'manager-user-id',
            message: 'High-scoring lead requires immediate attention',
            type: 'urgent'
          }
        }
      ],
      isActive: true,
      priority: 20,
      createdBy: 'demo-user'
    });

    console.log(`✅ Created high score workflow: ${highScoreWorkflow.id}`);

    // Workflow for status change notifications
    const statusChangeWorkflow = await workflowService.createWorkflow({
      name: 'Status Change Notifications',
      description: 'Notify team when lead status changes to qualified',
      trigger: {
        event: 'status_updated',
        conditions: [
          {
            field: 'newStatus',
            operator: 'equals',
            value: LeadStatus.QUALIFIED
          }
        ]
      },
      actions: [
        {
          type: 'send_email',
          parameters: {
            templateId: 'qualified-lead-template',
            variables: {
              subject: 'Lead qualified - Ready for conversion'
            }
          }
        },
        {
          type: 'create_task',
          parameters: {
            subject: 'Prepare proposal for qualified lead',
            description: 'Create and send proposal within 48 hours',
            type: 'proposal',
            priority: 'high',
            dueDate: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
          }
        }
      ],
      isActive: true,
      priority: 15,
      createdBy: 'demo-user'
    });

    console.log(`✅ Created status change workflow: ${statusChangeWorkflow.id}`);

    // 2. List all workflows
    console.log('\n2. Listing all workflows...');
    const { workflows } = await workflowService.getWorkflows();
    workflows.forEach(workflow => {
      console.log(`   - ${workflow.name} (${workflow.trigger.event}) - Priority: ${workflow.priority}`);
    });

    // 3. Create a test lead to trigger workflows
    console.log('\n3. Creating test lead to trigger workflows...');
    const testLead = await leadService.createLead({
      company: {
        name: 'Demo Company Inc.',
        industry: 'Technology',
        size: 'medium'
      },
      contact: {
        name: 'John Demo',
        email: 'john.demo@example.com',
        phone: '+1-555-0123'
      },
      source: {
        channel: LeadChannel.WEBSITE,
        campaign: 'demo-campaign'
      },
      status: LeadStatus.NEW,
      qualification: {
        businessType: BusinessType.B2B
      },
      createdBy: 'demo-user'
    });

    console.log(`✅ Created test lead: ${testLead.id}`);
    console.log('   This should trigger the welcome workflow...');

    // Wait a moment for async workflow execution
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 4. Check workflow executions
    console.log('\n4. Checking workflow executions...');
    const { executions } = await workflowService.getWorkflowExecutions({
      leadId: testLead.id
    });

    executions.forEach(execution => {
      console.log(`   - Workflow: ${execution.workflowId}`);
      console.log(`     Status: ${execution.status}`);
      console.log(`     Started: ${execution.startedAt}`);
      console.log(`     Actions executed: ${execution.executedActions.length}`);
    });

    // 5. Manually trigger a workflow
    console.log('\n5. Manually triggering workflow...');
    await workflowTrigger.triggerManual(testLead.id, 'demo-user', {
      manualTrigger: true,
      reason: 'Demo manual trigger'
    });

    console.log('✅ Manual workflow triggered');

    // 6. Test approval workflow by updating lead status
    console.log('\n6. Testing status change workflow...');
    await leadService.updateLead(testLead.id, {
      status: LeadStatus.QUALIFIED
    }, 'demo-user');

    console.log('✅ Lead status updated to qualified - should trigger status change workflow');

    // Wait for workflow execution
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 7. Check approval requests
    console.log('\n7. Checking approval requests...');
    const { requests } = await workflowService.getApprovalRequests({
      leadId: testLead.id
    });

    if (requests.length > 0) {
      console.log(`   Found ${requests.length} approval request(s):`);
      requests.forEach(request => {
        console.log(`   - Status: ${request.status}`);
        console.log(`     Approver Role: ${request.approverRole}`);
        console.log(`     Expires: ${request.expiresAt}`);
      });
    } else {
      console.log('   No approval requests found');
    }

    // 8. Final workflow execution summary
    console.log('\n8. Final workflow execution summary...');
    const { executions: finalExecutions } = await workflowService.getWorkflowExecutions({
      leadId: testLead.id
    });

    console.log(`   Total executions for test lead: ${finalExecutions.length}`);
    finalExecutions.forEach((execution, index) => {
      console.log(`   ${index + 1}. Status: ${execution.status}, Actions: ${execution.executedActions.length}`);
    });

    console.log('\n🎉 Workflow automation system demo completed successfully!');
    console.log('\nKey features demonstrated:');
    console.log('✅ Workflow creation and management');
    console.log('✅ Event-based triggers (lead_created, status_updated)');
    console.log('✅ Conditional workflow execution');
    console.log('✅ Multiple action types (email, tasks, notifications)');
    console.log('✅ Approval request workflows');
    console.log('✅ Manual workflow triggering');
    console.log('✅ Workflow execution tracking');

  } catch (error) {
    console.error('❌ Demo failed:', error);
    throw error;
  }
}

// Run the demo if this file is executed directly
if (require.main === module) {
  demonstrateWorkflowSystem()
    .then(() => {
      console.log('\n✅ Demo completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Demo failed:', error);
      process.exit(1);
    });
}

export { demonstrateWorkflowSystem };