create extension if not exists "uuid-ossp";

create table if not exists public.recurring_schedule_blocks (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  day_of_week integer not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  color_category text not null default 'default',
  start_date date not null,
  end_date date null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (start_time < end_time)
);

create table if not exists public.recurring_schedule_exceptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users (id) on delete cascade,
  recurring_block_id uuid not null references public.recurring_schedule_blocks (id) on delete cascade,
  exception_date date not null,
  type text not null check (type in ('skip', 'modify')),
  modified_start_time time null,
  modified_end_time time null,
  modified_title text null,
  created_at timestamptz not null default now(),
  check (
    (type = 'skip' and modified_start_time is null and modified_end_time is null) or
    (type = 'modify' and modified_start_time is not null and modified_end_time is not null and modified_start_time < modified_end_time)
  )
);

create index if not exists recurring_schedule_blocks_user_day_date_idx
  on public.recurring_schedule_blocks (user_id, day_of_week, start_date, end_date);

create index if not exists recurring_schedule_exceptions_user_date_idx
  on public.recurring_schedule_exceptions (user_id, exception_date);

create index if not exists recurring_schedule_exceptions_block_date_idx
  on public.recurring_schedule_exceptions (recurring_block_id, exception_date);

alter table public.recurring_schedule_blocks enable row level security;
alter table public.recurring_schedule_exceptions enable row level security;

drop policy if exists "recurring_schedule_blocks_select_own" on public.recurring_schedule_blocks;
create policy "recurring_schedule_blocks_select_own" on public.recurring_schedule_blocks
  for select using (auth.uid() = user_id);

drop policy if exists "recurring_schedule_blocks_insert_own" on public.recurring_schedule_blocks;
create policy "recurring_schedule_blocks_insert_own" on public.recurring_schedule_blocks
  for insert with check (auth.uid() = user_id);

drop policy if exists "recurring_schedule_blocks_update_own" on public.recurring_schedule_blocks;
create policy "recurring_schedule_blocks_update_own" on public.recurring_schedule_blocks
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "recurring_schedule_blocks_delete_own" on public.recurring_schedule_blocks;
create policy "recurring_schedule_blocks_delete_own" on public.recurring_schedule_blocks
  for delete using (auth.uid() = user_id);

drop policy if exists "recurring_schedule_exceptions_select_own" on public.recurring_schedule_exceptions;
create policy "recurring_schedule_exceptions_select_own" on public.recurring_schedule_exceptions
  for select using (auth.uid() = user_id);

drop policy if exists "recurring_schedule_exceptions_insert_own" on public.recurring_schedule_exceptions;
create policy "recurring_schedule_exceptions_insert_own" on public.recurring_schedule_exceptions
  for insert with check (auth.uid() = user_id);

drop policy if exists "recurring_schedule_exceptions_update_own" on public.recurring_schedule_exceptions;
create policy "recurring_schedule_exceptions_update_own" on public.recurring_schedule_exceptions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "recurring_schedule_exceptions_delete_own" on public.recurring_schedule_exceptions;
create policy "recurring_schedule_exceptions_delete_own" on public.recurring_schedule_exceptions
  for delete using (auth.uid() = user_id);

create or replace function public.set_recurring_schedule_blocks_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_recurring_schedule_blocks_updated_at on public.recurring_schedule_blocks;
create trigger trg_recurring_schedule_blocks_updated_at
  before update on public.recurring_schedule_blocks
  for each row execute procedure public.set_recurring_schedule_blocks_updated_at();
