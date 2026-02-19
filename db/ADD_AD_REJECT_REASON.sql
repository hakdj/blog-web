-- 광고 반려 사유 저장 컬럼 추가
ALTER TABLE user_ads
ADD COLUMN IF NOT EXISTS reject_reason TEXT;

ALTER TABLE user_ads
ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_user_ads_rejected_at ON user_ads(rejected_at DESC);
