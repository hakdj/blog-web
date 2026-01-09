-- ============================================
-- 유료 구독자 광고 시스템
-- ============================================
-- 작성일: 2026년 1월 9일
-- 목적: 유료 구독자가 자신의 광고를 게시하고 통계를 확인할 수 있는 시스템

-- 1. 광고 테이블 생성
CREATE TABLE IF NOT EXISTS user_ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  link_url TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending', 'rejected')),
  start_date TIMESTAMP DEFAULT NOW(),
  end_date TIMESTAMP,
  views INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. 광고 클릭 추적 테이블
CREATE TABLE IF NOT EXISTS ad_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id UUID NOT NULL REFERENCES user_ads(id) ON DELETE CASCADE,
  clicked_at TIMESTAMP DEFAULT NOW(),
  user_ip TEXT
);

-- 3. 광고 조회 추적 테이블
CREATE TABLE IF NOT EXISTS ad_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id UUID NOT NULL REFERENCES user_ads(id) ON DELETE CASCADE,
  viewed_at TIMESTAMP DEFAULT NOW(),
  user_ip TEXT
);

-- 4. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_user_ads_user_id ON user_ads(user_id);
CREATE INDEX IF NOT EXISTS idx_user_ads_status ON user_ads(status);
CREATE INDEX IF NOT EXISTS idx_user_ads_created_at ON user_ads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ad_clicks_ad_id ON ad_clicks(ad_id);
CREATE INDEX IF NOT EXISTS idx_ad_views_ad_id ON ad_views(ad_id);

-- 5. RLS (Row Level Security) 정책 설정
ALTER TABLE user_ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_views ENABLE ROW LEVEL SECURITY;

-- 모든 사람이 활성 광고를 볼 수 있음
CREATE POLICY "Anyone can view active ads"
  ON user_ads FOR SELECT
  USING (status = 'active');

-- 광고 소유자만 자신의 광고를 수정/삭제할 수 있음
CREATE POLICY "Users can manage their own ads"
  ON user_ads FOR ALL
  USING (auth.uid() = user_id);

-- 광고 소유자만 자신의 광고 통계를 볼 수 있음
CREATE POLICY "Users can view their ad clicks"
  ON ad_clicks FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM user_ads 
    WHERE user_ads.id = ad_clicks.ad_id 
    AND user_ads.user_id = auth.uid()
  ));

CREATE POLICY "Users can view their ad views"
  ON ad_views FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM user_ads 
    WHERE user_ads.id = ad_views.ad_id 
    AND user_ads.user_id = auth.uid()
  ));

-- 모든 사람이 클릭/조회를 기록할 수 있음
CREATE POLICY "Anyone can record ad clicks"
  ON ad_clicks FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can record ad views"
  ON ad_views FOR INSERT
  WITH CHECK (true);

-- 6. 광고 통계 업데이트 트리거
CREATE OR REPLACE FUNCTION update_ad_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_TABLE_NAME = 'ad_clicks' THEN
    UPDATE user_ads 
    SET clicks = clicks + 1, updated_at = NOW()
    WHERE id = NEW.ad_id;
  ELSIF TG_TABLE_NAME = 'ad_views' THEN
    UPDATE user_ads 
    SET views = views + 1, updated_at = NOW()
    WHERE id = NEW.ad_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_ad_clicks
  AFTER INSERT ON ad_clicks
  FOR EACH ROW
  EXECUTE FUNCTION update_ad_stats();

CREATE TRIGGER trigger_update_ad_views
  AFTER INSERT ON ad_views
  FOR EACH ROW
  EXECUTE FUNCTION update_ad_stats();

-- 7. updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_user_ads_updated_at
  BEFORE UPDATE ON user_ads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 8. 샘플 데이터 확인 쿼리
-- SELECT 
--   ua.id,
--   ua.title,
--   ua.views,
--   ua.clicks,
--   CASE 
--     WHEN ua.views > 0 THEN ROUND((ua.clicks::numeric / ua.views) * 100, 2)
--     ELSE 0
--   END as click_rate_percent,
--   ua.created_at
-- FROM user_ads ua
-- WHERE ua.user_id = auth.uid()
-- ORDER BY ua.created_at DESC;
