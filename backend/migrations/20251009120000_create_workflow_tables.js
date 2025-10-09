/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    .createTable('workflows', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('name').notNullable();
      table.text('description');
      table.jsonb('trigger').notNullable();
      table.jsonb('actions').notNullable();
      table.boolean('is_active').defaultTo(true);
      table.integer('priority').defaultTo(0);
      table.uuid('created_by').notNullable();
      table.timestamp('last_executed');
      table.integer('execution_count').defaultTo(0);
      table.timestamps(true, true);
      
      table.foreign('created_by').references('id').inTable('users');
      table.index(['is_active', 'priority']);
    })
    .createTable('workflow_executions', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('workflow_id').notNullable();
      table.uuid('lead_id').notNullable();
      table.uuid('triggered_by').notNullable();
      table.enum('status', ['pending', 'running', 'completed', 'failed', 'cancelled']).defaultTo('pending');
      table.jsonb('context').defaultTo('{}');
      table.timestamp('started_at').defaultTo(knex.fn.now());
      table.timestamp('completed_at');
      table.text('error');
      table.jsonb('executed_actions').defaultTo('[]');
      table.timestamps(true, true);
      
      table.foreign('workflow_id').references('id').inTable('workflows');
      table.foreign('lead_id').references('id').inTable('leads');
      table.foreign('triggered_by').references('id').inTable('users');
      table.index(['workflow_id', 'status']);
      table.index(['lead_id', 'status']);
    })
    .createTable('approval_requests', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('workflow_execution_id').notNullable();
      table.uuid('lead_id').notNullable();
      table.uuid('requested_by').notNullable();
      table.string('approver_role').notNullable();
      table.uuid('approver');
      table.enum('status', ['pending', 'approved', 'rejected', 'expired']).defaultTo('pending');
      table.jsonb('request_data').notNullable();
      table.text('reason');
      table.timestamp('responded_at');
      table.timestamp('expires_at').notNullable();
      table.timestamps(true, true);
      
      table.foreign('workflow_execution_id').references('id').inTable('workflow_executions');
      table.foreign('lead_id').references('id').inTable('leads');
      table.foreign('requested_by').references('id').inTable('users');
      table.foreign('approver').references('id').inTable('users');
      table.index(['status', 'expires_at']);
      table.index(['approver_role', 'status']);
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('approval_requests')
    .dropTableIfExists('workflow_executions')
    .dropTableIfExists('workflows');
};