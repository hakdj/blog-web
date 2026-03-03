-- ============================================
-- 구독 이력 관리 테이블
-- ============================================
-- 작성일: 2025년 12월 22일
-- 목적: 사용자의 플랜 변경 이력 추적

-- 1. subscription_history 테이블 생성
CREATE TABLE IF NOT EXISTS subscription_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  plan_name TEXT NOT NULL,
  plan_price INTEGER NOT NULL,
  plan_interval TEXT NOT NULL CHECK (plan_interval IN ('month', 'year')),
  
  -- 이력 정보
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_days INTEGER GENERATED ALWAYS AS (
    CASE 
      WHEN ended_at IS NOT NULL THEN 
        EXTRACT(DAY FROM (ended_at - started_at))::INTEGER
      ELSE NULL
    END
  ) STORED,
  
  -- 변경 사유
  change_reason TEXT CHECK (change_reason IN ('upgrade', 'downgrade', 'cancel', 'expire', 'renew', 'initial')),
  change_note TEXT,
  
  -- 메타 정보
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_subscription_history_user_id ON subscription_history(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_history_subscription_id ON subscription_history(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_history_started_at ON subscription_history(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscription_history_ended_at ON subscription_history(ended_at DESC);

-- 3. RLS 정책 설정
ALTER TABLE subscription_history ENABLE ROW LEVEL SECURITY;

-- 사용자는 본인 이력만 조회 가능
CREATE POLICY "Users can view own subscription history"
  ON subscription_history
  FOR SELECT
  USING (auth.uid() = user_id);

-- 서비스 롤은 모든 이력 관리 가능
CREATE POLICY "Service role can manage all subscription history"
  ON subscription_history
  FOR ALL
  USING (auth.role() = 'service_role');

-- 4. 트리거: 구독 생성 시 이력 자동 생성
CREATE OR REPLACE FUNCTION create_subscription_history()
RETURNS TRIGGER AS $$
BEGIN
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
    NEW.user_id,
    NEW.id,
    NEW.plan_id,
    p.name,
    p.price,
    p.interval,
    NEW.created_at,
    'initial'
  FROM plans p
  WHERE p.id = NEW.plan_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_create_subscription_history
  AFTER INSERT ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION create_subscription_history();

-- 5. 트리거: 플랜 변경 시 이력 업데이트
CREATE OR REPLACE FUNCTION update_subscription_history()
RETURNS TRIGGER AS $$
BEGIN
  -- 기존 이력 종료
  IF OLD.plan_id != NEW.plan_id THEN
    UPDATE subscription_history
    SET 
      ended_at = NOW(),
      updated_at = NOW()
    WHERE subscription_id = NEW.id
      AND ended_at IS NULL;
    
    -- 새 이력 생성
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
      NEW.user_id,
      NEW.id,
      NEW.plan_id,
      p.name,
      p.price,
      p.interval,
      NOW(),
      CASE 
        WHEN p.price > (SELECT price FROM plans WHERE id = OLD.plan_id) THEN 'upgrade'
        WHEN p.price < (SELECT price FROM plans WHERE id = OLD.plan_id) THEN 'downgrade'
        ELSE 'renew'
      END
    FROM plans p
    WHERE p.id = NEW.plan_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_subscription_history
  AFTER UPDATE ON subscriptions
  FOR EACH ROW
  WHEN (OLD.plan_id IS DISTINCT FROM NEW.plan_id)
  EXECUTE FUNCTION update_subscription_history();

-- 6. 트리거: 구독 취소 시 이력 종료
CREATE OR REPLACE FUNCTION end_subscription_history()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('canceled', 'expired') AND OLD.status = 'active' THEN
    UPDATE subscription_history
    SET 
      ended_at = NOW(),
      change_reason = CASE 
        WHEN NEW.status = 'canceled' THEN 'cancel'
        WHEN NEW.status = 'expired' THEN 'expire'
      END,
      updated_at = NOW()
    WHERE subscription_id = NEW.id
      AND ended_at IS NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_end_subscription_history
  AFTER UPDATE ON subscriptions
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION end_subscription_history();

-- 7. 확인 쿼리
SELECT 
  sh.id,
  sh.user_id,
  p.email as user_email,
  sh.plan_name,
  sh.plan_price,
  sh.plan_interval,
  sh.started_at,
  sh.ended_at,
  sh.duration_days,
  sh.change_reason,
  sh.change_note
FROM subscription_history sh
LEFT JOIN profiles p ON p.id = sh.user_id
ORDER BY sh.started_at DESC
LIMIT 10;

-- ============================================
-- 사용 예시
-- ============================================
-- 특정 사용자의 구독 이력 조회:
-- SELECT * FROM subscription_history 
-- WHERE user_id = 'user-uuid' 
-- ORDER BY started_at DESC;

-- 현재 활성 구독 이력:
-- SELECT * FROM subscription_history 
-- WHERE ended_at IS NULL;

-- 플랜별 사용 통계:
-- SELECT 
--   plan_name,
--   COUNT(*) as usage_count,
--   AVG(duration_days) as avg_duration_days
-- FROM subscription_history
-- WHERE ended_at IS NOT NULL
-- GROUP BY plan_name;
-- ============================================

