-- Seed data for Ritual Prediction Market
-- Run this after schema.sql

-- Note: In production, password should be hashed using bcrypt
-- This is a placeholder - the actual hashing will be done by the application
-- Default password: admin123 (will be hashed by the seed script)

-- Insert admin user (password will be hashed by Node.js script)
-- Username: admin
-- Password: admin123

-- Insert some test member users
-- These will also be created via the Node.js seed script

-- Insert platform settings
INSERT INTO platform_settings (key, value, updated_at)
VALUES 
  ('min_approval_votes', '10', NOW()),
  ('approval_window_hours', '15', NOW()),
  ('dispute_window_hours', '24', NOW()),
  ('stake_fee_percentage', '1', NOW()),
  ('starting_balance', '10', NOW()),
  ('min_stake_amount', '1', NOW())
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = NOW();
