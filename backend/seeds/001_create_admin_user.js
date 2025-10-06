const bcrypt = require('bcryptjs');

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function(knex) {
  // Deletes ALL existing entries
  await knex('users').del();
  
  // Hash the default admin password
  const hashedPassword = await bcrypt.hash('Admin123!', 12);
  
  // Inserts seed entries
  await knex('users').insert([
    {
      id: knex.raw('gen_random_uuid()'),
      email: 'admin@leadmanagement.com',
      password: hashedPassword,
      first_name: 'System',
      last_name: 'Administrator',
      role: 'admin',
      is_active: true,
      profile_department: 'IT',
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: knex.raw('gen_random_uuid()'),
      email: 'manager@leadmanagement.com',
      password: await bcrypt.hash('Manager123!', 12),
      first_name: 'Sales',
      last_name: 'Manager',
      role: 'manager',
      is_active: true,
      profile_department: 'Sales',
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: knex.raw('gen_random_uuid()'),
      email: 'sales@leadmanagement.com',
      password: await bcrypt.hash('Sales123!', 12),
      first_name: 'Sales',
      last_name: 'Representative',
      role: 'sales',
      is_active: true,
      profile_department: 'Sales',
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: knex.raw('gen_random_uuid()'),
      email: 'marketing@leadmanagement.com',
      password: await bcrypt.hash('Marketing123!', 12),
      first_name: 'Marketing',
      last_name: 'Specialist',
      role: 'marketing',
      is_active: true,
      profile_department: 'Marketing',
      created_at: new Date(),
      updated_at: new Date()
    }
  ]);
};