-- ============================================================
-- TempStaff
-- Migrate worker offer acceptance to the authoritative
-- booking state transition function.
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
  v_result jsonb;

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
  -- Lock the worker's offer.
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

  if v_offer.status <> 'pending' then
    return jsonb_build_object(
      'success', false,
      'error', 'Offer is no longer available'
    );
  end if;

  -- ==========================================================
  -- Expire an offer whose deadline has passed.
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
  -- This remains the atomic first-acceptance mechanism.
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
  -- Only an unassigned paid/searching booking can be won.
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
  -- Verify that this worker has no overlapping active booking.
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
  -- WIN THE BOOKING THROUGH THE CENTRAL STATE MACHINE.
  --
  -- The booking row is already locked.
  -- transition_booking_state() owns:
  --   - worker_id
  --   - booking status
  --   - booking status history
  -- ==========================================================

  v_result := public.transition_booking_state(
    v_booking.id,
    'assigned'::public.booking_status,
    v_worker_id,
    true,
    false
  );

  -- Record the worker acceptance timestamp.
  update public.bookings
  set
    worker_accepted_at = now(),
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

  return jsonb_build_object(
    'success', true,
    'action', 'accept',
    'offer_id', v_offer.id,
    'booking_id', v_booking.id,
    'worker_id', v_worker_id,
    'status', v_result->>'status'
  );

end;
$function$;

revoke execute
on function public.worker_respond_to_offer(uuid, text)
from public, anon;

grant execute
on function public.worker_respond_to_offer(uuid, text)
to authenticated;