-- ============================================
-- 빌구독(BillGudok) 구독 플랜으로 업데이트 (수정본)
-- 구독형 제품 대여 플랫폼
-- ============================================

-- 기존 plans 테이블 데이터 삭제
DELETE FROM plans;

-- tier 제약 조건 수정
ALTER TABLE plans DROP CONSTRAINT IF EXISTS plans_tier_check;
ALTER TABLE plans ADD CONSTRAINT plans_tier_check CHECK (tier IN ('standard', 'basic', 'starter', 'pro', 'enterprise'));

-- 새로운 플랜 데이터 입력
-- 월간: 14,900원
-- 연간: 150,000원 (정확히 15만원)
-- 할인율 계산: (14900 * 12 - 150000) / (14900 * 12) = 16.11% → 16%
INSERT INTO plans (tier, interval, name, price, features, is_active) VALUES
  -- 월간 플랜
  ('standard', 'month', '빌구독 월간', 14900, '{
    "subscription_type": "monthly",
    "rental_limit": 1,
    "rental_categories": ["all"],
    "delivery_fee": 0,
    "free_trial": false
  }', true),
  
  -- 연간 플랜 (15만원, 약 16% 할인)
  ('standard', 'year', '빌구독 연간', 150000, '{
    "subscription_type": "yearly",
    "rental_limit": 1,
    "rental_categories": ["all"],
    "delivery_fee": 0,
    "free_trial": false,
    "discount_rate": 16
  }', true);

-- ============================================
-- 확인 쿼리
-- ============================================
-- SELECT tier, interval, name, price, features, is_active 
-- FROM plans 
-- ORDER BY interval, tier;

-- ============================================
-- ✅ 완료!
-- ============================================
-- 이제 구독 플랜이 1개(월간/연간)로 설정되었습니다.
-- 월간: 14,900원
-- 연간: 150,000원 (16% 할인)
-- ============================================

