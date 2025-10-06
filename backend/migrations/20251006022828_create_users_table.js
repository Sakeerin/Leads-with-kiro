/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('users', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('email').notNullable().unique();
    table.string('password').notNullable();
    table.string('first_name').notNullable();
    table.string('last_name').notNullable();
    table.enum('role', ['admin', 'manager', 'sales', 'marketing', 'read_only', 'guest']).notNullable();
    table.boolean('is_active').defaultTo(true);
    table.timestamp('last_login_at').nullable();
    table.string('profile_phone').nullable();
    table.string('profile_department').nullable();
    table.string('profile_territory').nullable();
    table.jsonb('profile_working_hours').nullable();
    table.timestamps(true, true);
    
    // Indexes
    table.index('email');
    table.index('role');
    table.index('is_active');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('users');
};
