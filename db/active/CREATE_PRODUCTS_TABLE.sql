-- ============================================
-- 구멍가게 상품 관리 테이블
-- ============================================
-- 작성일: 2025년 12월 22일
-- 목적: 구멍가게 상품 및 재고 관리

-- 1. products 테이블 생성
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 상품 기본 정보
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('toy', 'snack', 'game', 'stationery', 'etc')),
  
  -- 가격 정보
  price INTEGER NOT NULL CHECK (price >= 0),
  rental_price INTEGER CHECK (rental_price >= 0),
  rental_period_days INTEGER DEFAULT 7,
  
  -- 재고 정보
  stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  reserved_quantity INTEGER NOT NULL DEFAULT 0 CHECK (reserved_quantity >= 0),
  available_quantity INTEGER GENERATED ALWAYS AS (stock_quantity - reserved_quantity) STORED,
  
  -- 상품 상태
  is_available BOOLEAN DEFAULT true,
  is_rental BOOLEAN DEFAULT false,
  is_for_sale BOOLEAN DEFAULT true,
  
  -- 이미지
  image_url TEXT,
  thumbnail_url TEXT,
  
  -- 메타 정보
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_is_available ON products(is_available);
CREATE INDEX IF NOT EXISTS idx_products_stock_quantity ON products(stock_quantity);

-- 3. RLS 정책 설정
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- 모든 사용자는 상품 조회 가능
CREATE POLICY "Anyone can view available products"
  ON products
  FOR SELECT
  USING (is_available = true);

-- 서비스 롤은 모든 상품 관리 가능
CREATE POLICY "Service role can manage all products"
  ON products
  FOR ALL
  USING (auth.role() = 'service_role');

-- 4. 트리거: updated_at 자동 업데이트
CREATE OR REPLACE FUNCTION update_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_products_updated_at();

-- 5. 확인 쿼리
SELECT 
  id,
  name,
  category,
  price,
  rental_price,
  stock_quantity,
  reserved_quantity,
  available_quantity,
  is_available,
  is_rental,
  is_for_sale
FROM products
ORDER BY category, name;

-- ============================================
-- 카테고리 설명
-- ============================================
-- toy: 장난감
-- snack: 간식/불량식품
-- game: 게임기/게임
-- stationery: 문구류
-- etc: 기타
-- ============================================

