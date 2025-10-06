/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('tasks', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('lead_id').notNullable().references('id').inTable('leads').onDelete('CASCADE');
    table.string('subject').notNullable();
    table.text('description').nullable();
    table.enum('type', ['call', 'email', 'meeting', 'follow_up', 'research', 'proposal']).notNullable();
    table.enum('priority', ['low', 'medium', 'high', 'urgent']).defaultTo('medium');
    table.uuid('assigned_to').notNullable().references('id').inTable('users');
    table.timestamp('due_date').notNullable();
    table.enum('status', ['pending', 'in_progress', 'completed', 'cancelled']).defaultTo('pending');
    table.jsonb('reminders').nullable();
    table.timestamp('completed_at').nullable();
    table.timestamps(true, true);
    table.uuid('created_by').notNullable().references('id').inTable('users');
    
    // Indexes
    table.index('lead_id');
    table.index('assigned_to');
    table.index('status');
    table.index('due_date');
    table.index('priority');
    table.index('type');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('tasks');
};
