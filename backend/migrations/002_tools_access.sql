-- Migration 002: Add tools_access column to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS tools_access JSONB DEFAULT '{"analyzer": true, "generator": true}';
UPDATE users SET tools_access = '{"analyzer": true, "generator": true}' WHERE tools_access IS NULL;
