-- AI Market Discovery Phase 3: model tuning + config persistence
-- Date: 2026-02-18

CREATE TABLE IF NOT EXISTS ai_model_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  model_name TEXT NOT NULL,
  version INT NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  weights JSONB NOT NULL,
  thresholds JSONB NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(model_name, version)
);

CREATE INDEX IF NOT EXISTS idx_ai_model_configs_active
  ON ai_model_configs(model_name, is_active, version DESC);

CREATE INDEX IF NOT EXISTS idx_ai_model_configs_created
  ON ai_model_configs(created_at DESC);

DROP TRIGGER IF EXISTS trg_ai_model_configs_updated_at ON ai_model_configs;
CREATE TRIGGER trg_ai_model_configs_updated_at
BEFORE UPDATE ON ai_model_configs
FOR EACH ROW EXECUTE FUNCTION ai_set_updated_at();

-- Ensure only one active version per model name
CREATE UNIQUE INDEX IF NOT EXISTS uq_ai_model_configs_one_active
  ON ai_model_configs(model_name)
  WHERE is_active = TRUE;

-- Seed default model configuration if absent
INSERT INTO ai_model_configs (model_name, version, is_active, weights, thresholds, metadata)
SELECT
  'engagement_v1',
  1,
  TRUE,
  '{
    "volume": 0.15,
    "velocity": 0.25,
    "controversy": 0.20,
    "diversity": 0.10,
    "temporal": 0.15,
    "historical": 0.15
  }'::jsonb,
  '{
    "review": 0.50,
    "high": 0.75,
    "duplicate": 0.85
  }'::jsonb,
  '{
    "source": "phase3_default_seed"
  }'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM ai_model_configs WHERE model_name = 'engagement_v1'
);
