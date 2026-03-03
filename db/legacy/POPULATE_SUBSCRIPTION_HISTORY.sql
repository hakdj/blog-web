-- ============================================
-- 기존 구독 데이터를 이력 테이블에 추가
-- ============================================
-- 작성일: 2025년 12월 31일
-- 목적: 이미 존재하는 구독의 이력 생성

-- 기존 활성 구독을 이력 테이블에 추가
INSERT INTO subscription_history (
  user_id,
  subscription_id,
  plan_id,
  plan_name,
  plan_price,
  plan_interval,
  started_at,
  change_reason
)
SELECT 
  s.user_id,
  s.id,
  s.plan_id,
  p.name,
  p.price,
  p.interval,
  s.created_at,
  'initial'
FROM subscriptions s
JOIN plans p ON p.id = s.plan_id
WHERE s.status = 'active'
  AND NOT EXISTS (
    SELECT 1 FROM subscription_history sh 
    WHERE sh.subscription_id = s.id
  );

-- 결과 확인
SELECT 
  sh.id,
  u.email as user_email,
  sh.plan_name,
  sh.plan_price,
  sh.plan_interval,
  sh.started_at,
  sh.ended_at,
  sh.change_reason
FROM subscription_history sh
LEFT JOIN auth.users u ON u.id = sh.user_id
ORDER BY sh.started_at DESC;
