-- profiles 테이블에 OpenAI API 키 컬럼 추가

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS openai_api_key TEXT;

-- 인덱스는 필요하지 않음 (개인 설정값)
