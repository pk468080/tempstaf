import { supabase } from '../../lib/supabase'

export type ServiceArea = {
  id: string
  serviceId: string | null
  name: string
  city: string | null
  state: string | null
  centerLatitude: number
  centerLongitude: number
  radiusKm: number
}

type ServiceAreaRow = {
  id: string
  service_id: string | null
  name: string
  city: string | null
  state: string | null
  center_latitude: number | string
  center_longitude: number | string
  radius_km: number | string
}

export async function getActiveServiceAreas(): Promise<
  ServiceArea[]
> {
  const { data, error } = await supabase
    .from('service_areas')
    .select(
      'id,service_id,name,city,state,center_latitude,center_longitude,radius_km',
    )
    .eq('is_active', true)

  if (error) {
    throw error
  }

  return ((data ?? []) as ServiceAreaRow[]).map(
    area => ({
      id: area.id,
      serviceId: area.service_id,
      name: area.name,
      city: area.city,
      state: area.state,
      centerLatitude: Number(
        area.center_latitude,
      ),
      centerLongitude: Number(
        area.center_longitude,
      ),
      radiusKm: Number(area.radius_km),
    }),
  )
}

export async function getAvailableServiceIds(
  latitude: number,
  longitude: number,
  serviceIds: string[] = [],
): Promise<Set<string>> {
  if (
    !Number.isFinite(latitude) ||
    latitude < -90 ||
    latitude > 90 ||
    !Number.isFinite(longitude) ||
    longitude < -180 ||
    longitude > 180
  ) {
    return new Set<string>()
  }

  const areas =
    await getActiveServiceAreas()

  const availableServiceIds =
    new Set<string>()

  const requestedIds =
    new Set(serviceIds)

  for (const area of areas) {
    if (
      !Number.isFinite(
        area.centerLatitude,
      ) ||
      !Number.isFinite(
        area.centerLongitude,
      ) ||
      !Number.isFinite(area.radiusKm) ||
      area.radiusKm <= 0
    ) {
      continue
    }

    const distanceKm =
      calculateDistanceKm(
        latitude,
        longitude,
        area.centerLatitude,
        area.centerLongitude,
      )

    if (distanceKm > area.radiusKm) {
      continue
    }

    if (area.serviceId === null) {
      if (requestedIds.size > 0) {
        requestedIds.forEach(
          serviceId =>
            availableServiceIds.add(
              serviceId,
            ),
        )
      }

      continue
    }

    if (
      requestedIds.size === 0 ||
      requestedIds.has(area.serviceId)
    ) {
      availableServiceIds.add(
        area.serviceId,
      )
    }
  }

  return availableServiceIds
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
