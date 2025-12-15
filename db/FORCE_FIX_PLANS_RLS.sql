-- ============================================
-- 플랜 RLS 정책 강제 수정 (타임아웃 문제 해결)
-- ============================================
-- 이 파일은 플랜 불러오기 타임아웃 문제를 해결합니다.
-- 타임아웃이 발생하는 경우 RLS 정책이 문제일 가능성이 높습니다.
-- ============================================

-- 1. 모든 기존 RLS 정책 삭제
DROP POLICY IF EXISTS "Anyone can view active plans" ON plans;
DROP POLICY IF EXISTS "Public plans are viewable by everyone" ON plans;
DROP POLICY IF EXISTS "Enable read access for all users" ON plans;
DROP POLICY IF EXISTS "plans_select_policy" ON plans;
DROP POLICY IF EXISTS "plans_select_active" ON plans;

-- 2. RLS 일시적으로 비활성화 (테스트용)
-- 주의: 프로덕션에서는 RLS를 활성화해야 합니다
-- ALTER TABLE plans DISABLE ROW LEVEL SECURITY;

-- 3. RLS 활성화 및 가장 관대한 정책 생성
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

-- 누구나 활성 플랜을 볼 수 있도록 정책 생성 (가장 간단한 형태)
CREATE POLICY "Anyone can view active plans" ON plans
  FOR SELECT 
  TO public
  USING (is_active = true);

-- 4. 플랜 데이터 확인 및 생성
-- 기존 플랜 확인
SELECT COUNT(*) as existing_plans FROM plans WHERE is_active = true;

-- 플랜이 없으면 생성
INSERT INTO plans (tier, interval, name, price, features, is_active)
SELECT * FROM (VALUES
  ('standard', 'month', '라떼 방구석 월간', 14900, '{"subscription_type": "monthly", "rental_limit": 1, "rental_categories": ["all"], "delivery_fee": 0, "free_trial": false}'::jsonb, true),
  ('standard', 'year', '라떼 방구석 연간', 150000, '{"subscription_type": "yearly", "rental_limit": 1, "rental_categories": ["all"], "delivery_fee": 0, "free_trial": false, "discount_rate": 16}'::jsonb, true)
) AS v(tier, interval, name, price, features, is_active)
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE is_active = true);

-- 5. 최종 확인
SELECT 
  '플랜 데이터' as check_type,
  COUNT(*) as count,
  string_agg(name, ', ') as names
FROM plans 
WHERE is_active = true;

SELECT 
  'RLS 정책' as check_type,
  COUNT(*) as count,
  string_agg(policyname, ', ') as policy_names
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'plans';

-- 6. 테스트 쿼리 (익명 사용자로 조회 가능한지 확인)
SELECT tier, interval, name, price, is_active 
FROM plans 
WHERE is_active = true
ORDER BY interval;

-- ============================================
-- ✅ 완료!
-- ============================================
-- 이제 플랜을 불러올 수 있어야 합니다.
-- 웹사이트의 /pricing 페이지를 새로고침해보세요.
-- ============================================

