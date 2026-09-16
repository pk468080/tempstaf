begin;

alter type public.booking_fulfillment_type
add value if not exists 'recurring';

alter table public.bookings
  add column if not exists schedule_start_date date,
  add column if not exists schedule_end_date date,
  add column if not exists daily_start_time time,
  add column if not exists daily_end_time time,
  add column if not exists selected_weekdays smallint[],
  add column if not exists off_dates date[],
  add column if not exists total_working_hours numeric(12,2),
  add column if not exists pricing_snapshot jsonb;

alter table public.bookings
  drop constraint if exists bookings_schedule_dates_check;

alter table public.bookings
  add constraint bookings_schedule_dates_check
  check (
    schedule_start_date is null
    or schedule_end_date is null
    or schedule_end_date >= schedule_start_date
  );

alter table public.bookings
  drop constraint if exists bookings_schedule_times_check;

alter table public.bookings
  add constraint bookings_schedule_times_check
  check (
    daily_start_time is null
    or daily_end_time is null
    or daily_end_time > daily_start_time
  );

alter table public.bookings
  drop constraint if exists bookings_selected_weekdays_check;

alter table public.bookings
  add constraint bookings_selected_weekdays_check
  check (
    selected_weekdays is null
    or (
      cardinality(selected_weekdays) between 1 and 7
      and selected_weekdays <@ array[0,1,2,3,4,5,6]::smallint[]
    )
  );

create index if not exists idx_booking_schedule_occurrences_booking_date
  on public.booking_schedule_occurrences (
    booking_id,
    occurrence_date
  );


drop function if exists public.create_customer_scheduled_booking(
  uuid,
  uuid,
  date,
  date,
  time,
  time,
  smallint[],
  date[],
  text
);

