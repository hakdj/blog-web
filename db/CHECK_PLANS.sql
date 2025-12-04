-- ============================================
-- 플랜 데이터 확인 쿼리
-- ============================================
-- 이 쿼리를 실행하여 플랜 데이터가 있는지 확인하세요.
-- ============================================

-- 1. 플랜 개수 확인
SELECT COUNT(*) as plan_count FROM plans;

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
ORDER BY interval, tier;

-- 3. 활성화된 플랜만 확인
SELECT 
  tier,
  interval,
  name,
  price,
  is_active
FROM plans 
WHERE is_active = true
ORDER BY interval;

-- 4. RLS 정책 확인
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

-- ============================================
-- 예상 결과
-- ============================================
-- plan_count: 2 (월간 1개, 연간 1개)
-- is_active: 모두 true
-- RLS 정책: "Anyone can view active plans" 정책이 있어야 함
-- ============================================


