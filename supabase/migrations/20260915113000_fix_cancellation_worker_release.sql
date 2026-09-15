-- ============================================================
-- TempStaff
-- Centralize worker release when a booking worker is cleared.
--
-- This fixes cancellation paths that use transition_booking_state
-- so an assigned worker is not left incorrectly marked busy.
-- ============================================================

create or replace function public.transition_booking_state(
  p_booking_id uuid,
  p_new_status public.booking_status,
  p_worker_id uuid default null,
  p_set_worker boolean default false,
  p_clear_worker boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_booking public.bookings%rowtype;
  v_old_status public.booking_status;
  v_old_worker_id uuid;
  v_allowed boolean := false;
  v_has_active_booking boolean := false;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if p_booking_id is null then
    raise exception 'Booking ID is required';
  end if;

  if p_new_status is null then
    raise exception 'New booking status is required';
  end if;

  if p_set_worker and p_worker_id is null then
    raise exception 'Worker ID is required when assigning a worker';
  end if;

  if p_set_worker and p_clear_worker then
    raise exception 'Cannot set and clear worker at the same time';
  end if;

  select *
  into v_booking
  from public.bookings
  where id = p_booking_id
  for update;

  if not found then
    raise exception 'Booking not found';
  end if;

  v_old_status := v_booking.status;
  v_old_worker_id := v_booking.worker_id;

  -- Idempotent transition.
  if v_old_status = p_new_status then

    if p_set_worker
       and v_booking.worker_id is distinct from p_worker_id then

      update public.bookings
      set
        worker_id = p_worker_id,
        updated_at = now()
      where id = v_booking.id;

    elsif p_clear_worker
          and v_booking.worker_id is not null then

      update public.bookings
      set
        worker_id = null,
        updated_at = now()
      where id = v_booking.id;

    end if;

    -- Release the previous worker when the booking no longer owns
    -- the worker assignment.
    if p_clear_worker and v_old_worker_id is not null then

      select exists (
        select 1
        from public.bookings
        where worker_id = v_old_worker_id
          and id <> v_booking.id
          and status in (
            'assigned'::public.booking_status,
            'on_the_way'::public.booking_status,
            'arrived'::public.booking_status,
            'in_progress'::public.booking_status
          )
      )
      into v_has_active_booking;

      if not v_has_active_booking then

        update public.worker_profiles
        set worker_status = 'available'::public.worker_status
        where id = v_old_worker_id
          and worker_status <> 'suspended'::public.worker_status;

        update public.worker_availability
        set is_available = true
        where worker_id = v_old_worker_id;

        update public.worker_presence
set is_available = true
where worker_id = v_old_worker_id;
      end if;
    end if;

    select *
    into v_booking
    from public.bookings
    where id = p_booking_id;

    return jsonb_build_object(
      'success', true,
      'booking_id', v_booking.id,
      'old_status', v_old_status::text,
      'status', v_booking.status::text,
      'worker_id', v_booking.worker_id,
      'transitioned', false
    );
  end if;

  -- ==========================================================
  -- Authoritative booking state machine.
  -- ==========================================================

  v_allowed :=
       (v_old_status = 'pending_payment'
        and p_new_status in (
          'paid',
          'payment_failed',
          'cancelled'
        ))

    or (v_old_status = 'payment_failed'
        and p_new_status in (
          'paid',
          'cancelled'
        ))

    or (v_old_status = 'paid'
        and p_new_status in (
          'searching_worker',
          'assigned',
          'cancelled'
        ))

    or (v_old_status = 'searching_worker'
        and p_new_status in (
          'assigned',
          'cancelled'
        ))

    or (v_old_status = 'assigned'
        and p_new_status in (
          'searching_worker',
          'on_the_way',
          'cancelled'
        ))

    or (v_old_status = 'on_the_way'
        and p_new_status in (
          'arrived',
          'cancelled'
        ))

    or (v_old_status = 'arrived'
        and p_new_status in (
          'in_progress',
          'cancelled'
        ))

    or (v_old_status = 'in_progress'
        and p_new_status in (
          'completed',
          'cancelled'
        ));

  if not v_allowed then
    raise exception
      'Invalid booking state transition: % -> %',
      v_old_status::text,
      p_new_status::text;
  end if;

  -- assigned requires a worker.
  if p_new_status = 'assigned' then

    if p_set_worker then
      null;

    elsif v_booking.worker_id is null then
      raise exception 'Assigned booking requires a worker';
    end if;

  end if;

  -- searching_worker must not retain a worker.
  if p_new_status = 'searching_worker'
     and not p_clear_worker
     and v_booking.worker_id is not null then

    raise exception
      'Searching worker booking cannot retain an assigned worker';
  end if;

  -- ==========================================================
  -- Authoritative booking update.
  -- ==========================================================

  if p_set_worker then

    update public.bookings
    set
      worker_id = p_worker_id,
      status = p_new_status,
      updated_at = now()
    where id = v_booking.id;

  elsif p_clear_worker then

    update public.bookings
    set
      worker_id = null,
      status = p_new_status,
      updated_at = now()
    where id = v_booking.id;

  else

    update public.bookings
    set
      status = p_new_status,
      updated_at = now()
    where id = v_booking.id;

  end if;

  -- ==========================================================
  -- Release the previous worker when their booking assignment
  -- is removed.
  -- ==========================================================

  if p_clear_worker and v_old_worker_id is not null then

    select exists (
      select 1
      from public.bookings
      where worker_id = v_old_worker_id
        and id <> v_booking.id
        and status in (
          'assigned'::public.booking_status,
          'on_the_way'::public.booking_status,
          'arrived'::public.booking_status,
          'in_progress'::public.booking_status
        )
    )
    into v_has_active_booking;

    if not v_has_active_booking then

      update public.worker_profiles
      set worker_status = 'available'::public.worker_status
      where id = v_old_worker_id
        and worker_status <> 'suspended'::public.worker_status;

      update public.worker_availability
      set is_available = true
      where worker_id = v_old_worker_id;

      update public.worker_presence
set is_available = true
where worker_id = v_old_worker_id;

    end if;
  end if;

  -- ==========================================================
  -- Record every real status transition.
  -- ==========================================================

  insert into public.booking_status_history (
    booking_id,
    old_status,
    new_status,
    changed_by,
    created_at
  )
  values (
    v_booking.id,
    v_old_status,
    p_new_status,
    auth.uid(),
    now()
  );

  select *
  into v_booking
  from public.bookings
  where id = p_booking_id;

  return jsonb_build_object(
    'success', true,
    'booking_id', v_booking.id,
    'old_status', v_old_status::text,
    'status', v_booking.status::text,
    'worker_id', v_booking.worker_id,
    'transitioned', true
  );
end;
$function$;

revoke execute
on function public.transition_booking_state(
  uuid,
  public.booking_status,
  uuid,
  boolean,
  boolean
)
from public;

revoke execute
on function public.transition_booking_state(
  uuid,
  public.booking_status,
  uuid,
  boolean,
  boolean
)
from anon;