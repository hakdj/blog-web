-- ============================================
-- 실행 후 확인하는 쿼리
-- SIMPLE_START.sql 실행 후 이것도 실행하세요
-- ============================================

-- 1. 플랜이 6개 있는지 확인
SELECT tier, interval, name, price 
FROM plans 
ORDER BY tier, interval;

-- 결과가 6개 보이면 성공!

-- 2. 새 테이블이 만들어졌는지 확인
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('blog_posts', 'usage_logs');

-- blog_posts, usage_logs가 보이면 성공!

-- 3. RLS가 활성화되었는지 확인
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('plans', 'blog_posts', 'usage_logs');

-- rowsecurity가 모두 'true'이면 성공!

