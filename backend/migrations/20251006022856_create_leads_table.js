/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('leads', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('account_lead_id').notNullable().unique(); // AL-YY-MM-XXX format
    
    // Company information
    table.string('company_name').notNullable();
    table.uuid('company_id').nullable().references('id').inTable('companies');
    table.string('company_industry').nullable();
    table.enum('company_size', ['startup', 'small', 'medium', 'large', 'enterprise']).nullable();
    
    // Contact information
    table.string('contact_name').notNullable();
    table.string('contact_phone').nullable();
    table.string('contact_mobile').nullable();
    table.string('contact_email').notNullable();
    
    // Source information
    table.enum('source_channel', [
      'web_form', 'email', 'phone', 'chat', 'event', 'referral', 
      'vendor_list', 'social_media', 'paid_ads', 'organic_search'
    ]).notNullable();
    table.string('source_campaign').nullable();
    table.jsonb('source_utm_params').nullable();
    
    // Assignment information
    table.uuid('assigned_to').nullable().references('id').inTable('users');
    table.timestamp('assigned_at').nullable();
    table.string('assignment_reason').nullable();
    
    // Status and scoring
    table.enum('status', [
      'new', 'contacted', 'qualified', 'proposal', 'negotiation', 
      'won', 'lost', 'disqualified', 'nurture'
    ]).defaultTo('new');
    table.integer('score_value').defaultTo(0);
    table.enum('score_band', ['hot', 'warm', 'cold']).defaultTo('cold');
    table.timestamp('score_last_calculated').defaultTo(knex.fn.now());
    
    // Qualification information
    table.enum('qualification_interest', ['high', 'medium', 'low']).nullable();
    table.enum('qualification_budget', ['confirmed', 'estimated', 'unknown']).nullable();
    table.enum('qualification_timeline', [
      'immediate', 'within_month', 'within_quarter', 'within_year', 'unknown'
    ]).nullable();
    table.enum('qualification_business_type', ['b2b', 'b2c']).nullable();
    
    // Follow-up information
    table.timestamp('follow_up_next_date').nullable();
    table.text('follow_up_notes').nullable();
    
    // Product information
    table.enum('product_type', ['software', 'hardware', 'service', 'consulting']).nullable();
    table.enum('product_ad_type', [
      'google_ads', 'facebook_ads', 'linkedin_ads', 'display', 'video'
    ]).nullable();
    
    // Custom fields and metadata
    table.jsonb('custom_fields').nullable();
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
    table.uuid('created_by').notNullable().references('id').inTable('users');
    
    // Indexes
    table.index('account_lead_id');
    table.index('contact_email');
    table.index('company_name');
    table.index('source_channel');
    table.index('assigned_to');
    table.index('status');
    table.index('score_band');
    table.index('is_active');
    table.index('created_at');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('leads');
};
