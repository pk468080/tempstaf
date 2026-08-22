import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

async function sha256(value: string) {
  const data = new TextEncoder().encode(value)
  const hash = await crypto.subtle.digest('SHA-256', data)

  return Array.from(new Uint8Array(hash))
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('')
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders,
    })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get(
      'SUPABASE_SERVICE_ROLE_KEY'
    )!

    const supabase = createClient(
      supabaseUrl,
      serviceRoleKey
    )

    const { bookingId, otpType } = await req.json()

    if (!bookingId) {
      return new Response(
        JSON.stringify({
          error: 'bookingId is required',
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      )
    }

    if (otpType !== 'start' && otpType !== 'end') {
      return new Response(
        JSON.stringify({
          error: 'otpType must be start or end',
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      )
    }

    const { data: booking, error: bookingError } =
      await supabase
        .from('bookings')
        .select('id, customer_id, worker_id, status')
        .eq('id', bookingId)
        .single()

    if (bookingError || !booking) {
      return new Response(
        JSON.stringify({
          error: 'Booking not found',
        }),
        {
          status: 404,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      )
    }

    const otp = generateOtp()
    const otpHash = await sha256(otp)

    const expiresAt = new Date(
      Date.now() + 15 * 60 * 1000
    ).toISOString()

    await supabase
      .from('booking_otps')
      .update({
        status: 'expired',
      })
      .eq('booking_id', bookingId)
      .eq('otp_type', otpType)
      .eq('status', 'pending')

    const { error: insertError } = await supabase
      .from('booking_otps')
      .insert({
        booking_id: bookingId,
        otp_type: otpType,
        otp_hash: otpHash,
        status: 'pending',
        attempts: 0,
        expires_at: expiresAt,
      })

    if (insertError) {
      throw insertError
    }

    return new Response(
      JSON.stringify({
        success: true,

        // DEVELOPMENT ONLY.
        // Remove this before production.
        otp,

        expiresAt,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    )
  } catch (error) {
    console.error(
      '[create-booking-otp]',
      error
    )

    return new Response(
      JSON.stringify({
        error:
          error instanceof Error
            ? error.message
            : 'Internal server error',
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    )
  }
})
