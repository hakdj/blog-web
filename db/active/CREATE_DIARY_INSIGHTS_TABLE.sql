-- db/active/CREATE_DIARY_INSIGHTS_TABLE.sql

-- diary_insights 테이블 생성 (AI 기반 일기 분석 결과 저장)
CREATE TABLE public.diary_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    analysis_month TEXT NOT NULL, -- 예: '2026-03' (월별 분석)
    analysis_date TIMESTAMPTZ DEFAULT now(), -- 분석이 수행된 날짜 및 시간
    sentiment_score JSONB, -- AI가 판단한 감성 점수 (예: {positive: 0.8, negative: 0.1, neutral: 0.1})
    keywords JSONB, -- 주요 감정 키워드, 토픽 키워드 (예: ['행복', '스트레스', '친구'])
    summary TEXT, -- AI가 요약한 월별 감성/일기 요약
    start_date TIMESTAMPTZ, -- 분석 대상 일기 범위 시작일
    end_date TIMESTAMPTZ, -- 분석 대상 일기 범위 종료일
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),

    UNIQUE (user_id, analysis_month) -- 사용자별 월별 분석은 하나만 존재
);

-- 인덱스 추가 (조회 성능 향상)
CREATE INDEX ON public.diary_insights (user_id, analysis_month);
CREATE INDEX ON public.diary_insights (analysis_date DESC);

-- RLS (Row Level Security) 설정
ALTER TABLE public.diary_insights ENABLE ROW LEVEL SECURITY;

-- 모든 사용자에게 조회 권한 부여 (필요시 수정)
-- 정책: 사용자는 자신의 일기 분석만 볼 수 있고, 관리자는 모두 볼 수 있도록
CREATE POLICY "Users can view their own diary insights" ON public.diary_insights
  FOR SELECT
  USING (auth.uid() = user_id);

-- 사용자는 자신의 일기 분석만 생성할 수 있음
CREATE POLICY "Users can insert their own diary insights" ON public.diary_insights
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 사용자는 자신의 일기 분석만 업데이트할 수 있음
CREATE POLICY "Users can update their own diary insights" ON public.diary_insights
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 사용자는 자신의 일기 분석만 삭제할 수 있음
CREATE POLICY "Users can delete their own diary insights" ON public.diary_insights
  FOR DELETE
  USING (auth.uid() = user_id);

-- (선택 사항) 관리자를 위한 정책 추가 (lib/auth.ts 의 isAdmin() 로직과 연동 필요)
-- 이 정책은 백엔드에서 서비스 역할 키로 우회하거나, 관리자용 RLS 로직을 추가해야 합니다.
-- 예를 들어:
-- CREATE POLICY "Admins can view all diary insights" ON public.diary_insights
--   FOR SELECT
--   USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE));


