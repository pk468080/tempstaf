-- ============================================================
-- TempStaff
-- Enforce OTP-only worker start/completion.
--
-- worker_booking_action() remains responsible for:
--   accept
--   decline
--   on_the_way
--   arrived
--   cancel
--
-- start and complete MUST go through:
--   verify_booking_otp_atomic()
-- ============================================================

create or replace function public.worker_booking_action(
  p_booking_id uuid,
  p_action text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$

declare
  v_booking public.bookings%rowtype;
  v_result jsonb;
  v_action text;

begin

  v_action := lower(trim(p_action));


  -- ==========================================================
  -- Authentication
  -- ==========================================================

  if auth.uid() is null then
    return jsonb_build_object(
      'success', false,
      'error', 'Authentication required'
    );
  end if;


  -- ==========================================================
  -- START / COMPLETE
  --
  -- These transitions require customer OTP verification.
  -- Never allow them through this generic worker action RPC.
  -- ==========================================================

  if v_action in ('start', 'complete') then
    return jsonb_build_object(
      'success', false,
      'error',
      'This action requires OTP verification'
    );
  end if;


  -- ==========================================================
  -- Worker authorization
  -- ==========================================================

  select *
  into v_booking
  from public.bookings
  where id = p_booking_id
    and worker_id = auth.uid()
  for update;


  if not found then
    return jsonb_build_object(
      'success', false,
      'error',
      'Booking not found or worker is not assigned to this booking'
    );
  end if;


  -- ==========================================================
  -- ACCEPT
  --
  -- Existing direct-assignment compatibility path:
  -- paid -> assigned
  --
  -- Multi-worker offers use worker_respond_to_offer().
  -- ==========================================================

  if v_action = 'accept' then

    if v_booking.status not in (
      'paid'::public.booking_status,
      'assigned'::public.booking_status
    ) then
      return jsonb_build_object(
        'success', false,
        'error',
        'Booking is no longer awaiting worker acceptance'
      );
    end if;


    -- Prevent overlapping active jobs.

    if exists (
      select 1
      from public.bookings ob
      where ob.worker_id = auth.uid()
        and ob.id <> v_booking.id
        and ob.status in (
          'assigned'::public.booking_status,
          'on_the_way'::public.booking_status,
          'arrived'::public.booking_status,
          'in_progress'::public.booking_status
        )
        and ob.scheduled_start < v_booking.scheduled_end
        and ob.scheduled_end > v_booking.scheduled_start
    ) then
      return jsonb_build_object(
        'success', false,
        'error',
        'You already have another booking during this time'
      );
    end if;


    update public.bookings
    set
      worker_accepted_at = now(),
      updated_at = now()
    where id = v_booking.id
      and worker_id = auth.uid();


    v_result := public.transition_booking_state(
      v_booking.id,
      'assigned'::public.booking_status
    );


  -- ==========================================================
  -- DECLINE
  --
  -- paid/assigned -> searching_worker
  -- ==========================================================

  elsif v_action = 'decline' then

    if v_booking.status not in (
      'paid'::public.booking_status,
      'assigned'::public.booking_status
    ) then
      return jsonb_build_object(
        'success', false,
        'error',
        'Only a pending worker offer can be declined'
      );
    end if;


    v_result := public.transition_booking_state(
      v_booking.id,
      'searching_worker'::public.booking_status,
      null,
      false,
      true
    );


  -- ==========================================================
  -- ON THE WAY
  --
  -- assigned -> on_the_way
  -- ==========================================================

  elsif v_action = 'on_the_way' then

    if v_booking.status <>
       'assigned'::public.booking_status then
      return jsonb_build_object(
        'success', false,
        'error',
        'Booking must be assigned before travelling'
      );
    end if;


    v_result := public.transition_booking_state(
      v_booking.id,
      'on_the_way'::public.booking_status
    );


  -- ==========================================================
  -- ARRIVED
  --
  -- on_the_way -> arrived
  -- ==========================================================

  elsif v_action = 'arrived' then

    if v_booking.status <>
       'on_the_way'::public.booking_status then
      return jsonb_build_object(
        'success', false,
        'error',
        'Worker must be on the way before marking arrival'
      );
    end if;


    v_result := public.transition_booking_state(
      v_booking.id,
      'arrived'::public.booking_status
    );


  -- ==========================================================
  -- CANCEL
  --
  -- assigned/on_the_way/arrived/in_progress -> cancelled
  -- ==========================================================

  elsif v_action = 'cancel' then

    if v_booking.status not in (
      'assigned'::public.booking_status,
      'on_the_way'::public.booking_status,
      'arrived'::public.booking_status,
      'in_progress'::public.booking_status
    ) then
      return jsonb_build_object(
        'success', false,
        'error',
        'This booking cannot be cancelled from its current state'
      );
    end if;


    v_result := public.transition_booking_state(
      v_booking.id,
      'cancelled'::public.booking_status,
      null,
      false,
      true
    );


  -- ==========================================================
  -- INVALID ACTION
  -- ==========================================================

  else

    return jsonb_build_object(
      'success', false,
      'error',
      'Invalid worker booking action'
    );

  end if;


  -- ==========================================================
  -- Result
  -- ==========================================================

  return jsonb_build_object(
    'success', true,
    'booking_id', v_booking.id,
    'action', v_action,
    'old_status', v_result->>'old_status',
    'status', v_result->>'status',
    'worker_accepted_at',
      case
        when v_action = 'accept' then
          (
            select worker_accepted_at::text
            from public.bookings
            where id = v_booking.id
          )
        else null
      end
  );

end;

$function$;


-- ============================================================
-- Permissions
-- ============================================================

revoke all
on function public.worker_booking_action(uuid, text)
from public;

revoke all
on function public.worker_booking_action(uuid, text)
from anon;

grant execute
on function public.worker_booking_action(uuid, text)
to authenticated;