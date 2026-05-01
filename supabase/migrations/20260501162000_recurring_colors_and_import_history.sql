create extension if not exists "uuid-ossp";

alter table public.recurring_schedule_blocks
  add column if not exists custom_color text null;

create table if not exists public.subject_colors (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users (id) on delete cascade,
  subject_title text not null,
  color_hex text not null,
  created_at timestamptz not null default now(),
  unique (user_id, subject_title)
);

alter table public.subject_colors enable row level security;

drop policy if exists "subject_colors_select_own" on public.subject_colors;
create policy "subject_colors_select_own" on public.subject_colors
  for select using (auth.uid() = user_id);

drop policy if exists "subject_colors_insert_own" on public.subject_colors;
create policy "subject_colors_insert_own" on public.subject_colors
  for insert with check (auth.uid() = user_id);

drop policy if exists "subject_colors_update_own" on public.subject_colors;
create policy "subject_colors_update_own" on public.subject_colors
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "subject_colors_delete_own" on public.subject_colors;
create policy "subject_colors_delete_own" on public.subject_colors
  for delete using (auth.uid() = user_id);

create table if not exists public.schedule_imports (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users (id) on delete cascade,
  schedule_name text not null,
  import_date timestamptz not null default now(),
  source_type text not null check (source_type in ('image', 'pdf', 'manual')),
  event_count integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.schedule_imports enable row level security;

drop policy if exists "schedule_imports_select_own" on public.schedule_imports;
create policy "schedule_imports_select_own" on public.schedule_imports
  for select using (auth.uid() = user_id);

drop policy if exists "schedule_imports_insert_own" on public.schedule_imports;
create policy "schedule_imports_insert_own" on public.schedule_imports
  for insert with check (auth.uid() = user_id);

drop policy if exists "schedule_imports_update_own" on public.schedule_imports;
create policy "schedule_imports_update_own" on public.schedule_imports
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "schedule_imports_delete_own" on public.schedule_imports;
create policy "schedule_imports_delete_own" on public.schedule_imports
  for delete using (auth.uid() = user_id);

alter table public.recurring_schedule_blocks
  add column if not exists import_id uuid null references public.schedule_imports (id) on delete cascade;

create index if not exists recurring_schedule_blocks_import_idx
  on public.recurring_schedule_blocks (import_id);
