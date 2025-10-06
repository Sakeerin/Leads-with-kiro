/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('activities', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('lead_id').notNullable().references('id').inTable('leads').onDelete('CASCADE');
    table.enum('type', [
      'lead_created', 'lead_updated', 'lead_assigned', 'lead_reassigned',
      'status_changed', 'score_updated', 'email_sent', 'email_received',
      'call_made', 'meeting_scheduled', 'task_created', 'task_completed',
      'note_added', 'file_uploaded'
    ]).notNullable();
    table.string('subject').notNullable();
    table.jsonb('details').notNullable();
    table.uuid('performed_by').notNullable().references('id').inTable('users');
    table.timestamp('performed_at').defaultTo(knex.fn.now());
    table.jsonb('related_entities').nullable();
    
    // Indexes
    table.index('lead_id');
    table.index('type');
    table.index('performed_by');
    table.index('performed_at');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('activities');
};
