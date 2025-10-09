import { knex } from '../config/database';
import { LeadService } from '../services/leadService';
import { LeadConversionService } from '../services/leadConversionService';
import { ConversionType, LeadStatus, OpportunityStage, CloseReason } from '../types';

async function runLeadConversionDemo() {
  console.log('🚀 Lead Conversion Demo Starting...\n');

  try {
    // Create a test user first
    const [testUser] = await knex('users').insert({
      email: 'demo@leadconversion.com',
      password: 'hashedpassword',
      first_name: 'Demo',
      last_name: 'User',
      role: 'sales',
      is_active: true
    }).returning('*');

    console.log('✅ Created demo user:', testUser.email);

    // 1. Create a qualified lead
    console.log('\n📝 Creating a qualified lead...');
    const lead = await LeadService.createLead({
      company: {
        name: 'TechCorp Solutions',
        industry: 'Technology',
        size: 'medium'
      },
      contact: {
        name: 'Sarah Johnson',
        email: 'sarah.johnson@techcorp.com',
        phone: '+1-555-0123',
        mobile: '+1-555-0124'
      },
      source: {
        channel: 'web_form',
        campaign: 'Q4-2024-Enterprise'
      },
      assignment: {
        assignedTo: testUser.id,
        assignmentReason: 'Territory match'
      },
      status: 'qualified',
      qualification: {
        interest: 'high',
        budget: 'confirmed',
        timeline: 'within_quarter',
        businessType: 'b2b'
      },
      followUp: {
        nextDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        notes: 'Interested in enterprise software solution'
      },
      product: {
        type: 'software',
        adType: 'google_ads'
      },
      createdBy: testUser.id
    });

    console.log('✅ Created lead:', lead.accountLeadId, '-', lead.company.name);

    // 2. Generate conversion preview
    console.log('\n🔍 Generating conversion preview...');
    const preview = await LeadConversionService.generateConversionPreview(lead.id);
    
    console.log('📊 Conversion Preview:');
    console.log('  - Suggested Account Name:', preview.suggestedAccountName);
    console.log('  - Suggested Contact Name:', preview.suggestedContactName);
    console.log('  - Suggested Opportunity Name:', preview.suggestedOpportunityName);
    console.log('  - Duplicate Accounts Found:', preview.duplicateAccounts.length);
    console.log('  - Duplicate Contacts Found:', preview.duplicateContacts.length);
    console.log('  - Warnings:', preview.warnings.length);

    if (preview.warnings.length > 0) {
      console.log('⚠️  Warnings:');
      preview.warnings.forEach(warning => console.log('    -', warning));
    }

    // 3. Perform full conversion
    console.log('\n🔄 Converting lead to Account + Contact + Opportunity...');
    const conversionResult = await LeadConversionService.convertLead({
      leadId: lead.id,
      conversionType: ConversionType.FULL,
      accountData: {
        name: 'TechCorp Solutions Inc.',
        industry: 'Technology',
        size: 'medium',
        website: 'https://techcorp-solutions.com',
        phone: '+1-555-0100',
        address: '123 Tech Street',
        city: 'San Francisco',
        state: 'CA',
        country: 'USA',
        postalCode: '94105',
        description: 'Leading technology solutions provider'
      },
      contactData: {
        firstName: 'Sarah',
        lastName: 'Johnson',
        email: 'sarah.johnson@techcorp.com',
        phone: '+1-555-0123',
        mobile: '+1-555-0124',
        title: 'CTO',
        department: 'Technology',
        isPrimary: true,
        isDecisionMaker: true
      },
      opportunityData: {
        name: 'TechCorp - Enterprise Software Solution',
        stage: OpportunityStage.QUALIFICATION,
        amount: 150000,
        currency: 'USD',
        probability: 75,
        expectedCloseDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        description: 'Enterprise software solution for workflow automation'
      },
      notes: 'Converted from highly qualified lead with confirmed budget',
      convertedBy: testUser.id
    });

    console.log('✅ Conversion completed successfully!');
    console.log('📈 Results:');
    console.log('  - Account Created:', conversionResult.account?.name, '(ID:', conversionResult.account?.id, ')');
    console.log('  - Contact Created:', `${conversionResult.contact?.firstName} ${conversionResult.contact?.lastName}`, '(ID:', conversionResult.contact?.id, ')');
    console.log('  - Opportunity Created:', conversionResult.opportunity?.name, '(ID:', conversionResult.opportunity?.id, ')');
    console.log('  - Conversion Type:', conversionResult.leadConversion.conversionType);
    console.log('  - Lead Status Updated to:', LeadStatus.WON);

    if (conversionResult.warnings && conversionResult.warnings.length > 0) {
      console.log('⚠️  Conversion Warnings:');
      conversionResult.warnings.forEach(warning => console.log('    -', warning));
    }

    // 4. Create another lead for closure demo
    console.log('\n📝 Creating another lead for closure demo...');
    const lead2 = await LeadService.createLead({
      company: {
        name: 'StartupXYZ',
        industry: 'Fintech',
        size: 'startup'
      },
      contact: {
        name: 'Mike Chen',
        email: 'mike@startupxyz.com',
        phone: '+1-555-0200'
      },
      source: {
        channel: 'referral',
        campaign: 'Partner-Referral'
      },
      status: 'proposal',
      qualification: {
        interest: 'medium',
        budget: 'estimated',
        timeline: 'within_month',
        businessType: 'b2b'
      },
      createdBy: testUser.id
    });

    console.log('✅ Created second lead:', lead2.accountLeadId, '-', lead2.company.name);

    // 5. Close lead as lost
    console.log('\n❌ Closing lead as lost...');
    const closedLead = await LeadConversionService.closeLead({
      leadId: lead2.id,
      status: LeadStatus.LOST,
      closeReason: CloseReason.LOST_BUDGET,
      closeNotes: 'Budget was reallocated to other priorities',
      closedBy: testUser.id
    });

    console.log('✅ Lead closed successfully');
    console.log('📊 Closure Details:');
    console.log('  - Final Status:', closedLead.status);
    console.log('  - Close Reason:', CloseReason.LOST_BUDGET);
    console.log('  - Close Notes: Budget was reallocated to other priorities');

    // 6. Get conversion history
    console.log('\n📚 Getting conversion history...');
    const conversionHistory = await LeadConversionService.getLeadConversionHistory(lead.id);
    
    console.log('📋 Conversion History for', lead.accountLeadId, ':');
    conversionHistory.forEach((conversion, index) => {
      console.log(`  ${index + 1}. Type: ${conversion.conversionType}`);
      console.log(`     Date: ${conversion.metadata.createdAt.toISOString()}`);
      console.log(`     Converted by: ${conversion.metadata.convertedBy}`);
      if (conversion.accountId) console.log(`     Account ID: ${conversion.accountId}`);
      if (conversion.contactId) console.log(`     Contact ID: ${conversion.contactId}`);
      if (conversion.opportunityId) console.log(`     Opportunity ID: ${conversion.opportunityId}`);
      if (conversion.notes) console.log(`     Notes: ${conversion.notes}`);
    });

    // 7. Get conversion statistics
    console.log('\n📊 Getting conversion statistics...');
    const statistics = await LeadConversionService.getConversionStatistics();
    
    console.log('📈 Conversion Statistics:');
    console.log('  - Total Conversions:', statistics.totalConversions);
    console.log('  - Conversion Rate:', statistics.conversionRate.toFixed(2) + '%');
    console.log('  - Recent Conversions (30 days):', statistics.recentConversions);
    console.log('  - Average Time to Conversion:', statistics.averageTimeToConversion, 'days');
    console.log('  - Conversions by Type:');
    Object.entries(statistics.conversionsByType).forEach(([type, count]) => {
      console.log(`    - ${type}: ${count}`);
    });

    // 8. Demonstrate account-only conversion
    console.log('\n📝 Creating lead for account-only conversion...');
    const lead3 = await LeadService.createLead({
      company: {
        name: 'Global Enterprises Ltd',
        industry: 'Manufacturing',
        size: 'large'
      },
      contact: {
        name: 'Jennifer Smith',
        email: 'j.smith@globalent.com'
      },
      source: {
        channel: 'event',
        campaign: 'Trade-Show-2024'
      },
      status: 'contacted',
      createdBy: testUser.id
    });

    console.log('✅ Created third lead:', lead3.accountLeadId, '-', lead3.company.name);

    console.log('\n🏢 Converting to account only...');
    const accountOnlyResult = await LeadConversionService.convertLead({
      leadId: lead3.id,
      conversionType: ConversionType.ACCOUNT_ONLY,
      accountData: {
        name: 'Global Enterprises Ltd',
        industry: 'Manufacturing',
        size: 'large',
        website: 'https://globalenterprises.com',
        description: 'Large manufacturing company with global operations'
      },
      notes: 'Account-only conversion for future opportunities',
      convertedBy: testUser.id
    });

    console.log('✅ Account-only conversion completed!');
    console.log('🏢 Account Created:', accountOnlyResult.account?.name);
    console.log('❌ Contact Created: None (account-only conversion)');
    console.log('❌ Opportunity Created: None (account-only conversion)');

    console.log('\n🎉 Lead Conversion Demo completed successfully!');
    console.log('\n📋 Summary:');
    console.log('  - Created 3 test leads');
    console.log('  - Performed 1 full conversion (Account + Contact + Opportunity)');
    console.log('  - Performed 1 account-only conversion');
    console.log('  - Closed 1 lead as lost');
    console.log('  - Demonstrated conversion preview functionality');
    console.log('  - Retrieved conversion history and statistics');

  } catch (error) {
    console.error('❌ Demo failed:', error);
    throw error;
  }
}

// Run the demo if this file is executed directly
if (require.main === module) {
  runLeadConversionDemo()
    .then(() => {
      console.log('\n✅ Demo completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Demo failed:', error);
      process.exit(1);
    });
}

export { runLeadConversionDemo };