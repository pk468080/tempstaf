import { supabase } from '../lib/supabase'

export function createDevelopmentBookingId() {
  return `TS-${Date.now().toString().slice(-8)}`
}

export function verifyDevelopmentLoginOtp(otp: string) {
  return otp === '123456'
}

export async function ensureDevelopmentSession(
  phone?: string
) {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (session?.user) {
    const { data: profile, error: profileError } =
      await supabase
        .from('profiles')
        .select('id, role, is_active')
        .eq('id', session.user.id)
        .maybeSingle()

    if (
      !profileError &&
      profile &&
      profile.role === 'customer' &&
      profile.is_active === true
    ) {
      return session
    }

    await supabase.auth.signOut()
  }

  const { data, error } =
    await supabase.auth.signInAnonymously()

  if (error) {
    throw error
  }

  if (!data.session || !data.user) {
    throw new Error(
      'Supabase did not return an authentication session.'
    )
  }

  const { error: profileError } =
    await supabase
      .from('profiles')
      .upsert(
        {
          id: data.user.id,
          phone: phone ?? null,
          role: 'customer',
          is_active: true,
        },
        {
          onConflict: 'id',
        }
      )

  if (profileError) {
    console.error(
      '[TempStaff] Failed to create customer profile:',
      profileError
    )

    await supabase.auth.signOut()

    throw profileError
  }

  return data.session
}

export type CreateAddressInput = {
  label?: string
  addressLine: string
  latitude: number
  longitude: number
}

export async function createAddress(
  input: CreateAddressInput
) {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Customer is not authenticated.')
  }

  const { data, error } = await supabase
    .from('addresses')
    .insert({
      user_id: user.id,
      label: input.label ?? 'Booking location',
      address_line: input.addressLine,
      latitude: input.latitude,
      longitude: input.longitude,
    })
    .select()
    .single()

  if (error) {
    console.error(
      '[TempStaff] Failed to create address:',
      error
    )

    throw error
  }

  return data
}

export async function createBookingOtp(
  bookingId: string,
  otpType: 'start' | 'end'
) {
  if (!bookingId) {
    throw new Error('Booking ID is required.')
  }

  const { data, error } =
    await supabase.functions.invoke(
      'create-booking-otp',
      {
        body: {
          bookingId,
          otpType,
        },
      }
    )

  if (error) {
    console.error(
      '[TempStaff] Failed to create OTP:',
      error
    )

    throw error
  }

  if (!data?.success || !data?.otp) {
    throw new Error(
      data?.error || 'Failed to create OTP.'
    )
  }

  return {
    otp: String(data.otp),
    expiresAt: data.expiresAt,
  }
}

export async function verifyBookingOtp(
  bookingId: string,
  otp: string,
  otpType: 'start' | 'end'
) {
  if (!bookingId || !otp) {
    throw new Error(
      'Booking ID and OTP are required.'
    )
  }

  const { data, error } =
    await supabase.functions.invoke(
      'verify-booking-otp',
      {
        body: {
          bookingId,
          otp,
          otpType,
        },
      }
    )

  if (error) {
    console.error(
      '[TempStaff] Failed to verify OTP:',
      error
    )

    throw error
  }

  if (!data?.success) {
    throw new Error(
      data?.error || 'OTP verification failed.'
    )
  }

  return data
}

export type CreateBookingInput = {
  workerId?: string | null
  serviceId: string
  addressId: string
  durationValue: number
  durationUnit:
    | 'hour'
    | 'day'
    | 'week'
    | 'month'
  scheduledStart: string
  scheduledEnd: string
  baseAmount: number
  platformFee: number
  taxAmount: number
  totalAmount: number
  notes?: string
}

export async function createBooking(
  input: CreateBookingInput
) {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error(
      'Customer is not authenticated.'
    )
  }

  const { data, error } = await supabase
    .from('bookings')
    .insert({
      customer_id: user.id,

      // Worker is assigned later by TempStaff.
      worker_id: input.workerId ?? null,

      service_id: input.serviceId,
      address_id: input.addressId,

      status: 'pending_payment',

      duration_value: input.durationValue,
      duration_unit: input.durationUnit,

      scheduled_start: input.scheduledStart,
      scheduled_end: input.scheduledEnd,

      base_amount: input.baseAmount,
      platform_fee: input.platformFee,
      tax_amount: input.taxAmount,
      total_amount: input.totalAmount,

      notes: input.notes ?? null,
    })
    .select()
    .single()

  if (error) {
    console.error(
      '[TempStaff] Failed to create booking:',
      error
    )

    throw error
  }

  return data
}

export async function markBookingPaid(
  bookingId: string
) {
  if (!bookingId) {
    throw new Error('Booking ID is required.')
  }

  const { data, error } =
    await supabase.rpc(
      'complete_test_payment',
      {
        p_booking_id: bookingId,
      }
    )

  if (error) {
    console.error(
      '[TempStaff] Failed to complete payment:',
      error
    )

    throw error
  }

  if (!data) {
    throw new Error(
      'Payment was not completed.'
    )
  }

  return data
}