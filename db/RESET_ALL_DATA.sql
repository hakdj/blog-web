-- ============================================
-- 모든 사용자 데이터 삭제 (초기화)
-- ⚠️ 주의: 모든 데이터가 삭제됩니다!
-- ============================================

-- 순서가 중요합니다 (외래키 제약 때문)

-- 1. 사용량 로그 삭제
DELETE FROM usage_logs;

-- 2. 블로그 글 삭제
DELETE FROM blog_posts;

-- 3. 결제 내역 삭제
DELETE FROM payments;

-- 4. 구독 삭제
DELETE FROM subscriptions;

-- 5. 프로필 삭제
DELETE FROM profiles;

-- 6. 사용자 삭제
-- 주의: auth.users는 Supabase 대시보드에서 삭제하는 것을 권장합니다
-- 또는 다음 명령으로 삭제 (Service Role Key 필요)
-- DELETE FROM auth.users;

-- ============================================
-- 확인 쿼리
-- ============================================
-- SELECT COUNT(*) FROM usage_logs;
-- SELECT COUNT(*) FROM blog_posts;
-- SELECT COUNT(*) FROM payments;
-- SELECT COUNT(*) FROM subscriptions;
-- SELECT COUNT(*) FROM profiles;

-- ============================================
-- 완료 후 해야 할 일
-- ============================================
-- 1. db/CREATE_PROFILES_AND_TRIGGER.sql 실행
-- 2. 회원가입 테스트

