-- ============================================================
-- TempStaff
-- Migrate payment completion to central booking transitions
-- ============================================================

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
  v_result jsonb;

begin

  if auth.uid() is null then
    return jsonb_build_object(
      'success', false,
      'error', 'Authentication required'
    );
  end if;


  -- ----------------------------------------------------------
  -- Customer authorization and payment-state validation
  -- ----------------------------------------------------------

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


  if v_booking.status not in (
    'pending_payment'::public.booking_status,
    'payment_failed'::public.booking_status
  ) then
    return jsonb_build_object(
      'success', false,
      'error', 'Booking is not awaiting payment confirmation'
    );
  end if;


  -- ----------------------------------------------------------
  -- Central authoritative transition
  -- ----------------------------------------------------------

  v_result := public.transition_booking_state(
    p_booking_id,
    'paid'::public.booking_status
  );


  return jsonb_build_object(
    'success', true,
    'booking_id', p_booking_id,
    'action', 'payment_complete',
    'old_status', v_result->>'old_status',
    'status', v_result->>'status'
  );

end;

$function$;