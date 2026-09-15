begin;

-- ============================================================
-- PLATFORM SETTINGS
--
-- Database-backed application configuration.
-- Production behavior must come from this table rather than
-- hardcoded business-policy defaults in application code/RPCs.
-- ============================================================

create table if not exists public.platform_settings (
  key text primary key,
  value jsonb not null,
  description text null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint platform_settings_key_check
    check (length(trim(key)) > 0)
);


-- ============================================================
-- Updated-at trigger
-- ============================================================

create or replace function public.set_platform_setting_updated_at()
returns trigger
language plpgsql
as $function$
begin
  new.updated_at := now();
  return new;
end;
$function$;


drop trigger if exists
  platform_settings_updated_at
on public.platform_settings;


create trigger platform_settings_updated_at
before update on public.platform_settings
for each row
execute function public.set_platform_setting_updated_at();


-- ============================================================
-- RLS
--
-- Configuration is not directly writable by customers/workers.
-- Admin access is handled through SECURITY DEFINER functions.
-- ============================================================

alter table public.platform_settings enable row level security;


drop policy if exists
  platform_settings_admin_select
on public.platform_settings;


create policy platform_settings_admin_select
on public.platform_settings
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
      and p.is_active = true
  )
);


-- ============================================================
-- Dispatch configuration
--
-- Values are inserted as data, not embedded in the dispatch
-- function's parameter defaults.
-- ============================================================

insert into public.platform_settings (
  key,
  value,
  description,
  is_active
)
values
(
  'dispatch.worker_offer_limit',
  '{"value":5}',
  'Maximum number of workers to offer a booking to in one dispatch round.',
  true
),
(
  'dispatch.worker_offer_duration_minutes',
  '{"value":5}',
  'Number of minutes a worker offer remains pending before expiration.',
  true
)
on conflict (key) do nothing;


commit;