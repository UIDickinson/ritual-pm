-- Migration: Add composite indexes for common query patterns

CREATE INDEX IF NOT EXISTS idx_predictions_user_market ON predictions(user_id, market_id);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status);
CREATE INDEX IF NOT EXISTS idx_disputes_market_status ON disputes(market_id, status);
CREATE INDEX IF NOT EXISTS idx_markets_status_created ON markets(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_approval_votes_market_vote ON approval_votes(market_id, vote);
