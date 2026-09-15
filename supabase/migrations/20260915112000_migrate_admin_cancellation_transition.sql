-- ============================================================
-- TempStaff
-- Route admin booking cancellation through the central
-- booking state transition.
-- ============================================================

create or replace function public.admin_cancel_booking(
  p_booking_id uuid,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_before jsonb;
  v_after jsonb;
  v_old_status public.booking_status;
  v_result jsonb;
begin
  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  if p_booking_id is null then
    raise exception 'Booking ID is required';
  end if;

  -- Lock and capture the authoritative pre-cancellation state.
  select
    to_jsonb(b),
    b.status
  into
    v_before,
    v_old_status
  from public.bookings b
  where b.id = p_booking_id
  for update;

  if v_before is null then
    raise exception 'Booking not found';
  end if;

  if v_old_status = 'cancelled'::public.booking_status then
    raise exception 'Booking is already cancelled';
  end if;

  -- Central state machine:
  --   status -> cancelled
  --   worker_id -> NULL
  --
  -- transition_booking_state() also records booking_status_history.
  v_result := public.transition_booking_state(
    p_booking_id,
    'cancelled'::public.booking_status,
    null,
    false,
    true
  );

  -- Capture the resulting authoritative state.
  select to_jsonb(b)
  into v_after
  from public.bookings b
  where b.id = p_booking_id;

  -- Preserve the existing admin audit trail.
  perform public.write_admin_audit(
    'admin_cancel_booking',
    'booking',
    p_booking_id,
    v_before,
    v_after,
    jsonb_build_object(
      'reason', p_reason
    )
  );

  return jsonb_build_object(
    'success', true,
    'booking_id', p_booking_id,
    'old_status', v_old_status::text,
    'status', 'cancelled',
    'worker_id', null,
    'transitioned', true
  );
end;
$function$;

revoke execute
on function public.admin_cancel_booking(uuid, text)
from public;

revoke execute
on function public.admin_cancel_booking(uuid, text)
from anon;

grant execute
on function public.admin_cancel_booking(uuid, text)
to authenticated;