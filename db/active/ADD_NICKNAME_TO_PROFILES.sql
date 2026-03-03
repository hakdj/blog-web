-- ============================================
-- profiles 테이블에 nickname 컬럼 추가
-- ============================================

-- nickname 컬럼 추가 (없는 경우만)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS nickname TEXT;

-- nickname에 대한 인덱스 추가 (검색 성능 향상)
CREATE INDEX IF NOT EXISTS idx_profiles_nickname ON profiles(nickname);

-- ============================================
-- ✅ 완료!
-- ============================================
-- 이제 profiles 테이블에 nickname 컬럼이 추가되었습니다.
-- ============================================

