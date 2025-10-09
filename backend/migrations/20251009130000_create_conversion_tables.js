/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return Promise.all([
    // Create accounts table
    knex.schema.createTable('accounts', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('name').notNullable();
      table.string('industry').nullable();
      table.enum('size', ['startup', 'small', 'medium', 'large', 'enterprise']).nullable();
      table.string('website').nullable();
      table.string('phone').nullable();
      table.text('address').nullable();
      table.string('city').nullable();
      table.string('state').nullable();
      table.string('country').nullable();
      table.string('postal_code').nullable();
      table.text('description').nullable();
      table.jsonb('custom_fields').nullable();
      table.boolean('is_active').defaultTo(true);
      table.timestamps(true, true);
      table.uuid('created_by').notNullable().references('id').inTable('users');
      
      // Indexes
      table.index('name');
      table.index('industry');
      table.index('is_active');
      table.index('created_at');
    }),

    // Create contacts table
    knex.schema.createTable('contacts', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('account_id').notNullable().references('id').inTable('accounts').onDelete('CASCADE');
      table.string('first_name').notNullable();
      table.string('last_name').notNullable();
      table.string('email').notNullable();
      table.string('phone').nullable();
      table.string('mobile').nullable();
      table.string('title').nullable();
      table.string('department').nullable();
      table.boolean('is_primary').defaultTo(false);
      table.boolean('is_decision_maker').defaultTo(false);
      table.jsonb('custom_fields').nullable();
      table.boolean('is_active').defaultTo(true);
      table.timestamps(true, true);
      table.uuid('created_by').notNullable().references('id').inTable('users');
      
      // Indexes
      table.index('account_id');
      table.index('email');
      table.index(['first_name', 'last_name']);
      table.index('is_primary');
      table.index('is_active');
      table.index('created_at');
    }),

    // Create opportunities table
    knex.schema.createTable('opportunities', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('name').notNullable();
      table.uuid('account_id').notNullable().references('id').inTable('accounts').onDelete('CASCADE');
      table.uuid('primary_contact_id').nullable().references('id').inTable('contacts').onDelete('SET NULL');
      table.uuid('owner_id').notNullable().references('id').inTable('users');
      table.enum('stage', [
        'prospecting', 'qualification', 'needs_analysis', 'proposal', 
        'negotiation', 'closed_won', 'closed_lost'
      ]).defaultTo('prospecting');
      table.decimal('amount', 15, 2).nullable();
      table.string('currency', 3).defaultTo('USD');
      table.integer('probability').defaultTo(0); // 0-100
      table.date('expected_close_date').nullable();
      table.date('actual_close_date').nullable();
      table.enum('close_reason', [
        'won_new_business', 'won_expansion', 'won_renewal',
        'lost_competitor', 'lost_budget', 'lost_timing', 'lost_no_decision',
        'disqualified_not_fit', 'disqualified_budget', 'disqualified_authority'
      ]).nullable();
      table.text('close_notes').nullable();
      table.enum('lead_source', [
        'web_form', 'email', 'phone', 'chat', 'event', 'referral', 
        'vendor_list', 'social_media', 'paid_ads', 'organic_search'
      ]).nullable();
      table.string('campaign').nullable();
      table.text('description').nullable();
      table.jsonb('custom_fields').nullable();
      table.boolean('is_active').defaultTo(true);
      table.timestamps(true, true);
      table.uuid('created_by').notNullable().references('id').inTable('users');
      
      // Indexes
      table.index('account_id');
      table.index('primary_contact_id');
      table.index('owner_id');
      table.index('stage');
      table.index('expected_close_date');
      table.index('is_active');
      table.index('created_at');
    }),

    // Create lead_conversions table for audit trail
    knex.schema.createTable('lead_conversions', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('lead_id').notNullable().references('id').inTable('leads').onDelete('CASCADE');
      table.uuid('account_id').nullable().references('id').inTable('accounts').onDelete('SET NULL');
      table.uuid('contact_id').nullable().references('id').inTable('contacts').onDelete('SET NULL');
      table.uuid('opportunity_id').nullable().references('id').inTable('opportunities').onDelete('SET NULL');
      table.enum('conversion_type', ['full', 'account_only', 'contact_only']).notNullable();
      table.jsonb('lead_data_snapshot').notNullable(); // Snapshot of lead data at conversion
      table.jsonb('conversion_mapping').nullable(); // Field mapping details
      table.text('notes').nullable();
      table.timestamps(true, true);
      table.uuid('converted_by').notNullable().references('id').inTable('users');
      
      // Indexes
      table.index('lead_id');
      table.index('account_id');
      table.index('contact_id');
      table.index('opportunity_id');
      table.index('conversion_type');
      table.index('created_at');
    })
  ]);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return Promise.all([
    knex.schema.dropTable('lead_conversions'),
    knex.schema.dropTable('opportunities'),
    knex.schema.dropTable('contacts'),
    knex.schema.dropTable('accounts')
  ]);
};