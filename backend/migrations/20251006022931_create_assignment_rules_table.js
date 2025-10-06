/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('assignment_rules', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name').notNullable();
    table.integer('priority').notNullable();
    table.jsonb('conditions').notNullable();
    table.jsonb('actions').notNullable();
    table.boolean('is_active').defaultTo(true);
    table.jsonb('working_hours').nullable();
    table.jsonb('territories').nullable();
    table.timestamps(true, true);
    table.uuid('created_by').notNullable().references('id').inTable('users');
    
    // Indexes
    table.index('priority');
    table.index('is_active');
    table.index('name');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('assignment_rules');
};
