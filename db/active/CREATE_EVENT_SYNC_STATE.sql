-- KCISA 동기화 진행 상태 저장
-- 여러 번 나눠서 실행해도 전체 페이지를 순환적으로 수집하기 위해 사용

create table if not exists event_sync_state (
  source text primary key,
  next_page integer not null default 1,
  total_pages integer,
  next_area_index integer,
  total_areas integer,
  last_attempt_at timestamptz,
  last_success_at timestamptz,
  last_status text,
  last_error text,
  last_count integer,
  updated_at timestamptz not null default now()
);

alter table if exists event_sync_state
  add column if not exists next_area_index integer,
  add column if not exists total_areas integer,
  add column if not exists last_attempt_at timestamptz,
  add column if not exists last_success_at timestamptz,
  add column if not exists last_status text,
  add column if not exists last_error text,
  add column if not exists last_count integer;
