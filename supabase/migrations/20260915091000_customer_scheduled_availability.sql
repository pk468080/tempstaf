begin;

-- ============================================================
-- Customer scheduled availability
--
-- Returns customer-facing start/end slots calculated entirely
-- on the server.
--
-- Customers do NOT read worker schedules directly.
--
-- Availability considers:
--   - selected service variant
--   - selected customer address
--   - worker service compatibility
--   - verified workers
--   - worker recurring schedule
--   - worker schedule exceptions
--   - existing booking conflicts
--   - worker service radius / current known location
--
-- IMPORTANT:
--   worker_presence is intentionally NOT required here.
--   A worker can be scheduled for a future booking while
--   currently offline.
-- ============================================================


create or replace function public.get_customer_scheduled_slots(
  p_service_variant_id uuid,
  p_address_id uuid,
  p_start_date date,
  p_end_date date
)
returns table (
  slot_start timestamptz,
  slot_end timestamptz
)
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_customer_id uuid := auth.uid();

  v_service_id uuid;
  v_duration_value integer;
  v_duration_unit public.booking_duration_unit;

  v_timezone text;
  v_customer_location public.geography;

  v_date date;
  v_weekday smallint;

  v_schedule record;
  v_slot_start_local timestamp;
  v_slot_end_local timestamp;

  v_slot_start timestamptz;
  v_slot_end timestamptz;

  v_worker_exists boolean;

  v_day_limit integer;
