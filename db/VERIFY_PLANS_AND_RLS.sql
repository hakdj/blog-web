-- ============================================
-- 플랜 및 RLS 정책 확인 및 수정
-- ============================================
-- 이 파일을 실행하여 플랜 데이터와 RLS 정책을 확인하고 수정하세요.
-- ============================================

-- 1. 플랜 데이터 확인
SELECT 
  id,
  tier,
  interval,
  name,
  price,
  is_active,
  created_at
FROM plans 
ORDER BY interval, tier;

-- 2. 활성 플랜 개수 확인
SELECT COUNT(*) as active_plan_count 
FROM plans 
WHERE is_active = true;

-- 3. RLS 활성화 확인
SELECT 
  tablename, 
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'plans';

-- 4. RLS 정책 확인
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'plans';

-- 5. RLS 정책 재설정 (확실하게)
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

-- 기존 정책 모두 삭제
DROP POLICY IF EXISTS "Anyone can view active plans" ON plans;
DROP POLICY IF EXISTS "Public plans are viewable by everyone" ON plans;
DROP POLICY IF EXISTS "Enable read access for all users" ON plans;

-- 새로운 정책 생성 (누구나 활성 플랜 조회 가능)
CREATE POLICY "Anyone can view active plans" ON plans
  FOR SELECT 
  USING (is_active = true);

-- 6. 플랜이 없으면 생성
INSERT INTO plans (tier, interval, name, price, features, is_active)
SELECT * FROM (VALUES
  ('standard', 'month', '라떼 방구석 월간', 14900, '{"subscription_type": "monthly", "rental_limit": 1, "rental_categories": ["all"], "delivery_fee": 0, "free_trial": false}'::jsonb, true),
  ('standard', 'year', '라떼 방구석 연간', 150000, '{"subscription_type": "yearly", "rental_limit": 1, "rental_categories": ["all"], "delivery_fee": 0, "free_trial": false, "discount_rate": 16}'::jsonb, true)
) AS v(tier, interval, name, price, features, is_active)
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE is_active = true);

-- 7. 최종 확인
SELECT 
  '플랜 데이터' as check_type,
  COUNT(*) as count
FROM plans 
WHERE is_active = true
UNION ALL
SELECT 
  'RLS 정책' as check_type,
  COUNT(*) as count
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'plans';

-- 8. 테스트 쿼리 (익명 사용자로 조회 가능한지 확인)
SELECT tier, interval, name, price, is_active 
FROM plans 
WHERE is_active = true
ORDER BY interval;

