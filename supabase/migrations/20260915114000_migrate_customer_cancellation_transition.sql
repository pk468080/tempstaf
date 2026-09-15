-- ============================================================
-- TempStaff
-- Migrate customer booking cancellation to the authoritative
-- booking state transition function.
-- ============================================================

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
  v_action text;
  v_result jsonb;
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

  if v_action <> 'cancel' then
    return jsonb_build_object(
      'success', false,
      'error', 'Invalid booking action'
    );
  end if;

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

  -- ==========================================================
  -- Authoritative cancellation transition.
  --
  -- This owns:
  --   - booking status
  --   - worker_id clearing
  --   - worker release
  --   - booking status history
  -- ==========================================================

  v_result := public.transition_booking_state(
    v_booking.id,
    'cancelled'::public.booking_status,
    null,
    false,
    true
  );

  return jsonb_build_object(
    'success', true,
    'booking_id', p_booking_id,
    'action', v_action,
    'old_status', v_old_status::text,
    'status', v_result->>'status'
  );

end;
$function$;

revoke execute
on function public.customer_booking_action(uuid, text)
from anon;

grant execute
on function public.customer_booking_action(uuid, text)
to authenticated;