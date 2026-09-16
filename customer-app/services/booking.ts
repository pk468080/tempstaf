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

export type CreateScheduledBookingInput = {
  serviceVariantId: string
  addressId: string
  scheduleStartDate: string
  scheduleEndDate: string
  dailyStartTime: string
  dailyEndTime: string
  selectedWeekdays: number[]
  offDates: string[]
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
      label:
        input.label ??
        'Booking location',
      address_line:
        input.addressLine,
      latitude:
        input.latitude,
      longitude:
        input.longitude,
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
    throw new Error(
      'Booking ID is required.'
    )
  }

  const {
    data,
    error,
  } = await supabase.functions.invoke(
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
      data?.error ||
        'Failed to create OTP.'
    )
  }

  return {
    otp: data.otp
      ? String(data.otp)
      : undefined,
    expiresAt:
      data.expiresAt,
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

  const {
    data,
    error,
  } = await supabase.functions.invoke(
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
      data?.error ||
        'OTP verification failed.'
    )
  }

  return data
}

/*
 * =============================================================================
 * SCHEDULED BOOKING CREATION
 * =============================================================================
 */

/**
 * Creates a Scheduled Booking using the
 * server-side scheduling and pricing engine.
 *
 * The customer app does NOT calculate:
 * - occurrences
 * - working hours
 * - price
 * - discount
 * - final payable amount
 *
 * Supabase is the source of truth.
 */
export async function createScheduledBooking(
  input: CreateScheduledBookingInput
) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) {
    throw userError
  }

  if (!user) {
    throw new Error(
      'Customer is not authenticated.'
    )
  }

  if (!input.serviceVariantId) {
    throw new Error(
      'Service package is required.'
    )
  }

  if (!input.addressId) {
    throw new Error(
      'Booking address is required.'
    )
  }

  if (!input.scheduleStartDate) {
    throw new Error(
      'Schedule start date is required.'
    )
  }

  if (!input.scheduleEndDate) {
    throw new Error(
      'Schedule end date is required.'
    )
  }

  if (!input.dailyStartTime) {
    throw new Error(
      'Daily start time is required.'
    )
  }

  if (!input.dailyEndTime) {
    throw new Error(
      'Daily end time is required.'
    )
  }

  if (
    !Array.isArray(
      input.selectedWeekdays
    ) ||
    input.selectedWeekdays.length === 0
  ) {
    throw new Error(
      'At least one working weekday is required.'
    )
  }

  const {
    data,
    error,
  } = await supabase.rpc(
    'create_customer_scheduled_booking',
    {
      p_service_variant_id:
        input.serviceVariantId,

      p_address_id:
        input.addressId,

      p_schedule_start_date:
        input.scheduleStartDate,

      p_schedule_end_date:
        input.scheduleEndDate,

      p_daily_start_time:
        input.dailyStartTime,

      p_daily_end_time:
        input.dailyEndTime,

      p_selected_weekdays:
        input.selectedWeekdays,

      p_off_dates:
        input.offDates ?? [],

      p_notes:
        input.notes ?? null,
    }
  )

  if (error) {
    console.error(
      '[TempStaff] Failed to create scheduled booking:',
      error
    )

    throw error
  }

  if (!data?.booking_id) {
    console.error(
      '[TempStaff] Scheduled booking RPC returned invalid data:',
      data
    )

    throw new Error(
      'Scheduled booking was not created.'
    )
  }

  return {
    ...data,

    id: String(
      data.booking_id
    ),

    occurrenceCount:
      Number(
        data.occurrence_count ?? 0
      ),

    totalWorkingHours:
      Number(
        data.total_working_hours ?? 0
      ),

    grossAmount:
      Number(
        data.gross_amount ?? 0
      ),

    discountAmount:
      Number(
        data.discount_amount ?? 0
      ),

    finalAmount:
      Number(
        data.final_amount ?? 0
      ),

    currency:
      String(
        data.currency ?? 'INR'
      ),
  }
}

/*
 * =============================================================================
 * LEGACY BOOKING CREATION
 * =============================================================================
 *
 * Kept for existing callers elsewhere in the application.
 *
 * Scheduled Checkout no longer uses this function.
 */

export type CreateBookingInput = {
  fulfillmentType:
    | 'instant'
    | 'scheduled'

  serviceVariantId: string

  addressId: string

  scheduledStart: string

  notes?: string
}

