begin;

-- ============================================================
-- Worker scheduling model
--
-- Purpose:
--   1. Store each worker's scheduling timezone.
--   2. Store recurring weekly working windows.
--   3. Store date-specific exceptions.
--
-- IMPORTANT:
--   This does NOT replace worker_availability.
--   worker_availability remains the existing concrete availability
--   mechanism used by the current assignment workflow.
--
-- Customers will NOT receive raw schedule rows.
-- A later SECURITY DEFINER availability RPC will calculate
-- customer-facing slots from these tables.
-- ============================================================


-- ============================================================
-- 1. Worker schedule settings
-- ============================================================

create table if not exists public.worker_schedule_settings (
  worker_id uuid primary key
    references public.worker_profiles(id)
    on delete cascade,

  timezone text not null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint worker_schedule_settings_timezone_not_blank
    check (length(trim(timezone)) > 0)
);


comment on table public.worker_schedule_settings is
'Per-worker scheduling configuration. Stores the IANA timezone used to interpret recurring schedule times.';

comment on column public.worker_schedule_settings.timezone is
'IANA timezone identifier used for the worker schedule, for example a valid application-selected timezone.';


-- ============================================================
-- 2. Recurring weekly worker schedule
-- ============================================================

create table if not exists public.worker_weekly_schedules (
  id uuid primary key default gen_random_uuid(),

  worker_id uuid not null
    references public.worker_profiles(id)
    on delete cascade,

  -- ISO-style weekday:
  -- 0 = Sunday
  -- 1 = Monday
  -- 2 = Tuesday
  -- 3 = Wednesday
  -- 4 = Thursday
  -- 5 = Friday
  -- 6 = Saturday
  day_of_week smallint not null,

  start_time time not null,
  end_time time not null,

  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint worker_weekly_schedules_day_of_week_check
    check (day_of_week between 0 and 6),

  constraint worker_weekly_schedules_time_order_check
    check (start_time < end_time)
);


comment on table public.worker_weekly_schedules is
'Recurring weekly working windows for workers. One worker may have multiple non-overlapping windows per day.';

comment on column public.worker_weekly_schedules.day_of_week is
'Weekday number where 0=Sunday and 6=Saturday.';

comment on column public.worker_weekly_schedules.start_time is
'Local schedule start time interpreted using the worker schedule timezone.';

comment on column public.worker_weekly_schedules.end_time is
'Local schedule end time interpreted using the worker schedule timezone.';


-- Prevent exact duplicate schedule rows.
create unique index if not exists worker_weekly_schedules_unique_window_idx
  on public.worker_weekly_schedules (
    worker_id,
    day_of_week,
    start_time,
    end_time
  );


create index if not exists worker_weekly_schedules_worker_day_idx
  on public.worker_weekly_schedules (
    worker_id,
    day_of_week,
    is_active
  );


-- ============================================================
-- 3. Date-specific schedule exceptions
-- ============================================================

create table if not exists public.worker_schedule_exceptions (
  id uuid primary key default gen_random_uuid(),

  worker_id uuid not null
    references public.worker_profiles(id)
    on delete cascade,

  exception_date date not null,

  exception_type text not null,

  start_time time null,
  end_time time null,

  reason text null,

  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint worker_schedule_exceptions_type_check
    check (
      exception_type in ('unavailable', 'available')
    ),

  constraint worker_schedule_exceptions_time_pair_check
    check (
      (
        start_time is null
        and end_time is null
      )
      or
      (
        start_time is not null
        and end_time is not null
        and start_time < end_time
      )
    ),

  constraint worker_schedule_exceptions_reason_check
    check (
      reason is null
      or length(trim(reason)) > 0
    )
);


comment on table public.worker_schedule_exceptions is
'Date-specific overrides to a worker weekly schedule. Exceptions can block an entire date or define an additional available window.';

comment on column public.worker_schedule_exceptions.exception_type is
'available adds an availability window; unavailable removes availability for the entire date or specified time window.';

comment on column public.worker_schedule_exceptions.start_time is
'Optional local start time. NULL together with end_time means the exception applies to the entire date.';

comment on column public.worker_schedule_exceptions.end_time is
'Optional local end time. NULL together with start_time means the exception is invalid.';


create index if not exists worker_schedule_exceptions_worker_date_idx
  on public.worker_schedule_exceptions (
    worker_id,
    exception_date,
    is_active
  );


-- ============================================================
-- 4. Updated-at trigger helper
-- ============================================================

create or replace function public.set_worker_schedule_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


drop trigger if exists worker_schedule_settings_updated_at
  on public.worker_schedule_settings;

