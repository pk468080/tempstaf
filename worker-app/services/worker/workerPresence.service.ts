import { supabase } from '../../lib/supabase'

import type {
  WorkerLocation,
  WorkerPresence,
  WorkerStatus,
} from '../../types/worker'

type PresenceRow = {
  worker_id: string
  is_available: boolean
  last_seen_at: string | null
  expires_at: string | null
}

type LocationRow = {
  latitude: number
  longitude: number
  recorded_at: string
}

type PresenceRpcResult = {
  success?: boolean
  worker_id?: string
  is_available?: boolean
  expires_at?: string | null
  recorded_at?: string
  latitude?: number
  longitude?: number
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

function mapPresence(
  row: PresenceRow,
  location: LocationRow | null,
): WorkerPresence {
  let status: WorkerStatus = 'offline'

  if (row.is_available) {
    status = 'available'
  }

  return {
    workerId: row.worker_id,
    status,

    latitude:
      location?.latitude ?? null,

    longitude:
      location?.longitude ?? null,

    lastHeartbeatAt:
      row.last_seen_at,

    presenceExpiresAt:
      row.expires_at,
  }
}

async function getLatestWorkerLocation(
  workerId: string,
): Promise<LocationRow | null> {
  const {
    data,
    error,
  } = await supabase
    .from('worker_locations')
    .select(
      'latitude, longitude, recorded_at',
    )
    .eq('worker_id', workerId)
    .is('booking_id', null)
    .order('recorded_at', {
      ascending: false,
    })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data
    ? {
        latitude: Number(
          data.latitude,
        ),
        longitude: Number(
          data.longitude,
        ),
        recorded_at:
          data.recorded_at,
      }
    : null
}

export async function getWorkerPresence(): Promise<
  WorkerPresence | null
> {
  const workerId =
    await getCurrentWorkerId()

  const {
    data,
    error,
  } = await supabase
    .from('worker_presence')
    .select(
      'worker_id, is_available, last_seen_at, expires_at',
    )
    .eq('worker_id', workerId)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    return null
  }

  const latestLocation =
    await getLatestWorkerLocation(
      workerId,
    )

  return mapPresence(
    data,
    latestLocation,
  )
}

export async function setWorkerPresence(
  available: boolean,
): Promise<WorkerPresence> {
  const workerId =
    await getCurrentWorkerId()

  const {
    data,
    error,
  } = await supabase.rpc(
    'worker_set_presence',
    {
      p_available: available,
    },
  )

  if (error) {
    throw error
  }

  const result =
    (data ?? {}) as PresenceRpcResult

  if (result.success !== true) {
    throw new Error(
      'Worker presence could not be updated.',
    )
  }

  if (
    result.worker_id &&
    result.worker_id !== workerId
  ) {
    throw new Error(
      'Presence update belongs to a different worker account.',
    )
  }

  const presence =
    await getWorkerPresence()

  if (!presence) {
    throw new Error(
      'Worker presence could not be loaded after updating.',
    )
  }

  return presence
}

export async function goOnline(): Promise<WorkerPresence> {
  return setWorkerPresence(true)
}

export async function goOffline(): Promise<WorkerPresence> {
  return setWorkerPresence(false)
}

export async function sendWorkerPresenceHeartbeat(
  latitude: number,
  longitude: number,
): Promise<WorkerPresence> {
  const workerId =
    await getCurrentWorkerId()

  validateCoordinates(
    latitude,
    longitude,
  )

  const {
    data,
    error,
  } = await supabase.rpc(
    'worker_presence_heartbeat',
    {
      p_latitude: latitude,
      p_longitude: longitude,
    },
  )

  if (error) {
    throw error
  }

  const result =
    (data ?? {}) as PresenceRpcResult

  if (result.success !== true) {
    throw new Error(
      'Worker presence heartbeat failed.',
    )
  }

  if (
    result.worker_id &&
    result.worker_id !== workerId
  ) {
    throw new Error(
      'Presence heartbeat belongs to a different worker account.',
    )
  }

  const presence =
    await getWorkerPresence()

  if (!presence) {
    throw new Error(
      'Worker presence could not be loaded after heartbeat.',
    )
  }

  return presence
}

export async function updateWorkerLocation(
  latitude: number,
  longitude: number,
  bookingId: string | null = null,
): Promise<WorkerLocation> {
  validateCoordinates(
    latitude,
    longitude,
  )

  const {
    data,
    error,
  } = await supabase.rpc(
    'worker_update_location',
    {
      p_latitude: latitude,
      p_longitude: longitude,
      p_booking_id: bookingId,
    },
  )

  if (error) {
    throw error
  }

  const result =
    (data ?? {}) as PresenceRpcResult

  if (result.success !== true) {
    throw new Error(
      'Worker location could not be updated.',
    )
  }

  if (
    typeof result.latitude !== 'number' ||
    typeof result.longitude !== 'number' ||
    !result.recorded_at
  ) {
    throw new Error(
      'Worker location update returned invalid data.',
    )
  }

  return {
    latitude:
      result.latitude,

    longitude:
      result.longitude,

    recordedAt:
      result.recorded_at,
  }
}

export async function getLatestLocation(): Promise<
  WorkerLocation | null
> {
  const workerId =
    await getCurrentWorkerId()

  const location =
    await getLatestWorkerLocation(
      workerId,
    )

  if (!location) {
    return null
  }

  return {
    latitude:
      location.latitude,

    longitude:
      location.longitude,

    recordedAt:
      location.recorded_at,
  }
}

export function isPresenceExpired(
  presence: WorkerPresence | null,
  now: Date = new Date(),
): boolean {
  if (!presence?.presenceExpiresAt) {
    return true
  }

  const expiresAt =
    new Date(
      presence.presenceExpiresAt,
    )

  if (
    Number.isNaN(
      expiresAt.getTime(),
    )
  ) {
    return true
  }

  return (
    expiresAt.getTime() <=
    now.getTime()
  )
}

export function isPresenceActive(
  presence: WorkerPresence | null,
  now: Date = new Date(),
): boolean {
  return (
    presence?.status === 'available' &&
    !isPresenceExpired(
      presence,
      now,
    )
  )
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