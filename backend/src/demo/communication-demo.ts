import { CommunicationService } from '../services/communicationService';
import { EmailTemplateType, CommunicationType, CommunicationDirection } from '../types';

/**
 * Demo script showcasing the Communication and Email Integration functionality
 * This demonstrates the key features implemented in Task 9
 */

async function runCommunicationDemo() {
  console.log('🚀 Starting Communication and Email Integration Demo\n');

  // Initialize communication service with demo configuration
  const emailConfig = {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER || 'demo@example.com',
      pass: process.env.SMTP_PASS || 'demo-password'
    }
  };

  const communicationService = new CommunicationService({ email: emailConfig });

  try {
    // Demo 1: Email Template Management
    console.log('📧 Demo 1: Email Template Management');
    console.log('=====================================');

    // Create welcome email template
    const welcomeTemplate = await communicationService.createEmailTemplate({
      name: 'Welcome Email',
      subject: 'Welcome to our service, {{lead_name}}!',
      body: `
        <h1>Welcome {{lead_name}}!</h1>
        <p>Thank you for your interest in our services at {{company_name}}.</p>
        <p>We're excited to help you achieve your goals.</p>
        <p>Best regards,<br>{{sender_name}}</p>
      `,
      type: EmailTemplateType.WELCOME,
      createdBy: 'demo-user-1'
    });

    console.log('✅ Created welcome email template:', {
      id: welcomeTemplate.id,
      name: welcomeTemplate.name,
      variables: welcomeTemplate.variables
    });

    // Create follow-up email template
    const followUpTemplate = await communicationService.createEmailTemplate({
      name: 'Follow-up Email',
      subject: 'Following up on our conversation - {{company_name}}',
      body: `
        <p>Hi {{lead_name}},</p>
        <p>I wanted to follow up on our recent conversation about {{product_type}}.</p>
        <p>Based on your {{business_type}} needs, I believe we can provide significant value.</p>
        <p>Would you be available for a quick call this week?</p>
        <p>Best regards,<br>{{sender_name}}<br>{{sender_department}}</p>
      `,
      type: EmailTemplateType.FOLLOW_UP,
      createdBy: 'demo-user-1'
    });

    console.log('✅ Created follow-up email template:', {
      id: followUpTemplate.id,
      name: followUpTemplate.name,
      variables: followUpTemplate.variables
    });

    // Get all templates
    const allTemplates = await communicationService.getEmailTemplates();
    console.log(`✅ Retrieved ${allTemplates.length} email templates\n`);

    // Demo 2: Email Sending (Simulated)
    console.log('📤 Demo 2: Email Sending');
    console.log('========================');

    console.log('📝 Simulating email send (would require actual SMTP configuration):');
    
    const emailRequest = {
      leadId: 'demo-lead-1',
      templateId: welcomeTemplate.id,
      variables: {
        lead_name: 'John Doe',
        company_name: 'Acme Corp',
        sender_name: 'Alice Smith',
        sender_department: 'Sales'
      },
      sentBy: 'demo-user-1'
    };

    console.log('Email request:', emailRequest);
    console.log('⚠️  Email sending skipped in demo (requires SMTP configuration)\n');

    // Demo 3: Communication History Logging
    console.log('📋 Demo 3: Communication History Logging');
    console.log('========================================');

    // Log email communication
    const emailCommunication = await communicationService.logCommunication({
      leadId: 'demo-lead-1',
      type: CommunicationType.EMAIL,
      direction: CommunicationDirection.OUTBOUND,
      subject: 'Welcome to our service, John Doe!',
      content: 'Sent welcome email using template',
      metadata: {
        templateId: welcomeTemplate.id,
        messageId: 'demo-msg-123',
        to: 'john.doe@acme.com'
      },
      performedBy: 'demo-user-1'
    });

    console.log('✅ Logged email communication:', {
      id: emailCommunication.id,
      type: emailCommunication.type,
      direction: emailCommunication.direction
    });

    // Log phone call communication
    const phoneCommunication = await communicationService.logCommunication({
      leadId: 'demo-lead-1',
      type: CommunicationType.PHONE,
      direction: CommunicationDirection.OUTBOUND,
      subject: 'Follow-up call',
      content: 'Discussed pricing and implementation timeline. Lead is interested in premium package.',
      metadata: {
        duration: 900, // 15 minutes
        outcome: 'positive',
        nextSteps: 'Send proposal'
      },
      performedBy: 'demo-user-1'
    });

    console.log('✅ Logged phone communication:', {
      id: phoneCommunication.id,
      type: phoneCommunication.type,
      direction: phoneCommunication.direction
    });

    // Get communication history
    const history = await communicationService.getCommunicationHistory('demo-lead-1');
    console.log(`✅ Retrieved ${history.length} communication records for lead\n`);

    // Demo 4: Follow-up Scheduling
    console.log('📅 Demo 4: Follow-up Scheduling');
    console.log('===============================');

    const followUpResult = await communicationService.scheduleFollowUp({
      leadId: 'demo-lead-1',
      title: 'Product Demo Meeting',
      description: 'Demonstrate key features and discuss implementation',
      startTime: new Date('2024-01-20T14:00:00Z'),
      endTime: new Date('2024-01-20T15:00:00Z'),
      attendees: ['john.doe@acme.com', 'alice.smith@company.com'],
      organizer: 'demo-user-1',
      createTask: true
    });

    console.log('✅ Scheduled follow-up meeting:', {
      success: followUpResult.success,
      taskId: followUpResult.taskId,
      eventId: followUpResult.eventId || 'No calendar integration'
    });

    // Demo 5: Follow-up Email Sequence
    console.log('📬 Demo 5: Follow-up Email Sequence');
    console.log('===================================');

    const sequenceTasks = await communicationService.createFollowUpSequence({
      leadId: 'demo-lead-1',
      templateIds: [welcomeTemplate.id, followUpTemplate.id],
      intervals: [1, 3], // 1 day, then 3 days later
      startDate: new Date('2024-01-15'),
      createdBy: 'demo-user-1'
    });

    console.log(`✅ Created follow-up sequence with ${sequenceTasks.length} tasks:`);
    sequenceTasks.forEach((task, index) => {
      console.log(`   ${index + 1}. ${task.subject} (Due: ${task.dueDate})`);
    });

    // Demo 6: Communication Analytics
    console.log('\n📊 Demo 6: Communication Analytics');
    console.log('==================================');

    const commStats = await communicationService.getCommunicationStats('demo-lead-1');
    console.log('✅ Communication statistics:', {
      total: commStats.total,
      byType: commStats.byType,
      byDirection: commStats.byDirection
    });

    // Demo 7: Inbound Email Processing (Simulated)
    console.log('\n📨 Demo 7: Inbound Email Processing');
    console.log('===================================');

    const inboundResult = await communicationService.processInboundEmail({
      from: 'john.doe@acme.com',
      to: 'sales@company.com',
      subject: 'Re: Welcome to our service, John Doe!',
      body: 'Thank you for the welcome email. I\'m interested in learning more about your premium package.',
      messageId: 'inbound-msg-456',
      inReplyTo: 'demo-msg-123',
      receivedAt: new Date(),
      attachments: []
    });

    console.log('✅ Processed inbound email:', {
      success: inboundResult.success,
      leadId: inboundResult.leadId || 'No matching lead found'
    });

    console.log('\n🎉 Communication Demo completed successfully!');
    console.log('\nKey Features Demonstrated:');
    console.log('• ✅ Email template system with variable substitution');
    console.log('• ✅ Email sending functionality (simulated)');
    console.log('• ✅ Inbound email processing and lead association');
    console.log('• ✅ Communication history tracking');
    console.log('• ✅ Calendar integration for follow-up scheduling');
    console.log('• ✅ Automated follow-up sequences');
    console.log('• ✅ Communication analytics and reporting');

  } catch (error) {
    console.error('❌ Demo failed:', error);
    throw error;
  }
}

// Export for use in other scripts
export { runCommunicationDemo };

// Run demo if this file is executed directly
if (require.main === module) {
  runCommunicationDemo()
    .then(() => {
      console.log('\n✅ Demo completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Demo failed:', error);
      process.exit(1);
    });
}