-- ============================================
-- 빌구독(BillGudok) 프로젝트 완전 설정 SQL
-- 구독형 제품 대여 플랫폼
-- ============================================
-- 이 파일 하나만 실행하면 모든 설정이 완료됩니다!
-- ============================================

-- ============================================
-- 1단계: profiles 테이블에 닉네임 컬럼 추가
-- ============================================
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS nickname TEXT;

CREATE INDEX IF NOT EXISTS idx_profiles_nickname ON profiles(nickname);

-- ============================================
-- 2단계: profiles 테이블에 주소 관련 컬럼 추가
-- ============================================
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS address_detail TEXT,
ADD COLUMN IF NOT EXISTS postal_code TEXT,
ADD COLUMN IF NOT EXISTS recipient_name TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT;

-- ============================================
-- 3단계: plans 테이블 업데이트 (빌구독 플랜)
-- ============================================

-- 기존 plans 테이블 데이터 삭제
DELETE FROM plans;

-- tier 제약 조건 수정
ALTER TABLE plans DROP CONSTRAINT IF EXISTS plans_tier_check;
ALTER TABLE plans ADD CONSTRAINT plans_tier_check CHECK (tier IN ('standard', 'basic', 'starter', 'pro', 'enterprise'));

-- 새로운 플랜 데이터 입력
-- 월간: 14,900원
-- 연간: 150,000원 (정확히 15만원, 약 16% 할인)
INSERT INTO plans (tier, interval, name, price, features, is_active) VALUES
  -- 월간 플랜
  ('standard', 'month', '빌구독 월간', 14900, '{
    "subscription_type": "monthly",
    "rental_limit": 1,
    "rental_categories": ["all"],
    "delivery_fee": 0,
    "free_trial": false
  }', true),
  
  -- 연간 플랜 (15만원, 16% 할인)
  ('standard', 'year', '빌구독 연간', 150000, '{
    "subscription_type": "yearly",
    "rental_limit": 1,
    "rental_categories": ["all"],
    "delivery_fee": 0,
    "free_trial": false,
    "discount_rate": 16
  }', true);

-- ============================================
-- 4단계: 프로필 자동 생성 함수 업데이트 (닉네임 포함)
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nickname)
  VALUES (NEW.id, NEW.email, NULL);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 트리거는 이미 있으면 그대로 유지
-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 확인 쿼리 (실행 후 확인용)
-- ============================================
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'profiles' 
-- ORDER BY ordinal_position;

-- SELECT tier, interval, name, price, is_active 
-- FROM plans 
-- ORDER BY interval;

-- ============================================
-- ✅ 완료!
-- ============================================
-- 실행 완료 후:
-- 1. profiles 테이블에 nickname, address, address_detail, postal_code, recipient_name, phone 컬럼 추가됨
-- 2. plans 테이블에 빌구독 월간/연간 플랜 2개 추가됨
-- 3. 프로필 자동 생성 함수 업데이트됨
-- ============================================

