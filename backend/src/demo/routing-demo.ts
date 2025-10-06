import { RoutingService } from '../services/routingService';
import { Lead } from '../models/Lead';
import { User } from '../models/User';
import { AssignmentRule } from '../models/AssignmentRule';
import { 
  UserRole, 
  LeadStatus, 
  ScoreBand, 
  LeadChannel, 
  CompanySize,
  InterestLevel,
  BudgetStatus,
  PurchaseTimeline,
  ProductType
} from '../types';

/**
 * Demo script showcasing the assignment and routing engine functionality
 */
async function runRoutingDemo() {
  console.log('🚀 Starting Lead Assignment and Routing Engine Demo\n');

  try {
    // 1. Create demo users (sales reps and managers)
    console.log('1. Creating demo users...');
    
    const salesRep1 = await User.createUser({
      email: 'sales1@demo.com',
      password: 'password123',
      firstName: 'Alice',
      lastName: 'Johnson',
      role: UserRole.SALES,
      isActive: true,
      profile: {
        department: 'sales',
        territory: 'north',
        workingHours: {
          timezone: 'UTC',
          monday: { isWorkingDay: true, startTime: '09:00', endTime: '17:00' },
          tuesday: { isWorkingDay: true, startTime: '09:00', endTime: '17:00' },
          wednesday: { isWorkingDay: true, startTime: '09:00', endTime: '17:00' },
          thursday: { isWorkingDay: true, startTime: '09:00', endTime: '17:00' },
          friday: { isWorkingDay: true, startTime: '09:00', endTime: '17:00' },
          saturday: { isWorkingDay: false },
          sunday: { isWorkingDay: false }
        }
      }
    });

    const salesRep2 = await User.createUser({
      email: 'sales2@demo.com',
      password: 'password123',
      firstName: 'Bob',
      lastName: 'Smith',
      role: UserRole.SALES,
      isActive: true,
      profile: {
        department: 'sales',
        territory: 'south',
        workingHours: {
          timezone: 'UTC',
          monday: { isWorkingDay: true, startTime: '08:00', endTime: '16:00' },
          tuesday: { isWorkingDay: true, startTime: '08:00', endTime: '16:00' },
          wednesday: { isWorkingDay: true, startTime: '08:00', endTime: '16:00' },
          thursday: { isWorkingDay: true, startTime: '08:00', endTime: '16:00' },
          friday: { isWorkingDay: true, startTime: '08:00', endTime: '16:00' },
          saturday: { isWorkingDay: false },
          sunday: { isWorkingDay: false }
        }
      }
    });

    const manager = await User.createUser({
      email: 'manager@demo.com',
      password: 'password123',
      firstName: 'Carol',
      lastName: 'Williams',
      role: UserRole.MANAGER,
      isActive: true,
      profile: {
        department: 'sales'
      }
    });

    console.log(`✅ Created users: ${salesRep1.first_name}, ${salesRep2.first_name}, ${manager.first_name}\n`);

    // 2. Create assignment rules
    console.log('2. Creating assignment rules...');

    // Rule 1: High-value leads go to experienced rep
    const highValueRule = await AssignmentRule.createRule({
      name: 'High Value Leads',
      priority: 1,
      conditions: [
        { field: 'score.value', operator: 'greater_than', value: 80 }
      ],
      actions: [
        { type: 'assign_to_user', parameters: { userId: salesRep1.id } }
      ],
      isActive: true,
      createdBy: manager.id
    });

    // Rule 2: Territory-based assignment
    const territoryRule = await AssignmentRule.createRule({
      name: 'Territory Based Assignment',
      priority: 2,
      conditions: [
        { field: 'company.industry', operator: 'equals', value: 'technology' }
      ],
      actions: [
        { type: 'assign_to_user', parameters: { userId: salesRep2.id } }
      ],
      isActive: true,
      createdBy: manager.id
    });

    console.log(`✅ Created assignment rules: ${highValueRule.name}, ${territoryRule.name}\n`);

    // 3. Create demo leads
    console.log('3. Creating demo leads...');

    const highValueLead = await Lead.createLead({
      company: { name: 'Enterprise Corp', industry: 'finance', size: CompanySize.LARGE },
      contact: { name: 'John Executive', email: 'john@enterprise.com', phone: '+1-555-0101' },
      source: { channel: LeadChannel.REFERRAL, campaign: 'enterprise-outreach' },
      assignment: {},
      status: LeadStatus.NEW,
      score: { value: 95, band: ScoreBand.HOT, lastCalculated: new Date() },
      qualification: { interest: InterestLevel.HIGH, budget: BudgetStatus.CONFIRMED, timeline: PurchaseTimeline.IMMEDIATE },
      followUp: {},
      product: { type: ProductType.SOFTWARE },
      customFields: {}
    });

    const techLead = await Lead.createLead({
      company: { name: 'Tech Startup', industry: 'technology', size: CompanySize.STARTUP },
      contact: { name: 'Jane Developer', email: 'jane@techstartup.com', phone: '+1-555-0102' },
      source: { channel: LeadChannel.WEB_FORM, campaign: 'tech-demo' },
      assignment: {},
      status: LeadStatus.NEW,
      score: { value: 70, band: ScoreBand.WARM, lastCalculated: new Date() },
      qualification: { interest: InterestLevel.MEDIUM, budget: BudgetStatus.ESTIMATED, timeline: PurchaseTimeline.WITHIN_MONTH },
      followUp: {},
      product: { type: ProductType.SOFTWARE },
      customFields: {}
    });

    const regularLead = await Lead.createLead({
      company: { name: 'Small Business', industry: 'retail', size: CompanySize.SMALL },
      contact: { name: 'Mike Owner', email: 'mike@smallbiz.com', phone: '+1-555-0103' },
      source: { channel: LeadChannel.PAID_ADS, campaign: 'google-ads' },
      assignment: {},
      status: LeadStatus.NEW,
      score: { value: 45, band: ScoreBand.COLD, lastCalculated: new Date() },
      qualification: { interest: InterestLevel.LOW, budget: BudgetStatus.UNKNOWN, timeline: PurchaseTimeline.WITHIN_QUARTER },
      followUp: {},
      product: { type: ProductType.SERVICE },
      customFields: {}
    });

    console.log(`✅ Created leads: ${highValueLead.account_lead_id}, ${techLead.account_lead_id}, ${regularLead.account_lead_id}\n`);

    // 4. Demonstrate automatic assignment
    console.log('4. Testing automatic lead assignment...\n');

    // Assign high-value lead (should match high-value rule)
    console.log(`Assigning high-value lead (${highValueLead.account_lead_id})...`);
    const assignment1 = await RoutingService.assignLead(highValueLead.id);
    console.log(`✅ Assigned to: ${assignment1.assignedTo}`);
    console.log(`   Reason: ${assignment1.assignmentReason}\n`);

    // Assign tech lead (should match territory rule)
    console.log(`Assigning tech lead (${techLead.account_lead_id})...`);
    const assignment2 = await RoutingService.assignLead(techLead.id);
    console.log(`✅ Assigned to: ${assignment2.assignedTo}`);
    console.log(`   Reason: ${assignment2.assignmentReason}\n`);

    // Assign regular lead (should use round-robin)
    console.log(`Assigning regular lead (${regularLead.account_lead_id})...`);
    const assignment3 = await RoutingService.assignLead(regularLead.id);
    console.log(`✅ Assigned to: ${assignment3.assignedTo}`);
    console.log(`   Reason: ${assignment3.assignmentReason}\n`);

    // 5. Demonstrate manual reassignment
    console.log('5. Testing manual reassignment...');
    
    const reassignmentRequest = {
      leadId: regularLead.id,
      newAssigneeId: salesRep1.id,
      reason: 'Customer requested specific rep',
      reassignedBy: manager.id
    };

    const reassignment = await RoutingService.reassignLead(reassignmentRequest);
    console.log(`✅ Reassigned lead ${regularLead.account_lead_id} to ${reassignment.assignedTo}`);
    console.log(`   Previous assignee: ${reassignment.previousAssignee}`);
    console.log(`   Reason: ${reassignment.assignmentReason}\n`);

    // 6. Check workload distribution
    console.log('6. Checking workload distribution...');
    
    const workloads = await RoutingService.getAllUserWorkloads();
    workloads.forEach(workload => {
      console.log(`👤 User ${workload.userId}: ${workload.activeLeads} leads (score: ${workload.workloadScore})`);
    });
    console.log();

    // 7. Demonstrate SLA monitoring
    console.log('7. Testing SLA monitoring...');
    
    // Check SLA for assigned leads
    const slaStatus1 = await RoutingService.checkSLACompliance(highValueLead.id);
    console.log(`📊 SLA Status for ${highValueLead.account_lead_id}:`);
    console.log(`   Assigned at: ${slaStatus1.assignedAt}`);
    console.log(`   SLA deadline: ${slaStatus1.slaDeadline}`);
    console.log(`   Hours remaining: ${slaStatus1.hoursRemaining.toFixed(1)}`);
    console.log(`   Is overdue: ${slaStatus1.isOverdue}`);
    console.log(`   Escalation level: ${slaStatus1.escalationLevel}\n`);

    // Check for overdue leads
    const overdueLeads = await RoutingService.getOverdueLeads();
    console.log(`📋 Found ${overdueLeads.length} overdue leads\n`);

    // 8. Show assignment statistics
    console.log('8. Assignment statistics...');
    
    const statistics = await RoutingService.getAssignmentStatistics();
    console.log('📈 Assignment Statistics:');
    console.log(`   Total assignments: ${statistics.totalAssignments}`);
    console.log(`   SLA compliance rate: ${statistics.slaComplianceRate}%\n`);

    // 9. Show assignment rule statistics
    console.log('9. Assignment rule statistics...');
    
    const ruleStats = await AssignmentRule.getRuleStatistics();
    console.log('📊 Rule Statistics:');
    console.log(`   Total rules: ${ruleStats.totalRules}`);
    console.log(`   Active rules: ${ruleStats.activeRules}`);
    console.log(`   Inactive rules: ${ruleStats.inactiveRules}\n`);

    // 10. Demonstrate rule management
    console.log('10. Testing rule management...');
    
    // Deactivate a rule
    await AssignmentRule.deactivateRule(territoryRule.id);
    console.log(`✅ Deactivated rule: ${territoryRule.name}`);
    
    // Reactivate the rule
    await AssignmentRule.activateRule(territoryRule.id);
    console.log(`✅ Reactivated rule: ${territoryRule.name}\n`);

    console.log('🎉 Routing Engine Demo completed successfully!');
    console.log('\nKey features demonstrated:');
    console.log('✅ Rule-based lead assignment');
    console.log('✅ Round-robin workload balancing');
    console.log('✅ Manual reassignment with reason logging');
    console.log('✅ Working hours validation');
    console.log('✅ SLA monitoring and compliance tracking');
    console.log('✅ Workload distribution analysis');
    console.log('✅ Assignment rule management');
    console.log('✅ Comprehensive activity logging');

    // Cleanup demo data
    console.log('\n🧹 Cleaning up demo data...');
    await Lead.delete(highValueLead.id);
    await Lead.delete(techLead.id);
    await Lead.delete(regularLead.id);
    await AssignmentRule.delete(highValueRule.id);
    await AssignmentRule.delete(territoryRule.id);
    await User.delete(salesRep1.id);
    await User.delete(salesRep2.id);
    await User.delete(manager.id);
    console.log('✅ Demo data cleaned up');

  } catch (error) {
    console.error('❌ Demo failed:', error);
    throw error;
  }
}

// Run the demo if this file is executed directly
if (require.main === module) {
  runRoutingDemo()
    .then(() => {
      console.log('\n✨ Demo completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Demo failed:', error);
      process.exit(1);
    });
}

export { runRoutingDemo };