import { supabase } from '../lib/supabase'

export type AppWorker = {
  id: string
  name: string
  service: string
  rating: number
  completedJobs: number
  verified: boolean
  avatarUrl: string | null
}

type ServiceRow = {
  id: string
  name: string
  description: string | null
  is_active: boolean
}

type WorkerServiceRow = {
  worker_id: string
  service_id: string
}

type WorkerProfileRow = {
  id: string
  worker_status: string
  rating: number
  total_completed_jobs: number
  is_verified: boolean
}

type ProfileRow = {
  id: string
  full_name: string | null
  avatar_url: string | null
  is_active: boolean
}

type AvailabilityRow = {
  worker_id: string
  available_from: string
  available_until: string
  is_available: boolean
}

/**
 * Get verified and currently available workers
 * connected to a specific service.
 */
export async function getWorkersByService(
  serviceName: string
): Promise<AppWorker[]> {
  if (!serviceName?.trim()) {
    return []
  }

  const requestedService = serviceName.trim()

  console.log(
    '[TempStaff] Searching workers for service:',
    requestedService
  )

  /**
   * 1. Find the service itself.
   *
   * We deliberately query the services table first instead
   * of depending on Supabase's nested relationship response.
   */
  const {
    data: services,
    error: serviceError,
  } = await supabase
    .from('services')
    .select(`
      id,
      name,
      description,
      is_active
    `)
    .ilike('name', requestedService)
    .eq('is_active', true)

  if (serviceError) {
    console.error(
      '[TempStaff] Failed to load service:',
      serviceError
    )

    throw serviceError
  }

  if (!services || services.length === 0) {
    console.warn(
      `[TempStaff] Service "${requestedService}" was not found in database.`
    )

    return []
  }

  const service: ServiceRow = services[0]

  console.log(
    '[TempStaff] Service found:',
    service.id,
    service.name
  )

  /**
   * 2. Find workers connected to this service.
   */
  const {
    data: workerServices,
    error: workerServicesError,
  } = await supabase
    .from('worker_services')
    .select(`
      worker_id,
      service_id
    `)
    .eq('service_id', service.id)

  if (workerServicesError) {
    console.error(
      '[TempStaff] Failed to load worker services:',
      workerServicesError
    )

    throw workerServicesError
  }

  if (!workerServices || workerServices.length === 0) {
    console.log(
      '[TempStaff] No workers are connected to this service.'
    )

    return []
  }

  const rows = workerServices as WorkerServiceRow[]

  const workerIds = [
    ...new Set(
      rows.map(row => row.worker_id)
    ),
  ]

  if (workerIds.length === 0) {
    return []
  }

  console.log(
    '[TempStaff] Matching worker IDs:',
    workerIds
  )

  /**
   * 3. Load worker profiles.
   *
   * Only active/usable worker profiles will eventually
   * be returned.
   */
  const {
    data: workerProfiles,
    error: workerProfilesError,
  } = await supabase
    .from('worker_profiles')
    .select(`
      id,
      worker_status,
      rating,
      total_completed_jobs,
      is_verified
    `)
    .in('id', workerIds)
    .eq('worker_status', 'available')
    .eq('is_verified', true)

  if (workerProfilesError) {
    console.error(
      '[TempStaff] Failed to load worker profiles:',
      workerProfilesError
    )

    throw workerProfilesError
  }

  if (!workerProfiles || workerProfiles.length === 0) {
    console.log(
      '[TempStaff] No verified available worker profiles found.'
    )

    return []
  }

  const workerProfileRows =
    workerProfiles as WorkerProfileRow[]

  /**
   * 4. Load customer-facing profiles.
   */
  const {
    data: profiles,
    error: profilesError,
  } = await supabase
    .from('profiles')
    .select(`
      id,
      full_name,
      avatar_url,
      is_active
    `)
    .in('id', workerIds)
    .eq('is_active', true)

  if (profilesError) {
    console.error(
      '[TempStaff] Failed to load profiles:',
      profilesError
    )

    throw profilesError
  }

  if (!profiles || profiles.length === 0) {
    console.log(
      '[TempStaff] No active public profiles found.'
    )

    return []
  }

  const profileRows = profiles as ProfileRow[]

  /**
   * 5. Load worker availability.
   *
   * This makes sure we don't show a worker who has
   * been marked unavailable.
   */
  const now = new Date().toISOString()

  const {
    data: availability,
    error: availabilityError,
  } = await supabase
    .from('worker_availability')
    .select(`
      worker_id,
      available_from,
      available_until,
      is_available
    `)
    .in('worker_id', workerIds)
    .eq('is_available', true)
    .lte('available_from', now)
    .gte('available_until', now)

  if (availabilityError) {
    console.error(
      '[TempStaff] Failed to load worker availability:',
      availabilityError
    )

    throw availabilityError
  }

  const availabilityRows =
    (availability || []) as AvailabilityRow[]

  /**
   * 6. Build lookup maps.
   */
  const profileMap = new Map<string, ProfileRow>()

  for (const profile of profileRows) {
    profileMap.set(profile.id, profile)
  }

  const workerProfileMap =
    new Map<string, WorkerProfileRow>()

  for (const worker of workerProfileRows) {
    workerProfileMap.set(worker.id, worker)
  }

  const availabilityMap =
    new Map<string, AvailabilityRow>()

  for (const item of availabilityRows) {
    availabilityMap.set(item.worker_id, item)
  }

  /**
   * 7. Build the final application workers.
   */
  const result: AppWorker[] = []

  for (const row of rows) {
    const profile = profileMap.get(row.worker_id)

    const workerProfile =
      workerProfileMap.get(row.worker_id)

    const workerAvailability =
      availabilityMap.get(row.worker_id)

    /**
     * Worker must have:
     *
     * - active profile
     * - available worker profile
     * - verified status
     * - current availability
     */
    if (!profile) {
      continue
    }

    if (!workerProfile) {
      continue
    }

    if (!workerAvailability) {
      continue
    }

    result.push({
      id: row.worker_id,

      name:
        profile.full_name ||
        'TempStaff Worker',

      service: service.name,

      rating: Number(
        workerProfile.rating || 0
      ),

      completedJobs: Number(
        workerProfile.total_completed_jobs || 0
      ),

      verified:
        Boolean(workerProfile.is_verified),

      avatarUrl:
        profile.avatar_url ?? null,
    })
  }

  console.log(
    `[TempStaff] ${result.length} matching workers found.`
  )

  return result
}