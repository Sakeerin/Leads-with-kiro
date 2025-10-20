/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return Promise.all([
    // Custom fields configuration
    knex.schema.createTable('custom_fields', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('entity_type').notNullable(); // 'lead', 'account', 'contact', 'opportunity'
      table.string('field_name').notNullable();
      table.string('field_label').notNullable();
      table.string('field_label_th'); // Thai label
      table.string('field_type').notNullable(); // 'text', 'number', 'date', 'boolean', 'picklist', 'textarea'
      table.text('description');
      table.text('description_th'); // Thai description
      table.boolean('is_required').defaultTo(false);
      table.boolean('is_active').defaultTo(true);
      table.integer('display_order').defaultTo(0);
      table.json('validation_rules'); // JSON object with validation rules
      table.json('picklist_values'); // For picklist fields
      table.string('default_value');
      table.string('created_by').notNullable();
      table.timestamps(true, true);
      
      table.unique(['entity_type', 'field_name']);
      table.index(['entity_type', 'is_active']);
    }),

    // Picklist management
    knex.schema.createTable('picklist_values', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('picklist_type').notNullable(); // 'status', 'source', 'product_type', 'ad_type'
      table.string('value').notNullable();
      table.string('label').notNullable();
      table.string('label_th'); // Thai label
      table.text('description');
      table.text('description_th'); // Thai description
      table.string('color_code'); // For UI display
      table.string('icon'); // Icon class or name
      table.boolean('is_active').defaultTo(true);
      table.boolean('is_default').defaultTo(false);
      table.integer('display_order').defaultTo(0);
      table.json('metadata'); // Additional configuration
      table.string('created_by').notNullable();
      table.timestamps(true, true);
      
      table.unique(['picklist_type', 'value']);
      table.index(['picklist_type', 'is_active']);
    }),

    // Status workflow configuration
    knex.schema.createTable('status_workflows', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('entity_type').notNullable(); // 'lead', 'opportunity'
      table.string('name').notNullable();
      table.string('name_th'); // Thai name
      table.text('description');
      table.text('description_th'); // Thai description
      table.json('status_transitions'); // Allowed transitions between statuses
      table.json('transition_rules'); // Rules for automatic transitions
      table.boolean('is_active').defaultTo(true);
      table.boolean('is_default').defaultTo(false);
      table.string('created_by').notNullable();
      table.timestamps(true, true);
      
      table.index(['entity_type', 'is_active']);
    }),

    // Working hours configuration
    knex.schema.createTable('working_hours_config', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('name').notNullable();
      table.string('timezone').notNullable();
      table.json('schedule'); // Weekly schedule with working hours
      table.json('holidays'); // Holiday calendar
      table.text('description');
      table.boolean('is_active').defaultTo(true);
      table.boolean('is_default').defaultTo(false);
      table.string('created_by').notNullable();
      table.timestamps(true, true);
      
      table.index(['is_active', 'is_default']);
    }),

    // Holiday calendar
    knex.schema.createTable('holidays', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('name').notNullable();
      table.string('name_th'); // Thai name
      table.date('date').notNullable();
      table.string('type').notNullable(); // 'national', 'company', 'regional'
      table.text('description');
      table.text('description_th'); // Thai description
      table.boolean('is_recurring').defaultTo(false);
      table.string('recurrence_pattern'); // For recurring holidays
      table.boolean('is_active').defaultTo(true);
      table.string('created_by').notNullable();
      table.timestamps(true, true);
      
      table.index(['date', 'is_active']);
      table.index(['type', 'is_active']);
    }),

    // System configuration
    knex.schema.createTable('system_config', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('config_key').notNullable().unique();
      table.string('config_value');
      table.json('config_json'); // For complex configuration objects
      table.string('data_type').notNullable(); // 'string', 'number', 'boolean', 'json'
      table.text('description');
      table.text('description_th'); // Thai description
      table.string('category').notNullable(); // 'general', 'email', 'scoring', 'routing', etc.
      table.boolean('is_sensitive').defaultTo(false); // For passwords, API keys
      table.boolean('requires_restart').defaultTo(false);
      table.string('updated_by').notNullable();
      table.timestamps(true, true);
      
      table.index(['category']);
    })
  ]);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return Promise.all([
    knex.schema.dropTableIfExists('system_config'),
    knex.schema.dropTableIfExists('holidays'),
    knex.schema.dropTableIfExists('working_hours_config'),
    knex.schema.dropTableIfExists('status_workflows'),
    knex.schema.dropTableIfExists('picklist_values'),
    knex.schema.dropTableIfExists('custom_fields')
  ]);
};