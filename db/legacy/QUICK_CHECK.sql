-- ============================================
-- 빠른 확인 쿼리 (플랜 확인)
-- ============================================

-- 플랜 6개 확인
SELECT tier, interval, name, price 
FROM plans 
ORDER BY tier, interval;

-- 결과가 6개 나오면 성공!
-- Basic 월간, Basic 연간
-- Premium 월간, Premium 연간  
-- Ultra 월간, Ultra 연간

