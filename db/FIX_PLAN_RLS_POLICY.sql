-- ============================================
-- 플랜 RLS 정책 수정 (플랜 불러오기 문제 해결)
-- ============================================
-- 이 파일은 플랜을 불러올 수 없는 문제를 해결합니다.
-- UPDATE_TO_BILLGUDOK_PLAN_FIXED.sql 실행 후에도 플랜이 안 보이면
-- 이 파일을 실행하세요.
-- ============================================

-- 1. plans 테이블에 RLS 활성화 확인
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

-- 2. 기존 정책 삭제 (있으면)
DROP POLICY IF EXISTS "Anyone can view active plans" ON plans;

-- 3. 새로운 정책 추가: 누구나 활성화된 플랜을 볼 수 있음
CREATE POLICY "Anyone can view active plans" ON plans
  FOR SELECT USING (is_active = true);

-- ============================================
-- 확인 쿼리 (실행 후 확인)
-- ============================================
-- SELECT tier, interval, name, price, is_active 
-- FROM plans 
-- ORDER BY interval;

-- ============================================
-- ✅ 완료!
-- ============================================
-- 이제 플랜을 불러올 수 있습니다.
-- 웹사이트의 /pricing 페이지를 새로고침해보세요.
-- ============================================