create or replace function public.create_customer_scheduled_booking(
  p_service_variant_id uuid,
  p_address_id uuid,
  p_schedule_start_date date,
  p_schedule_end_date date,
  p_daily_start_time time,
  p_daily_end_time time,
  p_selected_weekdays smallint[],
  p_off_dates date[] default '{}',
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_customer_id uuid;
  v_service_id uuid;
  v_booking_id uuid;

  v_service_name text;
  v_variant_name text;

  v_timezone text := 'Asia/Kolkata';

  v_current_date date;
  v_occurrence_index integer := 0;
  v_occurrence_count integer := 0;

  v_daily_hours numeric(12,2);
  v_total_hours numeric(12,2) := 0;

  v_start timestamptz;
  v_end timestamptz;

  v_price jsonb;
  v_gross_amount numeric(12,2);
  v_discount_amount numeric(12,2);
  v_final_amount numeric(12,2);
  v_currency text;

  v_service_area_count integer;

  v_latitude double precision;
  v_longitude double precision;

  v_existing_booking_count integer;

  v_weekday smallint;
  v_is_off_date boolean;

  v_area_latitude double precision;
  v_area_longitude double precision;
  v_area_radius_km numeric;

  v_distance_km numeric;
begin

  v_customer_id := auth.uid();

  if v_customer_id is null then
    raise exception 'Authentication required.';
  end if;


  if p_service_variant_id is null then
    raise exception 'Service package is required.';
  end if;

  if p_address_id is null then
    raise exception 'Booking address is required.';
  end if;

  if p_schedule_start_date is null then
    raise exception 'Schedule start date is required.';
  end if;

  if p_schedule_end_date is null then
    raise exception 'Schedule end date is required.';
  end if;

  if p_schedule_end_date < p_schedule_start_date then
    raise exception 'Schedule end date cannot be before start date.';
  end if;

  if p_schedule_end_date > p_schedule_start_date + 30 then
    raise exception 'Scheduled booking cannot exceed 31 calendar days.';
  end if;

  if p_daily_start_time is null
     or p_daily_end_time is null then
    raise exception 'Daily working hours are required.';
  end if;

  if p_daily_end_time <= p_daily_start_time then
    raise exception 'Daily end time must be after start time.';
  end if;

  if p_selected_weekdays is null
     or cardinality(p_selected_weekdays) = 0 then
    raise exception 'At least one working weekday must be selected.';
  end if;

  if cardinality(p_selected_weekdays) > 7 then
    raise exception 'Too many working weekdays.';
  end if;

  if exists (
    select 1
    from unnest(p_selected_weekdays) as d
    where d < 0 or d > 6
  ) then
    raise exception 'Invalid weekday selection.';
  end if;

  if p_off_dates is null then
    p_off_dates := '{}';
  end if;

  if exists (
    select 1
    from unnest(p_off_dates) as d
    where d < p_schedule_start_date
       or d > p_schedule_end_date
  ) then
    raise exception 'Off dates must be inside the selected date range.';
  end if;


  -- ----------------------------------------------------------
  -- CUSTOMER
  -- ----------------------------------------------------------

  if not exists (
    select 1
    from public.profiles
    where id = v_customer_id
  ) then
    raise exception 'Customer profile not found.';
  end if;


  -- ----------------------------------------------------------
  -- SERVICE + VARIANT
  -- ----------------------------------------------------------

  select
    sv.service_id,
    s.name,
    sv.name
  into
    v_service_id,
    v_service_name,
    v_variant_name
  from public.service_variants sv
  join public.services s
    on s.id = sv.service_id
  where sv.id = p_service_variant_id
    and sv.is_active = true
    and s.is_active = true;

  if v_service_id is null then
    raise exception 'Selected service package is not available.';
  end if;


  -- ----------------------------------------------------------
  -- ADDRESS
  -- ----------------------------------------------------------

  select
    a.latitude,
    a.longitude
  into
    v_latitude,
    v_longitude
  from public.addresses a
  where a.id = p_address_id
    and a.user_id = v_customer_id;

  if v_latitude is null
     or v_longitude is null then
    raise exception 'Booking address coordinates are required.';
  end if;


  -- ----------------------------------------------------------
  -- SERVICE AREA
  --
  -- Haversine distance using the actual live schema:
  -- center_latitude
  -- center_longitude
  -- radius_km
  -- ----------------------------------------------------------

  select count(*)
  into v_service_area_count
  from public.service_areas sa
  where sa.is_active = true
    and sa.service_id = v_service_id;


  if v_service_area_count > 0 then

    if not exists (
      select 1
      from public.service_areas sa
      where sa.is_active = true
        and sa.service_id = v_service_id
        and (
          6371 * acos(
            least(
              1,
              greatest(
                -1,
                cos(radians(v_latitude))
                * cos(radians(sa.center_latitude))
                * cos(
                    radians(sa.center_longitude)
                    - radians(v_longitude)
                  )
                + sin(radians(v_latitude))
                * sin(radians(sa.center_latitude))
              )
            )
          )
        ) <= sa.radius_km
    ) then
      raise exception
        'This service is not available at the selected location.';
    end if;

  else

    if exists (
      select 1
      from public.service_areas sa
      where sa.is_active = true
        and sa.service_id is null
    )
    and not exists (
      select 1
      from public.service_areas sa
      where sa.is_active = true
        and sa.service_id is null
        and (
          6371 * acos(
            least(
              1,
              greatest(
                -1,
                cos(radians(v_latitude))
                * cos(radians(sa.center_latitude))
                * cos(
                    radians(sa.center_longitude)
                    - radians(v_longitude)
                  )
                + sin(radians(v_latitude))
                * sin(radians(sa.center_latitude))
              )
            )
          )
        ) <= sa.radius_km
    ) then
      raise exception
        'This service is not available at the selected location.';
    end if;

  end if;


  -- ----------------------------------------------------------
  -- HOURS
  -- ----------------------------------------------------------

  v_daily_hours :=
    extract(
      epoch from (
        p_daily_end_time - p_daily_start_time
      )
    ) / 3600.0;

  if v_daily_hours <= 0 then
    raise exception 'Working hours must be greater than zero.';
  end if;


  -- ----------------------------------------------------------
  -- BUILD OCCURRENCES
  -- ----------------------------------------------------------

  v_current_date := p_schedule_start_date;

  while v_current_date <= p_schedule_end_date loop

    v_weekday :=
      extract(dow from v_current_date)::smallint;

    v_is_off_date :=
      v_current_date = any(p_off_dates);

    if v_weekday = any(p_selected_weekdays)
       and not v_is_off_date then

      v_occurrence_index :=
        v_occurrence_index + 1;

      v_start :=
        (
          v_current_date::text
          || ' '
          || p_daily_start_time::text
          || ' '
          || v_timezone
        )::timestamptz;

      v_end :=
        (
          v_current_date::text
          || ' '
          || p_daily_end_time::text
          || ' '
          || v_timezone
        )::timestamptz;

      if v_start <= now() then
        raise exception
          'Scheduled booking occurrences must be in the future.';
      end if;

      select count(*)
      into v_existing_booking_count
      from public.bookings b
      where b.customer_id = v_customer_id
        and b.status not in (
          'cancelled',
          'expired',
          'payment_failed'
        )
        and b.scheduled_start < v_end
        and b.scheduled_end > v_start;

      if v_existing_booking_count > 0 then
        raise exception
          'One or more selected times overlap an existing booking.';
      end if;

      v_occurrence_count :=
        v_occurrence_count + 1;

      v_total_hours :=
        v_total_hours + v_daily_hours;

    end if;

    v_current_date :=
      v_current_date + 1;

  end loop;


  if v_occurrence_count = 0 then
    raise exception
      'No working occurrences remain after weekday and off-date selection.';
  end if;


  -- ----------------------------------------------------------
  -- SERVER-SIDE PRICING
  -- ----------------------------------------------------------

  select public.calculate_service_booking_price(
    p_service_variant_id,
    v_total_hours
  )
  into v_price;

  if v_price is null then
    raise exception 'Unable to calculate booking price.';
  end if;

  v_gross_amount :=
    coalesce(
      (v_price ->> 'gross_amount')::numeric,
      0
    );

  v_discount_amount :=
    coalesce(
      (v_price ->> 'discount_amount')::numeric,
      0
    );

  v_final_amount :=
    coalesce(
      (v_price ->> 'final_amount')::numeric,
      0
    );

  v_currency :=
    coalesce(
      v_price ->> 'currency',
      'INR'
    );

  if v_final_amount <= 0 then
    raise exception 'Calculated booking amount is invalid.';
  end if;


  -- ----------------------------------------------------------
  -- CREATE PARENT BOOKING
  -- ----------------------------------------------------------

  insert into public.bookings (
    customer_id,
    worker_id,
    service_id,
    service_variant_id,
    address_id,
    status,
    duration_value,
    duration_unit,
    scheduled_start,
    scheduled_end,
    base_amount,
    platform_fee,
    tax_amount,
    total_amount,
    notes,
    fulfillment_type,
    schedule_start_date,
    schedule_end_date,
    daily_start_time,
    daily_end_time,
    selected_weekdays,
    off_dates,
    total_working_hours,
    pricing_snapshot
  )
  values (
    v_customer_id,
    null,
    v_service_id,
    p_service_variant_id,
    p_address_id,
    'pending_payment',
    v_total_hours,
    'hour',

    (
      select min(
        (
          d::date::text
          || ' '
          || p_daily_start_time::text
          || ' '
          || v_timezone
        )::timestamptz
      )
      from generate_series(
        p_schedule_start_date,
        p_schedule_end_date,
        interval '1 day'
      ) gs(d)
      where extract(dow from d)::smallint = any(p_selected_weekdays)
        and not (d::date = any(p_off_dates))
    ),

    (
      select max(
        (
          d::date::text
          || ' '
          || p_daily_end_time::text
          || ' '
          || v_timezone
        )::timestamptz
      )
      from generate_series(
        p_schedule_start_date,
        p_schedule_end_date,
        interval '1 day'
      ) gs(d)
      where extract(dow from d)::smallint = any(p_selected_weekdays)
        and not (d::date = any(p_off_dates))
    ),

    v_gross_amount,
    0,
    0,
    v_final_amount,
    p_notes,
    'scheduled',
    p_schedule_start_date,
    p_schedule_end_date,
    p_daily_start_time,
    p_daily_end_time,
    p_selected_weekdays,
    p_off_dates,
    v_total_hours,

    jsonb_build_object(
      'pricing_engine', 'service_hourly',
      'service_id', v_service_id,
      'service_variant_id', p_service_variant_id,
      'gross_amount', v_gross_amount,
      'discount_amount', v_discount_amount,
      'final_amount', v_final_amount,
      'currency', v_currency,
      'total_working_hours', v_total_hours
    )
  )
  returning id
  into v_booking_id;


  -- ----------------------------------------------------------
  -- CREATE OCCURRENCES
  -- ----------------------------------------------------------

  v_current_date := p_schedule_start_date;
  v_occurrence_index := 0;

  while v_current_date <= p_schedule_end_date loop

    v_weekday :=
      extract(dow from v_current_date)::smallint;

    v_is_off_date :=
      v_current_date = any(p_off_dates);

    if v_weekday = any(p_selected_weekdays)
       and not v_is_off_date then

      v_occurrence_index :=
        v_occurrence_index + 1;

      v_start :=
        (
          v_current_date::text
          || ' '
          || p_daily_start_time::text
          || ' '
          || v_timezone
        )::timestamptz;

      v_end :=
        (
          v_current_date::text
          || ' '
          || p_daily_end_time::text
          || ' '
          || v_timezone
        )::timestamptz;

      insert into public.booking_schedule_occurrences (
        booking_id,
        worker_id,
        occurrence_index,
        occurrence_date,
        scheduled_start,
        scheduled_end,
        status
      )
      values (
        v_booking_id,
        null,
        v_occurrence_index,
        v_current_date,
        v_start,
        v_end,
        'pending'
      );

    end if;

    v_current_date :=
      v_current_date + 1;

  end loop;


  -- ----------------------------------------------------------
  -- STATUS HISTORY
  -- ----------------------------------------------------------

  insert into public.booking_status_history (
    booking_id,
    old_status,
    new_status,
    changed_by
  )
  values (
    v_booking_id,
    null,
    'pending_payment',
    v_customer_id
  );


  -- ----------------------------------------------------------
  -- RETURN SERVER-CALCULATED RESULT
  -- ----------------------------------------------------------

  return jsonb_build_object(
    'success', true,
    'booking_id', v_booking_id,
    'service_id', v_service_id,
    'service_variant_id', p_service_variant_id,
    'service_name', v_service_name,
    'variant_name', v_variant_name,
    'schedule_start_date', p_schedule_start_date,
    'schedule_end_date', p_schedule_end_date,
    'daily_start_time', p_daily_start_time,
    'daily_end_time', p_daily_end_time,
    'selected_weekdays', p_selected_weekdays,
    'off_dates', p_off_dates,
    'occurrence_count', v_occurrence_count,
    'total_working_hours', v_total_hours,
    'gross_amount', v_gross_amount,
    'discount_amount', v_discount_amount,
    'final_amount', v_final_amount,
    'currency', v_currency
  );

end;
$$;


revoke all on function public.create_customer_scheduled_booking(
  uuid,
  uuid,
  date,
  date,
  time,
  time,
  smallint[],
  date[],
  text
) from public;

revoke all on function public.create_customer_scheduled_booking(
  uuid,
  uuid,
  date,
  date,
  time,
  time,
  smallint[],
  date[],
  text
) from anon;

grant execute on function public.create_customer_scheduled_booking(
  uuid,
  uuid,
  date,
  date,
  time,
  time,
  smallint[],
  date[],
  text
) to authenticated;

commit;