-- AI Market Discovery Engine baseline schema
-- Date: 2026-02-17

-- Enums
DO $$
BEGIN
  CREATE TYPE ai_topic_status AS ENUM (
    'detected',
    'scored',
    'filtered',
    'proposed',
    'approved',
    'rejected',
    'expired'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE ai_proposal_status AS ENUM (
    'pending',
    'approved',
    'edited',
    'rejected'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE ai_source_type AS ENUM ('reddit', 'telegram');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE ai_source_kind AS ENUM ('subreddit', 'telegram_group', 'telegram_channel');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Helper function for updated_at timestamps
CREATE OR REPLACE FUNCTION ai_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Core topic table
CREATE TABLE IF NOT EXISTS ai_topics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  label TEXT NOT NULL,
  summary TEXT NOT NULL,
  entities JSONB NOT NULL DEFAULT '[]'::jsonb,
  first_seen TIMESTAMPTZ NOT NULL,
  last_seen TIMESTAMPTZ NOT NULL,
  source_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
  message_count INT NOT NULL DEFAULT 0,
  engagement_score NUMERIC(5, 4),
  status ai_topic_status NOT NULL DEFAULT 'detected',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Normalized source messages
CREATE TABLE IF NOT EXISTS ai_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source ai_source_type NOT NULL,
  source_message_id TEXT NOT NULL,
  source_chat_id TEXT,
  author_hash TEXT NOT NULL,
  text TEXT NOT NULL,
  message_timestamp TIMESTAMPTZ NOT NULL,
  engagement JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(source, source_message_id)
);

-- Topic -> message mapping
CREATE TABLE IF NOT EXISTS ai_topic_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  topic_id UUID NOT NULL REFERENCES ai_topics(id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES ai_messages(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(topic_id, message_id)
);

-- Generated proposals pending admin decision
CREATE TABLE IF NOT EXISTS market_proposals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  topic_id UUID NOT NULL REFERENCES ai_topics(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  outcomes JSONB NOT NULL DEFAULT '[]'::jsonb,
  resolution_criteria TEXT NOT NULL,
  resolution_date TIMESTAMPTZ NOT NULL,
  categories JSONB NOT NULL DEFAULT '[]'::jsonb,
  ai_confidence NUMERIC(5, 4),
  engagement_score NUMERIC(5, 4),
  status ai_proposal_status NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES users(id),
  rejection_reason TEXT,
  market_id UUID REFERENCES markets(id),
  source_topic_id UUID REFERENCES ai_topics(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Feedback events to support calibration and retraining
CREATE TABLE IF NOT EXISTS ai_feedback_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  market_id UUID REFERENCES markets(id) ON DELETE SET NULL,
  proposal_id UUID REFERENCES market_proposals(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  event_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ingestion source config + allowlist state
CREATE TABLE IF NOT EXISTS ai_ingestion_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source ai_source_type NOT NULL,
  source_kind ai_source_kind NOT NULL,
  external_id TEXT NOT NULL,
  display_name TEXT,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  last_cursor TEXT,
  last_ingested_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(source, source_kind, external_id)
);

-- Policy decision audit log
CREATE TABLE IF NOT EXISTS ai_policy_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source ai_source_type,
  topic_id UUID REFERENCES ai_topics(id) ON DELETE SET NULL,
  proposal_id UUID REFERENCES market_proposals(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  reason_code TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_messages_source_timestamp
  ON ai_messages(source, message_timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_ai_messages_source_chat_timestamp
  ON ai_messages(source, source_chat_id, message_timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_ai_topics_status_score
  ON ai_topics(status, engagement_score DESC);

CREATE INDEX IF NOT EXISTS idx_ai_topics_last_seen
  ON ai_topics(last_seen DESC);

CREATE INDEX IF NOT EXISTS idx_market_proposals_status_created
  ON market_proposals(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_market_proposals_topic
  ON market_proposals(topic_id);

CREATE INDEX IF NOT EXISTS idx_ai_feedback_market
  ON ai_feedback_events(market_id, event_timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_ai_ingestion_sources_enabled
  ON ai_ingestion_sources(source, enabled);

CREATE INDEX IF NOT EXISTS idx_ai_policy_events_created
  ON ai_policy_events(created_at DESC);

-- JSONB indexes
CREATE INDEX IF NOT EXISTS idx_ai_topics_entities_gin
  ON ai_topics USING GIN (entities);

CREATE INDEX IF NOT EXISTS idx_ai_messages_metadata_gin
  ON ai_messages USING GIN (metadata);

CREATE INDEX IF NOT EXISTS idx_market_proposals_outcomes_gin
  ON market_proposals USING GIN (outcomes);

-- updated_at triggers
DROP TRIGGER IF EXISTS trg_ai_topics_updated_at ON ai_topics;
CREATE TRIGGER trg_ai_topics_updated_at
BEFORE UPDATE ON ai_topics
FOR EACH ROW EXECUTE FUNCTION ai_set_updated_at();

DROP TRIGGER IF EXISTS trg_market_proposals_updated_at ON market_proposals;
CREATE TRIGGER trg_market_proposals_updated_at
BEFORE UPDATE ON market_proposals
FOR EACH ROW EXECUTE FUNCTION ai_set_updated_at();

DROP TRIGGER IF EXISTS trg_ai_ingestion_sources_updated_at ON ai_ingestion_sources;
CREATE TRIGGER trg_ai_ingestion_sources_updated_at
BEFORE UPDATE ON ai_ingestion_sources
FOR EACH ROW EXECUTE FUNCTION ai_set_updated_at();
