-- Migration: Add bonus_pool column to markets table
-- Instead of inflating outcomes.total_staked (which distorts odds),
-- bonus funds are tracked separately and distributed to winners during resolution.

ALTER TABLE markets
ADD COLUMN IF NOT EXISTS bonus_pool DECIMAL(10, 2) NOT NULL DEFAULT 0.00;

-- Atomic function to increment a market's bonus pool
CREATE OR REPLACE FUNCTION increment_bonus_pool(p_market_id UUID, p_amount DECIMAL)
RETURNS VOID AS $$
BEGIN
  UPDATE markets
  SET bonus_pool = bonus_pool + p_amount
  WHERE id = p_market_id;
END;
$$ LANGUAGE plpgsql;
