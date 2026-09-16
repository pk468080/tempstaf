-- Booking schedule occurrences
--
-- A booking can span multiple worker working days.
-- Each occurrence represents one actual working-day window.
--
-- Example:
--   1 Week / 6 working days
--     occurrence 1 -> Monday 09:00-17:00
--     occurrence 2 -> Tuesday 09:00-17:00
--     ...
--     occurrence 6 -> Saturday 09:00-17:00
--
-- The parent bookings.scheduled_start / scheduled_end remain the
-- booking-level boundaries. This table stores the actual worker
-- schedule windows.

create table if not exists public.booking_schedule_occurrences (
  id uuid primary key default gen_random_uuid(),

  booking_id uuid not null
    references public.bookings(id)
    on delete cascade,

  worker_id uuid null
    references public.worker_profiles(id)
    on delete set null,

  occurrence_index integer not null,

  occurrence_date date not null,

  scheduled_start timestamptz not null,

  scheduled_end timestamptz not null,

  status text not null default 'scheduled',

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now(),

  constraint booking_schedule_occurrences_index_check
    check (occurrence_index > 0),

  constraint booking_schedule_occurrences_time_check
    check (scheduled_start < scheduled_end),

  constraint booking_schedule_occurrences_status_check
    check (
      status in (
        'scheduled',
        'in_progress',
        'completed',
        'cancelled'
      )
    ),

  constraint booking_schedule_occurrences_booking_index_unique
    unique (booking_id, occurrence_index),

  constraint booking_schedule_occurrences_booking_date_unique
    unique (booking_id, occurrence_date)
);

create index if not exists booking_schedule_occurrences_worker_time_idx
  on public.booking_schedule_occurrences (
    worker_id,
    scheduled_start,
    scheduled_end
  );

create index if not exists booking_schedule_occurrences_booking_idx
  on public.booking_schedule_occurrences (booking_id);

create index if not exists booking_schedule_occurrences_date_idx
  on public.booking_schedule_occurrences (occurrence_date);

create or replace function public.set_booking_schedule_occurrence_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists booking_schedule_occurrences_updated_at
on public.booking_schedule_occurrences;

create trigger booking_schedule_occurrences_updated_at
before update on public.booking_schedule_occurrences
for each row
execute function public.set_booking_schedule_occurrence_updated_at();

alter table public.booking_schedule_occurrences enable row level security;

drop policy if exists "booking_occurrences_customer_select"
on public.booking_schedule_occurrences;

create policy "booking_occurrences_customer_select"
on public.booking_schedule_occurrences
for select
to authenticated
using (
  exists (
    select 1
    from public.bookings b
    where b.id = booking_schedule_occurrences.booking_id
      and b.customer_id = auth.uid()
  )
);

drop policy if exists "booking_occurrences_worker_select"
on public.booking_schedule_occurrences;

create policy "booking_occurrences_worker_select"
on public.booking_schedule_occurrences
for select
to authenticated
using (
  booking_schedule_occurrences.worker_id = auth.uid()
);

drop policy if exists "booking_occurrences_admin_select"
on public.booking_schedule_occurrences;

create policy "booking_occurrences_admin_select"
on public.booking_schedule_occurrences
for select
to authenticated
using (
  public.is_admin()
);

-- Occurrences are created/modified by trusted server-side booking
-- functions, not directly by customers or workers.
revoke insert, update, delete
on public.booking_schedule_occurrences
from anon, authenticated;

grant select
on public.booking_schedule_occurrences
to authenticated;