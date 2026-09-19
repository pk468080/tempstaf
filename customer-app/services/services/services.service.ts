import { supabase } from '../../lib/supabase'
import type { HomeService } from '../../types/service'

type ServiceVariantPriceRow = {
  price: number | string
  currency: string
  service_variant_id: string
}

type ServiceVariantRow = {
  id: string
  service_id: string
  billing_type: string
  is_active: boolean
  service_variant_prices: ServiceVariantPriceRow[]
}

type ServiceRow = {
  id: string
  name: string
  description: string | null
  service_variants: ServiceVariantRow[]
}

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
        service_variant_prices (
          service_variant_id,
          price,
          currency
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
    .order('name', { ascending: true })

  if (error) {
    throw error
  }

  const rows = (data ?? []) as unknown as ServiceRow[]

  const services: HomeService[] = []

  for (const service of rows) {
    const variant = service.service_variants?.[0]

    if (!variant) {
      continue
    }

    const price = variant.service_variant_prices?.[0]

    services.push({
      id: service.id,
      name: service.name,
      description: service.description,
      hourlyPrice: price
        ? Number(price.price)
        : null,
      currency: price?.currency ?? null,
    })
  }

  return services
}