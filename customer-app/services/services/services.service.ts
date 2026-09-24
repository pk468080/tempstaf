import { supabase } from '../../lib/supabase'
import type { HomeService } from '../../types/service'

type ServiceVariantPriceRow = {
  id: string
  price: number | string
  currency: string
  effective_from: string | null
  effective_to: string | null
  is_active: boolean
}

type ServiceVariantRow = {
  id: string
  service_id: string
  billing_type: string
  is_active: boolean
  sort_order: number
  service_variant_prices: ServiceVariantPriceRow[]
}

type ServiceRow = {
  id: string
  name: string
  description: string | null
  image_url: string | null
  display_order: number | null
  is_featured: boolean | null
  service_variants: ServiceVariantRow[]
}

type ServiceAreaRow = {
  service_id: string | null
  center_latitude: number | string
  center_longitude: number | string
  radius_km: number | string
}

export async function getHomeServices(): Promise<HomeService[]> {
  const { data, error } = await supabase
    .from('services')
    .select(`
      id,
      name,
      description,
      image_url,
      display_order,
      is_featured,
      service_variants (
        id,
        service_id,
        billing_type,
        is_active,
        sort_order,
        service_variant_prices (
          id,
          price,
          currency,
          effective_from,
          effective_to,
          is_active
        )
      )
    `)
    .eq('is_active', true)
    .eq('service_variants.is_active', true)
    .eq('service_variants.billing_type', 'hourly')
    .eq(
      'service_variants.service_variant_prices.is_active',
      true,
    )
    .order('display_order', {
      ascending: true,
    })
    .order('name', {
      ascending: true,
    })

  if (error) {
    throw error
  }

  const rows =
    (data ?? []) as unknown as ServiceRow[]

  const now = Date.now()

  const services: HomeService[] = []

  for (const service of rows) {
    const hourlyVariants =
      service.service_variants
        ?.filter(
          variant =>
            variant.is_active &&
            variant.billing_type === 'hourly',
        )
        .sort(
          (a, b) =>
            a.sort_order -
            b.sort_order,
        ) ?? []

    if (hourlyVariants.length === 0) {
      continue
    }

    const variant =
      hourlyVariants[0]

    const activePrices =
      variant.service_variant_prices
        ?.filter(price => {
          if (!price.is_active) {
            return false
          }

          const effectiveFrom =
            price.effective_from
              ? new Date(
                  price.effective_from,
                ).getTime()
              : Number.NEGATIVE_INFINITY

          const effectiveTo =
            price.effective_to
              ? new Date(
                  price.effective_to,
                ).getTime()
              : Number.POSITIVE_INFINITY

          return (
            effectiveFrom <= now &&
            now < effectiveTo
          )
        })
        .sort((a, b) => {
          const aTime =
            a.effective_from
              ? new Date(
                  a.effective_from,
                ).getTime()
              : Number.NEGATIVE_INFINITY

          const bTime =
            b.effective_from
              ? new Date(
                  b.effective_from,
                ).getTime()
              : Number.NEGATIVE_INFINITY

          return bTime - aTime
        }) ?? []

    const price =
      activePrices[0]

    if (!price) {
      continue
    }

    const hourlyPrice =
      Number(price.price)

    if (
      !Number.isFinite(hourlyPrice) ||
      hourlyPrice < 0
    ) {
      continue
    }

    services.push({
      id: service.id,
      serviceVariantId: variant.id,
      name: service.name,
      description:
        service.description,
      hourlyPrice,
      currency:
        price.currency ?? null,
      imageUrl:
        service.image_url ?? null,
      displayOrder:
        Number(service.display_order ?? 0),
      isFeatured:
        service.is_featured === true,
    })
  }

  return services.sort((a, b) => {
    if (a.isFeatured !== b.isFeatured) {
      return a.isFeatured ? -1 : 1
    }

    if (a.displayOrder !== b.displayOrder) {
      return a.displayOrder - b.displayOrder
    }

    return a.name.localeCompare(b.name)
  })
}

export async function getHomeServicesForLocation(
  latitude: number,
  longitude: number,
): Promise<HomeService[]> {
  if (
    !Number.isFinite(latitude) ||
    latitude < -90 ||
    latitude > 90 ||
    !Number.isFinite(longitude) ||
    longitude < -180 ||
    longitude > 180
  ) {
    return []
  }

  const [
    services,
    serviceAreasResult,
  ] = await Promise.all([
    getHomeServices(),
    supabase
      .from('service_areas')
      .select(
        'service_id,center_latitude,center_longitude,radius_km',
      )
      .eq('is_active', true),
  ])

  if (serviceAreasResult.error) {
    throw serviceAreasResult.error
  }

  const availableServiceIds =
    new Set<string>()

  const areas =
    (serviceAreasResult.data ??
      []) as ServiceAreaRow[]

  for (const area of areas) {
    const centerLatitude =
      Number(area.center_latitude)
    const centerLongitude =
      Number(area.center_longitude)
    const radiusKm =
      Number(area.radius_km)

    if (
      !Number.isFinite(centerLatitude) ||
      !Number.isFinite(centerLongitude) ||
      !Number.isFinite(radiusKm) ||
      radiusKm <= 0
    ) {
      continue
    }

    const distanceKm =
      calculateDistanceKm(
        latitude,
        longitude,
        centerLatitude,
        centerLongitude,
      )

    if (distanceKm <= radiusKm) {
      if (area.service_id === null) {
        for (const service of services) {
          availableServiceIds.add(service.id)
        }
      } else {
        availableServiceIds.add(
          area.service_id,
        )
      }
    }
  }

  return services.filter(service =>
    availableServiceIds.has(service.id),
  )
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
