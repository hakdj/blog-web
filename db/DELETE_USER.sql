-- ============================================
-- 특정 사용자 삭제 SQL
-- ============================================
-- 사용법: 이메일 주소를 변경해서 사용하세요

-- 1. 프로필 삭제 (먼저 삭제해야 함 - 외래키 제약 때문)
DELETE FROM profiles 
WHERE email = 'solutiontop7@naver.com';

-- 2. 사용자 삭제
-- 주의: auth.users는 직접 삭제가 제한될 수 있으므로
-- Supabase 대시보드에서 삭제하는 것을 권장합니다
-- DELETE FROM auth.users 
-- WHERE email = 'solutiontop7@naver.com';

-- ============================================
-- 확인 쿼리 (실행 전에 확인)
-- ============================================
-- SELECT * FROM profiles WHERE email = 'solutiontop7@naver.com';
-- SELECT * FROM auth.users WHERE email = 'solutiontop7@naver.com';

