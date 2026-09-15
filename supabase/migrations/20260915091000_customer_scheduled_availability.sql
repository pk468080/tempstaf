begin;

-- ============================================================
-- CUSTOMER SCHEDULED AVAILABILITY
--
-- Customer-facing availability is calculated server-side.
--
-- Customers never read worker schedules directly.
--
-- Source of truth:
--   worker_schedule_settings
--   worker_weekly_schedules
--   worker_schedule_exceptions
--   worker_services
--   worker_profiles
--   bookings
--
-- worker_presence is NOT required for future scheduling.
-- worker_availability is NOT used by this function.
-- ============================================================


-- ============================================================
-- 1. Database-configured slot interval
--
-- No production default is supplied.
-- Each worker's scheduling settings must explicitly define
-- how customer-facing start times are generated.
-- ============================================================

alter table public.worker_schedule_settings
  add column if not exists slot_interval_minutes integer;


alter table public.worker_schedule_settings
  drop constraint if exists worker_schedule_settings_slot_interval_check;


alter table public.worker_schedule_settings
  add constraint worker_schedule_settings_slot_interval_check
  check (
    slot_interval_minutes is null
    or slot_interval_minutes > 0
  );


-- ============================================================
-- 2. Worker scheduled availability RPC
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

  v_customer_location public.geography;

  v_date date;
  v_candidate_date date;

  v_worker record;
  v_window record;

  v_timezone text;
  v_interval_minutes integer;

  v_window_start_local timestamp;
  v_window_end_local timestamp;

  v_candidate_start_local timestamp;
  v_candidate_end_local timestamp;

  v_candidate_start timestamptz;
  v_candidate_end timestamptz;

  v_date_start_local timestamp;
  v_date_end_local timestamp;

  v_worker_available boolean;

  v_day_of_week smallint;

  v_day_limit integer;

