create extension if not exists "uuid-ossp";

create table if not exists public.scheduled_blocks (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  start_time timestamptz not null,
  duration_minutes integer not null,
  reasoning text,
  source text not null default 'ai',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists scheduled_blocks_user_start_idx
  on public.scheduled_blocks (user_id, start_time);

alter table public.scheduled_blocks enable row level security;

drop policy if exists "scheduled_blocks_select_own" on public.scheduled_blocks;
create policy "scheduled_blocks_select_own" on public.scheduled_blocks
  for select using (auth.uid() = user_id);

drop policy if exists "scheduled_blocks_insert_own" on public.scheduled_blocks;
create policy "scheduled_blocks_insert_own" on public.scheduled_blocks
  for insert with check (auth.uid() = user_id);

drop policy if exists "scheduled_blocks_update_own" on public.scheduled_blocks;
create policy "scheduled_blocks_update_own" on public.scheduled_blocks
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "scheduled_blocks_delete_own" on public.scheduled_blocks;
create policy "scheduled_blocks_delete_own" on public.scheduled_blocks
  for delete using (auth.uid() = user_id);

create or replace function public.set_scheduled_blocks_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_scheduled_blocks_updated_at on public.scheduled_blocks;
create trigger trg_scheduled_blocks_updated_at
  before update on public.scheduled_blocks
  for each row execute procedure public.set_scheduled_blocks_updated_at();
