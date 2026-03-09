-- ============================================
-- products 확장: 내 상품 추적 + 외부몰 링크 연동
-- ============================================
-- 목적:
-- 1) 등록자(owner_user_id) 저장해서 "내 상품" 관리 가능
-- 2) 스마트스토어/쿠팡 등 외부 URL 연결 가능

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS external_url TEXT,
  ADD COLUMN IF NOT EXISTS external_platform TEXT
    CHECK (external_platform IN ('smartstore', 'coupang', 'etc'));

CREATE INDEX IF NOT EXISTS idx_products_owner_user_id ON products(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_products_external_platform ON products(external_platform);

-- 참고:
-- 기존 데이터는 owner_user_id가 NULL로 남습니다.
-- 이후 새로 등록하는 상품부터 owner_user_id가 자동 저장됩니다.
