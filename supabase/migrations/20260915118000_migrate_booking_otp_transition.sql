-- ============================================================
-- TempStaff
-- Migrate worker start/end OTP booking transitions to the
-- authoritative transition_booking_state() function.
--
-- Preserves:
--   - worker authorization
--   - booking locking
--   - OTP validation
--   - attempt limits
--   - expiry handling
--   - atomic OTP consumption
--   - exactly-once worker earnings
--   - worker availability release
-- ============================================================

create or replace function public.verify_booking_otp_atomic(
  p_booking_id uuid,
  p_otp_type text,
  p_otp_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$

declare
  v_booking public.bookings%rowtype;
  v_otp public.booking_otps%rowtype;
  v_new_status public.booking_status;
  v_has_active_booking boolean;
  v_platform_fee numeric;
  v_result jsonb;

begin

  -- ==========================================================
  -- Authentication
  -- ==========================================================

  if auth.uid() is null then
    return jsonb_build_object(
      'success', false,
      'error', 'Authentication required'
    );
  end if;


  -- ==========================================================
  -- Validate OTP type
  -- ==========================================================

  if lower(trim(p_otp_type)) not in ('start', 'end') then
    return jsonb_build_object(
      'success', false,
      'error', 'Invalid OTP type'
    );
  end if;


  -- ==========================================================
  -- Validate hash
  -- ==========================================================

  if p_otp_hash is null
     or length(trim(p_otp_hash)) <> 64
     or p_otp_hash !~ '^[0-9a-fA-F]{64}$' then

    return jsonb_build_object(
      'success', false,
      'error', 'Invalid OTP hash'
    );

  end if;


  -- ==========================================================
  -- Lock booking.
  --
  -- Worker must already be assigned to the booking.
  -- ==========================================================

  select *
  into v_booking
  from public.bookings
  where id = p_booking_id
    and worker_id = auth.uid()
  for update;


  if not found then
    return jsonb_build_object(
      'success', false,
      'error',
      'Booking not found or worker is not assigned'
    );
  end if;


  -- ==========================================================
  -- Validate booking state.
  -- ==========================================================

  if lower(trim(p_otp_type)) = 'start' then

    if v_booking.status <> 'arrived'::public.booking_status then
      return jsonb_build_object(
        'success', false,
        'error',
        'Booking must be arrived before start OTP verification'
      );
    end if;

    v_new_status :=
      'in_progress'::public.booking_status;

  else

    if v_booking.status <> 'in_progress'::public.booking_status then
      return jsonb_build_object(
        'success', false,
        'error',
        'Booking must be in progress before end OTP verification'
      );
    end if;

    v_new_status :=
      'completed'::public.booking_status;

  end if;


  -- ==========================================================
  -- Lock newest pending OTP.
  -- ==========================================================

  select *
  into v_otp
  from public.booking_otps
  where booking_id = p_booking_id
    and otp_type =
      lower(trim(p_otp_type))::public.otp_type
    and status = 'pending'::public.otp_status
  order by created_at desc
  limit 1
  for update;


  if not found then
    return jsonb_build_object(
      'success', false,
      'error', 'Invalid or expired OTP'
    );
  end if;


  -- ==========================================================
  -- Maximum five attempts.
  -- ==========================================================

  if coalesce(v_otp.attempts, 0) >= 5 then

    update public.booking_otps
    set status = 'expired'::public.otp_status
    where id = v_otp.id;

    return jsonb_build_object(
      'success', false,
      'error',
      'OTP has been locked after too many attempts'
    );

  end if;


  -- ==========================================================
  -- Expiration check.
  -- ==========================================================

  if v_otp.expires_at is not null
     and v_otp.expires_at <= now() then

    update public.booking_otps
    set status = 'expired'::public.otp_status
    where id = v_otp.id;

    return jsonb_build_object(
      'success', false,
      'error',
      'OTP has expired. Please generate a new OTP.'
    );

  end if;


  -- ==========================================================
  -- Verify SHA-256 hash.
  -- ==========================================================

  if lower(v_otp.otp_hash) <>
     lower(trim(p_otp_hash)) then

    update public.booking_otps
    set
      attempts = coalesce(attempts, 0) + 1,
      status =
        case
          when coalesce(attempts, 0) + 1 >= 5
            then 'expired'::public.otp_status
          else status
        end
    where id = v_otp.id
      and status = 'pending'::public.otp_status;

    return jsonb_build_object(
      'success', false,
      'error', 'Invalid OTP'
    );

  end if;


  -- ==========================================================
  -- Atomically consume OTP.
  -- ==========================================================

  update public.booking_otps
  set
    status = 'verified'::public.otp_status,
    verified_at = now()
  where id = v_otp.id
    and status = 'pending'::public.otp_status;


  if not found then
    return jsonb_build_object(
      'success', false,
      'error', 'OTP has already been used'
    );
  end if;


  -- ==========================================================
  -- AUTHORITATIVE BOOKING STATE TRANSITION
  --
  -- arrived -> in_progress
  -- in_progress -> completed
  --
  -- transition_booking_state() owns the booking mutation
  -- and booking_status_history record.
  -- ==========================================================

  v_result := public.transition_booking_state(
    v_booking.id,
    v_new_status,
    null,
    false,
    false
  );


  -- ==========================================================
  -- END OTP / COMPLETION
  --
  -- Create worker earnings exactly once.
  -- ==========================================================

  if v_new_status =
     'completed'::public.booking_status then

    v_platform_fee :=
      coalesce(v_booking.platform_fee, 0);

    insert into public.worker_earnings (
      worker_id,
      booking_id,
      gross_amount,
      platform_fee,
      net_amount
    )
    select
      v_booking.worker_id,
      v_booking.id,
      v_booking.total_amount,
      v_platform_fee,
      v_booking.total_amount - v_platform_fee
    where not exists (
      select 1
      from public.worker_earnings
      where booking_id = v_booking.id
    );


    -- ========================================================
    -- Release worker only when there is no other active job.
    -- ========================================================

    select exists (
      select 1
      from public.bookings
      where worker_id = auth.uid()
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
      set worker_status =
        'available'::public.worker_status
      where id = auth.uid()
        and worker_status <>
          'suspended'::public.worker_status;


      update public.worker_availability
      set is_available = true
      where worker_id = auth.uid();


      update public.worker_presence
      set
        is_available = true
      where worker_id = auth.uid();

    end if;

  end if;


  -- ==========================================================
  -- Success
  -- ==========================================================

  return jsonb_build_object(
    'success', true,
    'booking_id', v_booking.id,
    'otp_type', lower(trim(p_otp_type)),
    'status', v_new_status::text
  );


exception
  when others then
    raise;

end;

$function$;


-- ============================================================
-- Permissions
-- ============================================================

revoke all
on function public.verify_booking_otp_atomic(
  uuid,
  text,
  text
)
from public;

revoke all
on function public.verify_booking_otp_atomic(
  uuid,
  text,
  text
)
from anon;

grant execute
on function public.verify_booking_otp_atomic(
  uuid,
  text,
  text
)
to authenticated;

grant execute
on function public.verify_booking_otp_atomic(
  uuid,
  text,
  text
)
to service_role;