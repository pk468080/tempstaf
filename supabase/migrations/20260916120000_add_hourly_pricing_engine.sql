begin;

-- ============================================================
-- HOURLY BASE PRICING
--
-- One row represents the authoritative hourly price for a
-- service variant.
--
-- Existing service_variants and service_variant_prices are NOT
-- modified or deleted.
-- ============================================================

create table if not exists public.service_variant_hourly_prices (
  id uuid primary key default gen_random_uuid(),

  service_variant_id uuid not null
    references public.service_variants(id)
    on delete cascade,

  price numeric(12,2) not null
    check (price > 0),

  currency text not null
    check (length(trim(currency)) > 0),

  effective_from timestamptz not null default now(),

  effective_to timestamptz null,

  is_active boolean not null default true,

  created_at timestamptz not null default now(),

  constraint service_variant_hourly_prices_effective_check
    check (
      effective_to is null
      or effective_to > effective_from
    )
);

create index if not exists
  idx_service_variant_hourly_prices_lookup
on public.service_variant_hourly_prices (
  service_variant_id,
  is_active,
  effective_from desc
);


-- ============================================================
-- DISCOUNT TIERS
--
-- Discounts are based on total billable working hours.
--
-- Examples that Admin could configure later:
--
-- 1 hour       -> 0%
-- 4 hours      -> X%
-- 8 hours      -> Y%
-- weekly hours -> Z%
-- monthly hours-> W%
--
-- We do NOT insert those values here.
-- ============================================================

create table if not exists public.service_variant_discount_tiers (
  id uuid primary key default gen_random_uuid(),

  service_variant_id uuid not null
    references public.service_variants(id)
    on delete cascade,

  name text not null
    check (length(trim(name)) > 0),

  min_hours numeric(12,2) not null
    check (min_hours >= 0),

  max_hours numeric(12,2) null
    check (
      max_hours is null
      or max_hours > min_hours
    ),

  discount_percent numeric(5,2) not null
    check (
      discount_percent >= 0
      and discount_percent <= 100
    ),

  priority integer not null default 0,

  effective_from timestamptz not null default now(),

  effective_to timestamptz null,

  is_active boolean not null default true,

  created_at timestamptz not null default now(),

  constraint service_variant_discount_tiers_effective_check
    check (
      effective_to is null
      or effective_to > effective_from
    )
);

create index if not exists
  idx_service_variant_discount_tiers_lookup
on public.service_variant_discount_tiers (
  service_variant_id,
  is_active,
  min_hours desc
);


-- ============================================================
-- PRICING CALCULATION
--
-- Input:
--   service variant
--   total working hours
--
-- Output:
--   hourly price
--   gross amount
--   discount
--   final amount
--
-- This is deliberately independent of the Customer App.
-- Date selection will calculate the hours and then use this
-- function.
-- ============================================================

