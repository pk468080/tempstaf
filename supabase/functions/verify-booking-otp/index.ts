import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  })
}

async function sha256(value: string): Promise<string> {
  const data = new TextEncoder().encode(value)

  const hash = await crypto.subtle.digest(
    'SHA-256',
    data,
  )

  return Array.from(new Uint8Array(hash))
    .map((byte) =>
      byte.toString(16).padStart(2, '0'),
    )
    .join('')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders,
    })
  }

  if (req.method !== 'POST') {
    return jsonResponse(
      { error: 'Method not allowed.' },
      405,
    )
  }

  try {
    const supabaseUrl =
      Deno.env.get('SUPABASE_URL')

    const serviceRoleKey =
      Deno.env.get(
        'SUPABASE_SERVICE_ROLE_KEY',
      )

    if (!supabaseUrl || !serviceRoleKey) {
      console.error(
        '[verify-booking-otp] Missing Supabase environment variables.',
      )

      return jsonResponse(
        {
          error:
            'Supabase environment variables are missing.',
        },
        500,
      )
    }

    const authHeader =
      req.headers.get('Authorization')

    if (!authHeader) {
      return jsonResponse(
        {
          error:
            'Authorization header is required.',
        },
        401,
      )
    }

    /*
     * Preserve the caller JWT.
     *
     * auth.uid() inside the database RPC will
     * therefore remain the authenticated worker.
     */
    const supabase = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      },
    )

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return jsonResponse(
        {
          error: 'Unauthorized.',
        },
        401,
      )
    }

    let body: unknown

    try {
      body = await req.json()
    } catch {
      return jsonResponse(
        {
          error:
            'Invalid JSON request body.',
        },
        400,
      )
    }

    if (
      body === null ||
      typeof body !== 'object'
    ) {
      return jsonResponse(
        {
          error:
            'Request body must be a JSON object.',
        },
        400,
      )
    }

    const request =
      body as Record<string, unknown>

    const bookingId =
      request.bookingId !== undefined &&
      request.bookingId !== null
        ? String(request.bookingId).trim()
        : ''

    const otp =
      request.otp !== undefined &&
      request.otp !== null
        ? String(request.otp).trim()
        : ''

    const otpType =
      request.otpType !== undefined &&
      request.otpType !== null
        ? String(request.otpType)
            .trim()
            .toLowerCase()
        : ''

    if (!bookingId || !otp || !otpType) {
      return jsonResponse(
        {
          error:
            'bookingId, otp and otpType are required.',
        },
        400,
      )
    }

    if (
      otpType !== 'start' &&
      otpType !== 'end'
    ) {
      return jsonResponse(
        {
          error:
            'otpType must be "start" or "end".',
        },
        400,
      )
    }

    if (!/^\d{6}$/.test(otp)) {
      return jsonResponse(
        {
          error:
            'OTP must be a 6-digit number.',
        },
        400,
      )
    }

    /*
     * Hash the plaintext OTP.
     *
     * The plaintext OTP is never sent to the
     * database RPC.
     */
    const otpHash = await sha256(otp)

    /*
     * The database RPC is the single authority
     * for OTP verification.
     *
     * It performs:
     *
     * - authenticated worker validation
     * - booking ownership validation
     * - booking state validation
     * - OTP row locking
     * - expiration checking
     * - five-attempt lockout
     * - hash comparison
     * - single-use protection
     * - booking transition
     * - status history
     * - worker state updates
     * - earnings creation
     *
     * All of those operations happen inside
     * one PostgreSQL transaction.
     */
    const {
      data: result,
      error: rpcError,
    } = await supabase.rpc(
      'verify_booking_otp_atomic',
      {
        p_booking_id: bookingId,
        p_otp_type: otpType,
        p_otp_hash: otpHash,
      },
    )

    if (rpcError) {
      console.error(
        '[verify-booking-otp] Atomic RPC error:',
        rpcError.message,
      )

      return jsonResponse(
        {
          error:
            'Unable to verify OTP.',
        },
        500,
      )
    }

    if (
      !result ||
      result.success !== true
    ) {
      return jsonResponse(
        {
          error:
            result?.error ||
            'OTP verification failed.',
        },
        400,
      )
    }

    /*
     * Never return:
     *
     * - plaintext OTP
     * - OTP hash
     * - OTP record
     */
    return jsonResponse({
      success: true,
      booking_id: bookingId,
      otp_type: otpType,
      status: result.status,
    })
  } catch (error) {
    console.error(
      '[verify-booking-otp] Unexpected error:',
      error instanceof Error
        ? error.message
        : 'Unknown error',
    )

    return jsonResponse(
      {
        error:
          'Internal server error.',
      },
      500,
    )
  }
})