import dotenv from 'dotenv';
import knex, { Knex } from 'knex';

dotenv.config();

interface DatabaseConfig {
  client: string;
  connection: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
  } | string;
  pool: {
    min: number;
    max: number;
  };
  migrations: {
    tableName: string;
    directory: string;
  };
  seeds: {
    directory: string;
  };
}

const environment = process.env['NODE_ENV'] || 'development';

const config: { [key: string]: DatabaseConfig } = {
  development: {
    client: 'postgresql',
    connection: {
      host: process.env['DATABASE_HOST'] || 'localhost',
      port: parseInt(process.env['DATABASE_PORT'] || '5432'),
      database: process.env['DATABASE_NAME'] || 'lead_management',
      user: process.env['DATABASE_USER'] || 'postgres',
      password: process.env['DATABASE_PASSWORD'] || 'postgres',
    },
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      tableName: 'knex_migrations',
      directory: './migrations'
    },
    seeds: {
      directory: './seeds'
    }
  },
  test: {
    client: 'postgresql',
    connection: {
      host: process.env['DATABASE_HOST'] || 'localhost',
      port: parseInt(process.env['DATABASE_PORT'] || '5432'),
      database: process.env['DATABASE_NAME'] || 'lead_management_test',
      user: process.env['DATABASE_USER'] || 'postgres',
      password: process.env['DATABASE_PASSWORD'] || 'postgres',
    },
    pool: {
      min: 1,
      max: 5
    },
    migrations: {
      tableName: 'knex_migrations',
      directory: './migrations'
    },
    seeds: {
      directory: './seeds'
    }
  },
  production: {
    client: 'postgresql',
    connection: process.env['DATABASE_URL'] || {
      host: process.env['DATABASE_HOST'] || 'localhost',
      port: parseInt(process.env['DATABASE_PORT'] || '5432'),
      database: process.env['DATABASE_NAME'] || 'lead_management',
      user: process.env['DATABASE_USER'] || 'postgres',
      password: process.env['DATABASE_PASSWORD'] || 'postgres',
    },
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      tableName: 'knex_migrations',
      directory: './migrations'
    },
    seeds: {
      directory: './seeds'
    }
  }
};

// Create and export the database connection
const dbConfig = config[environment];
if (!dbConfig) {
  throw new Error(`Database configuration not found for environment: ${environment}`);
}

const db: Knex = knex(dbConfig);

export default db;
export { config };