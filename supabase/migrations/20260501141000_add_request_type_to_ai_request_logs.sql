alter table public.ai_request_logs
  add column if not exists request_type text;

update public.ai_request_logs
set request_type = 'ai_schedule'
where request_type is null;

alter table public.ai_request_logs
  alter column request_type set default 'ai_schedule';

alter table public.ai_request_logs
  alter column request_type set not null;

alter table public.ai_request_logs
  drop constraint if exists ai_request_logs_request_type_check;

alter table public.ai_request_logs
  add constraint ai_request_logs_request_type_check
  check (request_type in ('ai_schedule', 'extract_schedule'));

create index if not exists ai_request_logs_user_type_created_idx
  on public.ai_request_logs (user_id, request_type, created_at desc);
