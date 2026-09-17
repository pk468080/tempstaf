import { supabase } from '../lib/supabase'

/*
 * =============================================================================
 * TYPES
 * =============================================================================
 */

export type BookingMethod =
  | 'instant'
  | 'scheduled'
  | 'recurring'

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

/**
 * Shared input for scheduled and recurring multi-occurrence bookings.
 *
 * The backend remains authoritative for:
 * - occurrence generation
 * - working hours
 * - availability
 * - area coverage
 * - pricing
 * - discounts
 * - tax
 */
export type CreateMultiOccurrenceBookingInput = {
  serviceVariantId: string
  addressId: string
  scheduleStartDate: string
  scheduleEndDate: string
  dailyStartTime: string
  dailyEndTime: string
  selectedWeekdays: number[]
  offDates?: string[]
  notes?: string
}

/**
 * Backward-compatible name retained for existing callers.
 */
export type CreateScheduledBookingInput =
  CreateMultiOccurrenceBookingInput

export type CreateRecurringBookingInput =
  CreateMultiOccurrenceBookingInput

export type CreateHourlyBookingInput = {
  serviceVariantId: string
  addressId: string
  bookingType: Extract<
    BookingMethod,
    'instant' | 'scheduled'
  >
  scheduledStart: string
  scheduledEnd: string
  notes?: string
}

export type CalculateBookingPriceInput = {
  serviceVariantId: string
  totalWorkingHours: number
}

export type CalculateRecurringPriceInput = {
  serviceVariantId: string
  occurrenceHours: number
  commitmentDays: number
}

export type ScheduledSlot = {
  slotStart: string
  slotEnd: string
}

export type BookingPrice = {
  grossAmount: number
  discountAmount: number
  finalAmount: number
  currency: string
}

export type BookingCreationResult = {
  success?: boolean
  id: string
  bookingId?: string

  instantAvailable?: boolean
  fallbackToScheduled?: boolean
  message?: string

  occurrenceCount?: number
  totalWorkingHours?: number

  grossAmount?: number
  discountAmount?: number
  finalAmount?: number
  currency?: string

  [key: string]: unknown
}

/*
 * =============================================================================
 * AUTHENTICATION
 * =============================================================================
 */

async function requireAuthenticatedCustomer() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error) {
    throw error
  }

  if (!user) {
    throw new Error(
      'Customer is not authenticated.'
    )
  }

  return user
}

/*
 * =============================================================================
 * DEVELOPMENT / COMPATIBILITY
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
  const user = await requireAuthenticatedCustomer()

  if (!input.addressLine?.trim()) {
    throw new Error(
      'Booking address is required.'
    )
  }

  if (
    !Number.isFinite(input.latitude) ||
    !Number.isFinite(input.longitude)
  ) {
    throw new Error(
      'Valid address coordinates are required.'
    )
  }

  const { data, error } = await supabase
    .from('addresses')
    .insert({
      user_id: user.id,
      label:
        input.label?.trim() ||
        'Booking location',
      address_line:
        input.addressLine.trim(),
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
 * PRICE CALCULATION
 * =============================================================================
 *
 * These functions are intentionally thin wrappers around Supabase RPCs.
 *
 * The customer app must NEVER calculate:
 * - hourly base price
 * - discount percentage
 * - recurring discount percentage
 * - final payable amount
 *
 * Admin-configured backend pricing is authoritative.
 */

/**
 * Calculates the price for an hourly booking.
 *
 * Backend RPC:
 * calculate_service_booking_price
 */
