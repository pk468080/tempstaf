import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods':
    'POST, OPTIONS',
}

async function sha256(value: string): Promise<string> {
  const data = new TextEncoder().encode(value)

  const hash = await crypto.subtle.digest(
    'SHA-256',
    data
  )

  return Array.from(new Uint8Array(hash))
    .map((byte) =>
      byte.toString(16).padStart(2, '0')
    )
    .join('')
}

function jsonResponse(
  body: Record<string, unknown>,
  status = 200
) {
  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    }
  )
}

Deno.serve(async (req) => {
  /*
   * CORS
   */
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders,
    })
  }

  /*
   * Only POST is allowed.
   */
  if (req.method !== 'POST') {
    return jsonResponse(
      {
        error: 'Method not allowed.',
      },
      405
    )
  }

  try {
    /*
     * Supabase environment variables.
     */
    const supabaseUrl =
      Deno.env.get('SUPABASE_URL')

    const serviceRoleKey =
      Deno.env.get(
        'SUPABASE_SERVICE_ROLE_KEY'
      )

    if (!supabaseUrl || !serviceRoleKey) {
      console.error(
        '[verify-booking-otp] Missing Supabase environment variables.'
      )

      return jsonResponse(
        {
          error:
            'Supabase environment variables are missing.',
        },
        500
      )
    }

    /*
     * Get Authorization header.
     */
    const authHeader =
      req.headers.get('Authorization')

    if (!authHeader) {
      return jsonResponse(
        {
          error:
            'Authorization header is required.',
        },
        401
      )
    }

    /*
     * Client used to identify the logged-in user.
     */
    const authClient = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      }
    )

    const {
      data: { user },
      error: userError,
    } = await authClient.auth.getUser()

    if (userError || !user) {
      console.error(
        '[verify-booking-otp] Auth error:',
        userError
      )

      return jsonResponse(
        {
          error: 'Unauthorized.',
        },
        401
      )
    }

    /*
     * Service-role client for database operations.
     */
    const supabase = createClient(
      supabaseUrl,
      serviceRoleKey
    )

    /*
     * Read request body.
     */
    let body: any

    try {
      body = await req.json()
    } catch (error) {
      console.error(
        '[verify-booking-otp] Invalid JSON body:',
        error
      )

      return jsonResponse(
        {
          error: 'Invalid JSON request body.',
        },
        400
      )
    }

    /*
     * Log request structure.
     *
     * DO NOT log the actual OTP.
     */
    console.log(
      '[verify-booking-otp] Request received:',
      {
        userId: user.id,
        bookingIdType: typeof body?.bookingId,
        otpTypeValue: body?.otpType,
        otpValueType: typeof body?.otp,
        otpLength:
          body?.otp !== undefined &&
          body?.otp !== null
            ? String(body.otp).length
            : 0,
      }
    )

    /*
     * Normalize values.
     *
     * OTP is converted to string so that
     * both "123456" and 123456 work.
     */
    const bookingId =
      body?.bookingId !== undefined &&
      body?.bookingId !== null
        ? String(body.bookingId).trim()
        : ''

    const otp =
      body?.otp !== undefined &&
      body?.otp !== null
        ? String(body.otp).trim()
        : ''

    const otpType =
      body?.otpType !== undefined &&
      body?.otpType !== null
        ? String(body.otpType)
            .trim()
            .toLowerCase()
        : ''

    /*
     * Validate request.
     */
    if (!bookingId || !otp || !otpType) {
      console.error(
        '[verify-booking-otp] Missing required fields:',
        {
          hasBookingId: Boolean(bookingId),
          hasOtp: Boolean(otp),
          hasOtpType: Boolean(otpType),
        }
      )

      return jsonResponse(
        {
          error:
            'bookingId, otp and otpType are required.',
        },
        400
      )
    }

    /*
     * Validate OTP type.
     */
    if (
      otpType !== 'start' &&
      otpType !== 'end'
    ) {
      return jsonResponse(
        {
          error:
            'otpType must be "start" or "end".',
        },
        400
      )
    }

    /*
     * OTP should normally be 6 digits.
     */
    if (!/^\d{6}$/.test(otp)) {
      return jsonResponse(
        {
          error:
            'OTP must be a 6-digit number.',
        },
        400
      )
    }

    /*
     * Get booking.
     */
    const {
      data: booking,
      error: bookingError,
    } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .maybeSingle()

    if (bookingError) {
      console.error(
        '[verify-booking-otp] Booking query error:',
        bookingError
      )

      return jsonResponse(
        {
          error:
            'Unable to find booking.',
          details: bookingError.message,
        },
        500
      )
    }

    if (!booking) {
      return jsonResponse(
        {
          error: 'Booking not found.',
        },
        404
      )
    }

    /*
     * Make sure the authenticated user belongs
     * to this booking.
     */
    const isCustomer =
      booking.customer_id === user.id

    const isWorker =
      booking.worker_id === user.id

    if (!isCustomer && !isWorker) {
      return jsonResponse(
        {
          error:
            'You are not authorized for this booking.',
        },
        403
      )
    }

    /*
     * Worker must exist.
     */
    if (!booking.worker_id) {
      return jsonResponse(
        {
          error:
            'No worker is assigned to this booking.',
        },
        400
      )
    }

    /*
     * Validate booking stage.
     */
    if (
      otpType === 'start' &&
      booking.status !== 'arrived'
    ) {
      console.error(
        '[verify-booking-otp] Invalid start status:',
        booking.status
      )

      return jsonResponse(
        {
          error:
            `Start OTP cannot be used when booking status is "${booking.status}".`,
        },
        400
      )
    }

    if (
      otpType === 'end' &&
      booking.status !== 'in_progress'
    ) {
      console.error(
        '[verify-booking-otp] Invalid end status:',
        booking.status
      )

      return jsonResponse(
        {
          error:
            `End OTP cannot be used when booking status is "${booking.status}".`,
        },
        400
      )
    }

    /*
     * Find latest pending OTP.
     */
    const {
      data: otpRecord,
      error: otpError,
    } = await supabase
      .from('booking_otps')
      .select('*')
      .eq('booking_id', bookingId)
      .eq('otp_type', otpType)
      .eq('status', 'pending')
      .order('created_at', {
        ascending: false,
      })
      .limit(1)
      .maybeSingle()

    if (otpError) {
      console.error(
        '[verify-booking-otp] OTP query error:',
        otpError
      )

      return jsonResponse(
        {
          error:
            'Unable to verify OTP.',
          details: otpError.message,
        },
        500
      )
    }

    if (!otpRecord) {
      console.error(
        '[verify-booking-otp] No pending OTP found:',
        {
          bookingId,
          otpType,
        }
      )

      return jsonResponse(
        {
          error:
            'Invalid or expired OTP.',
        },
        400
      )
    }

    /*
     * Check expiration.
     */
    if (
      otpRecord.expires_at &&
      new Date(otpRecord.expires_at) <=
        new Date()
    ) {
      console.error(
        '[verify-booking-otp] OTP expired:',
        otpRecord.expires_at
      )

      return jsonResponse(
        {
          error:
            'OTP has expired. Please generate a new OTP.',
        },
        400
      )
    }

    /*
     * Hash supplied OTP.
     */
    const otpHash = await sha256(otp)

    /*
     * Compare hashes.
     */
    if (
      otpRecord.otp_hash !== otpHash
    ) {
      console.error(
        '[verify-booking-otp] OTP hash mismatch:',
        {
          bookingId,
          otpType,
        }
      )

      return jsonResponse(
        {
          error: 'Invalid OTP.',
        },
        400
      )
    }

    /*
     * Determine next action to perform.
     */
    const nextAction =
      otpType === 'start'
        ? 'start'
        : 'complete'

    /*
     * Update booking status using worker_booking_action RPC.
     * This RPC handles all validation and status transitions.
     */
    const {
      data: rpcResult,
      error: statusError,
    } = await authClient.rpc(
      'worker_booking_action',
      {
        p_booking_id: bookingId,
        p_action: nextAction,
      }
    )

    if (statusError) {
      console.error(
        '[verify-booking-otp] RPC error:',
        statusError
      )

      return jsonResponse(
        {
          error:
            'Unable to update booking status.',
          details:
            statusError.message,
        },
        500
      )
    }

    /*
     * Check if RPC succeeded.
     */
    if (!rpcResult?.success) {
      console.error(
        '[verify-booking-otp] RPC returned failure:',
        rpcResult
      )

      return jsonResponse(
        {
          error:
            rpcResult?.error ||
            'Unable to complete booking action.',
        },
        400
      )
    }

    /*
     * Mark OTP verified.
     */
    const {
      error: otpUpdateError,
    } = await supabase
      .from('booking_otps')
      .update({
        status: 'verified',
        verified_at:
          new Date().toISOString(),
      })
      .eq('id', otpRecord.id)

    if (otpUpdateError) {
      console.error(
        '[verify-booking-otp] OTP update error:',
        otpUpdateError
      )

      return jsonResponse(
        {
          error:
            'Booking was updated, but OTP could not be marked verified.',
          details:
            otpUpdateError.message,
        },
        500
      )
    }

    /*
     * Success.
     */
    console.log(
      '[verify-booking-otp] OTP verified successfully:',
      {
        bookingId,
        otpType,
        action: nextAction,
        userId: user.id,
      }
    )

    return jsonResponse({
      success: true,
      booking_id: bookingId,
      action: nextAction,
      status: rpcResult?.status,
    })
  } catch (error) {
    console.error(
      '[verify-booking-otp] Unexpected error:',
      error
    )

    return jsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Internal server error',
      },
      500
    )
  }
})