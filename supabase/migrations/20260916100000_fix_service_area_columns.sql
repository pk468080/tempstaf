begin;

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

  v_scheduling_mode text;
  v_working_days integer;
  v_daily_duration_minutes integer;

  v_customer_location public.geography;

  v_worker record;
  v_window record;
  v_day_window record;

  v_timezone text;
  v_interval_minutes integer;

  v_date date;
  v_candidate_date date;
  v_last_working_date date;

  v_day_of_week smallint;
  v_working_day_count integer;

  v_candidate_start_local timestamp;
  v_candidate_end_local timestamp;

  v_first_day_start_local timestamp;
  v_last_day_end_local timestamp;

  v_candidate_start timestamptz;
  v_candidate_end timestamptz;

  v_day_start_local timestamp;
  v_day_end_local timestamp;

  v_daily_start_local timestamp;
  v_daily_end_local timestamp;

  v_first_day_found boolean;
  v_day_found boolean;

  v_window_start_local timestamp;
  v_window_end_local timestamp;

begin

  /*
   * ============================================================
   * AUTHENTICATION / INPUT
   * ============================================================
   */

  if v_customer_id is null then
    raise exception 'Authentication required';
  end if;

  if p_service_variant_id is null then
    raise exception 'Service package is required';
  end if;

  if p_address_id is null then
    raise exception 'Booking address is required';
  end if;

  if p_start_date is null
     or p_end_date is null
  then
    raise exception 'Date range is required';
  end if;

  if p_end_date < p_start_date then
    raise exception 'Invalid date range';
  end if;

  if p_end_date - p_start_date + 1 > 31 then
    raise exception 'Availability range cannot exceed 31 days';
  end if;


  /*
   * ============================================================
   * CUSTOMER ADDRESS
   * ============================================================
   */

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


  /*
   * ============================================================
   * EXISTING SERVICE CATALOGUE
   * ============================================================
   */

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


  /*
   * ============================================================
   * SCHEDULING RULES
   * ============================================================
   */

  select
    r.scheduling_mode,
    r.working_days,
    r.daily_duration_minutes
  into
    v_scheduling_mode,
    v_working_days,
    v_daily_duration_minutes
  from public.service_variant_scheduling_rules r
  where r.service_variant_id = p_service_variant_id
    and r.is_active = true;

  if v_scheduling_mode is null then
    raise exception
      'Scheduling rules are not configured for this service package';
  end if;

  if v_scheduling_mode = 'working_days'
     and (
       v_working_days is null
       or v_working_days <= 0
     )
  then
    raise exception
      'Invalid working-days scheduling configuration';
  end if;

  if v_scheduling_mode = 'continuous'
     and (
       v_working_days is not null
       or v_daily_duration_minutes is not null
     )
  then
    raise exception
      'Invalid continuous scheduling configuration';
  end if;


  /*
   * ============================================================
   * SERVICE AREA — ALWAYS THE FIRST BUSINESS GATE
   *
   * Service-specific areas take precedence.
   * If no service-specific area exists, global areas are used.
   * If neither exists, no artificial restriction is invented.
   * ============================================================
   */

  if exists (
    select 1
    from public.service_areas sa
    where sa.service_id = v_service_id
      and sa.is_active = true
      and sa.center_latitude is not null
      and sa.center_longitude is not null
      and sa.radius_km is not null
  )
  then

    if not exists (
      select 1
      from public.service_areas sa
      where sa.service_id = v_service_id
        and sa.is_active = true
        and sa.center_latitude is not null
        and sa.center_longitude is not null
        and sa.radius_km is not null
        and st_dwithin(
          st_setsrid(
            st_makepoint(
              sa.center_longitude,
              sa.center_latitude
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

  elsif not exists (
    select 1
    from public.service_areas sa
    where sa.service_id is null
      and sa.is_active = true
      and sa.center_latitude is not null
      and sa.center_longitude is not null
      and sa.radius_km is not null
  )
  then

    null;

  elsif not exists (
    select 1
    from public.service_areas sa
    where sa.service_id is null
      and sa.is_active = true
      and sa.center_latitude is not null
      and sa.center_longitude is not null
      and sa.radius_km is not null
      and st_dwithin(
        st_setsrid(
          st_makepoint(
            sa.center_longitude,
            sa.center_latitude
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


  /*
   * ============================================================
   * WORKER SCHEDULE SOURCE
   *
   * IMPORTANT:
   *
   * Scheduled booking does NOT require:
   *   - worker online presence
   *   - worker current_location
   *   - worker heartbeat
   *
   * Worker schedule is the source for actual known slots.
   *
   * Service-area eligibility has already been checked above.
   * ============================================================
   */

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
      and wss.slot_interval_minutes is not null
      and wss.slot_interval_minutes > 0

  loop

    v_timezone := v_worker.timezone;
    v_interval_minutes := v_worker.slot_interval_minutes;


    /*
     * ============================================================
     * CONTINUOUS SERVICES
     * ============================================================
     */

    if v_scheduling_mode = 'continuous' then

      v_date := p_start_date;

      while v_date <= p_end_date loop

        v_day_of_week :=
          extract(
            dow from v_date
          )::smallint;


        for v_window in

          with windows as (

            select
              w.start_time,
              w.end_time

            from public.worker_weekly_schedules w

            where w.worker_id = v_worker.worker_id
              and w.day_of_week = v_day_of_week
              and w.is_active = true

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
            start_time,
            end_time
          from windows
          where start_time < end_time

        loop

          v_window_start_local :=
            v_date::timestamp
            + v_window.start_time;

          v_window_end_local :=
            v_date::timestamp
            + v_window.end_time;

          v_candidate_start_local :=
            v_window_start_local;


          while v_candidate_start_local < v_window_end_local loop

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


            if v_candidate_end_local <= v_window_end_local then

              v_candidate_start :=
                v_candidate_start_local
                at time zone v_timezone;

              v_candidate_end :=
                v_candidate_end_local
                at time zone v_timezone;


              if v_candidate_start > now()

                 /*
                  * Explicit unavailable exception.
                  */
                 and not exists (
                   select 1
                   from public.worker_schedule_exceptions e
                   where e.worker_id = v_worker.worker_id
                     and e.exception_date = v_date
                     and e.exception_type = 'unavailable'
                     and e.is_active = true
                     and (
                       e.start_time is null
                       or e.end_time is null
                       or (
                         v_candidate_start_local::time < e.end_time
                         and v_candidate_end_local::time > e.start_time
                       )
                     )
                 )

                 /*
                  * Existing active booking conflict.
                  *
                  * Searching/paid/unassigned bookings are not
                  * treated as worker occupation here because no
                  * worker has been assigned yet.
                  */
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


            v_candidate_start_local :=
              v_candidate_start_local
              + make_interval(
                  mins => v_interval_minutes
                );

          end loop;

        end loop;


        v_date := v_date + 1;

      end loop;


    /*
     * ============================================================
     * WORKING-DAYS SERVICES
     * ============================================================
     */

    elsif v_scheduling_mode = 'working_days' then

      v_date := p_start_date;

      while v_date <= p_end_date loop

        v_day_of_week :=
          extract(
            dow from v_date
          )::smallint;


        for v_window in

          with windows as (

            select
              w.start_time,
              w.end_time

            from public.worker_weekly_schedules w

            where w.worker_id = v_worker.worker_id
              and w.day_of_week = v_day_of_week
              and w.is_active = true

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
            start_time,
            end_time
          from windows
          where start_time < end_time

        loop

          v_first_day_found := false;

          v_first_day_start_local :=
            v_date::timestamp
            + v_window.start_time;


          if v_daily_duration_minutes is null then

            v_daily_start_local :=
              v_first_day_start_local;

            v_daily_end_local :=
              v_date::timestamp
              + v_window.end_time;

          else

            v_daily_start_local :=
              v_first_day_start_local;

            v_daily_end_local :=
              v_daily_start_local
              + make_interval(
                  mins => v_daily_duration_minutes
                );

            if v_daily_end_local >
               v_date::timestamp + v_window.end_time
            then
              continue;
            end if;

          end if;


          /*
           * First working day must still be in the future.
           *
           * No current worker-location check.
           */
          if v_first_day_start_local
             at time zone v_timezone > now()

             and not exists (
               select 1
               from public.worker_schedule_exceptions e
               where e.worker_id = v_worker.worker_id
                 and e.exception_date = v_date
                 and e.exception_type = 'unavailable'
                 and e.is_active = true
                 and (
                   e.start_time is null
                   or e.end_time is null
                   or (
                     v_daily_start_local::time < e.end_time
                     and v_daily_end_local::time > e.start_time
                   )
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
                 and b.scheduled_start <
                     (
                       v_daily_end_local
                       at time zone v_timezone
                     )
                 and b.scheduled_end >
                     (
                       v_daily_start_local
                       at time zone v_timezone
                     )
             )

          then

            v_first_day_found := true;

          end if;


          if not v_first_day_found then
            continue;
          end if;


          /*
           * Find subsequent working days.
           */

          v_candidate_date := v_date + 1;
          v_working_day_count := 1;
          v_last_working_date := v_date;


          while
            v_candidate_date <= p_end_date
            and v_working_day_count < v_working_days
          loop

            v_day_found := false;

            v_day_of_week :=
              extract(
                dow from v_candidate_date
              )::smallint;


            for v_day_window in

              with windows as (

                select
                  w.start_time,
                  w.end_time

                from public.worker_weekly_schedules w

                where w.worker_id = v_worker.worker_id
                  and w.day_of_week = v_day_of_week
                  and w.is_active = true

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
              )

              select
                start_time,
                end_time
              from windows
              where start_time < end_time

            loop

              v_day_start_local :=
                v_candidate_date::timestamp
                + v_day_window.start_time;


              if v_daily_duration_minutes is null then

                v_day_end_local :=
                  v_candidate_date::timestamp
                  + v_day_window.end_time;

              else

                v_day_end_local :=
                  v_day_start_local
                  + make_interval(
                      mins => v_daily_duration_minutes
                    );

                if v_day_end_local >
                   v_candidate_date::timestamp
                   + v_day_window.end_time
                then
                  continue;
                end if;

              end if;


              /*
               * Explicit unavailable exception.
               */
              if exists (
                select 1
                from public.worker_schedule_exceptions e
                where e.worker_id = v_worker.worker_id
                  and e.exception_date = v_candidate_date
                  and e.exception_type = 'unavailable'
                  and e.is_active = true
                  and (
                    e.start_time is null
                    or e.end_time is null
                    or (
                      v_day_start_local::time < e.end_time
                      and v_day_end_local::time > e.start_time
                    )
                  )
              )
              then
                continue;
              end if;


              /*
               * Existing worker booking conflict.
               */
              if exists (
                select 1
                from public.bookings b
                where b.worker_id = v_worker.worker_id
                  and b.status in (
                    'assigned'::public.booking_status,
                    'on_the_way'::public.booking_status,
                    'arrived'::public.booking_status,
                    'in_progress'::public.booking_status
                  )
                  and b.scheduled_start <
                      (
                        v_day_end_local
                        at time zone v_timezone
                      )
                  and b.scheduled_end >
                      (
                        v_day_start_local
                        at time zone v_timezone
                      )
              )
              then
                continue;
              end if;


              v_day_found := true;

              exit;

            end loop;


            if v_day_found then

              v_working_day_count :=
                v_working_day_count + 1;

              v_last_working_date :=
                v_candidate_date;

            end if;


            v_candidate_date :=
              v_candidate_date + 1;

          end loop;


          /*
           * Complete multi-day working-days slot.
           */

          if v_working_day_count >= v_working_days then

            v_day_of_week :=
              extract(
                dow from v_last_working_date
              )::smallint;

            v_last_day_end_local := null;


            for v_day_window in

              with windows as (

                select
                  w.start_time,
                  w.end_time

                from public.worker_weekly_schedules w

                where w.worker_id = v_worker.worker_id
                  and w.day_of_week = v_day_of_week
                  and w.is_active = true

                union

                select
                  e.start_time,
                  e.end_time

                from public.worker_schedule_exceptions e

                where e.worker_id = v_worker.worker_id
                  and e.exception_date = v_last_working_date
                  and e.exception_type = 'available'
                  and e.is_active = true
                  and e.start_time is not null
                  and e.end_time is not null
              )

              select
                start_time,
                end_time
              from windows
              where start_time < end_time

            loop

              v_day_start_local :=
                v_last_working_date::timestamp
                + v_day_window.start_time;


              if v_daily_duration_minutes is null then

                v_day_end_local :=
                  v_last_working_date::timestamp
                  + v_day_window.end_time;

              else

                v_day_end_local :=
                  v_day_start_local
                  + make_interval(
                      mins => v_daily_duration_minutes
                    );

                if v_day_end_local >
                   v_last_working_date::timestamp
                   + v_day_window.end_time
                then
                  continue;
                end if;

              end if;


              if exists (
                select 1
                from public.worker_schedule_exceptions e
                where e.worker_id = v_worker.worker_id
                  and e.exception_date = v_last_working_date
                  and e.exception_type = 'unavailable'
                  and e.is_active = true
                  and (
                    e.start_time is null
                    or e.end_time is null
                    or (
                      v_day_start_local::time < e.end_time
                      and v_day_end_local::time > e.start_time
                    )
                  )
              )
              then
                continue;
              end if;


              if exists (
                select 1
                from public.bookings b
                where b.worker_id = v_worker.worker_id
                  and b.status in (
                    'assigned'::public.booking_status,
                    'on_the_way'::public.booking_status,
                    'arrived'::public.booking_status,
                    'in_progress'::public.booking_status
                  )
                  and b.scheduled_start <
                      (
                        v_day_end_local
                        at time zone v_timezone
                      )
                  and b.scheduled_end >
                      (
                        v_day_start_local
                        at time zone v_timezone
                      )
              )
              then
                continue;
              end if;


              v_last_day_end_local :=
                v_day_end_local;

              exit;

            end loop;


            if v_last_day_end_local is not null then

              v_candidate_start :=
                v_first_day_start_local
                at time zone v_timezone;

              v_candidate_end :=
                v_last_day_end_local
                at time zone v_timezone;


              if v_candidate_start > now() then

                slot_start := v_candidate_start;
                slot_end := v_candidate_end;

                return next;

              end if;

            end if;

          end if;

        end loop;


        v_date := v_date + 1;

      end loop;

    end if;

  end loop;


  return;

end;

$function$;

commit;