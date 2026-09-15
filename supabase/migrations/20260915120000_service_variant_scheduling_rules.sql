begin;

-- ============================================================
-- SERVICE VARIANT SCHEDULING RULES
--
-- Keeps scheduling semantics separate from the existing
-- service catalogue.
--
-- Existing services / variants / prices are NOT modified.
-- ============================================================

create table if not exists public.service_variant_scheduling_rules (
  service_variant_id uuid primary key
    references public.service_variants(id)
    on delete cascade,

  scheduling_mode text not null,

  -- Used when scheduling_mode = 'working_days'.
  -- NULL for continuous bookings.
  working_days integer null,

  -- Optional daily staffing duration.
  -- NULL means the worker's schedule determines the required
  -- working window.
  daily_duration_minutes integer null,

  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint service_variant_scheduling_rules_mode_check
    check (
      scheduling_mode in (
        'continuous',
        'working_days'
      )
    ),

  constraint service_variant_scheduling_rules_working_days_check
    check (
      working_days is null
      or working_days > 0
    ),

  constraint service_variant_scheduling_rules_daily_duration_check
    check (
      daily_duration_minutes is null
      or daily_duration_minutes > 0
    ),

  constraint service_variant_scheduling_rules_continuous_fields_check
    check (
      scheduling_mode <> 'continuous'
      or (
        working_days is null
        and daily_duration_minutes is null
      )
    ),

  constraint service_variant_scheduling_rules_working_days_fields_check
    check (
      scheduling_mode <> 'working_days'
      or working_days is not null
    )
);

comment on table public.service_variant_scheduling_rules is
'Database-configured scheduling semantics for service variants. Does not alter the existing service catalogue.';

comment on column public.service_variant_scheduling_rules.scheduling_mode is
'continuous = one continuous booking interval; working_days = staffing occurs across worker working schedule windows.';

comment on column public.service_variant_scheduling_rules.working_days is
'Number of worker working days required by the service variant when using working_days scheduling.';

comment on column public.service_variant_scheduling_rules.daily_duration_minutes is
'Optional daily staffing duration for working_days scheduling. NULL means the worker schedule window determines the daily duration.';


-- ============================================================
-- Updated-at trigger
-- ============================================================

drop trigger if exists service_variant_scheduling_rules_updated_at
on public.service_variant_scheduling_rules;

create trigger service_variant_scheduling_rules_updated_at
before update on public.service_variant_scheduling_rules
for each row
execute function public.set_worker_schedule_updated_at();


-- ============================================================
-- Index
-- ============================================================

create index if not exists
  service_variant_scheduling_rules_active_idx
on public.service_variant_scheduling_rules (
  is_active,
  scheduling_mode
);


-- ============================================================
-- RLS
--
-- Customers do not write scheduling rules.
-- Customer availability RPC will read them through SECURITY
-- DEFINER logic.
-- ============================================================

alter table public.service_variant_scheduling_rules
enable row level security;


drop policy if exists service_variant_scheduling_rules_admin_select
on public.service_variant_scheduling_rules;

create policy service_variant_scheduling_rules_admin_select
on public.service_variant_scheduling_rules
for select
to authenticated
using (
  public.is_admin()
);


drop policy if exists service_variant_scheduling_rules_admin_insert
on public.service_variant_scheduling_rules;

create policy service_variant_scheduling_rules_admin_insert
on public.service_variant_scheduling_rules
for insert
to authenticated
with check (
  public.is_admin()
);


drop policy if exists service_variant_scheduling_rules_admin_update
on public.service_variant_scheduling_rules;

create policy service_variant_scheduling_rules_admin_update
on public.service_variant_scheduling_rules
for update
to authenticated
using (
  public.is_admin()
)
with check (
  public.is_admin()
);


drop policy if exists service_variant_scheduling_rules_admin_delete
on public.service_variant_scheduling_rules;

create policy service_variant_scheduling_rules_admin_delete
on public.service_variant_scheduling_rules
for delete
to authenticated
using (
  public.is_admin()
);


commit;