create extension if not exists "uuid-ossp";

create table if not exists public.ai_request_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists ai_request_logs_user_created_idx
  on public.ai_request_logs (user_id, created_at desc);

alter table public.ai_request_logs enable row level security;

drop policy if exists "ai_request_logs_select_own" on public.ai_request_logs;
create policy "ai_request_logs_select_own" on public.ai_request_logs
  for select using (auth.uid() = user_id);

drop policy if exists "ai_request_logs_insert_own" on public.ai_request_logs;
create policy "ai_request_logs_insert_own" on public.ai_request_logs
  for insert with check (auth.uid() = user_id);
