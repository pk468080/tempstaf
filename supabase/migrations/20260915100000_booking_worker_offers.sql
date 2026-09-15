begin;

-- ============================================================
-- BOOKING WORKER OFFERS
--
-- A booking may be offered to multiple eligible workers.
-- Exactly one worker can win the booking.
--
-- bookings.worker_id remains the authoritative winner.
-- booking_worker_offers preserves the complete offer history.
-- ============================================================


-- ============================================================
-- 1. Offer status
-- ============================================================

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n
      on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'booking_worker_offer_status'
  ) then

    create type public.booking_worker_offer_status as enum (
      'pending',
      'accepted',
      'declined',
      'expired',
      'cancelled'
    );

  end if;
end
$$;


-- ============================================================
-- 2. Offer table
-- ============================================================

create table if not exists public.booking_worker_offers (
  id uuid primary key default gen_random_uuid(),

  booking_id uuid not null
    references public.bookings(id)
    on delete cascade,

  worker_id uuid not null
    references public.worker_profiles(id)
    on delete restrict,

  status public.booking_worker_offer_status not null
    default 'pending',

  offered_at timestamptz not null
    default now(),

  expires_at timestamptz not null,

  responded_at timestamptz null,

  created_at timestamptz not null
    default now(),

  updated_at timestamptz not null
    default now(),

  constraint booking_worker_offers_expiry_check
    check (expires_at > offered_at),

  constraint booking_worker_offers_response_check
    check (
      (
        status = 'pending'
        and responded_at is null
      )
      or
      (
        status <> 'pending'
        and responded_at is not null
      )
    )
);


-- ============================================================
-- 3. One active offer per worker per booking
--
-- Historical offers may exist after an old offer is cancelled
-- or expired, but there can only be one pending offer.
-- ============================================================

create unique index if not exists
  booking_worker_offers_one_pending_per_worker
on public.booking_worker_offers (
  booking_id,
  worker_id
)
where status = 'pending';


create index if not exists
  booking_worker_offers_booking_idx
on public.booking_worker_offers (
  booking_id,
  created_at desc
);


create index if not exists
  booking_worker_offers_worker_idx
on public.booking_worker_offers (
  worker_id,
  status,
  created_at desc
);


create index if not exists
  booking_worker_offers_expiry_idx
on public.booking_worker_offers (
  expires_at
)
where status = 'pending';


-- ============================================================
-- 4. Updated-at trigger
-- ============================================================

create or replace function public.set_booking_worker_offer_updated_at()
returns trigger
language plpgsql
as $function$
begin
  new.updated_at := now();
  return new;
end;
$function$;


drop trigger if exists
  booking_worker_offers_updated_at
on public.booking_worker_offers;


create trigger booking_worker_offers_updated_at
before update on public.booking_worker_offers
for each row
execute function public.set_booking_worker_offer_updated_at();


-- ============================================================
-- 5. RLS
--
-- Workers can see only their own offers.
-- Customers can see no worker-offer internals.
-- Admin access is handled through SECURITY DEFINER RPCs.
-- ============================================================

alter table public.booking_worker_offers enable row level security;


drop policy if exists
  booking_worker_offers_worker_select
on public.booking_worker_offers;


create policy booking_worker_offers_worker_select
on public.booking_worker_offers
for select
to authenticated
using (
  worker_id = auth.uid()
);


-- No direct INSERT/UPDATE/DELETE policies are created.
--
-- Offer creation and response must go through RPCs so the
-- database can enforce the booking state machine atomically.


-- ============================================================
-- 6. Worker: respond to an offer
--
-- ACCEPT:
--   pending offer
--      -> accepted
--   booking
--      paid/searching_worker -> assigned
--
-- DECLINE:
--   pending offer -> declined
--   booking remains available for other workers.
--
-- The booking row is locked before acceptance.
-- This makes simultaneous worker acceptance race-safe.
-- ============================================================

