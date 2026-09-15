begin;

-- ============================================================
-- DISPATCH BOOKING WORKER OFFERS
--
-- Finds multiple eligible workers and creates pending offers.
--
-- IMPORTANT:
-- This function does NOT assign the booking.
-- The first worker to successfully accept an offer wins.
--
-- Dispatch policy is read from public.platform_settings.
-- ============================================================

create or replace function public.dispatch_booking_worker_offers(
  p_booking_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$

declare
  v_booking public.bookings%rowtype;
  v_address public.geography;

  v_worker record;

  v_created_count integer := 0;
  v_existing_count integer := 0;

  v_worker_limit integer;
  v_offer_minutes integer;
  v_offer_expires_at timestamptz;

  v_is_admin boolean := false;

begin

  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;


  -- ==========================================================
  -- Read dispatch configuration from the database.
  -- ==========================================================

  select
    case
      when jsonb_typeof(value -> 'value') = 'number'
      then (value ->> 'value')::integer
      else null
    end
  into v_worker_limit
  from public.platform_settings
  where key = 'dispatch.worker_offer_limit'
    and is_active = true;


  select
    case
      when jsonb_typeof(value -> 'value') = 'number'
      then (value ->> 'value')::integer
      else null
    end
  into v_offer_minutes
  from public.platform_settings
  where key = 'dispatch.worker_offer_duration_minutes'
    and is_active = true;


  if v_worker_limit is null then
    raise exception
      'Dispatch setting dispatch.worker_offer_limit is not configured';
  end if;


  if v_offer_minutes is null then
    raise exception
      'Dispatch setting dispatch.worker_offer_duration_minutes is not configured';
  end if;


  -- Defensive validation of database configuration.
  if v_worker_limit < 1 then
    raise exception
      'Dispatch worker offer limit must be at least 1';
  end if;


  if v_offer_minutes < 1 then
    raise exception
      'Dispatch worker offer duration must be at least 1 minute';
  end if;


  -- ==========================================================
  -- Admin check.
  -- ==========================================================

  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
      and p.is_active = true
  )
  into v_is_admin;


  if not v_is_admin then
    raise exception 'Admin access required';
  end if;


  -- ==========================================================
  -- Lock booking.
  --
  -- Prevents simultaneous dispatch requests from creating
  -- competing offer sets for the same booking.
  -- ==========================================================

  select *
  into v_booking
  from public.bookings
  where id = p_booking_id
  for update;


  if not found then
    raise exception 'Booking not found';
  end if;


  -- ==========================================================
  -- Booking must be waiting for assignment.
  -- ==========================================================

  if v_booking.status not in (
    'paid'::public.booking_status,
    'searching_worker'::public.booking_status
  ) then

    return jsonb_build_object(
      'success', false,
      'booking_id', v_booking.id,
      'status', v_booking.status,
      'error', 'Booking is not awaiting worker assignment'
    );

  end if;


  if v_booking.worker_id is not null then

    return jsonb_build_object(
      'success', true,
      'booking_id', v_booking.id,
      'status', 'assigned',
      'assigned', true,
      'worker_id', v_booking.worker_id,
      'created_offers', 0
    );

  end if;


  -- ==========================================================
  -- Booking location.
  -- ==========================================================

  select coalesce(
    a.location,
    st_setsrid(
      st_makepoint(a.longitude, a.latitude),
      4326
    )::public.geography
  )
  into v_address
  from public.addresses a
  where a.id = v_booking.address_id;


  if v_address is null then
    raise exception 'Booking location is missing';
  end if;


  -- ==========================================================
  -- Offer expiry.
  -- ==========================================================

  v_offer_expires_at :=
    now() + make_interval(mins => v_offer_minutes);


  -- ==========================================================
  -- Find eligible workers.
  --
  -- Current eligibility:
  --   - worker provides the booking service
  --   - verified
  --   - available worker status
  --   - active worker presence
  --   - recent location
  --   - inside service radius
  --   - no conflicting active booking
  --
  -- Scheduling-table integration remains separate until the
  -- multi-day service-duration semantics are finalized.
  -- ==========================================================

  for v_worker in

    select
      wp.id as worker_id,
      wp.rating,
      wp.total_completed_jobs,
      wp.service_radius_km,
      st_distance(
        wl.location,
        v_address
      ) / 1000.0 as distance_km

    from public.worker_services ws

    join public.worker_profiles wp
      on wp.id = ws.worker_id

    join public.worker_presence pr
      on pr.worker_id = wp.id
     and pr.is_available = true
     and pr.expires_at > now()

    join lateral (
      select
        wl.location
      from public.worker_locations wl
      where wl.worker_id = wp.id
        and wl.location is not null
        and wl.recorded_at >= now() - interval '10 minutes'
      order by wl.recorded_at desc
      limit 1
    ) wl on true

    where ws.service_id = v_booking.service_id

      and wp.is_verified = true

      and wp.worker_status =
        'available'::public.worker_status

      and wp.service_radius_km is not null

      and wp.service_radius_km > 0

      and st_dwithin(
        wl.location,
        v_address,
        wp.service_radius_km * 1000
      )

      -- Do not send another pending offer to the same worker.
      and not exists (
        select 1
        from public.booking_worker_offers bwo
        where bwo.booking_id = v_booking.id
          and bwo.worker_id = wp.id
          and bwo.status = 'pending'
      )

      -- Do not offer a worker who already has a conflicting job.
      and not exists (
        select 1
        from public.bookings b
        where b.worker_id = wp.id
          and b.id <> v_booking.id

          and b.status in (
            'assigned'::public.booking_status,
            'on_the_way'::public.booking_status,
            'arrived'::public.booking_status,
            'in_progress'::public.booking_status
          )

          and b.scheduled_start < v_booking.scheduled_end
          and b.scheduled_end > v_booking.scheduled_start
      )

    order by
      distance_km asc,
      wp.rating desc nulls last,
      wp.total_completed_jobs desc nulls last,
      wp.id

    limit v_worker_limit

  loop

    insert into public.booking_worker_offers (
      booking_id,
      worker_id,
      status,
      offered_at,
      expires_at,
      responded_at,
      created_at,
      updated_at
    )
    values (
      v_booking.id,
      v_worker.worker_id,
      'pending',
      now(),
      v_offer_expires_at,
      null,
      now(),
      now()
    )
    on conflict do nothing;

    if found then
      v_created_count := v_created_count + 1;
    end if;

  end loop;


  -- ==========================================================
  -- Move paid booking into searching_worker.
  -- ==========================================================

  if v_created_count > 0
     and v_booking.status = 'paid'::public.booking_status then

    update public.bookings
    set
      status = 'searching_worker'::public.booking_status,
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
      'paid'::public.booking_status,
      'searching_worker'::public.booking_status,
      auth.uid(),
      now()
    );

  end if;


  -- ==========================================================
  -- Return dispatch result.
  -- ==========================================================

  select count(*)
  into v_existing_count
  from public.booking_worker_offers
  where booking_id = v_booking.id
    and status = 'pending';


  return jsonb_build_object(
    'success', true,
    'booking_id', v_booking.id,
    'status',
      case
        when v_booking.status = 'paid'::public.booking_status
             and v_created_count > 0
          then 'searching_worker'
        else v_booking.status
      end,
    'created_offers', v_created_count,
    'pending_offers', v_existing_count,
    'offer_expires_at', v_offer_expires_at
  );

end;
$function$;


-- ============================================================
-- Remove the previous parameterized overload if it exists.
--
-- The dispatch policy is now database-configured, so callers
-- must not be able to supply worker-limit or offer-duration
-- overrides.
-- ============================================================

drop function if exists
  public.dispatch_booking_worker_offers(uuid, integer, integer);


-- ============================================================
-- Permissions
-- ============================================================

revoke execute
on function public.dispatch_booking_worker_offers(uuid)
from public, anon;


grant execute
on function public.dispatch_booking_worker_offers(uuid)
to authenticated;


commit;