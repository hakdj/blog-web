-- ============================================
-- 플랜 데이터 확인 및 생성 (요금제 페이지 문제 해결)
-- ============================================

-- 1. 기존 플랜 확인
SELECT COUNT(*) as plan_count FROM plans WHERE is_active = true;

-- 2. 플랜이 없으면 생성
-- 먼저 plans 테이블이 있는지 확인하고, 없으면 생성
DO $$
BEGIN
  -- plans 테이블이 없으면 생성
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'plans') THEN
    CREATE TABLE plans (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tier TEXT NOT NULL,
      interval TEXT NOT NULL CHECK (interval IN ('month', 'year')),
      name TEXT NOT NULL,
      price INTEGER NOT NULL,
      features JSONB,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  END IF;
END $$;

-- 3. 기존 플랜이 없으면 새로 생성
INSERT INTO plans (tier, interval, name, price, features, is_active)
SELECT * FROM (VALUES
  ('standard', 'month', '라떼 방구석 월간', 14900, '{"subscription_type": "monthly", "rental_limit": 1, "rental_categories": ["all"], "delivery_fee": 0, "free_trial": false}'::jsonb, true),
  ('standard', 'year', '라떼 방구석 연간', 150000, '{"subscription_type": "yearly", "rental_limit": 1, "rental_categories": ["all"], "delivery_fee": 0, "free_trial": false, "discount_rate": 16}'::jsonb, true)
) AS v(tier, interval, name, price, features, is_active)
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE is_active = true);

-- 4. RLS 정책 설정
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active plans" ON plans;
CREATE POLICY "Anyone can view active plans" ON plans
  FOR SELECT USING (is_active = true);

-- 5. 결과 확인
SELECT tier, interval, name, price, is_active 
FROM plans 
WHERE is_active = true
ORDER BY interval;

