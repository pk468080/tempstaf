-- ============================================================
-- TempStaff
-- Migrate admin booking assignment to central state transitions
-- ============================================================

drop function if exists public.admin_assign_booking_worker(uuid, uuid);

create function public.admin_assign_booking_worker(
  p_booking_id uuid,
  p_worker_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$

declare
  v_booking public.bookings%rowtype;
  v_old_worker uuid;
  v_old_status public.booking_status;
  v_before jsonb;
  v_after jsonb;
  v_address geography;
  v_worker_location geography;
  v_worker_radius numeric;
  v_result jsonb;

begin

  -- ----------------------------------------------------------
  -- Admin authorization
  -- ----------------------------------------------------------

  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;


  if p_worker_id is null then
    raise exception 'Worker is required';
  end if;


  -- ----------------------------------------------------------
  -- Lock booking
  -- ----------------------------------------------------------

  select *
  into v_booking
  from public.bookings
  where id = p_booking_id
  for update;


  if not found then
    raise exception 'Booking not found';
  end if;


  -- ----------------------------------------------------------
  -- Validate booking state
  -- ----------------------------------------------------------

  if v_booking.status not in (
    'paid'::public.booking_status,
    'searching_worker'::public.booking_status,
    'assigned'::public.booking_status
  ) then
    raise exception
      'Booking cannot be assigned or reassigned in its current status';
  end if;


  -- ----------------------------------------------------------
  -- Validate worker service compatibility
  -- ----------------------------------------------------------

  if not exists (
    select 1
    from public.worker_services ws
    where ws.worker_id = p_worker_id
      and ws.service_id = v_booking.service_id
  ) then
    raise exception
      'Selected worker does not provide this service';
  end if;


  -- ----------------------------------------------------------
  -- Validate worker eligibility
  -- ----------------------------------------------------------

  select wp.service_radius_km
  into v_worker_radius
  from public.worker_profiles wp
  where wp.id = p_worker_id
    and wp.is_verified = true
    and wp.worker_status in (
      'available'::public.worker_status,
      'offline'::public.worker_status
    );


  if not found then
    raise exception
      'Selected worker is not eligible or active';
  end if;


  if v_worker_radius is null or v_worker_radius <= 0 then
    raise exception
      'Selected worker does not have a valid service radius';
  end if;


  -- ----------------------------------------------------------
  -- Booking location
  -- ----------------------------------------------------------

  select coalesce(
    a.location,
    st_setsrid(
      st_makepoint(a.longitude, a.latitude),
      4326
    )::geography
  )
  into v_address
  from public.addresses a
  where a.id = v_booking.address_id;


  if v_address is null then
    raise exception 'Booking location is missing';
  end if;


  -- ----------------------------------------------------------
  -- Worker latest location
  -- ----------------------------------------------------------

  select wl.location
  into v_worker_location
  from public.worker_locations wl
  where wl.worker_id = p_worker_id
    and wl.location is not null
  order by wl.recorded_at desc nulls last
  limit 1;


  if v_worker_location is null then
    raise exception
      'Selected worker does not have a current location';
  end if;


  if not st_dwithin(
    v_worker_location,
    v_address,
    v_worker_radius * 1000
  ) then
    raise exception
      'Selected worker is outside their service radius for this booking location';
  end if;


  -- ----------------------------------------------------------
  -- Prevent overlapping active bookings
  -- ----------------------------------------------------------

  if exists (
    select 1
    from public.bookings b
    where b.worker_id = p_worker_id
      and b.id <> p_booking_id
      and b.status in (
        'assigned'::public.booking_status,
        'on_the_way'::public.booking_status,
        'arrived'::public.booking_status,
        'in_progress'::public.booking_status
      )
      and b.scheduled_start < v_booking.scheduled_end
      and b.scheduled_end > v_booking.scheduled_start
  ) then
    raise exception
      'Selected worker is already booked during this time';
  end if;


  -- ----------------------------------------------------------
  -- Capture before-state for admin audit
  -- ----------------------------------------------------------

  v_old_worker := v_booking.worker_id;
  v_old_status := v_booking.status;
  v_before := to_jsonb(v_booking);


  -- ----------------------------------------------------------
  -- Release previously assigned worker on reassignment
  -- ----------------------------------------------------------

  if v_old_worker is not null
     and v_old_worker <> p_worker_id then

    update public.worker_profiles
    set
      worker_status = 'available'::public.worker_status,
      updated_at = now()
    where id = v_old_worker
      and worker_status = 'busy'::public.worker_status;

  end if;


  -- ----------------------------------------------------------
  -- Central booking state transition
  --
  -- paid/searching_worker/assigned -> assigned
  --
  -- The central function owns:
  --   - worker_id mutation
  --   - booking status mutation
  --   - status history
  -- ----------------------------------------------------------

  v_result := public.transition_booking_state(
    v_booking.id,
    'assigned'::public.booking_status,
    p_worker_id,
    true,
    false
  );


  -- ----------------------------------------------------------
  -- Mark newly assigned worker busy
  -- ----------------------------------------------------------

  update public.worker_profiles
  set
    worker_status = 'busy'::public.worker_status,
    updated_at = now()
  where id = p_worker_id;


  -- ----------------------------------------------------------
  -- Capture after-state for admin audit
  -- ----------------------------------------------------------

  select to_jsonb(b)
  into v_after
  from public.bookings b
  where b.id = p_booking_id;


  perform public.write_admin_audit(
    case
      when v_old_worker is null
        then 'admin_assign_booking_worker'
      else 'admin_reassign_booking_worker'
    end,
    'booking',
    p_booking_id,
    v_before,
    v_after,
    jsonb_build_object(
      'old_worker_id', v_old_worker,
      'new_worker_id', p_worker_id
    )
  );


  -- ----------------------------------------------------------
  -- Return
  -- ----------------------------------------------------------

  return jsonb_build_object(
    'success', true,
    'booking_id', p_booking_id,
    'worker_id', p_worker_id,
    'old_worker_id', v_old_worker,
    'old_status', v_old_status::text,
    'status', v_result->>'status'
  );

end;

$function$;


revoke execute
on function public.admin_assign_booking_worker(uuid, uuid)
from anon;

grant execute
on function public.admin_assign_booking_worker(uuid, uuid)
to authenticated;