begin

  -- ==========================================================
  -- Authentication
  -- ==========================================================

  if v_customer_id is null then
    raise exception 'Authentication required';
  end if;


  -- ==========================================================
  -- Input validation
  -- ==========================================================

  if p_service_variant_id is null then
    raise exception 'Service package is required';
  end if;

  if p_address_id is null then
    raise exception 'Booking address is required';
  end if;

  if p_start_date is null or p_end_date is null then
    raise exception 'Date range is required';
  end if;

  if p_end_date < p_start_date then
    raise exception 'Invalid date range';
  end if;

  v_day_limit := p_end_date - p_start_date + 1;

  if v_day_limit > 31 then
    raise exception 'Availability range cannot exceed 31 days';
  end if;


  -- ==========================================================
  -- Customer address
  -- ==========================================================

  select coalesce(
    a.location,
    st_setsrid(
      st_makepoint(a.longitude, a.latitude),
      4326
    )::public.geography
  )
  into v_customer_location
  from public.addresses a
  where a.id = p_address_id
    and a.user_id = v_customer_id
    and a.latitude is not null
    and a.longitude is not null;

  if v_customer_location is null then
    raise exception 'Valid customer address is required';
  end if;


  -- ==========================================================
  -- Service variant + duration
  -- ==========================================================

  select
    sv.service_id,
    coalesce(sv.duration_value, 1),
    coalesce(
      sv.duration_unit,
      'hour'
    )::public.booking_duration_unit
  into
    v_service_id,
    v_duration_value,
    v_duration_unit
  from public.service_variants sv
  join public.services s
    on s.id = sv.service_id
  where sv.id = p_service_variant_id
    and sv.is_active = true
    and s.is_active = true;

  if v_service_id is null then
    raise exception 'Service package is not available';
  end if;

  if v_duration_value <= 0 then
    raise exception 'Service package has an invalid duration';
  end if;


  -- ==========================================================
  -- Iterate through requested dates
  -- ==========================================================

  v_date := p_start_date;

  while v_date <= p_end_date loop

    -- PostgreSQL:
    -- 0 = Sunday
    -- 1 = Monday
    -- ...
    -- 6 = Saturday

    v_weekday := extract(
      dow from v_date
    )::smallint;


    -- ========================================================
    -- Every active recurring schedule window for this weekday
    -- ========================================================

    for v_schedule in
      select
        wws.worker_id,
        wss.timezone,
        wws.start_time,
        wws.end_time
      from public.worker_weekly_schedules wws
      join public.worker_schedule_settings wss
        on wss.worker_id = wws.worker_id
      where wws.day_of_week = v_weekday
        and wws.is_active = true
    loop

      -- ======================================================
      -- Build the first candidate slot at schedule start.
      --
      -- Slot progression uses the actual service duration.
      -- There is no hardcoded hourly interval.
      -- ======================================================

      v_slot_start_local :=
        v_date::timestamp
        + v_schedule.start_time;

      loop

        -- ====================================================
        -- Calculate slot end using the existing booking
        -- duration semantics.
        -- ====================================================

        v_slot_end_local :=
          case v_duration_unit
            when 'hour' then
              v_slot_start_local
              + make_interval(
                  hours => v_duration_value
                )

            when 'day' then
              v_slot_start_local
              + make_interval(
                  days => v_duration_value
                )

            when 'week' then
              v_slot_start_local
              + make_interval(
                  days => v_duration_value * 7
                )

            when 'month' then
              v_slot_start_local
              + make_interval(
                  months => v_duration_value
                )
          end;


        -- ====================================================
        -- Candidate must fit completely inside worker's
        -- recurring schedule window.
        --
        -- Convert local wall-clock time using the worker's
        -- configured timezone.
        -- ====================================================

        if v_slot_start_local::time >= v_schedule.start_time
           and v_slot_end_local::time <= v_schedule.end_time
           and v_slot_end_local::date = v_date
        then

          v_slot_start :=
            v_slot_start_local
            at time zone v_schedule.timezone;

          v_slot_end :=
            v_slot_end_local
            at time zone v_schedule.timezone;


          -- ================================================
          -- Do not offer slots that have already started.
          -- ================================================

          if v_slot_start > now() then

            -- ==============================================
            -- Apply schedule exceptions.
            --
            -- Entire-date unavailable exception blocks the
            -- candidate.
            --
            -- Time-window unavailable exception blocks only
            -- overlapping candidates.
            --
            -- Available exceptions are additive and do not
            -- replace the weekly schedule.
            -- ==============================================

            if not exists (
              select 1
              from public.worker_schedule_exceptions e
              where e.worker_id = v_schedule.worker_id
                and e.exception_date = v_date
                and e.is_active = true
                and e.exception_type = 'unavailable'
                and (
                  e.start_time is null
                  or (
                    v_slot_start_local::time < e.end_time
                    and v_slot_end_local::time > e.start_time
                  )
                )
            ) then

              -- ============================================
              -- There must be at least one worker capable of
              -- performing this booking at this location and
              -- time.
              --
              -- We use the worker's latest known location for
              -- service-radius validation, but do NOT require
              -- live presence.
              -- ============================================

              select exists (
                select 1
                from public.worker_services ws
                join public.worker_profiles wp
                  on wp.id = ws.worker_id

                where ws.service_id = v_service_id
                  and wp.is_verified = true
                  and wp.service_radius_km > 0

                  and wp.current_location is not null

                  and st_dwithin(
                    wp.current_location,
                    v_customer_location,
                    wp.service_radius_km * 1000
                  )

                  -- ========================================
                  -- Worker must not already have a booking
                  -- overlapping the candidate.
                  -- ========================================

                  and not exists (
                    select 1
                    from public.bookings b
                    where b.worker_id = wp.id
                      and b.status in (
                        'assigned'::public.booking_status,
                        'on_the_way'::public.booking_status,
                        'arrived'::public.booking_status,
                        'in_progress'::public.booking_status
                      )
                      and b.scheduled_start < v_slot_end
                      and b.scheduled_end > v_slot_start
                  )

                  -- ========================================
                  -- Concrete availability, when present,
                  -- must cover the candidate.
                  --
                  -- This preserves compatibility with the
                  -- existing worker_availability mechanism
                  -- without making it the source of recurring
                  -- future schedules.
                  -- ========================================

                  and (
                    not exists (
                      select 1
                      from public.worker_availability wa_check
                      where wa_check.worker_id = wp.id
                    )
                    or exists (
                      select 1
                      from public.worker_availability wa
                      where wa.worker_id = wp.id
                        and wa.is_available = true
                        and wa.available_from <= v_slot_start
                        and wa.available_until >= v_slot_end
                    )
                  )
              )
              into v_worker_exists;


              if v_worker_exists then
                slot_start := v_slot_start;
                slot_end := v_slot_end;
                return next;
              end if;

            end if;

          end if;

        end if;


        -- ====================================================
        -- Advance by the service duration.
        --
        -- No hardcoded 1-hour slot interval.
        -- ====================================================

        v_slot_start_local :=
          case v_duration_unit
            when 'hour' then
              v_slot_start_local
              + make_interval(
                  hours => v_duration_value
                )

            when 'day' then
              v_slot_start_local
              + make_interval(
                  days => v_duration_value
                )

            when 'week' then
              v_slot_start_local
              + make_interval(
                  days => v_duration_value * 7
                )

            when 'month' then
              v_slot_start_local
              + make_interval(
                  months => v_duration_value
                )
          end;


        -- Stop once the next candidate starts outside this
        -- recurring schedule window.

        exit when v_slot_start_local::time >= v_schedule.end_time
                   or v_slot_start_local::date <> v_date;

      end loop;

    end loop;


    -- ========================================================
    -- Move to next date.
    -- ========================================================

    v_date := v_date + 1;

  end loop;

  return;

end;
$function$;


-- ============================================================
-- Explicit customer-facing execution permissions.
--
-- Raw schedule tables remain protected by RLS.
-- Customers only receive calculated slots through this RPC.
-- ============================================================

revoke all
on function public.get_customer_scheduled_slots(
  uuid,
  uuid,
  date,
  date
)
from public;

grant execute
on function public.get_customer_scheduled_slots(
  uuid,
  uuid,
  date,
  date
)
to authenticated;


commit;