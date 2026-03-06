-- Migration: Add telegram_user_id to users table for Telegram account linking
-- Each Telegram user ID can only be linked to one Ritual account.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS telegram_user_id BIGINT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_users_telegram_user_id
  ON users (telegram_user_id)
  WHERE telegram_user_id IS NOT NULL;
