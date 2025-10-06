import { ScoringService } from '../services/scoringService';
import { LeadService } from '../services/leadService';
import { Lead } from '../models/Lead';
import { Activity } from '../models/Activity';
import { LeadChannel, CompanySize, BusinessType, InterestLevel, BudgetStatus, PurchaseTimeline, ScoreBand, ActivityType } from '../types';

/**
 * Demo script showcasing the Lead Scoring System functionality
 */
async function runScoringDemo() {
  console.log('🎯 Lead Scoring System Demo');
  console.log('=' .repeat(50));

  try {
    // 1. Create sample leads with different characteristics
    console.log('\n1. Creating sample leads with different scoring profiles...');
    
    const highValueLead = await LeadService.createLead({
      company: {
        name: 'TechCorp Enterprise',
        industry: 'technology',
        size: CompanySize.ENTERPRISE
      },
      contact: {
        name: 'Sarah Johnson',
        email: 'sarah.johnson@techcorp.com',
        phone: '+1-555-0123'
      },
      source: {
        channel: LeadChannel.REFERRAL,
        campaign: 'enterprise-referral'
      },
      qualification: {
        interest: InterestLevel.HIGH,
        budget: BudgetStatus.CONFIRMED,
        timeline: PurchaseTimeline.IMMEDIATE,
        businessType: BusinessType.B2B
      },
      createdBy: 'demo-user'
    }, true); // Skip quality check for demo

    const mediumValueLead = await LeadService.createLead({
      company: {
        name: 'MidSize Solutions',
        industry: 'finance',
        size: CompanySize.MEDIUM
      },
      contact: {
        name: 'Mike Chen',
        email: 'mike.chen@midsize.com',
        phone: '+1-555-0456'
      },
      source: {
        channel: LeadChannel.WEB_FORM,
        campaign: 'website-contact'
      },
      qualification: {
        interest: InterestLevel.MEDIUM,
        budget: BudgetStatus.ESTIMATED,
        timeline: PurchaseTimeline.WITHIN_QUARTER,
        businessType: BusinessType.B2B
      },
      createdBy: 'demo-user'
    }, true);

    const lowValueLead = await LeadService.createLead({
      company: {
        name: 'Small Retail Shop',
        industry: 'retail',
        size: CompanySize.SMALL
      },
      contact: {
        name: 'Lisa Brown',
        email: 'lisa@smallshop.com'
      },
      source: {
        channel: LeadChannel.VENDOR_LIST,
        campaign: 'purchased-list'
      },
      qualification: {
        interest: InterestLevel.LOW,
        budget: BudgetStatus.UNKNOWN,
        timeline: PurchaseTimeline.UNKNOWN,
        businessType: BusinessType.B2C
      },
      createdBy: 'demo-user'
    }, true);

    console.log(`✅ Created high-value lead: ${highValueLead.accountLeadId}`);
    console.log(`✅ Created medium-value lead: ${mediumValueLead.accountLeadId}`);
    console.log(`✅ Created low-value lead: ${lowValueLead.accountLeadId}`);

    // 2. Add behavioral activities to simulate engagement
    console.log('\n2. Adding behavioral activities to simulate engagement...');
    
    // High engagement for high-value lead
    await Activity.createActivity({
      leadId: highValueLead.id,
      type: ActivityType.EMAIL_OPENED,
      subject: 'Opened welcome email',
      details: { emailId: 'welcome-001' },
      performedBy: 'system',
      performedAt: new Date()
    });

    await Activity.createActivity({
      leadId: highValueLead.id,
      type: ActivityType.EMAIL_REPLIED,
      subject: 'Replied to welcome email',
      details: { emailId: 'welcome-001', reply: 'Very interested!' },
      performedBy: highValueLead.id,
      performedAt: new Date()
    });

    await Activity.createActivity({
      leadId: highValueLead.id,
      type: ActivityType.WEBSITE_VISIT,
      subject: 'Visited pricing page',
      details: { page: '/pricing', duration: 180 },
      performedBy: highValueLead.id,
      performedAt: new Date()
    });

    // Medium engagement for medium-value lead
    await Activity.createActivity({
      leadId: mediumValueLead.id,
      type: ActivityType.EMAIL_OPENED,
      subject: 'Opened newsletter',
      details: { emailId: 'newsletter-001' },
      performedBy: 'system',
      performedAt: new Date()
    });

    await Activity.createActivity({
      leadId: mediumValueLead.id,
      type: ActivityType.FORM_COMPLETED,
      subject: 'Completed contact form',
      details: { formId: 'contact-form', fields: ['name', 'email', 'company'] },
      performedBy: mediumValueLead.id,
      performedAt: new Date()
    });

    // Low engagement for low-value lead (no activities)

    console.log('✅ Added behavioral activities');

    // 3. Calculate scores for all leads
    console.log('\n3. Calculating lead scores...');
    
    const highValueScore = await ScoringService.calculateScore(highValueLead.id);
    const mediumValueScore = await ScoringService.calculateScore(mediumValueLead.id);
    const lowValueScore = await ScoringService.calculateScore(lowValueLead.id);

    console.log('\n📊 Scoring Results:');
    console.log('-'.repeat(30));
    
    console.log(`\n🔥 High-Value Lead (${highValueLead.accountLeadId}):`);
    console.log(`   Total Score: ${highValueScore.totalScore}`);
    console.log(`   Score Band: ${highValueScore.scoreBand.toUpperCase()}`);
    console.log(`   Breakdown:`);
    console.log(`     - Profile Fit: ${highValueScore.breakdown.profileFit}`);
    console.log(`     - Behavioral: ${highValueScore.breakdown.behavioral}`);
    console.log(`     - Recency: ${highValueScore.breakdown.recency}`);
    console.log(`     - Source: ${highValueScore.breakdown.source}`);
    console.log(`     - Qualification: ${highValueScore.breakdown.qualification}`);

    console.log(`\n🔶 Medium-Value Lead (${mediumValueLead.accountLeadId}):`);
    console.log(`   Total Score: ${mediumValueScore.totalScore}`);
    console.log(`   Score Band: ${mediumValueScore.scoreBand.toUpperCase()}`);
    console.log(`   Breakdown:`);
    console.log(`     - Profile Fit: ${mediumValueScore.breakdown.profileFit}`);
    console.log(`     - Behavioral: ${mediumValueScore.breakdown.behavioral}`);
    console.log(`     - Recency: ${mediumValueScore.breakdown.recency}`);
    console.log(`     - Source: ${mediumValueScore.breakdown.source}`);
    console.log(`     - Qualification: ${mediumValueScore.breakdown.qualification}`);

    console.log(`\n🔵 Low-Value Lead (${lowValueLead.accountLeadId}):`);
    console.log(`   Total Score: ${lowValueScore.totalScore}`);
    console.log(`   Score Band: ${lowValueScore.scoreBand.toUpperCase()}`);
    console.log(`   Breakdown:`);
    console.log(`     - Profile Fit: ${lowValueScore.breakdown.profileFit}`);
    console.log(`     - Behavioral: ${lowValueScore.breakdown.behavioral}`);
    console.log(`     - Recency: ${lowValueScore.breakdown.recency}`);
    console.log(`     - Source: ${lowValueScore.breakdown.source}`);
    console.log(`     - Qualification: ${lowValueScore.breakdown.qualification}`);

    // 4. Demonstrate score bands configuration
    console.log('\n4. Current Score Bands Configuration:');
    console.log('-'.repeat(40));
    
    const scoreBands = ScoringService.getScoreBands();
    scoreBands.forEach(band => {
      console.log(`\n${band.band.toUpperCase()} (${band.minScore}-${band.maxScore}):`);
      band.actions.forEach(action => {
        console.log(`  - ${action.type}: ${JSON.stringify(action.parameters)}`);
      });
    });

    // 5. Demonstrate batch recalculation
    console.log('\n5. Demonstrating batch score recalculation...');
    
    const batchResult = await ScoringService.recalculateScoresForLeads([
      highValueLead.id,
      mediumValueLead.id,
      lowValueLead.id
    ]);

    console.log(`✅ Batch recalculation completed:`);
    console.log(`   - Processed: ${batchResult.processed}`);
    console.log(`   - Successful: ${batchResult.successful}`);
    console.log(`   - Failed: ${batchResult.failed}`);
    console.log(`   - Duration: ${batchResult.completedAt.getTime() - batchResult.startedAt.getTime()}ms`);

    // 6. Demonstrate scoring model management
    console.log('\n6. Demonstrating scoring model management...');
    
    const defaultModel = await ScoringService.getScoringModel('default');
    console.log(`✅ Retrieved default model: "${defaultModel.name}"`);
    console.log(`   - Created: ${defaultModel.createdAt.toISOString()}`);
    console.log(`   - Is Active: ${defaultModel.isActive}`);
    console.log(`   - Is Default: ${defaultModel.isDefault}`);

    // 7. Get lead scores with filtering
    console.log('\n7. Demonstrating lead score filtering...');
    
    const hotLeads = await ScoringService.getLeadScores({
      scoreBand: ScoreBand.HOT,
      limit: 10
    });

    const warmLeads = await ScoringService.getLeadScores({
      scoreBand: ScoreBand.WARM,
      limit: 10
    });

    const coldLeads = await ScoringService.getLeadScores({
      scoreBand: ScoreBand.COLD,
      limit: 10
    });

    console.log(`🔥 HOT leads: ${hotLeads.scores.length}`);
    console.log(`🔶 WARM leads: ${warmLeads.scores.length}`);
    console.log(`🔵 COLD leads: ${coldLeads.scores.length}`);

    // 8. Demonstrate custom score band configuration
    console.log('\n8. Demonstrating custom score band configuration...');
    
    const customScoreBands = [
      {
        band: ScoreBand.HOT,
        minScore: 80,
        maxScore: 100,
        actions: [
          {
            type: 'assign_to_senior' as const,
            parameters: { priority: 'urgent', team: 'enterprise' }
          },
          {
            type: 'send_notification' as const,
            parameters: { type: 'immediate', recipients: ['sales-manager'] }
          }
        ]
      },
      {
        band: ScoreBand.WARM,
        minScore: 50,
        maxScore: 79,
        actions: [
          {
            type: 'set_priority' as const,
            parameters: { priority: 'high' }
          }
        ]
      },
      {
        band: ScoreBand.COLD,
        minScore: 0,
        maxScore: 49,
        actions: [
          {
            type: 'add_to_nurture' as const,
            parameters: { campaign: 'cold_lead_nurture', frequency: 'weekly' }
          }
        ]
      }
    ];

    const updatedBands = ScoringService.updateScoreBands(customScoreBands);
    console.log('✅ Updated score bands with custom configuration');
    console.log(`   - Total bands: ${updatedBands.length}`);

    // 9. Clean up demo data
    console.log('\n9. Cleaning up demo data...');
    
    await Lead.delete(highValueLead.id);
    await Lead.delete(mediumValueLead.id);
    await Lead.delete(lowValueLead.id);
    
    console.log('✅ Demo data cleaned up');

    console.log('\n🎉 Lead Scoring System Demo completed successfully!');
    console.log('\nKey Features Demonstrated:');
    console.log('✅ Configurable scoring criteria (profile fit, behavioral, recency, source, qualification)');
    console.log('✅ Weighted scoring algorithm with breakdown');
    console.log('✅ Score band management with automatic actions');
    console.log('✅ Batch score recalculation');
    console.log('✅ Behavioral activity tracking and scoring');
    console.log('✅ Scoring model management');
    console.log('✅ Lead score filtering and pagination');
    console.log('✅ Custom score band configuration');

  } catch (error) {
    console.error('❌ Demo failed:', error);
    throw error;
  }
}

// Run the demo if this file is executed directly
if (require.main === module) {
  runScoringDemo()
    .then(() => {
      console.log('\n✅ Demo completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Demo failed:', error);
      process.exit(1);
    });
}

export { runScoringDemo };