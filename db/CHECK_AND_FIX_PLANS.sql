-- ============================================
-- 플랜 확인 및 수정 (요금제 페이지 문제 해결)
-- ============================================
-- SQL 실행 후 이 파일을 실행하여 플랜이 제대로 설정되었는지 확인하세요.
-- ============================================

-- 1. 플랜 개수 확인
SELECT COUNT(*) as plan_count FROM plans WHERE is_active = true;

-- 2. 플랜 상세 정보 확인
SELECT 
  id,
  tier,
  interval,
  name,
  price,
  is_active,
  created_at
FROM plans 
ORDER BY interval;

-- 3. RLS 정책 확인
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'plans';

-- 4. RLS가 활성화되어 있는지 확인
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'plans';

-- 5. 플랜이 없으면 생성
INSERT INTO plans (tier, interval, name, price, features, is_active)
SELECT * FROM (VALUES
  ('standard', 'month', '라떼 방구석 월간', 14900, '{"subscription_type": "monthly", "rental_limit": 1, "rental_categories": ["all"], "delivery_fee": 0, "free_trial": false}'::jsonb, true),
  ('standard', 'year', '라떼 방구석 연간', 150000, '{"subscription_type": "yearly", "rental_limit": 1, "rental_categories": ["all"], "delivery_fee": 0, "free_trial": false, "discount_rate": 16}'::jsonb, true)
) AS v(tier, interval, name, price, features, is_active)
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE is_active = true);

-- 6. RLS 정책 재설정 (확실하게)
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active plans" ON plans;
CREATE POLICY "Anyone can view active plans" ON plans
  FOR SELECT 
  USING (is_active = true);

-- 7. 최종 확인
SELECT tier, interval, name, price, is_active 
FROM plans 
WHERE is_active = true
ORDER BY interval;