export async function calculateBookingPrice(
  input: CalculateBookingPriceInput
): Promise<BookingPrice> {
  await requireAuthenticatedCustomer()

  if (!input.serviceVariantId) {
    throw new Error(
      'Service variant is required.'
    )
  }

  if (
    !Number.isFinite(
      input.totalWorkingHours
    ) ||
    input.totalWorkingHours < 1
  ) {
    throw new Error(
      'Booking duration must be at least 1 hour.'
    )
  }

  const {
    data,
    error,
  } = await supabase.rpc(
    'calculate_service_booking_price',
    {
      p_service_variant_id:
        input.serviceVariantId,

      p_total_working_hours:
        input.totalWorkingHours,
    }
  )

  if (error) {
    console.error(
      '[TempStaff] Failed to calculate booking price:',
      error
    )

    throw error
  }

  if (!data) {
    throw new Error(
      'Booking price could not be calculated.'
    )
  }

  return {
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

/**
 * Calculates one recurring occurrence price with the
 * backend-configured recurring commitment discount.
 *
 * Backend RPC:
 * calculate_recurring_occurrence_price
 */
export async function calculateRecurringOccurrencePrice(
  input: CalculateRecurringPriceInput
): Promise<BookingPrice> {
  await requireAuthenticatedCustomer()

  if (!input.serviceVariantId) {
    throw new Error(
      'Service variant is required.'
    )
  }

  if (
    !Number.isFinite(
      input.occurrenceHours
    ) ||
    input.occurrenceHours < 1
  ) {
    throw new Error(
      'Occurrence duration must be at least 1 hour.'
    )
  }

  if (
    !Number.isFinite(
      input.commitmentDays
    ) ||
    input.commitmentDays < 1
  ) {
    throw new Error(
      'Recurring commitment duration is required.'
    )
  }

  const {
    data,
    error,
  } = await supabase.rpc(
    'calculate_recurring_occurrence_price',
    {
      p_service_variant_id:
        input.serviceVariantId,

      p_occurrence_hours:
        input.occurrenceHours,

      p_commitment_days:
        input.commitmentDays,
    }
  )

  if (error) {
    console.error(
      '[TempStaff] Failed to calculate recurring price:',
      error
    )

    throw error
  }

  if (!data) {
    throw new Error(
      'Recurring booking price could not be calculated.'
    )
  }

  return {
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
 * NEAR-TERM SCHEDULED SLOTS
 * =============================================================================
 *
 * Used when the customer wants a scheduled booking for today/tomorrow.
 *
 * The backend decides which slots are actually available based on
 * worker schedules, service coverage, booking conflicts, etc.
 */

export async function getNearTermScheduledSlots(
  serviceVariantId: string,
  addressId: string
): Promise<ScheduledSlot[]> {
  await requireAuthenticatedCustomer()

  if (!serviceVariantId) {
    throw new Error(
      'Service variant is required.'
    )
  }

  if (!addressId) {
    throw new Error(
      'Booking address is required.'
    )
  }

  const {
    data,
    error,
  } = await supabase.rpc(
    'get_customer_near_term_scheduled_slots',
    {
      p_service_variant_id:
        serviceVariantId,

      p_address_id:
        addressId,
    }
  )

  if (error) {
    console.error(
      '[TempStaff] Failed to load near-term scheduled slots:',
      error
    )

    throw error
  }

  return (
    (data ?? []) as Array<{
      slot_start: string
      slot_end: string
    }>
  ).map(
    (slot) => ({
      slotStart:
        String(
          slot.slot_start
        ),

      slotEnd:
        String(
          slot.slot_end
        ),
    })
  )
}

/**
 * Backward-compatible alias.
 */
export const getCustomerNearTermScheduledSlots =
  getNearTermScheduledSlots

/*
 * =============================================================================
 * INSTANT / HOURLY BOOKING
 * =============================================================================
 *
 * This is the direct booking ingress for:
 *
 * - instant
 * - scheduled hourly booking
 *
 * The backend decides:
 * - service validity
 * - address ownership
 * - service area
 * - 10 km worker matching
 * - live presence
 * - worker location freshness
 * - worker conflicts
 * - schedule availability
 * - minimum duration
 * - operating hours
 * - price
 * - booking state
 *
 * The client only submits the requested facts.
 */

export async function createHourlyBooking(
  input: CreateHourlyBookingInput
): Promise<BookingCreationResult> {
  await requireAuthenticatedCustomer()

  if (!input.serviceVariantId) {
    throw new Error(
      'Service variant is required.'
    )
  }

  if (!input.addressId) {
    throw new Error(
      'Booking address is required.'
    )
  }

  if (
    input.bookingType !== 'instant' &&
    input.bookingType !== 'scheduled'
  ) {
    throw new Error(
      'Invalid hourly booking type.'
    )
  }

  if (!input.scheduledStart) {
    throw new Error(
      'Booking start time is required.'
    )
  }

  if (!input.scheduledEnd) {
    throw new Error(
      'Booking end time is required.'
    )
  }

  const {
    data,
    error,
  } = await supabase.rpc(
    'create_customer_hourly_booking',
    {
      p_service_variant_id:
        input.serviceVariantId,

      p_address_id:
        input.addressId,

      p_booking_type:
        input.bookingType,

      p_scheduled_start:
        input.scheduledStart,

      p_scheduled_end:
        input.scheduledEnd,

      p_notes:
        input.notes?.trim() ||
        null,
    }
  )

  if (error) {
    console.error(
      '[TempStaff] Failed to create hourly booking:',
      error
    )

    throw error
  }

  if (!data) {
    throw new Error(
      'Booking creation returned no result.'
    )
  }

  /*
   * IMPORTANT:
   *
   * Instant booking with no currently available worker is NOT
   * treated as a database error.
   *
   * The backend intentionally returns:
   *
   * {
   *   success: false,
   *   instant_available: false,
   *   fallback_to_scheduled: true
   * }
   *
   * so the UI can offer scheduled booking.
   */

  const bookingId =
    data.booking_id
      ? String(data.booking_id)
      : ''

  return {
    ...data,

    success:
      data.success !== undefined
        ? Boolean(data.success)
        : Boolean(bookingId),

    id:
      bookingId,

    bookingId:
      bookingId || undefined,

    instantAvailable:
      data.instant_available !== undefined
        ? Boolean(
            data.instant_available
          )
        : undefined,

    fallbackToScheduled:
      data.fallback_to_scheduled !== undefined
        ? Boolean(
            data.fallback_to_scheduled
          )
        : undefined,

    occurrenceCount:
      data.occurrence_count !== undefined
        ? Number(
            data.occurrence_count
          )
        : undefined,

    totalWorkingHours:
      data.total_working_hours !== undefined
        ? Number(
            data.total_working_hours
          )
        : undefined,

    grossAmount:
      data.gross_amount !== undefined
        ? Number(
            data.gross_amount
          )
        : undefined,

    discountAmount:
      data.discount_amount !== undefined
        ? Number(
            data.discount_amount
          )
        : undefined,

    finalAmount:
      data.final_amount !== undefined
        ? Number(
            data.final_amount
          )
        : undefined,

    currency:
      data.currency !== undefined
        ? String(
            data.currency
          )
        : undefined,
  }
}

/**
 * Explicit instant-booking helper.
 */
export async function createInstantBooking(
  input: Omit<
    CreateHourlyBookingInput,
    'bookingType'
  >
): Promise<BookingCreationResult> {
  return createHourlyBooking({
    ...input,
    bookingType: 'instant',
  })
}

/**
 * Explicit scheduled hourly helper.
 *
 * This is useful for near-term scheduled bookings where the customer
 * selected a concrete start/end slot.
 */
export async function createInstantFallbackScheduledBooking(
  input: Omit<
    CreateHourlyBookingInput,
    'bookingType'
  >
): Promise<BookingCreationResult> {
  return createHourlyBooking({
    ...input,
    bookingType: 'scheduled',
  })
}

/*
 * =============================================================================
 * MULTI-OCCURRENCE BOOKING
 * =============================================================================
 *
 * Used for:
 *
 * - scheduled future date/range
 * - recurring weekday schedules
 *
 * The backend creates the individual booking_schedule_occurrences.
 */

export async function createMultiOccurrenceBooking(
  input: CreateMultiOccurrenceBookingInput & {
    bookingType: 'scheduled' | 'recurring'
  }
): Promise<BookingCreationResult> {
  await requireAuthenticatedCustomer()

  if (!input.serviceVariantId) {
    throw new Error(
      'Service variant is required.'
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
    'create_customer_multi_occurrence_booking',
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
        input.notes?.trim() ||
        null,

      p_booking_type:
        input.bookingType,
    }
  )

  if (error) {
    console.error(
      '[TempStaff] Failed to create multi-occurrence booking:',
      error
    )

    throw error
  }

  if (!data?.booking_id) {
    console.error(
      '[TempStaff] Multi-occurrence booking RPC returned invalid data:',
      data
    )

    throw new Error(
      'Booking was not created.'
    )
  }

  return {
    ...data,

    success: true,

    id:
      String(
        data.booking_id
      ),

    bookingId:
      String(
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
 * SCHEDULED BOOKING
 * =============================================================================
 *
 * Kept under the existing function name so existing screens compile.
 *
 * It now calls the new hourly/multi-occurrence backend model and explicitly
 * identifies the booking as scheduled.
 */

export async function createScheduledBooking(
  input: CreateScheduledBookingInput
): Promise<BookingCreationResult> {
  return createMultiOccurrenceBooking({
    ...input,
    bookingType: 'scheduled',
  })
}

/*
 * =============================================================================
 * RECURRING BOOKING
 * =============================================================================
 */

export async function createRecurringBooking(
  input: CreateRecurringBookingInput
): Promise<BookingCreationResult> {
  return createMultiOccurrenceBooking({
    ...input,
    bookingType: 'recurring',
  })
}

/*
 * =============================================================================
 * LEGACY SECURE BOOKING CREATION
 * =============================================================================
 *
 * Retained only for compatibility with code that has not yet been migrated.
 *
 * IMPORTANT:
 * The old create_customer_booking RPC is NOT the customer application's
 * normal booking ingress anymore.
 *
 * New screens should use:
 *
 * - createInstantBooking()
 * - createHourlyBooking()
 * - createScheduledBooking()
 * - createRecurringBooking()
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
  _input: CreateBookingInput
): Promise<never> {
  throw new Error(
    'Legacy booking creation is disabled. Use createInstantBooking(), createHourlyBooking(), createScheduledBooking(), or createRecurringBooking().'
  )
}
  



/*
 * =============================================================================
 * PAYMENT COMPATIBILITY
 * =============================================================================
 *
 * This function is retained for existing code.
 *
 * Production Razorpay verification must continue to use the dedicated
 * payment verification/webhook flow. The client must not be trusted to
 * declare a booking paid.
 */

export async function markBookingPaid(
  bookingId: string
) {
  if (!bookingId) {
    throw new Error(
      'Booking ID is required.'
    )
  }

  await requireAuthenticatedCustomer()

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

  await requireAuthenticatedCustomer()

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
 * CUSTOMER BOOKING QUERIES
 * =============================================================================
 */

async function loadWorkerProfiles(
  workerIds: string[]
) {
  if (workerIds.length === 0) {
    return {} as Record<
      string,
      CustomerBooking['worker']
    >
  }

  const {
    data: workers,
    error,
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

  if (error) {
    console.warn(
      '[TempStaff] Failed to load worker profiles:',
      error
    )

    return {} as Record<
      string,
      CustomerBooking['worker']
    >
  }

  return Object.fromEntries(
    (workers ?? []).map(
      (worker) => [
        worker.id,
        worker,
      ]
    )
  )
}

export async function getCustomerBookings(): Promise<
  CustomerBooking[]
> {
  const user =
    await requireAuthenticatedCustomer()

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

  const workerMap =
    await loadWorkerProfiles(
      workerIds
    )

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

  const user =
    await requireAuthenticatedCustomer()

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

  let worker =
    null

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
      workerData ??
      null
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

  await requireAuthenticatedCustomer()

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

  await requireAuthenticatedCustomer()

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