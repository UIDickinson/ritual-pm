-- Add AI pipeline control settings
-- These are upserted so they won't fail if already present

INSERT INTO platform_settings (key, value, updated_at)
VALUES 
  ('ai_pipeline_enabled', '"false"', NOW()),
  ('ai_pipeline_last_run', 'null', NOW())
ON CONFLICT (key) DO NOTHING;
