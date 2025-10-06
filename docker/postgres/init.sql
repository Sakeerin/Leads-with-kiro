-- Initialize Lead Management Database
-- This script runs when the PostgreSQL container starts for the first time

-- Create additional databases for testing
CREATE DATABASE lead_management_test;

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE lead_management TO postgres;
GRANT ALL PRIVILEGES ON DATABASE lead_management_test TO postgres;

-- Connect to main database
\c lead_management;

-- Create extensions in main database
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Connect to test database
\c lead_management_test;

-- Create extensions in test database
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";