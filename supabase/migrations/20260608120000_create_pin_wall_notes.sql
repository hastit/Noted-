create extension if not exists "uuid-ossp";

create table if not exists public.pin_wall_notes (
  id         uuid        primary key default uuid_generate_v4(),
  user_id    uuid        not null references auth.users (id) on delete cascade,
  content    text        not null default '',
  color      text        not null default '#FEFF9C',
  x_pct      float       not null default 10,
  y_pct      float       not null default 10,
  rotation   float       not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists pin_wall_notes_user_idx
  on public.pin_wall_notes (user_id, created_at);

alter table public.pin_wall_notes enable row level security;

create policy "pin_wall_select_own" on public.pin_wall_notes
  for select using (auth.uid() = user_id);

create policy "pin_wall_insert_own" on public.pin_wall_notes
  for insert with check (auth.uid() = user_id);

create policy "pin_wall_update_own" on public.pin_wall_notes
  for update using (auth.uid() = user_id);

create policy "pin_wall_delete_own" on public.pin_wall_notes
  for delete using (auth.uid() = user_id);
