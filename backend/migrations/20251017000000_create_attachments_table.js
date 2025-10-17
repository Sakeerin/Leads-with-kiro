/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('attachments', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('lead_id').notNullable();
    table.string('filename').notNullable();
    table.string('original_filename').notNullable();
    table.string('content_type').notNullable();
    table.bigInteger('size').notNullable();
    table.string('storage_path').notNullable();
    table.string('storage_provider').notNullable().defaultTo('s3');
    table.string('bucket_name');
    table.string('file_hash').notNullable(); // For integrity verification
    table.boolean('virus_scanned').defaultTo(false);
    table.boolean('virus_clean').defaultTo(null);
    table.string('scan_result');
    table.json('metadata'); // Additional file metadata
    table.uuid('uploaded_by').notNullable();
    table.timestamp('uploaded_at').defaultTo(knex.fn.now());
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.boolean('is_active').defaultTo(true);

    // Foreign key constraints
    table.foreign('lead_id').references('id').inTable('leads').onDelete('CASCADE');
    table.foreign('uploaded_by').references('id').inTable('users').onDelete('RESTRICT');

    // Indexes
    table.index(['lead_id']);
    table.index(['uploaded_by']);
    table.index(['content_type']);
    table.index(['virus_scanned', 'virus_clean']);
    table.index(['created_at']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('attachments');
};