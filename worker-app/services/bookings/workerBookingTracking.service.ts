import { supabase } from '../../lib/supabase'

import type {
  WorkerLocation,
} from '../../types/worker'

export type WorkerBookingLocation = {
  bookingId: string

  latitude: number
  longitude: number

  recordedAt: string
}

type WorkerLocationRow = {
  id: number
  worker_id: string
  booking_id: string | null
  latitude: number
  longitude: number
  recorded_at: string
}

const LOCATION_SELECT = `
  id,
  worker_id,
  booking_id,
  latitude,
  longitude,
  recorded_at
`

function mapBookingLocation(
  row: WorkerLocationRow,
): WorkerBookingLocation {
  if (!row.booking_id) {
    throw new Error(
      'Worker location record is not associated with a booking.',
    )
  }

  return {
    bookingId:
      row.booking_id,

    latitude:
      Number(
        row.latitude,
      ),

    longitude:
      Number(
        row.longitude,
      ),

    recordedAt:
      row.recorded_at,
  }
}

async function getCurrentWorkerId(): Promise<string> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error) {
    throw error
  }

  if (!user) {
    throw new Error(
      'A worker authentication session is required.',
    )
  }

  return user.id
}

function validateBookingId(
  bookingId: string,
): void {
  if (!bookingId.trim()) {
    throw new Error(
      'Booking id is required.',
    )
  }
}

function validateCoordinates(
  latitude: number,
  longitude: number,
): void {
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    throw new Error(
      'Worker location coordinates are invalid.',
    )
  }

  if (
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    throw new Error(
      'Worker location coordinates are outside the valid range.',
    )
  }
}

export async function recordWorkerBookingLocation(
  bookingId: string,
  latitude: number,
  longitude: number,
): Promise<WorkerBookingLocation> {
  validateBookingId(
    bookingId,
  )

  validateCoordinates(
    latitude,
    longitude,
  )

  const workerId =
    await getCurrentWorkerId()

  const {
    data,
    error,
  } = await supabase.rpc(
    'record_worker_booking_location',
    {
      p_booking_id:
        bookingId,

      p_latitude:
        latitude,

      p_longitude:
        longitude,
    },
  )

  if (error) {
    throw error
  }

  if (!data) {
    throw new Error(
      'Worker booking location could not be recorded.',
    )
  }

  const row =
    data as unknown as WorkerLocationRow

  if (
    row.worker_id &&
    row.worker_id !== workerId
  ) {
    throw new Error(
      'Location record belongs to a different worker account.',
    )
  }

  return mapBookingLocation(
    row,
  )
}

export async function updateWorkerBookingLocation(
  bookingId: string,
  latitude: number,
  longitude: number,
): Promise<WorkerBookingLocation> {
  return recordWorkerBookingLocation(
    bookingId,
    latitude,
    longitude,
  )
}

export async function getWorkerBookingLocations(
  bookingId: string,
  limit = 50,
): Promise<WorkerBookingLocation[]> {
  validateBookingId(
    bookingId,
  )

  const workerId =
    await getCurrentWorkerId()

  const safeLimit =
    Math.max(
      1,
      Math.min(
        Math.trunc(limit),
        200,
      ),
    )

  const {
    data,
    error,
  } = await supabase
    .from('worker_locations')
    .select(
      LOCATION_SELECT,
    )
    .eq('worker_id', workerId)
    .eq(
      'booking_id',
      bookingId,
    )
    .order('recorded_at', {
      ascending: false,
    })
    .limit(safeLimit)

  if (error) {
    throw error
  }

  return (data ?? []).map(
    (row) =>
      mapBookingLocation(
        row as WorkerLocationRow,
      ),
  )
}

export async function getLatestWorkerBookingLocation(
  bookingId: string,
): Promise<WorkerBookingLocation | null> {
  const locations =
    await getWorkerBookingLocations(
      bookingId,
      1,
    )

  return locations[0] ?? null
}

export async function getWorkerBookingLocationHistory(
  bookingId: string,
  limit = 100,
): Promise<WorkerBookingLocation[]> {
  const locations =
    await getWorkerBookingLocations(
      bookingId,
      limit,
    )

  return [
    ...locations,
  ].sort(
    (a, b) =>
      new Date(
        a.recordedAt,
      ).getTime() -
      new Date(
        b.recordedAt,
      ).getTime(),
  )
}

export function hasRecentBookingLocation(
  location: WorkerBookingLocation | null,
  maxAgeSeconds = 90,
  now: Date = new Date(),
): boolean {
  if (!location) {
    return false
  }

  const recordedAt =
    new Date(
      location.recordedAt,
    )

  if (
    Number.isNaN(
      recordedAt.getTime(),
    )
  ) {
    return false
  }

  const ageMs =
    now.getTime() -
    recordedAt.getTime()

  return (
    ageMs >= 0 &&
    ageMs <=
      maxAgeSeconds * 1000
  )
}

export function getWorkerBookingLocationAsWorkerLocation(
  location: WorkerBookingLocation | null,
): WorkerLocation | null {
  if (!location) {
    return null
  }

  return {
    latitude:
      location.latitude,

    longitude:
      location.longitude,

    recordedAt:
      location.recordedAt,
  }
}