export async function createBooking(
  input: CreateBookingInput
) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) {
    throw userError
  }

  if (!user) {
    throw new Error(
      'Customer is not authenticated.'
    )
  }

  if (!input.serviceVariantId) {
    throw new Error(
      'Service package is required.'
    )
  }

  if (!input.addressId) {
    throw new Error(
      'Booking address is required.'
    )
  }

  if (!input.scheduledStart) {
    throw new Error(
      'Booking start time is required.'
    )
  }

  const {
    data,
    error,
  } = await supabase.rpc(
    'create_customer_booking',
    {
      p_service_variant_id:
        input.serviceVariantId,

      p_address_id:
        input.addressId,

      p_fulfillment_type:
        input.fulfillmentType,

      p_scheduled_start:
        input.scheduledStart,

      p_notes:
        input.notes ?? null,
    }
  )

  if (error) {
    console.error(
      '[TempStaff] Failed to create secure booking:',
      error
    )

    throw error
  }

  if (!data?.booking_id) {
    console.error(
      '[TempStaff] Secure booking RPC returned invalid data:',
      data
    )

    throw new Error(
      'Booking was not created.'
    )
  }

  return {
    ...data,
    id: String(
      data.booking_id
    ),
  }
}

/*
 * =============================================================================
 * PAYMENT
 * =============================================================================
 *
 * Existing function retained for compatibility.
 * Real Razorpay verification will replace the
 * test-payment path later in this flow.
 */

export async function markBookingPaid(
  bookingId: string
) {
  if (!bookingId) {
    throw new Error(
      'Booking ID is required.'
    )
  }

  const {
    data,
    error,
  } = await supabase.rpc(
    'complete_test_payment',
    {
      p_booking_id:
        bookingId,
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

/*
 * =============================================================================
 * CUSTOMER BOOKING ACTIONS
 * =============================================================================
 */

export async function customerBookingAction(
  bookingId: string,
  action: 'cancel'
) {
  if (!bookingId) {
    throw new Error(
      'Booking ID is required.'
    )
  }

  const {
    data,
    error,
  } = await supabase.rpc(
    'customer_booking_action',
    {
      p_booking_id:
        bookingId,

      p_action:
        action,
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
      data?.error ||
        'Booking action failed.'
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
    throw new Error(
      'Customer is not authenticated.'
    )
  }

  const {
    data,
    error,
  } = await supabase
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
    .eq(
      'customer_id',
      user.id
    )
    .order(
      'created_at',
      {
        ascending: false,
      }
    )

  if (error) {
    console.error(
      '[TempStaff] Failed to load customer bookings:',
      error
    )

    throw error
  }

  const bookings =
    (data ?? []) as any[]

  const workerIds =
    Array.from(
      new Set(
        bookings
          .map(
            (booking) =>
              booking.worker_id
          )
          .filter(Boolean)
      )
    )

  let workerMap:
    Record<string, any> = {}

  if (workerIds.length > 0) {
    const {
      data: workers,
      error: workersError,
    } = await supabase
      .from('profiles')
      .select(`
        id,
        full_name,
        phone,
        avatar_url
      `)
      .in(
        'id',
        workerIds
      )

    if (workersError) {
      console.warn(
        '[TempStaff] Failed to load worker profiles:',
        workersError
      )
    } else {
      workerMap =
        Object.fromEntries(
          (workers ?? []).map(
            (worker) => [
              worker.id,
              worker,
            ]
          )
        )
    }
  }

  return bookings.map(
    (booking) => ({
      ...booking,

      service:
        booking.services ??
        null,

      address:
        booking.addresses ??
        null,

      worker:
        booking.worker_id
          ? workerMap[
              booking.worker_id
            ] ?? null
          : null,
    })
  )
}

export async function getCustomerBooking(
  bookingId: string
): Promise<CustomerBooking> {
  if (!bookingId) {
    throw new Error(
      'Booking ID is required.'
    )
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) {
    throw userError
  }

  if (!user) {
    throw new Error(
      'Customer is not authenticated.'
    )
  }

  const {
    data,
    error,
  } = await supabase
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
    .eq(
      'id',
      bookingId
    )
    .eq(
      'customer_id',
      user.id
    )
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
    const {
      data: workerData,
    } = await supabase
      .from('profiles')
      .select(`
        id,
        full_name,
        phone,
        avatar_url
      `)
      .eq(
        'id',
        data.worker_id
      )
      .maybeSingle()

    worker =
      workerData ?? null
  }

  return {
    ...(data as any),

    service:
      (data as any).services ??
      null,

    address:
      (data as any).addresses ??
      null,

    worker,
  }
}