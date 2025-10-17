import { ReportingService } from '../services/reportingService';
import { Lead } from '../models/Lead';
import { User } from '../models/User';
import { Activity } from '../models/Activity';
import { Task } from '../models/Task';
import { LeadStatus, LeadChannel, UserRole, ActivityType, TaskStatus } from '../types';

/**
 * Demo script to test reporting functionality
 */
async function runReportingDemo() {
  console.log('🚀 Starting Reporting Demo...\n');

  try {
    // Create demo user
    console.log('📊 Creating demo user...');
    const demoUser = await User.create({
      email: 'demo-sales@example.com',
      password: 'hashedpassword',
      first_name: 'Demo',
      last_name: 'Sales Rep',
      role: UserRole.SALES,
      is_active: true
    });
    console.log(`✅ Created user: ${demoUser.first_name} ${demoUser.last_name}`);

    // Create demo leads with different statuses and sources
    console.log('\n📈 Creating demo leads...');
    const leadData = [
      {
        company_name: 'Tech Startup Inc',
        contact_name: 'John Smith',
        contact_email: 'john@techstartup.com',
        contact_phone: '+1234567890',
        source_channel: LeadChannel.WEB_FORM,
        status: LeadStatus.NEW,
        score_value: 75,
        score_band: 'warm',
        assigned_to: demoUser.id,
        assigned_at: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        is_active: true,
        created_by: demoUser.id
      },
      {
        company_name: 'Enterprise Corp',
        contact_name: 'Jane Doe',
        contact_email: 'jane@enterprise.com',
        contact_phone: '+1234567891',
        source_channel: LeadChannel.EMAIL,
        status: LeadStatus.CONTACTED,
        score_value: 85,
        score_band: 'hot',
        assigned_to: demoUser.id,
        assigned_at: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
        is_active: true,
        created_by: demoUser.id
      },
      {
        company_name: 'Small Business LLC',
        contact_name: 'Bob Johnson',
        contact_email: 'bob@smallbiz.com',
        contact_phone: '+1234567892',
        source_channel: LeadChannel.PAID_ADS,
        status: LeadStatus.QUALIFIED,
        score_value: 90,
        score_band: 'hot',
        assigned_to: demoUser.id,
        assigned_at: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        is_active: true,
        created_by: demoUser.id
      },
      {
        company_name: 'Big Corporation',
        contact_name: 'Alice Brown',
        contact_email: 'alice@bigcorp.com',
        contact_phone: '+1234567893',
        source_channel: LeadChannel.REFERRAL,
        status: LeadStatus.WON,
        score_value: 95,
        score_band: 'hot',
        assigned_to: demoUser.id,
        assigned_at: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
        is_active: true,
        created_by: demoUser.id
      },
      {
        company_name: 'Lost Opportunity Inc',
        contact_name: 'Charlie Wilson',
        contact_email: 'charlie@lostopportunity.com',
        source_channel: LeadChannel.COLD_CALL,
        status: LeadStatus.LOST,
        score_value: 60,
        score_band: 'cold',
        assigned_to: demoUser.id,
        assigned_at: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
        is_active: true,
        created_by: demoUser.id
      }
    ];

    const createdLeads = [];
    for (const lead of leadData) {
      const createdLead = await Lead.create({
        ...lead,
        account_lead_id: await Lead.generateAccountLeadId()
      });
      createdLeads.push(createdLead);
      console.log(`✅ Created lead: ${createdLead.company_name} (${createdLead.status})`);
    }

    // Create demo activities
    console.log('\n📝 Creating demo activities...');
    for (const lead of createdLeads) {
      await Activity.create({
        lead_id: lead.id,
        type: ActivityType.LEAD_CREATED,
        subject: 'Lead created',
        details: JSON.stringify({ source: lead.source_channel }),
        performed_by: demoUser.id,
        performed_at: new Date()
      });

      await Activity.create({
        lead_id: lead.id,
        type: ActivityType.STATUS_CHANGE,
        subject: `Status changed to ${lead.status}`,
        details: JSON.stringify({ 
          old_status: LeadStatus.NEW, 
          new_status: lead.status 
        }),
        performed_by: demoUser.id,
        performed_at: new Date()
      });
    }
    console.log(`✅ Created activities for ${createdLeads.length} leads`);

    // Create demo tasks
    console.log('\n📋 Creating demo tasks...');
    await Task.create({
      lead_id: createdLeads[0].id,
      subject: 'Follow up call',
      description: 'Call to discuss requirements',
      type: 'call',
      priority: 'medium',
      assigned_to: demoUser.id,
      due_date: new Date(Date.now() + 24 * 60 * 60 * 1000),
      status: TaskStatus.COMPLETED,
      created_by: demoUser.id
    });

    await Task.create({
      lead_id: createdLeads[1].id,
      subject: 'Send proposal',
      description: 'Prepare and send detailed proposal',
      type: 'email',
      priority: 'high',
      assigned_to: demoUser.id,
      due_date: new Date(Date.now() - 24 * 60 * 60 * 1000), // Overdue
      status: TaskStatus.PENDING,
      created_by: demoUser.id
    });

    console.log('✅ Created demo tasks');

    // Test reporting functions
    console.log('\n📊 Testing Reporting Functions...\n');

    // 1. Funnel Metrics
    console.log('1️⃣ Testing Funnel Metrics...');
    const funnelMetrics = await ReportingService.getFunnelMetrics();
    console.log('Funnel Metrics:');
    funnelMetrics.forEach(metric => {
      console.log(`  ${metric.stage}: ${metric.count} leads (${metric.conversionRate.toFixed(1)}% conversion, ${metric.averageTimeInStage.toFixed(1)} days avg)`);
    });

    // 2. Time to First Touch
    console.log('\n2️⃣ Testing Time to First Touch Report...');
    const timeToFirstTouch = await ReportingService.getTimeToFirstTouchReport();
    console.log(`Average Time to First Touch: ${timeToFirstTouch.averageTimeToFirstTouch.toFixed(1)} hours`);
    console.log(`Median Time to First Touch: ${timeToFirstTouch.medianTimeToFirstTouch.toFixed(1)} hours`);
    console.log('By Source:');
    timeToFirstTouch.bySource.forEach(source => {
      console.log(`  ${source.source}: ${source.averageTime.toFixed(1)}h avg, ${source.medianTime.toFixed(1)}h median`);
    });

    // 3. SLA Compliance
    console.log('\n3️⃣ Testing SLA Compliance Report...');
    const slaCompliance = await ReportingService.getSLAComplianceReport(24);
    console.log(`Overall SLA Compliance: ${slaCompliance.overallCompliance.toFixed(1)}%`);
    console.log(`Compliant Leads: ${slaCompliance.compliantLeads}/${slaCompliance.totalLeads}`);
    console.log(`Average Response Time: ${slaCompliance.averageResponseTime.toFixed(1)} hours`);

    // 4. Source Effectiveness
    console.log('\n4️⃣ Testing Source Effectiveness Report...');
    const sourceEffectiveness = await ReportingService.getSourceEffectivenessReport();
    console.log('Source Effectiveness:');
    sourceEffectiveness.forEach(source => {
      console.log(`  ${source.source}:`);
      console.log(`    Total: ${source.totalLeads}, Qualified: ${source.qualifiedLeads}, Converted: ${source.convertedLeads}`);
      console.log(`    Qualification Rate: ${source.qualificationRate.toFixed(1)}%, Conversion Rate: ${source.conversionRate.toFixed(1)}%`);
      console.log(`    Average Score: ${source.averageScore.toFixed(1)}, Avg Time to Conversion: ${source.averageTimeToConversion.toFixed(1)} days`);
    });

    // 5. Sales Rep Performance
    console.log('\n5️⃣ Testing Sales Rep Performance Report...');
    const salesPerformance = await ReportingService.getSalesRepPerformanceReport();
    console.log('Sales Rep Performance:');
    salesPerformance.forEach(rep => {
      console.log(`  ${rep.assigneeName}:`);
      console.log(`    Total Leads: ${rep.totalLeads}, Active: ${rep.activeLeads}, Qualified: ${rep.qualifiedLeads}, Converted: ${rep.convertedLeads}`);
      console.log(`    Qualification Rate: ${rep.qualificationRate.toFixed(1)}%, Conversion Rate: ${rep.conversionRate.toFixed(1)}%`);
      console.log(`    Tasks: ${rep.tasksCompleted} completed, ${rep.tasksOverdue} overdue`);
      console.log(`    SLA Compliance: ${rep.slaCompliance.toFixed(1)}%`);
    });

    // 6. Data Quality
    console.log('\n6️⃣ Testing Data Quality Report...');
    const dataQuality = await ReportingService.getDataQualityReport();
    console.log(`Total Leads: ${dataQuality.totalLeads}`);
    console.log(`Data Completeness Score: ${dataQuality.dataCompletenessScore.toFixed(1)}%`);
    console.log(`Duplicate Rate: ${dataQuality.duplicateRate.toFixed(1)}% (${dataQuality.duplicateLeads} leads)`);
    console.log(`Invalid Emails: ${dataQuality.invalidEmails}, Invalid Phones: ${dataQuality.invalidPhones}`);
    console.log('Missing Fields:');
    dataQuality.missingFields.forEach(field => {
      console.log(`  ${field.field}: ${field.missingCount} missing (${field.missingRate.toFixed(1)}%)`);
    });

    console.log('\n✅ All reporting functions tested successfully!');

    // Clean up demo data
    console.log('\n🧹 Cleaning up demo data...');
    await Activity.query.where('performed_by', demoUser.id).del();
    await Task.query.where('created_by', demoUser.id).del();
    await Lead.query.where('created_by', demoUser.id).del();
    await User.query.where('id', demoUser.id).del();
    console.log('✅ Demo data cleaned up');

  } catch (error) {
    console.error('❌ Error in reporting demo:', error);
    throw error;
  }
}

// Run the demo if this file is executed directly
if (require.main === module) {
  runReportingDemo()
    .then(() => {
      console.log('\n🎉 Reporting demo completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Reporting demo failed:', error);
      process.exit(1);
    });
}

export { runReportingDemo };