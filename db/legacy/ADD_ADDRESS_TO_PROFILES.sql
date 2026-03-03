-- ============================================
-- profiles 테이블에 주소 관련 컬럼 추가
-- ============================================

-- 주소 관련 컬럼 추가 (없는 경우만)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS address_detail TEXT,
ADD COLUMN IF NOT EXISTS postal_code TEXT,
ADD COLUMN IF NOT EXISTS recipient_name TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT;

-- ============================================
-- ✅ 완료!
-- ============================================
-- 이제 profiles 테이블에 주소 관련 컬럼이 추가되었습니다.
-- - address: 기본 주소
-- - address_detail: 상세 주소
-- - postal_code: 우편번호
-- - recipient_name: 수령인 이름
-- - phone: 전화번호
-- ============================================





