/**
 * Security and compliance related database tables
 */

exports.up = function(knex) {
  return Promise.all([
    // Audit logs table
    knex.schema.createTable('audit_logs', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('userId').nullable();
      table.string('action', 100).notNullable();
      table.string('resource', 100).notNullable();
      table.uuid('resourceId').nullable();
      table.text('details').nullable(); // JSON string
      table.string('ipAddress', 45).nullable(); // IPv6 compatible
      table.text('userAgent').nullable();
      table.timestamp('timestamp').notNullable().defaultTo(knex.fn.now());
      table.enum('severity', ['low', 'medium', 'high', 'critical']).notNullable();
      table.enum('category', ['authentication', 'authorization', 'data_access', 'data_modification', 'system', 'security']).notNullable();
      table.boolean('success').notNullable();
      table.text('errorMessage').nullable();
      
      // Indexes for performance
      table.index(['userId', 'timestamp']);
      table.index(['action', 'timestamp']);
      table.index(['resource', 'timestamp']);
      table.index(['category', 'severity', 'timestamp']);
      table.index(['timestamp']);
      
      // Foreign key
      table.foreign('userId').references('id').inTable('users').onDelete('SET NULL');
    }),

    // Consent records table for GDPR compliance
    knex.schema.createTable('consent_records', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('userId').nullable();
      table.uuid('leadId').nullable();
      table.string('email', 255).notNullable();
      table.enum('consentType', ['marketing', 'analytics', 'functional', 'data_processing']).notNullable();
      table.boolean('consentGiven').notNullable();
      table.timestamp('consentDate').notNullable().defaultTo(knex.fn.now());
      table.enum('consentMethod', ['explicit', 'implicit', 'legitimate_interest']).notNullable();
      table.string('ipAddress', 45).nullable();
      table.text('userAgent').nullable();
      table.timestamp('withdrawalDate').nullable();
      table.text('withdrawalReason').nullable();
      
      // Indexes
      table.index(['email', 'consentType']);
      table.index(['consentDate']);
      table.index(['userId']);
      
      // Foreign keys
      table.foreign('userId').references('id').inTable('users').onDelete('SET NULL');
      table.foreign('leadId').references('id').inTable('leads').onDelete('SET NULL');
    }),

    // Data export requests table
    knex.schema.createTable('data_export_requests', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('userId').nullable();
      table.string('email', 255).notNullable();
      table.timestamp('requestDate').notNullable().defaultTo(knex.fn.now());
      table.enum('status', ['pending', 'processing', 'completed', 'failed']).notNullable().defaultTo('pending');
      table.timestamp('completedDate').nullable();
      table.string('downloadUrl', 500).nullable();
      table.timestamp('expiryDate').nullable();
      table.string('requestedBy', 255).notNullable();
      table.string('ipAddress', 45).nullable();
      
      // Indexes
      table.index(['email', 'status']);
      table.index(['requestDate']);
      table.index(['status']);
      
      // Foreign key
      table.foreign('userId').references('id').inTable('users').onDelete('SET NULL');
    }),

    // Data deletion requests table
    knex.schema.createTable('data_deletion_requests', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('userId').nullable();
      table.string('email', 255).notNullable();
      table.timestamp('requestDate').notNullable().defaultTo(knex.fn.now());
      table.enum('status', ['pending', 'processing', 'completed', 'failed']).notNullable().defaultTo('pending');
      table.timestamp('completedDate').nullable();
      table.enum('deletionType', ['full', 'anonymization', 'retention_only']).notNullable();
      table.text('reason').nullable();
      table.string('requestedBy', 255).notNullable();
      table.string('ipAddress', 45).nullable();
      table.timestamp('retentionUntil').nullable();
      
      // Indexes
      table.index(['email', 'status']);
      table.index(['requestDate']);
      table.index(['status']);
      
      // Foreign key
      table.foreign('userId').references('id').inTable('users').onDelete('SET NULL');
    }),

    // MFA devices table
    knex.schema.createTable('mfa_devices', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('userId').notNullable();
      table.string('deviceName', 100).notNullable();
      table.enum('deviceType', ['totp', 'sms', 'email']).notNullable();
      table.string('secret', 255).nullable(); // For TOTP
      table.string('phoneNumber', 20).nullable(); // For SMS
      table.string('email', 255).nullable(); // For email
      table.boolean('isActive').notNullable().defaultTo(true);
      table.timestamp('createdAt').notNullable().defaultTo(knex.fn.now());
      table.timestamp('lastUsed').nullable();
      
      // Indexes
      table.index(['userId', 'isActive']);
      table.index(['userId']);
      
      // Foreign key
      table.foreign('userId').references('id').inTable('users').onDelete('CASCADE');
    }),

    // Backup codes table for MFA
    knex.schema.createTable('backup_codes', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('userId').notNullable();
      table.string('code', 255).notNullable(); // Hashed
      table.boolean('isUsed').notNullable().defaultTo(false);
      table.timestamp('createdAt').notNullable().defaultTo(knex.fn.now());
      table.timestamp('usedAt').nullable();
      
      // Indexes
      table.index(['userId', 'isUsed']);
      table.index(['code']); // For lookup
      
      // Foreign key
      table.foreign('userId').references('id').inTable('users').onDelete('CASCADE');
    }),

    // MFA codes table (for SMS/Email verification)
    knex.schema.createTable('mfa_codes', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('userId').notNullable();
      table.string('code', 255).notNullable(); // Hashed
      table.enum('type', ['sms', 'email']).notNullable();
      table.timestamp('expiresAt').notNullable();
      table.boolean('isUsed').notNullable().defaultTo(false);
      table.timestamp('createdAt').notNullable().defaultTo(knex.fn.now());
      table.timestamp('usedAt').nullable();
      
      // Indexes
      table.index(['userId', 'type', 'isUsed']);
      table.index(['code']);
      table.index(['expiresAt']);
      
      // Foreign key
      table.foreign('userId').references('id').inTable('users').onDelete('CASCADE');
    })
  ]).then(() => {
    // Add GDPR-related columns to existing tables
    return Promise.all([
      // Add MFA enabled flag to users table
      knex.schema.table('users', function(table) {
        table.boolean('mfaEnabled').notNullable().defaultTo(false);
      }),
      
      // Add GDPR retention fields to leads table
      knex.schema.table('leads', function(table) {
        table.boolean('gdprRetention').notNullable().defaultTo(false);
        table.timestamp('retentionUntil').nullable();
      })
    ]);
  });
};

exports.down = function(knex) {
  return Promise.all([
    // Remove added columns first
    knex.schema.table('users', function(table) {
      table.dropColumn('mfaEnabled');
    }),
    knex.schema.table('leads', function(table) {
      table.dropColumn('gdprRetention');
      table.dropColumn('retentionUntil');
    })
  ]).then(() => {
    // Drop tables in reverse order
    return Promise.all([
      knex.schema.dropTableIfExists('mfa_codes'),
      knex.schema.dropTableIfExists('backup_codes'),
      knex.schema.dropTableIfExists('mfa_devices'),
      knex.schema.dropTableIfExists('data_deletion_requests'),
      knex.schema.dropTableIfExists('data_export_requests'),
      knex.schema.dropTableIfExists('consent_records'),
      knex.schema.dropTableIfExists('audit_logs')
    ]);
  });
};