create or replace function public.calculate_service_booking_price(
  p_service_variant_id uuid,
  p_total_working_hours numeric
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$

declare
  v_customer_id uuid := auth.uid();

  v_price numeric;
  v_currency text;

  v_gross_amount numeric;
  v_discount_percent numeric := 0;
  v_discount_amount numeric := 0;
  v_final_amount numeric;

  v_discount_tier_id uuid;
  v_discount_tier_name text;

begin

  if v_customer_id is null then
    raise exception 'Authentication required';
  end if;

  if p_service_variant_id is null then
    raise exception 'Service package is required';
  end if;

  if p_total_working_hours is null
     or p_total_working_hours <= 0
  then
    raise exception 'Working hours must be greater than zero';
  end if;


  -- ==========================================================
  -- ACTIVE SERVICE VARIANT
  -- ==========================================================

  if not exists (
    select 1
    from public.service_variants sv
    join public.services s
      on s.id = sv.service_id
    where sv.id = p_service_variant_id
      and sv.is_active = true
      and s.is_active = true
  ) then
    raise exception 'Service package is not available';
  end if;


  -- ==========================================================
  -- CURRENT HOURLY PRICE
  -- ==========================================================

  select
    hp.price,
    hp.currency
  into
    v_price,
    v_currency
  from public.service_variant_hourly_prices hp
  where hp.service_variant_id = p_service_variant_id
    and hp.is_active = true
    and hp.effective_from <= now()
    and (
      hp.effective_to is null
      or hp.effective_to > now()
    )
  order by
    hp.effective_from desc,
    hp.created_at desc
  limit 1;


  if v_price is null then
    raise exception
      'No active hourly price is configured for this service package';
  end if;


  -- ==========================================================
  -- GROSS PRICE
  -- ==========================================================

  v_gross_amount :=
    round(
      p_total_working_hours * v_price,
      2
    );


  -- ==========================================================
  -- BEST APPLICABLE DISCOUNT
  --
  -- Highest applicable minimum-hours tier wins.
  -- This means:
  --
  -- 1 hour  -> 1-hour tier
  -- 4 hours -> 4-hour tier
  -- 8 hours -> 8-hour tier
  -- etc.
  -- ==========================================================

  select
    dt.id,
    dt.name,
    dt.discount_percent
  into
    v_discount_tier_id,
    v_discount_tier_name,
    v_discount_percent
  from public.service_variant_discount_tiers dt
  where dt.service_variant_id = p_service_variant_id
    and dt.is_active = true
    and dt.min_hours <= p_total_working_hours
    and (
      dt.max_hours is null
      or p_total_working_hours < dt.max_hours
    )
    and dt.effective_from <= now()
    and (
      dt.effective_to is null
      or dt.effective_to > now()
    )
  order by
    dt.min_hours desc,
    dt.priority desc,
    dt.effective_from desc,
    dt.created_at desc
  limit 1;


  -- ==========================================================
  -- DISCOUNT CALCULATION
  -- ==========================================================

  v_discount_amount :=
    round(
      v_gross_amount
      * (v_discount_percent / 100),
      2
    );

  v_final_amount :=
    round(
      v_gross_amount - v_discount_amount,
      2
    );


  return jsonb_build_object(
    'success', true,

    'service_variant_id',
    p_service_variant_id,

    'total_working_hours',
    p_total_working_hours,

    'hourly_price',
    v_price,

    'currency',
    v_currency,

    'gross_amount',
    v_gross_amount,

    'discount_tier_id',
    v_discount_tier_id,

    'discount_tier_name',
    v_discount_tier_name,

    'discount_percent',
    v_discount_percent,

    'discount_amount',
    v_discount_amount,

    'final_amount',
    v_final_amount
  );

end;

$function$;


-- ============================================================
-- RLS
-- ============================================================

alter table public.service_variant_hourly_prices
enable row level security;

alter table public.service_variant_discount_tiers
enable row level security;


-- ============================================================
-- ADMIN-ONLY MANAGEMENT
--
-- Customers do not directly manage pricing.
-- The calculation RPC above is the customer-facing interface.
-- ============================================================

create policy
  service_variant_hourly_prices_admin_select
on public.service_variant_hourly_prices
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


create policy
  service_variant_hourly_prices_admin_insert
on public.service_variant_hourly_prices
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
      and p.is_active = true
  )
);


create policy
  service_variant_hourly_prices_admin_update
on public.service_variant_hourly_prices
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
      and p.is_active = true
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
      and p.is_active = true
  )
);


create policy
  service_variant_hourly_prices_admin_delete
on public.service_variant_hourly_prices
for delete
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


create policy
  service_variant_discount_tiers_admin_select
on public.service_variant_discount_tiers
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


create policy
  service_variant_discount_tiers_admin_insert
on public.service_variant_discount_tiers
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
      and p.is_active = true
  )
);


create policy
  service_variant_discount_tiers_admin_update
on public.service_variant_discount_tiers
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
      and p.is_active = true
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
      and p.is_active = true
  )
);


create policy
  service_variant_discount_tiers_admin_delete
on public.service_variant_discount_tiers
for delete
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
-- RPC EXECUTION
-- ============================================================

revoke all
on function public.calculate_service_booking_price(
  uuid,
  numeric
)
from public;

grant execute
on function public.calculate_service_booking_price(
  uuid,
  numeric
)
to authenticated;


commit;