create or replace function public.worker_respond_to_offer(
  p_offer_id uuid,
  p_response text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$

declare
  v_worker_id uuid := auth.uid();

  v_offer public.booking_worker_offers%rowtype;
  v_booking public.bookings%rowtype;

  v_response text;
  v_old_booking_status public.booking_status;

  v_has_conflict boolean;

begin

  if v_worker_id is null then
    return jsonb_build_object(
      'success', false,
      'error', 'Authentication required'
    );
  end if;


  v_response := lower(trim(p_response));


  if v_response not in ('accept', 'decline') then
    return jsonb_build_object(
      'success', false,
      'error', 'Invalid offer response'
    );
  end if;


  -- ==========================================================
  -- Lock the offer.
  -- ==========================================================

  select *
  into v_offer
  from public.booking_worker_offers
  where id = p_offer_id
    and worker_id = v_worker_id
  for update;


  if not found then
    return jsonb_build_object(
      'success', false,
      'error', 'Offer not found'
    );
  end if;


  -- ==========================================================
  -- Offer must still be pending.
  -- ==========================================================

  if v_offer.status <> 'pending' then
    return jsonb_build_object(
      'success', false,
      'error', 'Offer is no longer available'
    );
  end if;


  -- ==========================================================
  -- Expire the offer if its deadline has passed.
  -- ==========================================================

  if v_offer.expires_at <= now() then

    update public.booking_worker_offers
    set
      status = 'expired',
      responded_at = now(),
      updated_at = now()
    where id = v_offer.id;

    return jsonb_build_object(
      'success', false,
      'error', 'Offer has expired',
      'status', 'expired'
    );

  end if;


  -- ==========================================================
  -- Lock the booking.
  --
  -- This is the critical race-protection mechanism.
  -- ==========================================================

  select *
  into v_booking
  from public.bookings
  where id = v_offer.booking_id
  for update;


  if not found then
    update public.booking_worker_offers
    set
      status = 'cancelled',
      responded_at = now(),
      updated_at = now()
    where id = v_offer.id;

    return jsonb_build_object(
      'success', false,
      'error', 'Booking no longer exists'
    );
  end if;


  v_old_booking_status := v_booking.status;


  -- ==========================================================
  -- DECLINE
  -- ==========================================================

  if v_response = 'decline' then

    update public.booking_worker_offers
    set
      status = 'declined',
      responded_at = now(),
      updated_at = now()
    where id = v_offer.id;


    return jsonb_build_object(
      'success', true,
      'action', 'decline',
      'offer_id', v_offer.id,
      'booking_id', v_booking.id,
      'status', 'declined'
    );

  end if;


  -- ==========================================================
  -- ACCEPT
  --
  -- Only an unassigned booking can be won.
  -- ==========================================================

  if v_booking.status not in (
    'paid'::public.booking_status,
    'searching_worker'::public.booking_status
  )
  or v_booking.worker_id is not null
  then

    update public.booking_worker_offers
    set
      status = 'cancelled',
      responded_at = now(),
      updated_at = now()
    where id = v_offer.id;

    return jsonb_build_object(
      'success', false,
      'error', 'Booking is no longer available'
    );

  end if;


  -- ==========================================================
  -- Verify that this worker does not have an overlapping
  -- active booking.
  -- ==========================================================

  select exists (
    select 1
    from public.bookings ob
    where ob.worker_id = v_worker_id
      and ob.id <> v_booking.id
      and ob.status in (
        'assigned'::public.booking_status,
        'on_the_way'::public.booking_status,
        'arrived'::public.booking_status,
        'in_progress'::public.booking_status
      )
      and ob.scheduled_start < v_booking.scheduled_end
      and ob.scheduled_end > v_booking.scheduled_start
  )
  into v_has_conflict;


  if v_has_conflict then

    update public.booking_worker_offers
    set
      status = 'declined',
      responded_at = now(),
      updated_at = now()
    where id = v_offer.id;

    return jsonb_build_object(
      'success', false,
      'error', 'You already have another booking during this time'
    );

  end if;


  -- ==========================================================
  -- WIN THE BOOKING.
  --
  -- Booking row is locked, therefore only one concurrent
  -- transaction can reach this point for this booking.
  -- ==========================================================

  update public.bookings
  set
    worker_id = v_worker_id,
    worker_accepted_at = now(),
    status = 'assigned'::public.booking_status,
    updated_at = now()
  where id = v_booking.id;


  -- ==========================================================
  -- Mark this offer accepted.
  -- ==========================================================

  update public.booking_worker_offers
  set
    status = 'accepted',
    responded_at = now(),
    updated_at = now()
  where id = v_offer.id;


  -- ==========================================================
-- Mark the winning worker busy/unavailable.
-- ==========================================================

update public.worker_profiles
set
  worker_status = 'busy'::public.worker_status,
  updated_at = now()
where id = v_worker_id;

update public.worker_presence
set
  is_available = false,
  expires_at = now(),
  updated_at = now()
where worker_id = v_worker_id;


  -- ==========================================================
  -- Close every other pending offer.
  -- ==========================================================

  update public.booking_worker_offers
  set
    status = 'cancelled',
    responded_at = now(),
    updated_at = now()
  where booking_id = v_booking.id
    and id <> v_offer.id
    and status = 'pending';

    update public.worker_profiles
set
  worker_status = 'busy'::public.worker_status,
  updated_at = now()
where id = v_worker_id;

update public.worker_presence
set
  is_available = false,
  expires_at = now(),
  updated_at = now()
where worker_id = v_worker_id;


  -- ==========================================================
  -- Record booking state transition.
  -- ==========================================================

  if v_old_booking_status <> 'assigned'::public.booking_status then

    insert into public.booking_status_history (
      booking_id,
      old_status,
      new_status,
      changed_by,
      created_at
    )
    values (
      v_booking.id,
      v_old_booking_status,
      'assigned'::public.booking_status,
      v_worker_id,
      now()
    );

  end if;


  return jsonb_build_object(
    'success', true,
    'action', 'accept',
    'offer_id', v_offer.id,
    'booking_id', v_booking.id,
    'worker_id', v_worker_id,
    'status', 'assigned'
  );

end;
$function$;


revoke execute
on function public.worker_respond_to_offer(uuid, text)
from public, anon;


grant execute
on function public.worker_respond_to_offer(uuid, text)
to authenticated;


-- ============================================================
-- 7. Expire stale offers
--
-- This function is intentionally separate from acceptance.
-- A future scheduled job/worker can call it.
-- ============================================================

create or replace function public.expire_booking_worker_offers()
returns integer
language plpgsql
security definer
set search_path = public
as $function$

declare
  v_count integer;

begin

  update public.booking_worker_offers
  set
    status = 'expired',
    responded_at = now(),
    updated_at = now()
  where status = 'pending'
    and expires_at <= now();

  get diagnostics v_count = row_count;

  return v_count;

end;
$function$;


revoke execute
on function public.expire_booking_worker_offers()
from public, anon;


grant execute
on function public.expire_booking_worker_offers()
to authenticated;


commit;