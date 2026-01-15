-- Ritual Prediction Market Database Schema
-- Execute this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'member', 'viewer')) DEFAULT 'member',
  points_balance DECIMAL(10, 2) NOT NULL DEFAULT 10.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Markets Table
CREATE TABLE IF NOT EXISTS markets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  description TEXT,
  status VARCHAR(20) NOT NULL CHECK (status IN ('proposed', 'approved', 'live', 'closed', 'resolved', 'disputed', 'final', 'dissolved')) DEFAULT 'proposed',
  close_time TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  approval_deadline TIMESTAMP WITH TIME ZONE,
  resolution_time TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES users(id),
  resolution_reason TEXT,
  winning_outcome_id UUID
);

-- Outcomes Table
CREATE TABLE IF NOT EXISTS outcomes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  market_id UUID NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
  outcome_text TEXT NOT NULL,
  total_staked DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  order_index INTEGER NOT NULL,
  UNIQUE(market_id, order_index)
);

-- Add foreign key for winning_outcome_id after outcomes table is created
ALTER TABLE markets 
ADD CONSTRAINT fk_winning_outcome 
FOREIGN KEY (winning_outcome_id) 
REFERENCES outcomes(id);

-- Predictions Table
CREATE TABLE IF NOT EXISTS predictions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  market_id UUID NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
  outcome_id UUID NOT NULL REFERENCES outcomes(id) ON DELETE CASCADE,
  stake_amount DECIMAL(10, 2) NOT NULL,
  fee_paid DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  payout_amount DECIMAL(10, 2),
  paid_out BOOLEAN DEFAULT FALSE
);

-- Approval Votes Table
CREATE TABLE IF NOT EXISTS approval_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  market_id UUID NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vote VARCHAR(10) NOT NULL CHECK (vote IN ('approve', 'reject')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(market_id, user_id)
);

-- Disputes Table
CREATE TABLE IF NOT EXISTS disputes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  market_id UUID NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
  initiated_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'upheld', 'overturned', 'invalidated')) DEFAULT 'pending',
  admin_decision TEXT,
  decided_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- Resolution Votes Table (for community voting)
CREATE TABLE IF NOT EXISTS resolution_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  market_id UUID NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  outcome_id UUID NOT NULL REFERENCES outcomes(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(market_id, user_id)
);

-- Activity Logs Table
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action_type VARCHAR(100) NOT NULL,
  target_id UUID,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Platform Settings Table
CREATE TABLE IF NOT EXISTS platform_settings (
  key VARCHAR(100) PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_markets_status ON markets(status);
CREATE INDEX idx_markets_creator ON markets(creator_id);
CREATE INDEX idx_markets_close_time ON markets(close_time);
CREATE INDEX idx_outcomes_market ON outcomes(market_id);
CREATE INDEX idx_predictions_user ON predictions(user_id);
CREATE INDEX idx_predictions_market ON predictions(market_id);
CREATE INDEX idx_predictions_outcome ON predictions(outcome_id);
CREATE INDEX idx_approval_votes_market ON approval_votes(market_id);
CREATE INDEX idx_disputes_market ON disputes(market_id);
CREATE INDEX idx_resolution_votes_market ON resolution_votes(market_id);
CREATE INDEX idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_created ON activity_logs(created_at);

-- Create function to update last_active timestamp
CREATE OR REPLACE FUNCTION update_last_active()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE users SET last_active = NOW() WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to update last_active on user activity
CREATE TRIGGER update_user_active_on_prediction
AFTER INSERT ON predictions
FOR EACH ROW
EXECUTE FUNCTION update_last_active();

CREATE TRIGGER update_user_active_on_vote
AFTER INSERT ON approval_votes
FOR EACH ROW
EXECUTE FUNCTION update_last_active();

-- Function to automatically set approval_deadline when market is created
CREATE OR REPLACE FUNCTION set_approval_deadline()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'proposed' AND NEW.approval_deadline IS NULL THEN
    NEW.approval_deadline := NEW.created_at + INTERVAL '15 hours';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_market_approval_deadline
BEFORE INSERT ON markets
FOR EACH ROW
EXECUTE FUNCTION set_approval_deadline();

-- Function to log activity
CREATE OR REPLACE FUNCTION log_activity(
  p_user_id UUID,
  p_action_type VARCHAR,
  p_target_id UUID,
  p_details JSONB
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO activity_logs (user_id, action_type, target_id, details)
  VALUES (p_user_id, p_action_type, p_target_id, p_details);
END;
$$ LANGUAGE plpgsql;
