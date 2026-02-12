-- profiles 테이블에 AI 키/제공자 컬럼 추가

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS openai_api_key TEXT,
ADD COLUMN IF NOT EXISTS ai_provider TEXT,
ADD COLUMN IF NOT EXISTS ai_api_key TEXT,
ADD COLUMN IF NOT EXISTS ai_api_key_encrypted TEXT,
ADD COLUMN IF NOT EXISTS ai_key_masked TEXT,
ADD COLUMN IF NOT EXISTS ai_key_rotated_at TIMESTAMPTZ;
r
-- 인덱스는 필요하지 않음 (개인 설정값)

-- 기존 OpenAI 키를 새 컬럼으로 마이그레이션
UPDATE profiles
SET ai_provider = COALESCE(ai_provider, 'openai'),
    ai_api_key = COALESCE(ai_api_key, openai_api_key)
WHERE ai_api_key IS NULL AND openai_api_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS ai_key_rotation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  key_masked TEXT,
  action TEXT NOT NULL CHECK (action IN ('rotate', 'delete')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_key_rotation_logs_user_id ON ai_key_rotation_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_key_rotation_logs_created_at ON ai_key_rotation_logs(created_at DESC);
ALTER TABLE ai_key_rotation_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own ai key logs" ON ai_key_rotation_logs;
CREATE POLICY "Users can view own ai key logs" ON ai_key_rotation_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS ai_request_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  feature TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT,
  status_code INTEGER NOT NULL,
  latency_ms INTEGER,
  success BOOLEAN NOT NULL DEFAULT false,
  error_code TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_request_logs_created_at ON ai_request_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_request_logs_provider_created_at ON ai_request_logs(provider, created_at DESC);
ALTER TABLE ai_request_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own ai request logs" ON ai_request_logs;
CREATE POLICY "Users can view own ai request logs" ON ai_request_logs
  FOR SELECT USING (auth.uid() = user_id);
