import { supabase } from '../../lib/supabase'
import type { AvailabilityResult } from '../../types/availability'

type InstantAvailabilityRpcResult = {
  service_area_available?: boolean
  nearby_worker_available?: boolean
  instant_available?: boolean
  nearby_worker_count?: number
  nearest_worker_id?: string | null
  nearest_worker_distance_km?: number | string | null
}

export async function checkInstantAvailability(
  serviceId: string,
  latitude: number,
  longitude: number,
): Promise<AvailabilityResult> {
  const checkedAt = new Date().toISOString()

  if (
    !serviceId ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return {
      serviceAreaAvailable: false,
      nearbyWorkerAvailable: false,
      instantAvailable: false,
      recommendedBookingType: 'scheduled',
      nearbyWorkerCount: 0,
      nearestWorkerId: null,
      nearestWorkerDistanceKm: null,
      checkedAt,
      errorMessage: 'A valid service and location are required.',
    }
  }

  const { data, error } = await supabase.rpc(
    'check_customer_instant_worker_availability',
    {
      p_service_id: serviceId,
      p_latitude: latitude,
      p_longitude: longitude,
    },
  )

  if (error) {
    throw error
  }

  const result = (data ?? null) as
    | InstantAvailabilityRpcResult
    | null

  if (!result) {
    throw new Error(
      'The backend did not return instant availability.',
    )
  }

  const serviceAreaAvailable =
    result.service_area_available === true

  const nearbyWorkerCount = Number(
    result.nearby_worker_count ?? 0,
  )

  const nearbyWorkerAvailable =
    result.nearby_worker_available === true ||
    nearbyWorkerCount > 0

  const instantAvailable =
    result.instant_available === true &&
    serviceAreaAvailable &&
    nearbyWorkerAvailable

  const nearestWorkerDistanceValue =
    result.nearest_worker_distance_km

  const nearestWorkerDistanceKm =
    nearestWorkerDistanceValue == null
      ? null
      : Number(nearestWorkerDistanceValue)

  return {
    serviceAreaAvailable,
    nearbyWorkerAvailable,
    instantAvailable,
    recommendedBookingType:
      instantAvailable
        ? 'instant'
        : 'scheduled',
    nearbyWorkerCount:
      Number.isFinite(nearbyWorkerCount)
        ? nearbyWorkerCount
        : 0,
    nearestWorkerId:
      result.nearest_worker_id ?? null,
    nearestWorkerDistanceKm:
      nearestWorkerDistanceKm !== null &&
      Number.isFinite(nearestWorkerDistanceKm)
        ? nearestWorkerDistanceKm
        : null,
    checkedAt,
  }
}