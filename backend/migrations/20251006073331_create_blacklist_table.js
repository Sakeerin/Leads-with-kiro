/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('blacklist', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.enum('type', ['email', 'phone', 'domain', 'company']).notNullable();
    table.string('value', 255).notNullable();
    table.enum('reason', [
      'spam', 
      'unsubscribed', 
      'bounced', 
      'complained', 
      'invalid', 
      'competitor', 
      'do_not_contact', 
      'gdpr_request', 
      'manual'
    ]).notNullable();
    table.text('notes');
    table.uuid('added_by').notNullable();
    table.uuid('removed_by');
    table.boolean('is_active').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('removed_at');

    // Indexes
    table.index(['type', 'value', 'is_active'], 'idx_blacklist_type_value_active');
    table.index(['is_active', 'created_at'], 'idx_blacklist_active_created');
    table.index(['added_by'], 'idx_blacklist_added_by');
    
    // Unique constraint for active entries
    table.unique(['type', 'value', 'is_active'], 'uq_blacklist_type_value_active');

    // Foreign key constraints
    table.foreign('added_by').references('id').inTable('users').onDelete('RESTRICT');
    table.foreign('removed_by').references('id').inTable('users').onDelete('RESTRICT');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('blacklist');
};
