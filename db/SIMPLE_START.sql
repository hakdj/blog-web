-- ============================================
-- 초보자용: 처음부터 깨끗하게 시작하기
-- 이 파일 하나만 실행하면 끝!
-- ============================================

-- ============================================
-- 1단계: 기존 백업 테이블 정리 (에러 방지)
-- ============================================
DROP TABLE IF EXISTS plans_old CASCADE;
DROP TABLE IF EXISTS plans_new CASCADE;

-- ============================================
-- 2단계: 기존 plans 테이블 삭제 (새로 만들기 위해)
-- 주의: plans 테이블에 데이터가 중요하면 백업 먼저!
-- ============================================
DROP TABLE IF EXISTS plans CASCADE;

-- ============================================
-- 3단계: 새 plans 테이블 생성 (Basic/Premium/Ultra × 월간/연간)
-- ============================================
CREATE TABLE plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tier TEXT NOT NULL CHECK (tier IN ('basic', 'premium', 'ultra')),
  interval TEXT NOT NULL CHECK (interval IN ('month', 'year')),
  name TEXT NOT NULL,
  price INTEGER NOT NULL,
  features JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 4단계: 플랜 데이터 넣기 (6개 플랜)
-- ============================================
INSERT INTO plans (tier, interval, name, price, features, is_active) VALUES
  -- Basic 무료 플랜
  ('basic', 'month', 'Basic 월간', 0, '{"agent_mode": 1, "bulk_mode": 30, "ai_models": ["chatgpt"], "storage_months": 3}', true),
  ('basic', 'year', 'Basic 연간', 0, '{"agent_mode": 12, "bulk_mode": 360, "ai_models": ["chatgpt"], "storage_months": 3}', true),
  
  -- Premium 플랜
  ('premium', 'month', 'Premium 월간', 9900, '{"agent_mode": 30, "bulk_mode": 900, "ai_models": ["chatgpt", "gemini"], "storage_months": 3, "seo_check": true, "tone_preset": true}', true),
  ('premium', 'year', 'Premium 연간', 99000, '{"agent_mode": 360, "bulk_mode": 10800, "ai_models": ["chatgpt", "gemini"], "storage_months": 3, "seo_check": true, "tone_preset": true}', true),
  
  -- Ultra 플랜
  ('ultra', 'month', 'Ultra 월간', 19900, '{"agent_mode": 70, "bulk_mode": 2100, "ai_models": ["chatgpt", "gemini", "claude"], "storage_months": 3, "seo_check": true, "tone_preset": true, "pros_cons_analysis": true, "auto_synthesis": true}', true),
  ('ultra', 'year', 'Ultra 연간', 199000, '{"agent_mode": 840, "bulk_mode": 25200, "ai_models": ["chatgpt", "gemini", "claude"], "storage_months": 3, "seo_check": true, "tone_preset": true, "pros_cons_analysis": true, "auto_synthesis": true}', true);

-- ============================================
-- 5단계: 블로그 글 저장 테이블 만들기
-- ============================================
CREATE TABLE IF NOT EXISTS blog_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB,
  generated_by TEXT,
  ai_models TEXT[],
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 6단계: 사용량 추적 테이블 만들기
-- ============================================
CREATE TABLE IF NOT EXISTS usage_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE CASCADE,
  usage_type TEXT NOT NULL CHECK (usage_type IN ('agent', 'bulk')),
  count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 7단계: 빠른 검색을 위한 인덱스 만들기 (없으면 만들기)
-- ============================================
CREATE INDEX IF NOT EXISTS idx_blog_posts_user_id ON blog_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_usage_logs_user_id ON usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_subscription_id ON usage_logs(subscription_id);

-- ============================================
-- 8단계: 보안 설정 (RLS 활성화)
-- ============================================
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 9단계: 보안 정책 만들기 (기존 정책 있으면 삭제 후 재생성)
-- ============================================

-- plans: 누구나 볼 수 있음
DROP POLICY IF EXISTS "Anyone can view active plans" ON plans;
CREATE POLICY "Anyone can view active plans" ON plans
  FOR SELECT USING (is_active = true);

-- blog_posts: 본인 것만 볼 수 있음
DROP POLICY IF EXISTS "Users can view own blog posts" ON blog_posts;
CREATE POLICY "Users can view own blog posts" ON blog_posts
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own blog posts" ON blog_posts;
CREATE POLICY "Users can insert own blog posts" ON blog_posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own blog posts" ON blog_posts;
CREATE POLICY "Users can update own blog posts" ON blog_posts
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own blog posts" ON blog_posts;
CREATE POLICY "Users can delete own blog posts" ON blog_posts
  FOR DELETE USING (auth.uid() = user_id);

-- usage_logs: 본인 것만 볼 수 있음
DROP POLICY IF EXISTS "Users can view own usage logs" ON usage_logs;
CREATE POLICY "Users can view own usage logs" ON usage_logs
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own usage logs" ON usage_logs;
CREATE POLICY "Users can insert own usage logs" ON usage_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- ✅ 완료!
-- ============================================

