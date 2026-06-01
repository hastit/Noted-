-- Allow a recurring occurrence to be moved to a different calendar day.
-- The existing check constraint does not reference modified_date, so adding
-- the nullable column does not invalidate any existing rows or constraints.
alter table public.recurring_schedule_exceptions
  add column if not exists modified_date date null;
