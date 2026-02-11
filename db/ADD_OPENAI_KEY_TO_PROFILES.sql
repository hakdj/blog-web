-- profiles 테이블에 AI 키/제공자 컬럼 추가

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS openai_api_key TEXT,
ADD COLUMN IF NOT EXISTS ai_provider TEXT,
ADD COLUMN IF NOT EXISTS ai_api_key TEXT;

-- 인덱스는 필요하지 않음 (개인 설정값)

-- 기존 OpenAI 키를 새 컬럼으로 마이그레이션
UPDATE profiles
SET ai_provider = COALESCE(ai_provider, 'openai'),
    ai_api_key = COALESCE(ai_api_key, openai_api_key)
WHERE ai_api_key IS NULL AND openai_api_key IS NOT NULL;
