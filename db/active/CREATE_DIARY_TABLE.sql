-- 추억의 일기장 테이블

create table if not exists diary_entries (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  content text not null,
  entry_date date not null default (now()::date),
  mood text,
  tags text[] default array[]::text[],
  image_urls text[] default array[]::text[],
  visibility text not null default 'private' check (visibility in ('private', 'public')),
  ai_prompt text,
  ai_generated boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_diary_entries_user_id on diary_entries(user_id);
create index if not exists idx_diary_entries_visibility on diary_entries(visibility);
create index if not exists idx_diary_entries_entry_date on diary_entries(entry_date desc);

alter table diary_entries enable row level security;

-- 공개 글은 모두 조회 가능, 개인 글은 본인만
drop policy if exists "Users can view diary entries" on diary_entries;
create policy "Users can view diary entries" on diary_entries
  for select using (auth.uid() = user_id or visibility = 'public');

drop policy if exists "Users can insert own diary entries" on diary_entries;
create policy "Users can insert own diary entries" on diary_entries
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update own diary entries" on diary_entries;
create policy "Users can update own diary entries" on diary_entries
  for update using (auth.uid() = user_id);

drop policy if exists "Users can delete own diary entries" on diary_entries;
create policy "Users can delete own diary entries" on diary_entries
  for delete using (auth.uid() = user_id);
