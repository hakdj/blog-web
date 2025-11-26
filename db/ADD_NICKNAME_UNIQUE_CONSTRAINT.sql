-- ============================================
-- 닉네임 중복 방지 제약 조건 추가
-- ============================================

-- 기존 인덱스 삭제 (있으면)
DROP INDEX IF EXISTS idx_profiles_nickname;

-- 닉네임에 UNIQUE 제약 조건 추가
-- NULL 값은 허용 (기존 사용자용)
ALTER TABLE profiles 
DROP CONSTRAINT IF EXISTS profiles_nickname_unique;

-- UNIQUE 제약 조건 추가 (NULL은 중복 허용)
CREATE UNIQUE INDEX idx_profiles_nickname_unique 
ON profiles(nickname) 
WHERE nickname IS NOT NULL;

-- ============================================
-- ✅ 완료!
-- ============================================
-- 이제 닉네임은 중복될 수 없습니다.
-- NULL 값은 여러 개 허용 (기존 사용자용)
-- ============================================

