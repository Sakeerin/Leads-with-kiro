/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('companies', function(table) {
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
    table.timestamps(true, true);
    
    // Indexes
    table.index('name');
    table.index('industry');
    table.index('size');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('companies');
};
