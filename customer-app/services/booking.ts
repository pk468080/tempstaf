import { supabase } from '../lib/supabase'

/*
 * =============================================================================
 * TYPE DEFINITIONS
 * =============================================================================
 */

export type CustomerBooking = {
  id: string
  customer_id: string
  worker_id: string | null
  service_id: string
  address_id: string
  status: string
  duration_value: number
  duration_unit: string
  scheduled_start: string
  scheduled_end: string
  base_amount: number
  platform_fee: number
  tax_amount: number
  total_amount: number
  notes: string | null
  created_at: string
  updated_at: string
  service?: {
    id: string
    name: string
    description: string | null
  } | null
  address?: {
    id: string
    label: string | null
    address_line: string
    latitude: number
    longitude: number
  } | null
  worker?: {
    id: string
    full_name: string | null
    phone: string | null
    avatar_url: string | null
  } | null
}

export type CreateAddressInput = {
  label?: string
  addressLine: string
  latitude: number
  longitude: number
}

export type CreateBookingInput = {
  fulfillmentType: 'instant' | 'scheduled'
  serviceId: string
  addressId: string
  durationValue: number
  durationUnit: 'hour' | 'day' | 'week' | 'month'
  scheduledStart: string
  scheduledEnd: string
  baseAmount: number
  platformFee: number
  taxAmount: number
  totalAmount: number
  notes?: string
}

/*
 * =============================================================================
 * AUTHENTICATION & SESSION
 * =============================================================================
 */

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

/*
 * =============================================================================
 * ADDRESS OPERATIONS
 * =============================================================================
 */

export async function createAddress(
  input: CreateAddressInput
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

/*
 * =============================================================================
 * OTP OPERATIONS
 * =============================================================================
 */

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

  if (!data?.success) {
    throw new Error(
      data?.error || 'Failed to create OTP.'
    )
  }

  return {
    otp: data.otp ? String(data.otp) : undefined,
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

/*
 * =============================================================================
 * BOOKING CREATION
 * =============================================================================
 */

/**
 * Creates the booking only.
 *
 * Worker assignment is intentionally NOT trusted
 * from the customer application.
 *
 * Instant assignment must be performed by the
 * Supabase/database transaction after payment.
 */
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

  if (!input.serviceId) {
    throw new Error(
      'Service is required.'
    )
  }

  if (!input.addressId) {
    throw new Error(
      'Booking address is required.'
    )
  }

  if (
    input.fulfillmentType === 'instant' &&
    !input.scheduledStart
  ) {
    throw new Error(
      'Instant booking start time is required.'
    )
  }

  if (
    input.fulfillmentType === 'scheduled' &&
    !input.scheduledStart
  ) {
    throw new Error(
      'Scheduled booking time is required.'
    )
  }

  const { data, error } = await supabase
    .from('bookings')
    .insert({
      customer_id: user.id,

      // Never accept a worker selected by the
      // customer app.
      worker_id: null,

      service_id: input.serviceId,
      address_id: input.addressId,

      fulfillment_type:
        input.fulfillmentType,

      status: 'pending_payment',

      duration_value:
        input.durationValue,

      duration_unit:
        input.durationUnit,

      scheduled_start:
        input.scheduledStart,

      scheduled_end:
        input.scheduledEnd,

      base_amount:
        input.baseAmount,

      platform_fee:
        input.platformFee,

      tax_amount:
        input.taxAmount,

      total_amount:
        input.totalAmount,

      notes:
        input.notes ?? null,
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
    throw new Error(
      'Booking ID is required.'
    )
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

export async function customerBookingAction(
  bookingId: string,
  action: 'cancel'
) {
  if (!bookingId) {
    throw new Error('Booking ID is required.')
  }

  const { data, error } = await supabase.rpc(
    'customer_booking_action',
    {
      p_booking_id: bookingId,
      p_action: action,
    }
  )

  if (error) {
    console.error(
      '[TempStaff] Failed to update booking action:',
      error
    )

    throw error
  }

  if (!data?.success) {
    throw new Error(
      data?.error || 'Booking action failed.'
    )
  }

  return data
}

/*
 * =============================================================================
 * BOOKING QUERIES
 * =============================================================================
 */

export async function getCustomerBookings(): Promise<
  CustomerBooking[]
> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) {
    throw userError
  }

  if (!user) {
    throw new Error('Customer is not authenticated.')
  }

  const { data, error } = await supabase
    .from('bookings')
    .select(`
      id,
      customer_id,
      worker_id,
      service_id,
      address_id,
      status,
      duration_value,
      duration_unit,
      scheduled_start,
      scheduled_end,
      base_amount,
      platform_fee,
      tax_amount,
      total_amount,
      notes,
      created_at,
      updated_at,
      services (
        id,
        name,
        description
      ),
      addresses (
        id,
        label,
        address_line,
        latitude,
        longitude
      )
    `)
    .eq('customer_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error(
      '[TempStaff] Failed to load customer bookings:',
      error
    )

    throw error
  }

  const bookings = (data ?? []) as any[]

  const workerIds = Array.from(
    new Set(
      bookings
        .map((booking) => booking.worker_id)
        .filter(Boolean)
    )
  )

  let workerMap: Record<string, any> = {}

  if (workerIds.length > 0) {
    const { data: workers, error: workersError } =
      await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          phone,
          avatar_url
        `)
        .in('id', workerIds)

    if (workersError) {
      console.warn(
        '[TempStaff] Failed to load worker profiles:',
        workersError
      )
    } else {
      workerMap = Object.fromEntries(
        (workers ?? []).map((worker) => [
          worker.id,
          worker,
        ])
      )
    }
  }

  return bookings.map((booking) => ({
    ...booking,
    service: booking.services ?? null,
    address: booking.addresses ?? null,
    worker: booking.worker_id
      ? workerMap[booking.worker_id] ?? null
      : null,
  }))
}

export async function getCustomerBooking(
  bookingId: string
): Promise<CustomerBooking> {
  if (!bookingId) {
    throw new Error('Booking ID is required.')
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) {
    throw userError
  }

  if (!user) {
    throw new Error('Customer is not authenticated.')
  }

  const { data, error } = await supabase
    .from('bookings')
    .select(`
      id,
      customer_id,
      worker_id,
      service_id,
      address_id,
      status,
      duration_value,
      duration_unit,
      scheduled_start,
      scheduled_end,
      base_amount,
      platform_fee,
      tax_amount,
      total_amount,
      notes,
      created_at,
      updated_at,
      services (
        id,
        name,
        description
      ),
      addresses (
        id,
        label,
        address_line,
        latitude,
        longitude
      )
    `)
    .eq('id', bookingId)
    .eq('customer_id', user.id)
    .single()

  if (error) {
    console.error(
      '[TempStaff] Failed to load booking:',
      error
    )

    throw error
  }

  let worker = null

  if (data.worker_id) {
    const { data: workerData } = await supabase
      .from('profiles')
      .select(`
        id,
        full_name,
        phone,
        avatar_url
      `)
      .eq('id', data.worker_id)
      .maybeSingle()

    worker = workerData ?? null
  }

  return {
    ...(data as any),
    service: (data as any).services ?? null,
    address: (data as any).addresses ?? null,
    worker,
  }
}