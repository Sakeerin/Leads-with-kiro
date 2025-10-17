/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return Promise.all([
    // Import history table
    knex.schema.createTable('import_history', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('filename').notNullable();
      table.string('original_filename').notNullable();
      table.enum('file_type', ['csv', 'xlsx']).notNullable();
      table.integer('total_records').notNullable();
      table.integer('successful_records').notNullable();
      table.integer('failed_records').notNullable();
      table.integer('duplicate_records').notNullable();
      table.enum('status', ['processing', 'completed', 'failed', 'rolled_back']).notNullable();
      table.json('validation_errors').nullable();
      table.json('duplicate_report').nullable();
      table.json('field_mapping').nullable();
      table.string('imported_by').notNullable();
      table.string('rolled_back_by').nullable();
      table.timestamp('started_at').notNullable();
      table.timestamp('completed_at').nullable();
      table.timestamp('rolled_back_at').nullable();
      table.timestamps(true, true);
      
      table.index(['imported_by']);
      table.index(['status']);
      table.index(['started_at']);
    }),

    // Import records table (tracks individual records from imports)
    knex.schema.createTable('import_records', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('import_id').notNullable().references('id').inTable('import_history').onDelete('CASCADE');
      table.integer('row_number').notNullable();
      table.uuid('lead_id').nullable().references('id').inTable('leads').onDelete('SET NULL');
      table.enum('status', ['success', 'failed', 'duplicate', 'skipped']).notNullable();
      table.json('original_data').notNullable();
      table.json('processed_data').nullable();
      table.json('validation_errors').nullable();
      table.json('duplicate_matches').nullable();
      table.timestamps(true, true);
      
      table.index(['import_id']);
      table.index(['lead_id']);
      table.index(['status']);
    }),

    // Export history table
    knex.schema.createTable('export_history', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('filename').notNullable();
      table.enum('export_type', ['leads', 'reports', 'analytics']).notNullable();
      table.enum('file_format', ['csv', 'xlsx']).notNullable();
      table.integer('record_count').notNullable();
      table.json('filters_applied').nullable();
      table.json('columns_exported').nullable();
      table.string('file_path').nullable();
      table.integer('file_size').nullable();
      table.enum('status', ['processing', 'completed', 'failed']).notNullable();
      table.string('error_message').nullable();
      table.string('exported_by').notNullable();
      table.timestamp('started_at').notNullable();
      table.timestamp('completed_at').nullable();
      table.timestamps(true, true);
      
      table.index(['exported_by']);
      table.index(['export_type']);
      table.index(['status']);
      table.index(['started_at']);
    }),

    // Scheduled reports table
    knex.schema.createTable('scheduled_reports', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('name').notNullable();
      table.string('description').nullable();
      table.enum('report_type', ['leads', 'analytics', 'performance']).notNullable();
      table.enum('file_format', ['csv', 'xlsx', 'pdf']).notNullable();
      table.json('filters').nullable();
      table.json('columns').nullable();
      table.string('cron_schedule').notNullable(); // e.g., '0 9 * * 1' for every Monday at 9 AM
      table.json('email_recipients').notNullable(); // Array of email addresses
      table.string('email_subject').nullable();
      table.text('email_body').nullable();
      table.boolean('is_active').defaultTo(true);
      table.timestamp('last_run_at').nullable();
      table.timestamp('next_run_at').nullable();
      table.string('created_by').notNullable();
      table.timestamps(true, true);
      
      table.index(['is_active']);
      table.index(['next_run_at']);
      table.index(['created_by']);
    }),

    // Scheduled report executions table
    knex.schema.createTable('scheduled_report_executions', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('scheduled_report_id').notNullable().references('id').inTable('scheduled_reports').onDelete('CASCADE');
      table.enum('status', ['running', 'completed', 'failed']).notNullable();
      table.string('file_path').nullable();
      table.integer('record_count').nullable();
      table.string('error_message').nullable();
      table.timestamp('started_at').notNullable();
      table.timestamp('completed_at').nullable();
      table.timestamps(true, true);
      
      table.index(['scheduled_report_id']);
      table.index(['status']);
      table.index(['started_at']);
    })
  ]);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return Promise.all([
    knex.schema.dropTableIfExists('scheduled_report_executions'),
    knex.schema.dropTableIfExists('scheduled_reports'),
    knex.schema.dropTableIfExists('export_history'),
    knex.schema.dropTableIfExists('import_records'),
    knex.schema.dropTableIfExists('import_history')
  ]);
};