-- Add generated_by column to market_proposals
-- Tracks which system generated each proposal (e.g. 'manual_trigger', 'gemini', 'heuristic')
ALTER TABLE market_proposals
  ADD COLUMN IF NOT EXISTS generated_by TEXT;
