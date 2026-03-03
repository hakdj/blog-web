-- 라떼 친구 일정/할 일 테이블

create table if not exists assistant_tasks (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  note text,
  due_date date,
  is_done boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_assistant_tasks_user_id on assistant_tasks(user_id);
create index if not exists idx_assistant_tasks_due_date on assistant_tasks(due_date);

alter table assistant_tasks enable row level security;

drop policy if exists "Users can view own tasks" on assistant_tasks;
create policy "Users can view own tasks" on assistant_tasks
  for select using (auth.uid() = user_id);

drop policy if exists "Users can insert own tasks" on assistant_tasks;
create policy "Users can insert own tasks" on assistant_tasks
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update own tasks" on assistant_tasks;
create policy "Users can update own tasks" on assistant_tasks
  for update using (auth.uid() = user_id);

drop policy if exists "Users can delete own tasks" on assistant_tasks;
create policy "Users can delete own tasks" on assistant_tasks
  for delete using (auth.uid() = user_id);

-- 라떼 친구 하루 메모/목표 테이블
create table if not exists assistant_daily_notes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  note_date date not null,
  goal text,
  memo text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, note_date)
);

create index if not exists idx_assistant_daily_notes_user_id on assistant_daily_notes(user_id);
create index if not exists idx_assistant_daily_notes_date on assistant_daily_notes(note_date desc);

alter table assistant_daily_notes enable row level security;

drop policy if exists "Users can view own daily notes" on assistant_daily_notes;
create policy "Users can view own daily notes" on assistant_daily_notes
  for select using (auth.uid() = user_id);

drop policy if exists "Users can insert own daily notes" on assistant_daily_notes;
create policy "Users can insert own daily notes" on assistant_daily_notes
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update own daily notes" on assistant_daily_notes;
create policy "Users can update own daily notes" on assistant_daily_notes
  for update using (auth.uid() = user_id);

drop policy if exists "Users can delete own daily notes" on assistant_daily_notes;
create policy "Users can delete own daily notes" on assistant_daily_notes
  for delete using (auth.uid() = user_id);
