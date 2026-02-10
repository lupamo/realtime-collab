-- This script runs on first container startup
-- Creates the database if it doesn't exist

-- The main database is already created by POSTGRES_DB env var
-- This file is for any additional setup needed

-- Enable UUID extension (if needed in future)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create indexes that SQLAlchemy might not create
-- (These are also defined in models.py, but having them here ensures they exist)

-- Additional configuration
ALTER DATABASE collab_platform SET timezone TO 'UTC';

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE collab_platform TO postgres;


