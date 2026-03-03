-- ============================================
-- 중복 구독 정리
-- ============================================
-- 작성일: 2026년 1월 9일
-- 목적: 같은 사용자가 여러 개의 active 구독을 가진 경우 정리

-- 1. 중복 구독 확인
SELECT 
  user_id,
  COUNT(*) as subscription_count,
  array_agg(id ORDER BY created_at DESC) as subscription_ids
FROM subscriptions
WHERE status = 'active'
GROUP BY user_id
HAVING COUNT(*) > 1;

-- 2. 중복 구독 정리 (가장 최근 것만 남기고 나머지는 cancelled로 변경)
WITH ranked_subscriptions AS (
  SELECT 
    id,
    user_id,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) as rn
  FROM subscriptions
  WHERE status = 'active'
)
UPDATE subscriptions
SET status = 'cancelled',
    updated_at = NOW()
WHERE id IN (
  SELECT id 
  FROM ranked_subscriptions 
  WHERE rn > 1
);

-- 3. 결과 확인
SELECT 
  user_id,
  status,
  created_at,
  current_period_end
FROM subscriptions
ORDER BY user_id, created_at DESC;
