-- ============================================
-- 알파블로그 구조로 플랜 업데이트
-- 베이직/스타터/프로/엔터프라이즈 × 월간/연간 = 8개 플랜
-- ============================================

-- 기존 plans 테이블 데이터 삭제
DELETE FROM plans;

-- tier 제약 조건 수정 (basic, starter, pro, enterprise)
ALTER TABLE plans DROP CONSTRAINT IF EXISTS plans_tier_check;
ALTER TABLE plans ADD CONSTRAINT plans_tier_check CHECK (tier IN ('basic', 'starter', 'pro', 'enterprise'));

-- 새로운 플랜 데이터 입력 (참고: alphablogogo.com)
INSERT INTO plans (tier, interval, name, price, features, is_active) VALUES
  -- 베이직 (Basic) - 무료 플랜
  ('basic', 'month', '베이직', 0, '{
    "service_uses_per_month": 1,
    "agent_mode": 1,
    "bulk_mode": 30,
    "storage_months": 3
  }', true),
  ('basic', 'year', '베이직', 0, '{
    "service_uses_per_month": 12,
    "agent_mode": 12,
    "bulk_mode": 360,
    "storage_months": 3
  }', true),
  
  -- 스타터 (Starter)
  ('starter', 'month', '스타터', 9900, '{
    "service_uses_per_month": 30,
    "agent_mode": 30,
    "bulk_mode": 900,
    "storage_months": 3
  }', true),
  ('starter', 'year', '스타터', 99000, '{
    "service_uses_per_month": 360,
    "agent_mode": 360,
    "bulk_mode": 10800,
    "storage_months": 3
  }', true),
  
  -- 프로 (Pro)
  ('pro', 'month', '프로', 19900, '{
    "service_uses_per_month": 70,
    "agent_mode": 70,
    "bulk_mode": 2100,
    "storage_months": 3
  }', true),
  ('pro', 'year', '프로', 199000, '{
    "service_uses_per_month": 840,
    "agent_mode": 840,
    "bulk_mode": 25200,
    "storage_months": 3
  }', true),
  
  -- 엔터프라이즈 (Enterprise)
  ('enterprise', 'month', '엔터프라이즈', 49900, '{
    "service_uses_per_month": 200,
    "agent_mode": 200,
    "bulk_mode": 6000,
    "storage_months": 3
  }', true),
  ('enterprise', 'year', '엔터프라이즈', 499000, '{
    "service_uses_per_month": 2400,
    "agent_mode": 2400,
    "bulk_mode": 72000,
    "storage_months": 3
  }', true);

-- 확인 쿼리
SELECT tier, interval, name, price, features
FROM plans
ORDER BY 
  CASE tier 
    WHEN 'basic' THEN 1
    WHEN 'starter' THEN 2
    WHEN 'pro' THEN 3
    WHEN 'enterprise' THEN 4
  END,
  CASE interval 
    WHEN 'month' THEN 1
    WHEN 'year' THEN 2
  END;

