create or replace function public.customer_booking_action(
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
  for update;

  if not found then
    return jsonb_build_object(
      'success', false,
      'error', 'Booking not found'
    );
  end if;

  if not (
    v_booking.customer_id = auth.uid()
    or exists (
      select 1
      from public.profiles
      where id = auth.uid()
        and role = 'admin'
    )
  ) then
    return jsonb_build_object(
      'success', false,
      'error', 'You are not allowed to manage this booking'
    );
  end if;

  v_old_status := v_booking.status;

  if v_action = 'cancel' then
    if v_booking.status not in (
      'pending_payment'::public.booking_status,
      'paid'::public.booking_status,
      'searching_worker'::public.booking_status,
      'assigned'::public.booking_status,
      'on_the_way'::public.booking_status,
      'arrived'::public.booking_status,
      'in_progress'::public.booking_status
    ) then
      return jsonb_build_object(
        'success', false,
        'error', 'This booking cannot be cancelled from its current state'
      );
    end if;

    v_new_status := 'cancelled'::public.booking_status;

    update public.bookings
    set
      status = v_new_status,
      worker_id = null,
      updated_at = now()
    where id = v_booking.id;

    if v_booking.worker_id is not null then
      select exists (
        select 1
        from public.bookings
        where worker_id = v_booking.worker_id
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
        where id = v_booking.worker_id
          and worker_status <> 'suspended'::public.worker_status;

        update public.worker_availability
        set is_available = true
        where worker_id = v_booking.worker_id;
      end if;
    end if;

  else
    return jsonb_build_object(
      'success', false,
      'error', 'Invalid booking action'
    );
  end if;

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

  return jsonb_build_object(
    'success', true,
    'booking_id', v_booking.id,
    'action', v_action,
    'old_status', v_old_status::text,
    'status', v_new_status::text
  );
end;
$function$;

revoke execute
on function public.customer_booking_action(uuid, text)
from anon;

grant execute
on function public.customer_booking_action(uuid, text)
to authenticated;
