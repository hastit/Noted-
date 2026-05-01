-- Noted — schéma Supabase (à exécuter dans SQL Editor)
-- Prénom / nom affiché : stocké dans auth.users.raw_user_meta_data (clé `full_name`)
-- à l’inscription (Auth) et mis à jour depuis les paramètres (updateUser).
-- Active les extensions utiles
create extension if not exists "pgcrypto";

-- ── notes ───────────────────────────────────────────────────────────
create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default '',
  content text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists notes_user_id_idx on public.notes (user_id);
create index if not exists notes_updated_at_idx on public.notes (user_id, updated_at desc);

alter table public.notes enable row level security;

create policy "notes_select_own" on public.notes
  for select using (auth.uid() = user_id);
create policy "notes_insert_own" on public.notes
  for insert with check (auth.uid() = user_id);
create policy "notes_update_own" on public.notes
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "notes_delete_own" on public.notes
  for delete using (auth.uid() = user_id);

create or replace function public.set_notes_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_notes_updated_at on public.notes;
create trigger trg_notes_updated_at
  before update on public.notes
  for each row execute procedure public.set_notes_updated_at();

-- ── tasks ───────────────────────────────────────────────────────────
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  is_completed boolean not null default false,
  due_date date,
  created_at timestamptz not null default now()
);

-- Champs Kanban / UI (hors schéma minimal) — recommandé pour Noted
alter table public.tasks
  add column if not exists meta jsonb not null default '{}'::jsonb;

create index if not exists tasks_user_id_idx on public.tasks (user_id);

alter table public.tasks enable row level security;

create policy "tasks_select_own" on public.tasks
  for select using (auth.uid() = user_id);
create policy "tasks_insert_own" on public.tasks
  for insert with check (auth.uid() = user_id);
create policy "tasks_update_own" on public.tasks
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "tasks_delete_own" on public.tasks
  for delete using (auth.uid() = user_id);

-- ── calendar_events ─────────────────────────────────────────────────
create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  description text,
  event_date date not null,
  start_time time,
  end_time time,
  created_at timestamptz not null default now()
);

create index if not exists calendar_events_user_date_idx
  on public.calendar_events (user_id, event_date);

alter table public.calendar_events enable row level security;

create policy "calendar_events_select_own" on public.calendar_events
  for select using (auth.uid() = user_id);
create policy "calendar_events_insert_own" on public.calendar_events
  for insert with check (auth.uid() = user_id);
create policy "calendar_events_update_own" on public.calendar_events
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "calendar_events_delete_own" on public.calendar_events
  for delete using (auth.uid() = user_id);

-- ── folders ─────────────────────────────────────────────────────────
create table if not exists public.folders (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default '',
  color text,
  created_at timestamptz not null default now(),
  last_used_at timestamptz not null default now()
);

create index if not exists folders_user_id_idx on public.folders (user_id);

alter table public.folders enable row level security;

create policy "folders_select_own" on public.folders
  for select using (auth.uid() = user_id);
create policy "folders_insert_own" on public.folders
  for insert with check (auth.uid() = user_id);
create policy "folders_update_own" on public.folders
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "folders_delete_own" on public.folders
  for delete using (auth.uid() = user_id);

-- ── notebooks ────────────────────────────────────────────────────────
create table if not exists public.notebooks (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default '',
  color text not null default '#F4F4F4',
  emoji text,
  folder_id uuid references public.folders (id) on delete set null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz not null default now()
);

create index if not exists notebooks_user_id_idx on public.notebooks (user_id);

alter table public.notebooks enable row level security;

create policy "notebooks_select_own" on public.notebooks
  for select using (auth.uid() = user_id);
create policy "notebooks_insert_own" on public.notebooks
  for insert with check (auth.uid() = user_id);
create policy "notebooks_update_own" on public.notebooks
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "notebooks_delete_own" on public.notebooks
  for delete using (auth.uid() = user_id);

-- ── quick_notes ──────────────────────────────────────────────────────
create table if not exists public.quick_notes (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default '',
  content text not null default '',
  color text not null default '#FFFFFF',
  created_at timestamptz not null default now(),
  last_used_at timestamptz not null default now()
);

create index if not exists quick_notes_user_id_idx on public.quick_notes (user_id);

alter table public.quick_notes enable row level security;

create policy "quick_notes_select_own" on public.quick_notes
  for select using (auth.uid() = user_id);
create policy "quick_notes_insert_own" on public.quick_notes
  for insert with check (auth.uid() = user_id);
create policy "quick_notes_update_own" on public.quick_notes
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "quick_notes_delete_own" on public.quick_notes
  for delete using (auth.uid() = user_id);

-- ── pdf_files ────────────────────────────────────────────────────────
create table if not exists public.pdf_files (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  storage_path text not null,
  url text not null,
  folder_id uuid references public.folders (id) on delete cascade,
  uploaded_at timestamptz not null default now()
);

create index if not exists pdf_files_user_id_idx on public.pdf_files (user_id);
create index if not exists pdf_files_folder_id_idx on public.pdf_files (folder_id);

alter table public.pdf_files enable row level security;

create policy "pdf_files_select_own" on public.pdf_files
  for select using (auth.uid() = user_id);
create policy "pdf_files_insert_own" on public.pdf_files
  for insert with check (auth.uid() = user_id);
create policy "pdf_files_delete_own" on public.pdf_files
  for delete using (auth.uid() = user_id);
