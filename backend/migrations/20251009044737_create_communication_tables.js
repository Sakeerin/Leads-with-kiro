/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return Promise.all([
    // Email Templates table
    knex.schema.createTable('email_templates', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('name').notNullable();
      table.string('subject').notNullable();
      table.text('body').notNullable();
      table.enum('type', ['welcome', 'follow_up', 'proposal', 'meeting_invitation', 'thank_you', 'nurture', 'reminder', 'custom']).notNullable();
      table.json('variables').defaultTo('[]');
      table.boolean('is_active').defaultTo(true);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.uuid('created_by').notNullable().references('id').inTable('users');
      
      table.index(['type', 'is_active']);
      table.index('created_by');
    }),

    // Email Logs table
    knex.schema.createTable('email_logs', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('lead_id').notNullable().references('id').inTable('leads');
      table.uuid('template_id').nullable().references('id').inTable('email_templates');
      table.string('to_email').notNullable();
      table.string('cc_email').nullable();
      table.string('bcc_email').nullable();
      table.string('subject').notNullable();
      table.text('body').notNullable();
      table.enum('status', ['draft', 'queued', 'sending', 'sent', 'delivered', 'opened', 'clicked', 'replied', 'bounced', 'failed']).defaultTo('draft');
      table.timestamp('sent_at').nullable();
      table.timestamp('delivered_at').nullable();
      table.timestamp('opened_at').nullable();
      table.timestamp('clicked_at').nullable();
      table.timestamp('replied_at').nullable();
      table.timestamp('bounced_at').nullable();
      table.text('error_message').nullable();
      table.string('message_id').nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.uuid('sent_by').notNullable().references('id').inTable('users');
      
      table.index(['lead_id', 'status']);
      table.index(['status', 'created_at']);
      table.index('message_id');
      table.index('sent_by');
    }),

    // Inbound Emails table
    knex.schema.createTable('inbound_emails', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('lead_id').nullable().references('id').inTable('leads');
      table.string('from_email').notNullable();
      table.string('to_email').notNullable();
      table.string('subject').notNullable();
      table.text('body').notNullable();
      table.text('html_body').nullable();
      table.string('message_id').notNullable().unique();
      table.string('in_reply_to').nullable();
      table.text('references').nullable();
      table.timestamp('received_at').notNullable();
      table.boolean('processed').defaultTo(false);
      table.timestamp('processed_at').nullable();
      table.json('attachments').nullable();
      
      table.index(['from_email', 'received_at']);
      table.index(['lead_id', 'received_at']);
      table.index(['processed', 'received_at']);
      table.index('message_id');
    }),

    // Calendar Events table
    knex.schema.createTable('calendar_events', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('lead_id').notNullable().references('id').inTable('leads');
      table.uuid('task_id').nullable().references('id').inTable('tasks');
      table.string('title').notNullable();
      table.text('description').nullable();
      table.timestamp('start_time').notNullable();
      table.timestamp('end_time').notNullable();
      table.string('location').nullable();
      table.json('attendees').defaultTo('[]');
      table.uuid('organizer').notNullable().references('id').inTable('users');
      table.enum('status', ['tentative', 'confirmed', 'cancelled']).defaultTo('tentative');
      table.string('external_event_id').nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      
      table.index(['lead_id', 'start_time']);
      table.index(['organizer', 'start_time']);
      table.index('external_event_id');
    }),

    // Communication History table
    knex.schema.createTable('communication_history', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('lead_id').notNullable().references('id').inTable('leads');
      table.enum('type', ['email', 'phone', 'sms', 'whatsapp', 'line', 'meeting', 'note']).notNullable();
      table.enum('direction', ['inbound', 'outbound']).notNullable();
      table.string('subject').nullable();
      table.text('content').notNullable();
      table.json('metadata').defaultTo('{}');
      table.uuid('performed_by').notNullable().references('id').inTable('users');
      table.timestamp('performed_at').notNullable();
      table.uuid('related_email_id').nullable().references('id').inTable('email_logs');
      table.uuid('related_task_id').nullable().references('id').inTable('tasks');
      
      table.index(['lead_id', 'performed_at']);
      table.index(['type', 'direction']);
      table.index('performed_by');
    })
  ]);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return Promise.all([
    knex.schema.dropTableIfExists('communication_history'),
    knex.schema.dropTableIfExists('calendar_events'),
    knex.schema.dropTableIfExists('inbound_emails'),
    knex.schema.dropTableIfExists('email_logs'),
    knex.schema.dropTableIfExists('email_templates')
  ]);
};
