import { TaskService } from '../services/taskService';
import { ActivityService } from '../services/activityService';
import { TaskType, Priority, TaskStatus } from '../types';

/**
 * Demo script to test task management and activity tracking functionality
 */
async function runTaskActivityDemo() {
  console.log('🚀 Starting Task Management and Activity Tracking Demo...\n');

  try {
    // Demo data
    const demoLeadId = 'demo-lead-123';
    const demoUserId = 'demo-user-456';
    const demoAssigneeId = 'demo-assignee-789';

    console.log('📋 Creating a new task...');
    const newTask = await TaskService.createTask({
      leadId: demoLeadId,
      subject: 'Follow up call with prospect',
      description: 'Call to discuss pricing and implementation timeline',
      type: TaskType.CALL,
      priority: Priority.HIGH,
      assignedTo: demoAssigneeId,
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
      status: TaskStatus.PENDING,
      reminders: [
        {
          id: 'reminder-1',
          type: 'email',
          scheduledAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
          sent: false
        }
      ],
      createdBy: demoUserId
    });
    console.log(`✅ Task created: ${newTask.id} - "${newTask.subject}"`);

    console.log('\n📝 Adding a note with @mention...');
    const noteActivity = await ActivityService.addNote(
      demoLeadId,
      `Important update: Customer is interested in our premium package. @${demoAssigneeId} please prepare detailed proposal.`,
      demoUserId
    );
    console.log(`✅ Note added: ${noteActivity.id} - "${noteActivity.subject}"`);

    console.log('\n📧 Logging email activity...');
    const emailActivity = await ActivityService.logEmail(
      demoLeadId,
      demoUserId,
      {
        type: 'sent',
        subject: 'Proposal for Premium Package',
        to: 'prospect@company.com',
        templateId: 'proposal-template-1'
      }
    );
    console.log(`✅ Email logged: ${emailActivity.id} - "${emailActivity.subject}"`);

    console.log('\n📞 Logging call activity...');
    const callActivity = await ActivityService.logCall(
      demoLeadId,
      demoUserId,
      {
        type: 'made',
        duration: 1800, // 30 minutes
        outcome: 'Positive - interested in demo',
        notes: 'Customer wants to see product demo next week'
      }
    );
    console.log(`✅ Call logged: ${callActivity.id} - "${callActivity.subject}"`);

    console.log('\n🗓️ Logging meeting activity...');
    const meetingActivity = await ActivityService.logMeeting(
      demoLeadId,
      demoUserId,
      {
        type: 'scheduled',
        title: 'Product Demo Session',
        scheduledAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
        duration: 3600, // 1 hour
        attendees: [demoUserId, demoAssigneeId, 'client-contact-id'],
        notes: 'Demo scheduled for next Tuesday at 2 PM'
      }
    );
    console.log(`✅ Meeting logged: ${meetingActivity.id} - "${meetingActivity.subject}"`);

    console.log('\n📊 Getting task statistics...');
    const taskStats = await TaskService.getTaskStatistics(demoAssigneeId);
    console.log('Task Statistics:', {
      total: taskStats.total,
      pending: taskStats.pending,
      inProgress: taskStats.inProgress,
      completed: taskStats.completed,
      overdue: taskStats.overdue
    });

    console.log('\n📈 Getting activity statistics...');
    const activityStats = await ActivityService.getActivityStatistics(demoLeadId);
    console.log('Activity Statistics:', {
      totalActivities: activityStats.totalActivities,
      activitiesByType: activityStats.activitiesByType,
      recentActivityCount: activityStats.recentActivityCount,
      topPerformersCount: activityStats.topPerformers.length
    });

    console.log('\n🕒 Getting lead timeline...');
    const timeline = await ActivityService.getLeadTimeline(demoLeadId, 10);
    console.log(`Timeline entries: ${timeline.length}`);
    timeline.forEach((activity, index) => {
      console.log(`  ${index + 1}. ${activity.subject} (${activity.type}) - ${activity.performedAt.toISOString()}`);
    });

    console.log('\n✅ Completing the task...');
    const completedTask = await TaskService.completeTask(newTask.id, demoAssigneeId);
    console.log(`✅ Task completed: ${completedTask.id} - Status: ${completedTask.status}`);

    console.log('\n🔍 Searching activities...');
    const searchResults = await ActivityService.searchActivities('proposal', demoLeadId, 5);
    console.log(`Search results for "proposal": ${searchResults.length} activities found`);

    console.log('\n🎯 Getting tasks by priority...');
    const highPriorityTasks = await TaskService.getTasksByPriority(Priority.HIGH, demoAssigneeId);
    console.log(`High priority tasks: ${highPriorityTasks.length}`);

    console.log('\n⏰ Getting upcoming tasks...');
    const upcomingTasks = await TaskService.getUpcomingTasks(7, demoAssigneeId);
    console.log(`Upcoming tasks (next 7 days): ${upcomingTasks.length}`);

    console.log('\n🚨 Getting overdue tasks...');
    const overdueTasks = await TaskService.getOverdueTasks(demoAssigneeId);
    console.log(`Overdue tasks: ${overdueTasks.length}`);

    console.log('\n🔄 Reassigning task...');
    // Create another task to reassign
    const taskToReassign = await TaskService.createTask({
      leadId: demoLeadId,
      subject: 'Task to reassign',
      description: 'This task will be reassigned',
      type: TaskType.EMAIL,
      priority: Priority.MEDIUM,
      assignedTo: demoAssigneeId,
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      status: TaskStatus.PENDING,
      reminders: [],
      createdBy: demoUserId
    });

    const reassignedTask = await TaskService.reassignTask(
      taskToReassign.id,
      demoUserId,
      demoAssigneeId,
      'Workload balancing'
    );
    console.log(`✅ Task reassigned: ${reassignedTask.id} - New assignee: ${reassignedTask.assignedTo}`);

    console.log('\n🎉 Task Management and Activity Tracking Demo completed successfully!');

  } catch (error) {
    console.error('❌ Demo failed:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      console.error('Stack trace:', error.stack);
    }
  }
}

// Export for use in other files
export { runTaskActivityDemo };

// Run demo if this file is executed directly
if (require.main === module) {
  runTaskActivityDemo()
    .then(() => {
      console.log('\n✨ Demo execution completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Demo execution failed:', error);
      process.exit(1);
    });
}