begin

  -- ==========================================================
  -- Authentication
  -- ==========================================================

  if v_customer_id is null then
    raise exception 'Authentication required';
  end if;


  -- ==========================================================
  -- Validate inputs
  -- ==========================================================

  if p_service_variant_id is null then
    raise exception 'Service package is required';
  end if;

  if p_address_id is null then
    raise exception 'Booking address is required';
  end if;

  if p_start_date is null
     or p_end_date is null then
    raise exception 'Date range is required';
  end if;

  if p_end_date < p_start_date then
    raise exception 'Invalid date range';
  end if;

  v_day_limit :=
    p_end_date - p_start_date + 1;

  if v_day_limit > 31 then
    raise exception 'Availability range cannot exceed 31 days';
  end if;


  -- ==========================================================
  -- Customer address
  -- ==========================================================

  select coalesce(
    a.location,
    st_setsrid(
      st_makepoint(
        a.longitude,
        a.latitude
      ),
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
  -- Existing catalogue is the source of truth for duration.
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
  -- Validate that the customer address is inside an active
  -- service area for this service.
  --
  -- This mirrors the server-side booking requirement.
  -- ==========================================================

  if not exists (
    select 1
    from public.service_areas sa
    where sa.service_id = v_service_id
      and sa.is_active = true
      and sa.center_lat is not null
      and sa.center_long is not null
      and sa.radius_km is not null
      and st_dwithin(
        st_setsrid(
          st_makepoint(
            sa.center_long,
            sa.center_lat
          ),
          4326
        )::public.geography,
        v_customer_location,
        sa.radius_km * 1000
      )
  )
  and not exists (
    select 1
    from public.service_areas sa
    where sa.service_id is null
      and sa.is_active = true
      and sa.center_lat is not null
      and sa.center_long is not null
      and sa.radius_km is not null
      and st_dwithin(
        st_setsrid(
          st_makepoint(
            sa.center_long,
            sa.center_lat
          ),
          4326
        )::public.geography,
        v_customer_location,
        sa.radius_km * 1000
      )
  )
  then
    raise exception 'Service is not available at this address';
  end if;


  -- ==========================================================
  -- Iterate workers.
  --
  -- Every returned slot must be backed by the SAME worker whose
  -- schedule generated the candidate.
  -- ==========================================================

  for v_worker in

    select
      wp.id as worker_id,
      wss.timezone,
      wss.slot_interval_minutes
    from public.worker_profiles wp
    join public.worker_schedule_settings wss
      on wss.worker_id = wp.id
    join public.worker_services ws
      on ws.worker_id = wp.id
    where ws.service_id = v_service_id
      and wp.is_verified = true
      and wp.current_location is not null
      and wp.service_radius_km is not null
      and wp.service_radius_km > 0
      and wss.slot_interval_minutes is not null
      and wss.slot_interval_minutes > 0

  loop

    v_timezone :=
      v_worker.timezone;

    v_interval_minutes :=
      v_worker.slot_interval_minutes;


    -- ========================================================
    -- Iterate requested dates.
    -- ========================================================

    v_date := p_start_date;

    while v_date <= p_end_date loop

      v_day_of_week :=
        extract(
          dow from v_date
        )::smallint;


      -- ======================================================
      -- Build candidate windows from:
      --
      --   1. recurring weekly schedules
      --   2. additive "available" exceptions
      --
      -- "unavailable" exceptions are checked separately and
      -- always override both.
      -- ======================================================

      for v_window in

        with windows as (

          select
            wws.start_time,
            wws.end_time
          from public.worker_weekly_schedules wws
          where wws.worker_id = v_worker.worker_id
            and wws.day_of_week = v_day_of_week
            and wws.is_active = true

          union

          select
            e.start_time,
            e.end_time
          from public.worker_schedule_exceptions e
          where e.worker_id = v_worker.worker_id
            and e.exception_date = v_date
            and e.exception_type = 'available'
            and e.is_active = true
            and e.start_time is not null
            and e.end_time is not null

        )

        select
          w.start_time,
          w.end_time
        from windows w
        where w.start_time < w.end_time

      loop

        v_window_start_local :=
          v_date::timestamp
          + v_window.start_time;

        v_window_end_local :=
          v_date::timestamp
          + v_window.end_time;


        -- ====================================================
        -- Generate candidates according to the database-defined
        -- worker slot interval.
        -- ====================================================

        v_candidate_start_local :=
          v_window_start_local;


        while v_candidate_start_local < v_window_end_local loop

          -- ================================================
          -- Existing booking duration semantics.
          -- ================================================

          v_candidate_end_local :=
            case v_duration_unit

              when 'hour' then
                v_candidate_start_local
                + make_interval(
                    hours => v_duration_value
                  )

              when 'day' then
                v_candidate_start_local
                + make_interval(
                    days => v_duration_value
                  )

              when 'week' then
                v_candidate_start_local
                + make_interval(
                    days => v_duration_value * 7
                  )

              when 'month' then
                v_candidate_start_local
                + make_interval(
                    months => v_duration_value
                  )

            end;


          -- ==================================================
          -- Candidate must fit the originating working window
          -- for a normal same-day service.
          --
          -- Multi-day services are checked separately below.
          -- ==================================================

          if v_duration_unit = 'hour' then

            if v_candidate_end_local <= v_window_end_local then

              v_candidate_start :=
                v_candidate_start_local
                at time zone v_timezone;

              v_candidate_end :=
                v_candidate_end_local
                at time zone v_timezone;


              if v_candidate_start > now() then

                -- ============================================
                -- Worker-specific unavailable exception.
                -- ============================================

                if not exists (
                  select 1
                  from public.worker_schedule_exceptions e
                  where e.worker_id = v_worker.worker_id
                    and e.exception_date = v_date
                    and e.exception_type = 'unavailable'
                    and e.is_active = true
                    and (
                      (
                        e.start_time is null
                        and e.end_time is null
                      )
                      or (
                        e.start_time is not null
                        and e.end_time is not null
                        and v_candidate_start_local::time < e.end_time
                        and v_candidate_end_local::time > e.start_time
                      )
                    )
                )

                -- ==========================================
                -- Worker must currently be within the service
                -- radius. Presence/online status is NOT
                -- required.
                -- ==========================================

                and exists (
                  select 1
                  from public.worker_profiles wp2
                  where wp2.id = v_worker.worker_id
                    and wp2.current_location is not null
                    and st_dwithin(
                      wp2.current_location,
                      v_customer_location,
                      wp2.service_radius_km * 1000
                    )
                )

                -- ==========================================
                -- No conflicting booking for this worker.
                -- ==========================================

                and not exists (
                  select 1
                  from public.bookings b
                  where b.worker_id = v_worker.worker_id
                    and b.status in (
                      'assigned'::public.booking_status,
                      'on_the_way'::public.booking_status,
                      'arrived'::public.booking_status,
                      'in_progress'::public.booking_status
                    )
                    and b.scheduled_start < v_candidate_end
                    and b.scheduled_end > v_candidate_start
                )
                then

                  slot_start := v_candidate_start;
                  slot_end := v_candidate_end;

                  return next;

                end if;

              end if;

            end if;


          else

            -- =================================================
            -- DAY / WEEK / MONTH
            --
            -- These durations may cross local calendar dates.
            -- Verify the entire interval against this SAME
            -- worker's schedule.
            -- =================================================

            v_worker_available := true;

            v_candidate_start :=
              v_candidate_start_local
              at time zone v_timezone;

            v_candidate_end :=
              v_candidate_end_local
              at time zone v_timezone;


            if v_candidate_start <= now() then
              v_worker_available := false;
            end if;


            -- =================================================
            -- Check every local calendar date touched by the
            -- booking.
            -- =================================================

            if v_worker_available then

              v_candidate_date :=
                v_candidate_start_local::date;


              while v_candidate_date <=
                    v_candidate_end_local::date
              loop

                v_date_start_local :=
                  case
                    when v_candidate_date =
                         v_candidate_start_local::date
                    then
                      v_candidate_start_local
                    else
                      v_candidate_date::timestamp
                  end;

                v_date_end_local :=
                  case
                    when v_candidate_date =
                         v_candidate_end_local::date
                    then
                      v_candidate_end_local
                    else
                      (v_candidate_date + 1)::timestamp
                  end;


                -- =============================================
                -- Every touched portion must be covered by at
                -- least one weekly/available schedule window.
                -- =============================================

                if not exists (

                  select 1

                  from (

                    select
                      wws.start_time,
                      wws.end_time
                    from public.worker_weekly_schedules wws
                    where wws.worker_id = v_worker.worker_id
                      and wws.day_of_week =
                          extract(
                            dow from v_candidate_date
                          )::smallint
                      and wws.is_active = true

                    union

                    select
                      e.start_time,
                      e.end_time
                    from public.worker_schedule_exceptions e
                    where e.worker_id = v_worker.worker_id
                      and e.exception_date = v_candidate_date
                      and e.exception_type = 'available'
                      and e.is_active = true
                      and e.start_time is not null
                      and e.end_time is not null

                  ) windows

                  where
                    (
                      v_date_start_local::time >= windows.start_time
                      and v_date_end_local::time <= windows.end_time
                    )

                )
                then
                  v_worker_available := false;
                end if;


                -- =============================================
                -- Unavailable exception overrides availability.
                -- =============================================

                if exists (
                  select 1
                  from public.worker_schedule_exceptions e
                  where e.worker_id = v_worker.worker_id
                    and e.exception_date = v_candidate_date
                    and e.exception_type = 'unavailable'
                    and e.is_active = true
                    and (
                      (
                        e.start_time is null
                        and e.end_time is null
                      )
                      or (
                        e.start_time is not null
                        and e.end_time is not null
                        and v_date_start_local::time < e.end_time
                        and v_date_end_local::time > e.start_time
                      )
                    )
                )
                then
                  v_worker_available := false;
                end if;


                v_candidate_date :=
                  v_candidate_date + 1;

              end loop;

            end if;


            -- =================================================
            -- Location and booking conflict.
            -- =================================================

            if v_worker_available
               and exists (
                 select 1
                 from public.worker_profiles wp3
                 where wp3.id = v_worker.worker_id
                   and wp3.current_location is not null
                   and st_dwithin(
                     wp3.current_location,
                     v_customer_location,
                     wp3.service_radius_km * 1000
                   )
               )
               and not exists (
                 select 1
                 from public.bookings b
                 where b.worker_id = v_worker.worker_id
                   and b.status in (
                     'assigned'::public.booking_status,
                     'on_the_way'::public.booking_status,
                     'arrived'::public.booking_status,
                     'in_progress'::public.booking_status
                   )
                   and b.scheduled_start < v_candidate_end
                   and b.scheduled_end > v_candidate_start
               )
            then

              slot_start := v_candidate_start;
              slot_end := v_candidate_end;

              return next;

            end if;

          end if;


          -- ==================================================
          -- Next customer-facing candidate.
          --
          -- Interval comes entirely from worker_schedule_settings.
          -- ==================================================

          v_candidate_start_local :=
            v_candidate_start_local
            + make_interval(
                mins => v_interval_minutes
              );

        end loop;

      end loop;


      v_date :=
        v_date + 1;

    end loop;

  end loop;


  return;

end;
$function$;


-- ============================================================
-- Security
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