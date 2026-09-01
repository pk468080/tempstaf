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
  v_old_status public.booking_status;
  v_new_status public.booking_status;
  v_action text;
  v_has_active_booking boolean;
  v_platform_fee numeric;
begin
  v_action := lower(trim(p_action));

  if auth.uid() is null then
    return jsonb_build_object(
      'success', false,
      'error', 'Authentication required'
    );
  end if;

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

  v_old_status := v_booking.status;

  /*
   * ACCEPT
   *
   * paid -> assigned
   */
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

    /*
     * Prevent overlapping active jobs.
     */
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
    set worker_accepted_at = now(),
        updated_at = now()
    where id = v_booking.id
      and worker_id = auth.uid();

    v_new_status := 'assigned'::public.booking_status;

  /*
   * DECLINE
   *
   * paid/assigned -> searching_worker
   *
   * The worker is removed so another worker can be assigned.
   */
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

    update public.bookings
    set
      status = 'searching_worker'::public.booking_status,
      worker_id = null,
      updated_at = now()
    where id = v_booking.id;

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
      'searching_worker'::public.booking_status,
      auth.uid(),
      now()
    );

    /*
     * Make worker available again unless another
     * active booking exists.
     */
    select exists (
      select 1
      from public.bookings
      where worker_id = auth.uid()
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
      where id = auth.uid()
        and worker_status <> 'suspended'::public.worker_status;

      update public.worker_availability
      set is_available = true
      where worker_id = auth.uid();
    end if;

    return jsonb_build_object(
      'success', true,
      'booking_id', v_booking.id,
      'action', v_action,
      'status', 'searching_worker'
    );

  /*
   * ON THE WAY
   *
   * assigned -> on_the_way
   */
  elsif v_action = 'on_the_way' then

    if v_booking.status <> 'assigned'::public.booking_status then
      return jsonb_build_object(
        'success', false,
        'error',
        'Booking must be assigned before travelling'
      );
    end if;

    v_new_status := 'on_the_way'::public.booking_status;

  /*
   * ARRIVED
   *
   * on_the_way -> arrived
   */
  elsif v_action = 'arrived' then

    if v_booking.status <> 'on_the_way'::public.booking_status then
      return jsonb_build_object(
        'success', false,
        'error',
        'Worker must be on the way before marking arrival'
      );
    end if;

    v_new_status := 'arrived'::public.booking_status;

  /*
   * START
   *
   * arrived -> in_progress
   *
   * OTP verification should happen before this action
   * in the worker app / verification flow.
   */
  elsif v_action = 'start' then

    if v_booking.status <> 'arrived'::public.booking_status then
      return jsonb_build_object(
        'success', false,
        'error',
        'Worker must arrive before starting the job'
      );
    end if;

    v_new_status := 'in_progress'::public.booking_status;

  /*
   * COMPLETE
   *
   * in_progress -> completed
   */
  elsif v_action = 'complete' then

    if v_booking.status <> 'in_progress'::public.booking_status then
      return jsonb_build_object(
        'success', false,
        'error',
        'Job must be in progress before completion'
      );
    end if;

    v_new_status := 'completed'::public.booking_status;

  /*
   * CANCEL
   *
   * assigned/on_the_way/arrived/in_progress -> cancelled
   */
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

    v_new_status := 'cancelled'::public.booking_status;

  else

    return jsonb_build_object(
      'success', false,
      'error',
      'Invalid worker booking action'
    );

  end if;

  /*
   * All normal worker transitions reach this point.
   */
  update public.bookings
  set
    status = v_new_status,
    updated_at = now()
  where id = v_booking.id
    and worker_id = auth.uid()
  returning *
  into v_booking;

  /*
   * Record status history.
   */
  if v_old_status <> v_new_status then
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
      v_new_status,
      auth.uid(),
      now()
    );
  end if;

  /*
   * Worker becomes busy once a booking is accepted
   * and remains busy through the active job.
   */
  if v_new_status in (
    'assigned'::public.booking_status,
    'on_the_way'::public.booking_status,
    'arrived'::public.booking_status,
    'in_progress'::public.booking_status
  ) then

    update public.worker_profiles
    set worker_status = 'busy'::public.worker_status
    where id = auth.uid();

    update public.worker_availability
    set is_available = false
    where worker_id = auth.uid();

  end if;

  /*
   * Completion creates earnings exactly once.
   */
  if v_new_status = 'completed'::public.booking_status then

    v_platform_fee := coalesce(
      v_booking.platform_fee,
      0
    );

    insert into public.worker_earnings (
      worker_id,
      booking_id,
      gross_amount,
      platform_fee,
      net_amount
    )
    select
      v_booking.worker_id,
      v_booking.id,
      v_booking.total_amount,
      v_platform_fee,
      v_booking.total_amount - v_platform_fee
    where not exists (
      select 1
      from public.worker_earnings
      where booking_id = v_booking.id
    );

  end if;

  /*
   * Cancellation/completion releases worker availability
   * unless another active booking exists.
   */
  if v_new_status in (
    'completed'::public.booking_status,
    'cancelled'::public.booking_status
  ) then

    select exists (
      select 1
      from public.bookings
      where worker_id = auth.uid()
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
      where id = auth.uid()
        and worker_status <> 'suspended'::public.worker_status;

      update public.worker_availability
      set is_available = true
      where worker_id = auth.uid();

    end if;

  end if;

  return jsonb_build_object(
    'success', true,
    'booking_id', v_booking.id,
    'action', v_action,
    'old_status', v_old_status::text,
    'status', v_new_status::text,
    'worker_accepted_at',
      case
        when v_action = 'accept' then v_booking.worker_accepted_at::text
        else null
      end
  );
end;
$function$;

revoke execute
on function public.worker_booking_action(uuid, text)
from anon;

grant execute
on function public.worker_booking_action(uuid, text)
to authenticated;