-- Migration: Atomic financial operations
-- Prevents race conditions on balance updates by using Postgres functions with row-level locking.

-- 1. Atomic balance deduction with validation
-- Returns the new balance, or raises an exception if insufficient funds.
CREATE OR REPLACE FUNCTION deduct_balance(
  p_user_id UUID,
  p_amount DECIMAL
)
RETURNS DECIMAL AS $$
DECLARE
  v_current DECIMAL;
  v_new DECIMAL;
BEGIN
  -- Lock the user row to prevent concurrent reads
  SELECT points_balance INTO v_current
  FROM users
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found: %', p_user_id;
  END IF;

  IF v_current < p_amount THEN
    RAISE EXCEPTION 'Insufficient balance: has %, needs %', v_current, p_amount;
  END IF;

  v_new := v_current - p_amount;

  UPDATE users SET points_balance = v_new WHERE id = p_user_id;
  RETURN v_new;
END;
$$ LANGUAGE plpgsql;

-- 2. Atomic balance credit (for payouts, refunds)
CREATE OR REPLACE FUNCTION credit_balance(
  p_user_id UUID,
  p_amount DECIMAL
)
RETURNS DECIMAL AS $$
DECLARE
  v_new DECIMAL;
BEGIN
  UPDATE users
  SET points_balance = points_balance + p_amount
  WHERE id = p_user_id
  RETURNING points_balance INTO v_new;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found: %', p_user_id;
  END IF;

  RETURN v_new;
END;
$$ LANGUAGE plpgsql;

-- 3. Atomic balance deduction that prevents negative balances (for reversals)
-- Deducts up to the available balance, never below 0.
CREATE OR REPLACE FUNCTION deduct_balance_safe(
  p_user_id UUID,
  p_amount DECIMAL
)
RETURNS DECIMAL AS $$
DECLARE
  v_new DECIMAL;
BEGIN
  UPDATE users
  SET points_balance = GREATEST(points_balance - p_amount, 0)
  WHERE id = p_user_id
  RETURNING points_balance INTO v_new;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found: %', p_user_id;
  END IF;

  RETURN v_new;
END;
$$ LANGUAGE plpgsql;

-- 4. Atomic outcome stake increment
CREATE OR REPLACE FUNCTION increment_outcome_stake(
  p_outcome_id UUID,
  p_amount DECIMAL
)
RETURNS DECIMAL AS $$
DECLARE
  v_new DECIMAL;
BEGIN
  UPDATE outcomes
  SET total_staked = total_staked + p_amount
  WHERE id = p_outcome_id
  RETURNING total_staked INTO v_new;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Outcome not found: %', p_outcome_id;
  END IF;

  RETURN v_new;
END;
$$ LANGUAGE plpgsql;

-- 5. Helper to get a platform setting value
CREATE OR REPLACE FUNCTION get_setting(p_key VARCHAR)
RETURNS JSONB AS $$
DECLARE
  v_value JSONB;
BEGIN
  SELECT value INTO v_value FROM platform_settings WHERE key = p_key;
  RETURN v_value;
END;
$$ LANGUAGE plpgsql STABLE;
