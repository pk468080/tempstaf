import { supabase } from '../../lib/supabase'

export type BookingStatus =
  | 'pending_payment'
  | 'paid'
  | 'searching_worker'
  | 'assigned'
  | 'on_the_way'
  | 'arrived'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'expired'
  | 'payment_failed'

export type CustomerBooking = {
  id: string
  status: BookingStatus
  booking_type?: string | null
  service_name: string | null
  scheduled_start: string | null
  scheduled_end: string | null
  total_working_hours: number | null
  total_amount: number | null
  worker_id: string | null
  started_at: string | null
  completed_at: string | null
  journey_started_at: string | null
  arrived_at: string | null
  created_at?: string | null
}
export type CustomerBookingOccurrence = {
  id: string
  booking_id: string
  worker_id: string | null
  occurrence_index: number
  occurrence_date: string
  scheduled_start: string
  scheduled_end: string
  status: string

  journey_started_at: string | null
  arrived_at: string | null
  started_at: string | null
  completed_at: string | null

  start_otp_verified_at: string | null
  end_otp_verified_at: string | null

  created_at: string
  updated_at: string
}

export type BookingStatusHistoryItem = {
  id: string
  booking_id: string
  old_status: BookingStatus | null
  new_status: BookingStatus
  changed_by: string | null
  created_at: string
}

export type WorkerLocation = {
  latitude: number
  longitude: number
  recorded_at: string
}

export type WorkerLocationFreshness =
  | 'unavailable'
  | 'fresh'
  | 'stale'

type BookingRow = CustomerBooking & {
  service_variant?: {
    service?: {
      name?: string | null
    } | null
  } | null
}

function mapBooking(row: BookingRow): CustomerBooking {
  return {
    ...row,
    service_name:
      row.service_variant?.service?.name ?? null,
  }
}

export async function getCustomerBooking(
  bookingId: string,
): Promise<CustomerBooking> {
  const { data, error } = await supabase
    .from('bookings')
    .select(
      'id, status, booking_type:fulfillment_type, created_at, scheduled_start, scheduled_end, total_working_hours, total_amount, worker_id, started_at, completed_at, journey_started_at, arrived_at, service_variant:service_variants(service:services(name))',
    )
    .eq('id', bookingId)
    .single()

  if (error) {
    throw error
  }

  return mapBooking(
    data as unknown as BookingRow,
  )
}

export async function getCustomerBookings(): Promise<
  CustomerBooking[]
> {
  const { data, error } = await supabase
    .from('bookings')
    .select(
      'id, status, booking_type:fulfillment_type, created_at, scheduled_start, scheduled_end, total_working_hours, total_amount, worker_id, started_at, completed_at, journey_started_at, arrived_at, service_variant:service_variants(service:services(name))',
    )
    .order('created_at', {
      ascending: false,
    })

  if (error) {
    throw error
  }

  return (
    (data ?? []) as unknown as BookingRow[]
  ).map(mapBooking)
}

export async function getCustomerBookingStatusHistory(
  bookingId: string,
): Promise<BookingStatusHistoryItem[]> {
  const { data, error } = await supabase
    .from('booking_status_history')
    .select(
      'id, booking_id, old_status, new_status, changed_by, created_at',
    )
    .eq('booking_id', bookingId)
    .order('created_at', {
      ascending: true,
    })

  if (error) {
    throw error
  }

  return (
    (data ?? []) as unknown as BookingStatusHistoryItem[]
  )
}

export async function getLatestWorkerLocation(
  bookingId: string,
): Promise<WorkerLocation | null> {
  const { data, error } = await supabase
    .from('worker_locations')
    .select(
      'latitude, longitude, recorded_at',
    )
    .eq('booking_id', bookingId)
    .order('recorded_at', {
      ascending: false,
    })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data as WorkerLocation | null
}

export function getWorkerLocationFreshness(
  location: WorkerLocation | null,
  nowMs = Date.now(),
): WorkerLocationFreshness {
  if (!location) {
    return 'unavailable'
  }

  const recordedAt = Date.parse(
    location.recorded_at,
  )

  if (!Number.isFinite(recordedAt)) {
    return 'stale'
  }

  const ageMs = Math.max(
    0,
    nowMs - recordedAt,
  )

  return ageMs <= 60_000
    ? 'fresh'
    : 'stale'
}

export function getWorkerLocationAgeSeconds(
  location: WorkerLocation | null,
  nowMs = Date.now(),
): number | null {
  if (!location) {
    return null
  }

  const recordedAt = Date.parse(
    location.recorded_at,
  )

  if (!Number.isFinite(recordedAt)) {
    return null
  }

  return Math.max(
    0,
    Math.floor(
      (nowMs - recordedAt) / 1000,
    ),
  )
}

export async function requestBookingOtp(
  bookingId: string,
  otpType: 'start' | 'end',
) {
  const { data, error } =
    await supabase.functions.invoke(
      'create-booking-otp',
      {
        body: {
          bookingId,
          otpType,
        },
      },
    )

  if (error) {
    throw error
  }

  const result = data as {
    success?: boolean
    otp?: string
    expiresAt?: string
  }

  if (result.success !== true) {
    throw new Error(
      'Unable to generate the booking OTP.',
    )
  }

  return result
}
