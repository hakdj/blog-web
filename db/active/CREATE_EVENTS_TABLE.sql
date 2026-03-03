-- ============================================
-- 이벤트 일정 테이블 생성
-- 전국 축제, 지역 일정, 지역 특색, 지역 광고 등을 저장
-- ============================================

-- 이벤트 테이블 생성
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT NOT NULL CHECK (event_type IN ('festival', 'local_feature', 'local_ad', 'other')),
  region TEXT NOT NULL, -- 서울, 부산, 경기, 인천, 대구, 대전, 광주, 울산, 세종, 강원, 충북, 충남, 전북, 전남, 경북, 경남, 제주
  location TEXT, -- 상세 위치
  start_date DATE NOT NULL,
  end_date DATE,
  image_url TEXT,
  link_url TEXT, -- 외부 링크 (선택)
  contact_info TEXT, -- 연락처 정보
  is_featured BOOLEAN DEFAULT false, -- 추천 이벤트 여부
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성 (검색 성능 향상)
CREATE INDEX IF NOT EXISTS idx_events_event_type ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_region ON events(region);
CREATE INDEX IF NOT EXISTS idx_events_start_date ON events(start_date);
CREATE INDEX IF NOT EXISTS idx_events_is_active ON events(is_active);
CREATE INDEX IF NOT EXISTS idx_events_is_featured ON events(is_featured);

-- RLS 활성화
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- 누구나 활성화된 이벤트를 볼 수 있도록 정책 설정
DROP POLICY IF EXISTS "Anyone can view active events" ON events;
CREATE POLICY "Anyone can view active events" ON events
  FOR SELECT USING (is_active = true);

-- 관리자만 이벤트를 추가/수정/삭제할 수 있도록 (서비스 역할 키 사용)
-- 일반 사용자는 읽기만 가능

-- 샘플 데이터 삽입 (테스트용)
INSERT INTO events (title, description, event_type, region, location, start_date, end_date, is_featured, is_active) VALUES
  ('부산국제영화제', '아시아 최대 규모의 영화제', 'festival', '부산', '해운대구', '2024-10-03', '2024-10-12', true, true),
  ('제주 유채꽃 축제', '봄을 알리는 제주의 대표 축제', 'festival', '제주', '제주시', '2024-04-01', '2024-04-30', true, true),
  ('전주 한옥마을 문화축제', '전통 한옥의 아름다움을 느낄 수 있는 축제', 'festival', '전북', '전주시', '2024-05-01', '2024-05-05', false, true),
  ('서울 랜턴 페스티벌', '서울의 밤을 밝히는 아름다운 랜턴 축제', 'festival', '서울', '청계천', '2024-11-01', '2024-11-30', true, true),
  ('경주 벚꽃 축제', '봄의 경주를 물들인 벚꽃 축제', 'festival', '경북', '경주시', '2024-04-05', '2024-04-14', false, true),
  ('부산 해운대 모래축제', '해운대 해변에서 열리는 모래조각 축제', 'festival', '부산', '해운대구', '2024-06-01', '2024-06-09', false, true),
  ('강릉 커피축제', '강릉의 특색 있는 커피 문화를 소개하는 축제', 'local_feature', '강원', '강릉시', '2024-05-10', '2024-05-12', false, true),
  ('안동 하회마을 전통문화 체험', '유네스코 세계문화유산 하회마을의 전통문화 체험', 'local_feature', '경북', '안동시', '2024-04-01', '2024-12-31', false, true),
  ('여수 밤바다 불꽃축제', '여수 아름다운 밤바다를 수놓는 불꽃 축제', 'festival', '전남', '여수시', '2024-08-01', '2024-08-31', true, true),
  ('태백산 눈축제', '겨울 태백산의 설원을 즐기는 축제', 'festival', '강원', '태백시', '2024-12-20', '2025-01-05', false, true);

-- ============================================
-- ✅ 완료!
-- ============================================
-- 이제 events 테이블이 생성되었고 샘플 데이터가 추가되었습니다.
-- 이벤트 유형:
--   - festival: 축제
--   - local_feature: 지역 특색
--   - local_ad: 지역 광고
--   - other: 기타
-- ============================================
