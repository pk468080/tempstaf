import { supabase } from '../../lib/supabase'
import { getAvailableServiceIds } from './availability.service'
import type { AvailabilityResult } from '../../types/availability'

type WorkerRow = {
  worker_id: string
  worker_profile:
    | {
        worker_status:
          | 'offline'
          | 'available'
          | 'busy'
          | 'suspended'
        service_radius_km: number | string | null
        current_location: unknown
      }
    | null
}

type Point = {
  latitude: number
  longitude: number
}

export async function checkInstantAvailability(
  serviceId: string,
  latitude: number,
  longitude: number,
): Promise<AvailabilityResult> {
  const checkedAt = new Date().toISOString()

  const availableServiceIds =
    await getAvailableServiceIds(
      latitude,
      longitude,
    )

  const serviceAreaAvailable =
    availableServiceIds.has(serviceId)

  if (!serviceAreaAvailable) {
    return {
      serviceAreaAvailable: false,
      nearbyWorkerAvailable: false,
      instantAvailable: false,
      recommendedBookingType: 'scheduled',
      nearbyWorkerCount: 0,
      checkedAt,
    }
  }

  const { data, error } = await supabase
    .from('worker_services')
    .select(`
      worker_id,
      worker_profile:worker_profiles!inner (
        worker_status,
        service_radius_km,
        current_location
      )
    `)
    .eq('service_id', serviceId)
    .in('worker_profile.worker_status', [
      'available',
      'busy',
    ])

  if (error) {
    throw error
  }

  const workers =
    (data ?? []) as unknown as WorkerRow[]

  let nearbyWorkerCount = 0

  for (const row of workers) {
    const profile = row.worker_profile

    if (!profile) {
      continue
    }

    const point = parsePoint(
      profile.current_location,
    )

    const radiusKm = Number(
      profile.service_radius_km,
    )

    if (
      !point ||
      !Number.isFinite(radiusKm) ||
      radiusKm <= 0
    ) {
      continue
    }

    const distanceKm = calculateDistanceKm(
      latitude,
      longitude,
      point.latitude,
      point.longitude,
    )

    if (distanceKm <= radiusKm) {
      nearbyWorkerCount += 1
    }
  }

  const instantAvailable =
    nearbyWorkerCount > 0

  return {
    serviceAreaAvailable: true,
    nearbyWorkerAvailable: instantAvailable,
    instantAvailable,
    recommendedBookingType:
      instantAvailable
        ? 'instant'
        : 'scheduled',
    nearbyWorkerCount,
    checkedAt,
  }
}

function parsePoint(
  value: unknown,
): Point | null {
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
      Array.isArray(coordinates) &&
      coordinates.length >= 2
    ) {
      const longitude = Number(
        coordinates[0],
      )

      const latitude = Number(
        coordinates[1],
      )

      if (
        Number.isFinite(latitude) &&
        Number.isFinite(longitude)
      ) {
        return {
          latitude,
          longitude,
        }
      }
    }
  }

  if (typeof value === 'string') {
    const match = value.match(
      /POINT\s*\(\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s*\)/i,
    )

    if (match) {
      const longitude = Number(match[1])
      const latitude = Number(match[2])

      if (
        Number.isFinite(latitude) &&
        Number.isFinite(longitude)
      ) {
        return {
          latitude,
          longitude,
        }
      }
    }
  }

  return null
}

function calculateDistanceKm(
  latitude1: number,
  longitude1: number,
  latitude2: number,
  longitude2: number,
): number {
  const earthRadiusKm = 6371

  const latitudeDelta =
    toRadians(latitude2 - latitude1)

  const longitudeDelta =
    toRadians(longitude2 - longitude1)

  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(toRadians(latitude1)) *
      Math.cos(toRadians(latitude2)) *
      Math.sin(longitudeDelta / 2) ** 2

  return (
    2 *
    earthRadiusKm *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a),
    )
  )
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180
}