-- ============================================
-- 거래 내역 테이블 (수익 추적)
-- ============================================
-- 작성일: 2025년 12월 22일
-- 목적: 모든 거래 내역 및 수익 출처 추적

-- 1. transactions 테이블 생성
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 거래 주체
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- 거래 유형
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('subscription', 'product_sale', 'product_rental', 'refund', 'other')),
  
  -- 거래 금액
  amount INTEGER NOT NULL,
  currency TEXT DEFAULT 'KRW',
  
  -- 관련 정보
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  
  -- 거래 상태
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded', 'canceled')),
  
  -- 결제 정보
  payment_method TEXT CHECK (payment_method IN ('card', 'bank_transfer', 'virtual_account', 'phone', 'other')),
  payment_provider TEXT, -- 'portone', 'inicis', etc.
  payment_id TEXT, -- 외부 결제 시스템 ID
  
  -- 상세 정보
  description TEXT,
  metadata JSONB, -- 추가 정보 (상품명, 수량 등)
  
  -- 메타 정보
  transaction_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_subscription_id ON transactions(subscription_id);
CREATE INDEX IF NOT EXISTS idx_transactions_product_id ON transactions(product_id);

-- 3. RLS 정책 설정
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- 사용자는 본인 거래 내역만 조회 가능
CREATE POLICY "Users can view own transactions"
  ON transactions
  FOR SELECT
  USING (auth.uid() = user_id);

-- 서비스 롤은 모든 거래 관리 가능
CREATE POLICY "Service role can manage all transactions"
  ON transactions
  FOR ALL
  USING (auth.role() = 'service_role');

-- 4. 트리거: updated_at 자동 업데이트
CREATE OR REPLACE FUNCTION update_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_transactions_updated_at();

-- 5. 트리거: 거래 완료 시 completed_at 설정
CREATE OR REPLACE FUNCTION set_transaction_completed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    NEW.completed_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_transaction_completed_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION set_transaction_completed_at();

-- 6. 뷰: 수익 요약
CREATE OR REPLACE VIEW revenue_summary AS
SELECT 
  transaction_type,
  COUNT(*) as transaction_count,
  SUM(amount) as total_amount,
  AVG(amount) as avg_amount,
  MIN(amount) as min_amount,
  MAX(amount) as max_amount
FROM transactions
WHERE status = 'completed'
GROUP BY transaction_type;

-- 7. 뷰: 일별 수익
CREATE OR REPLACE VIEW daily_revenue AS
SELECT 
  DATE(transaction_date) as date,
  transaction_type,
  COUNT(*) as transaction_count,
  SUM(amount) as total_amount
FROM transactions
WHERE status = 'completed'
GROUP BY DATE(transaction_date), transaction_type
ORDER BY date DESC, transaction_type;

-- 8. 뷰: 상품별 수익
CREATE OR REPLACE VIEW product_revenue AS
SELECT 
  p.id as product_id,
  p.name as product_name,
  p.category,
  COUNT(t.id) as transaction_count,
  SUM(t.amount) as total_revenue
FROM products p
LEFT JOIN transactions t ON t.product_id = p.id AND t.status = 'completed'
WHERE t.transaction_type IN ('product_sale', 'product_rental')
GROUP BY p.id, p.name, p.category
ORDER BY total_revenue DESC NULLS LAST;

-- 9. 확인 쿼리
SELECT 
  id,
  user_id,
  transaction_type,
  amount,
  status,
  payment_method,
  description,
  transaction_date
FROM transactions
ORDER BY transaction_date DESC
LIMIT 10;

-- 10. 수익 요약 확인
SELECT * FROM revenue_summary;

-- ============================================
-- 사용 예시
-- ============================================
-- 구독 수익 조회:
-- SELECT SUM(amount) as subscription_revenue
-- FROM transactions
-- WHERE transaction_type = 'subscription' AND status = 'completed';

-- 구멍가게 수익 조회:
-- SELECT SUM(amount) as product_revenue
-- FROM transactions
-- WHERE transaction_type IN ('product_sale', 'product_rental') 
-- AND status = 'completed';

-- 월별 수익:
-- SELECT 
--   DATE_TRUNC('month', transaction_date) as month,
--   transaction_type,
--   SUM(amount) as revenue
-- FROM transactions
-- WHERE status = 'completed'
-- GROUP BY DATE_TRUNC('month', transaction_date), transaction_type
-- ORDER BY month DESC;
-- ============================================

