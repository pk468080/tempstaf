create or replace function public.complete_test_payment(
  p_booking_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_booking public.bookings%rowtype;
  v_old_status public.booking_status;
begin
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
    and customer_id = auth.uid()
  for update;

  if not found then
    return jsonb_build_object(
      'success', false,
      'error', 'Booking not found or does not belong to this customer'
    );
  end if;

  v_old_status := v_booking.status;

  if v_booking.status not in (
    'pending_payment'::public.booking_status,
    'payment_failed'::public.booking_status
  ) then
    return jsonb_build_object(
      'success', false,
      'error', 'Booking is not awaiting payment confirmation'
    );
  end if;

  update public.bookings
  set
    status = 'paid'::public.booking_status,
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
    'paid'::public.booking_status,
    auth.uid(),
    now()
  );

  return jsonb_build_object(
    'success', true,
    'booking_id', v_booking.id,
    'action', 'payment_complete',
    'old_status', v_old_status::text,
    'status', 'paid'
  );
end;
$function$;

revoke execute on function public.complete_test_payment(uuid) from anon;
grant execute on function public.complete_test_payment(uuid) to authenticated;

create or replace function public.get_eligible_workers(
  p_booking_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_booking public.bookings%rowtype;
  v_row record;
  v_result jsonb;
begin
  select *
  into v_booking
  from public.bookings
  where id = p_booking_id;

  if not found then
    return jsonb '[]';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'worker_id', v.worker_id,
        'worker_status', v.worker_status,
        'rating', v.rating,
        'total_completed_jobs', v.total_completed_jobs,
        'distance_km', v.distance_km
      )
      order by v.distance_km asc nulls last, v.rating desc nulls last
    ),
    jsonb '[]'
  )
  into v_result
  from (
    select
      wp.id as worker_id,
      wp.worker_status,
      wp.rating,
      wp.total_completed_jobs,
      null::numeric as distance_km
    from public.worker_services ws
    join public.worker_profiles wp
      on wp.id = ws.worker_id
    where ws.service_id = v_booking.service_id
      and wp.is_verified = true
      and wp.worker_status = 'available'::public.worker_status
      and exists (
        select 1
        from public.worker_availability wa
        where wa.worker_id = ws.worker_id
          and wa.is_available = true
          and wa.available_from <= v_booking.scheduled_end
          and wa.available_until >= v_booking.scheduled_start
      )
      and not exists (
        select 1
        from public.bookings b
        where b.worker_id = ws.worker_id
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
  ) as v;

  return v_result;
end;
$function$;

revoke execute on function public.get_eligible_workers(uuid) from anon;
grant execute on function public.get_eligible_workers(uuid) to authenticated;

create or replace function public.admin_assign_booking_worker(
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
  v_old_status public.booking_status;
  v_is_admin boolean;
begin
  if auth.uid() is null then
    return jsonb_build_object(
      'success', false,
      'error', 'Authentication required'
    );
  end if;

  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  )
  into v_is_admin;

  if not v_is_admin then
    return jsonb_build_object(
      'success', false,
      'error', 'Admin access required'
    );
  end if;

  select *
  into v_booking
  from public.bookings
  where id = p_booking_id
  for update;

  if not found then
    return jsonb_build_object(
      'success', false,
      'error', 'Booking not found'
    );
  end if;

  if p_worker_id is null then
    return jsonb_build_object(
      'success', false,
      'error', 'Worker is required'
    );
  end if;

  if v_booking.status not in (
    'paid'::public.booking_status,
    'searching_worker'::public.booking_status
  ) then
    return jsonb_build_object(
      'success', false,
      'error', 'Booking is not awaiting worker assignment'
    );
  end if;

  if not exists (
    select 1
    from public.worker_services
    where worker_id = p_worker_id
      and service_id = v_booking.service_id
  ) then
    return jsonb_build_object(
      'success', false,
      'error', 'Selected worker does not provide this service'
    );
  end if;

  if exists (
    select 1
    from public.bookings b
    where b.worker_id = p_worker_id
      and b.id <> v_booking.id
      and b.status in (
        'assigned'::public.booking_status,
        'on_the_way'::public.booking_status,
        'arrived'::public.booking_status,
        'in_progress'::public.booking_status
      )
      and b.scheduled_start < v_booking.scheduled_end
      and b.scheduled_end > v_booking.scheduled_start
  ) then
    return jsonb_build_object(
      'success', false,
      'error', 'Selected worker is already booked during this time'
    );
  end if;

  v_old_status := v_booking.status;

  update public.bookings
  set
    worker_id = p_worker_id,
    status = 'assigned'::public.booking_status,
    updated_at = now()
  where id = v_booking.id;

  update public.worker_profiles
  set worker_status = 'busy'::public.worker_status
  where id = p_worker_id;

  update public.worker_availability
  set is_available = false
  where worker_id = p_worker_id;

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
    'assigned'::public.booking_status,
    auth.uid(),
    now()
  );

  return jsonb_build_object(
    'success', true,
    'booking_id', v_booking.id,
    'worker_id', p_worker_id,
    'old_status', v_old_status::text,
    'status', 'assigned'
  );
end;
$function$;

revoke execute on function public.admin_assign_booking_worker(uuid, uuid) from anon;
grant execute on function public.admin_assign_booking_worker(uuid, uuid) to authenticated;
