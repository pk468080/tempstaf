import { supabase } from '../../lib/supabase'

import type {
  WorkerProfile,
} from '../../types/worker'

type ProfileRow = {
  id: string
  full_name: string | null
  phone: string | null
  email: string | null
  role: string
  is_active: boolean
}

type WorkerProfileRow = {
  id: string
  worker_status: WorkerProfile['workerStatus']
  service_radius_km: number
  current_location: unknown
  is_verified: boolean
  rating: number
  total_completed_jobs: number
  is_featured: boolean
  created_at: string
  updated_at: string
}

type WorkerLocationRow = {
  latitude: number
  longitude: number
  recorded_at: string
}

export type UpdateWorkerProfileInput = {
  fullName?: string | null
  phone?: string | null
}

const MAX_NAME_LENGTH = 100

function normalizePhone(
  phone: string,
): string {
  return phone.replace(
    /\D/g,
    '',
  )
}

function normalizeOptionalText(
  value: string | null | undefined,
): string | null {
  if (
    value === null ||
    value === undefined
  ) {
    return null
  }

  const trimmed =
    value.trim()

  return trimmed.length > 0
    ? trimmed
    : null
}

function isValidPhone(
  phone: string,
): boolean {
  const normalized =
    normalizePhone(phone)

  return (
    normalized.length >= 10 &&
    normalized.length <= 15
  )
}

function parseWorkerLocation(
  value: unknown,
  recordedAt: string,
): WorkerProfile['currentLocation'] {
  if (!value) {
    return null
  }

  if (
    typeof value === 'object' &&
    value !== null &&
    'coordinates' in value
  ) {
    const coordinates = (
      value as {
        coordinates?: unknown
      }
    ).coordinates

    if (
      Array.isArray(
        coordinates,
      ) &&
      typeof coordinates[0] ===
        'number' &&
      typeof coordinates[1] ===
        'number'
    ) {
      return {
        longitude:
          coordinates[0],
        latitude:
          coordinates[1],
        recordedAt,
      }
    }
  }

  return null
}

function mapWorkerProfile(
  profile: ProfileRow,
  workerProfile: WorkerProfileRow,
  latestLocation: WorkerLocationRow | null,
): WorkerProfile {
  const currentLocation =
    latestLocation
      ? {
          latitude:
            Number(
              latestLocation.latitude,
            ),

          longitude:
            Number(
              latestLocation.longitude,
            ),

          recordedAt:
            latestLocation.recorded_at,
        }
      : parseWorkerLocation(
          workerProfile.current_location,
          workerProfile.updated_at,
        )

  return {
    id: profile.id,

    fullName:
      profile.full_name,

    email:
      profile.email,

    phone:
      profile.phone,

    isActive:
      profile.is_active,

    workerStatus:
      workerProfile.worker_status,

    isVerified:
      workerProfile.is_verified,

    isFeatured:
      workerProfile.is_featured,

    rating:
      Number(
        workerProfile.rating ??
          0,
      ),

    totalCompletedJobs:
      Number(
        workerProfile.total_completed_jobs ??
          0,
      ),

    serviceRadiusKm:
      Number(
        workerProfile.service_radius_km ??
          0,
      ),

    currentLocation,

    createdAt:
      workerProfile.created_at,

    updatedAt:
      workerProfile.updated_at,
  }
}

async function getCurrentWorkerId(): Promise<string> {
  const {
    data: { user },
    error,
  } =
    await supabase.auth.getUser()

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

async function fetchLatestWorkerLocation(
  workerId: string,
): Promise<WorkerLocationRow | null> {
  const {
  data,
  error,
} = await supabase
  .from('worker_locations')
  .select(
    'latitude, longitude, recorded_at',
  )
  .eq(
    'worker_id',
    workerId,
  )
  .is(
    'booking_id',
    null,
  )
  .order(
    'recorded_at',
    {
      ascending: false,
    },
  )
    .limit(1)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    return null
  }

  return {
    latitude:
      Number(
        data.latitude,
      ),

    longitude:
      Number(
        data.longitude,
      ),

    recorded_at:
      data.recorded_at,
  }
}

async function fetchWorkerProfile(
  workerId: string,
): Promise<WorkerProfile | null> {
  const {
    data: profile,
    error: profileError,
  } =
    await supabase
      .from('profiles')
      .select(
        'id, full_name, phone, email, role, is_active',
      )
      .eq(
        'id',
        workerId,
      )
      .maybeSingle()

  if (profileError) {
    throw profileError
  }

  if (!profile) {
    return null
  }

  if (
    profile.role !==
    'worker'
  ) {
    throw new Error(
      'The authenticated account is not a worker account.',
    )
  }

  if (
    !profile.is_active
  ) {
    throw new Error(
      'The worker account is inactive.',
    )
  }

  const {
    data: workerProfile,
    error:
      workerProfileError,
  } =
    await supabase
      .from(
        'worker_profiles',
      )
      .select(
        'id, worker_status, service_radius_km, current_location, is_verified, rating, total_completed_jobs, is_featured, created_at, updated_at',
      )
      .eq(
        'id',
        workerId,
      )
      .maybeSingle()

  if (
    workerProfileError
  ) {
    throw workerProfileError
  }

  if (!workerProfile) {
    return null
  }

  const latestLocation =
    await fetchLatestWorkerLocation(
      workerId,
    )

  return mapWorkerProfile(
    profile,
    workerProfile,
    latestLocation,
  )
}

export async function getWorkerProfile(): Promise<
  WorkerProfile | null
> {
  const workerId =
    await getCurrentWorkerId()

  return fetchWorkerProfile(
    workerId,
  )
}

export async function updateWorkerProfile(
  input: UpdateWorkerProfileInput,
): Promise<WorkerProfile> {
  const workerId =
    await getCurrentWorkerId()

  const updates: {
    full_name?: string | null
    phone?: string | null
  } = {}

  if (
    input.fullName !==
    undefined
  ) {
    const fullName =
      normalizeOptionalText(
        input.fullName,
      )

    if (!fullName) {
      throw new Error(
        'Full name is required.',
      )
    }

    if (
      fullName.length >
      MAX_NAME_LENGTH
    ) {
      throw new Error(
        `Name must be ${MAX_NAME_LENGTH} characters or fewer.`,
      )
    }

    updates.full_name =
      fullName
  }

  if (
    input.phone !==
    undefined
  ) {
    const phone =
      normalizePhone(
        input.phone ??
          '',
      )

    if (
      !isValidPhone(
        phone,
      )
    ) {
      throw new Error(
        'Please enter a valid mobile number.',
      )
    }

    updates.phone =
      phone
  }

  if (
    Object.keys(
      updates,
    ).length === 0
  ) {
    const existing =
      await getWorkerProfile()

    if (!existing) {
      throw new Error(
        'Worker profile not found.',
      )
    }

    return existing
  }

  const {
    error,
  } = await supabase
    .from('profiles')
    .update(
      updates,
    )
    .eq(
      'id',
      workerId,
    )

  if (error) {
    throw error
  }

  const updated =
    await getWorkerProfile()

  if (!updated) {
    throw new Error(
      'Worker profile could not be loaded after updating.',
    )
  }

  return updated
}

export async function updateWorkerName(
  fullName: string,
): Promise<WorkerProfile> {
  return updateWorkerProfile({
    fullName,
  })
}

export async function updateWorkerPhone(
  phone: string,
): Promise<WorkerProfile> {
  return updateWorkerProfile({
    phone,
  })
}