create trigger worker_schedule_settings_updated_at
before update on public.worker_schedule_settings
for each row
execute function public.set_worker_schedule_updated_at();


drop trigger if exists worker_weekly_schedules_updated_at
  on public.worker_weekly_schedules;

create trigger worker_weekly_schedules_updated_at
before update on public.worker_weekly_schedules
for each row
execute function public.set_worker_schedule_updated_at();


drop trigger if exists worker_schedule_exceptions_updated_at
  on public.worker_schedule_exceptions;

create trigger worker_schedule_exceptions_updated_at
before update on public.worker_schedule_exceptions
for each row
execute function public.set_worker_schedule_updated_at();


-- ============================================================
-- 5. RLS
-- ============================================================

alter table public.worker_schedule_settings enable row level security;
alter table public.worker_weekly_schedules enable row level security;
alter table public.worker_schedule_exceptions enable row level security;


-- ============================================================
-- Schedule settings policies
-- ============================================================

drop policy if exists worker_schedule_settings_select_own
  on public.worker_schedule_settings;

create policy worker_schedule_settings_select_own
on public.worker_schedule_settings
for select
to authenticated
using (
  worker_id = auth.uid()
  or public.is_admin()
);


drop policy if exists worker_schedule_settings_insert_own
  on public.worker_schedule_settings;

create policy worker_schedule_settings_insert_own
on public.worker_schedule_settings
for insert
to authenticated
with check (
  worker_id = auth.uid()
  or public.is_admin()
);


drop policy if exists worker_schedule_settings_update_own
  on public.worker_schedule_settings;

create policy worker_schedule_settings_update_own
on public.worker_schedule_settings
for update
to authenticated
using (
  worker_id = auth.uid()
  or public.is_admin()
)
with check (
  worker_id = auth.uid()
  or public.is_admin()
);


drop policy if exists worker_schedule_settings_delete_own
  on public.worker_schedule_settings;

create policy worker_schedule_settings_delete_own
on public.worker_schedule_settings
for delete
to authenticated
using (
  worker_id = auth.uid()
  or public.is_admin()
);


-- ============================================================
-- Weekly schedule policies
-- ============================================================

drop policy if exists worker_weekly_schedules_select_own
  on public.worker_weekly_schedules;

create policy worker_weekly_schedules_select_own
on public.worker_weekly_schedules
for select
to authenticated
using (
  worker_id = auth.uid()
  or public.is_admin()
);


drop policy if exists worker_weekly_schedules_insert_own
  on public.worker_weekly_schedules;

create policy worker_weekly_schedules_insert_own
on public.worker_weekly_schedules
for insert
to authenticated
with check (
  worker_id = auth.uid()
  or public.is_admin()
);


drop policy if exists worker_weekly_schedules_update_own
  on public.worker_weekly_schedules;

create policy worker_weekly_schedules_update_own
on public.worker_weekly_schedules
for update
to authenticated
using (
  worker_id = auth.uid()
  or public.is_admin()
)
with check (
  worker_id = auth.uid()
  or public.is_admin()
);


drop policy if exists worker_weekly_schedules_delete_own
  on public.worker_weekly_schedules;

create policy worker_weekly_schedules_delete_own
on public.worker_weekly_schedules
for delete
to authenticated
using (
  worker_id = auth.uid()
  or public.is_admin()
);


-- ============================================================
-- Exception policies
-- ============================================================

drop policy if exists worker_schedule_exceptions_select_own
  on public.worker_schedule_exceptions;

create policy worker_schedule_exceptions_select_own
on public.worker_schedule_exceptions
for select
to authenticated
using (
  worker_id = auth.uid()
  or public.is_admin()
);


drop policy if exists worker_schedule_exceptions_insert_own
  on public.worker_schedule_exceptions;

create policy worker_schedule_exceptions_insert_own
on public.worker_schedule_exceptions
for insert
to authenticated
with check (
  worker_id = auth.uid()
  or public.is_admin()
);


drop policy if exists worker_schedule_exceptions_update_own
  on public.worker_schedule_exceptions;

create policy worker_schedule_exceptions_update_own
on public.worker_schedule_exceptions
for update
to authenticated
using (
  worker_id = auth.uid()
  or public.is_admin()
)
with check (
  worker_id = auth.uid()
  or public.is_admin()
);


drop policy if exists worker_schedule_exceptions_delete_own
  on public.worker_schedule_exceptions;

create policy worker_schedule_exceptions_delete_own
on public.worker_schedule_exceptions
for delete
to authenticated
using (
  worker_id = auth.uid()
  or public.is_admin()
);


commit;