-- Add theme column to users table
ALTER TABLE users ADD COLUMN theme TEXT DEFAULT 'light';
