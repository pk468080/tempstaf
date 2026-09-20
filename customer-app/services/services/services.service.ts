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
  service_variants: ServiceVariantRow[]
}

/**
 * Returns the services that can be presented on the customer Home screen.
 *
 * Home is a discovery/selection layer.
 * It does NOT perform the authoritative booking availability check.
 *
 * Final service-area, worker-availability and booking validation
 * happens later in the booking flow/backend.
 */
export async function getHomeServices(): Promise<HomeService[]> {
  const { data, error } = await supabase
    .from('services')
    .select(`
      id,
      name,
      description,
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

    /*
     * Do not expose a service on Home when it has
     * no currently effective hourly customer price.
     */
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
    })
  }

  return services
}