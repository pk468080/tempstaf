import { supabase } from '../../lib/supabase'

export type HomePromotion = {
  id: string
  title: string
  subtitle: string | null
  ctaText: string | null
  serviceId: string | null
  imageUrl: string | null
}

export type HomeRebook = {
  serviceId: string
  createdAt: string
  durationValue: number | null
  durationUnit: string | null
  scheduledStart: string | null
}

type PromotionRow = {
  id: string
  title: string
  subtitle: string | null
  cta_text: string | null
  service_id: string | null
  image_url: string | null
  sort_order: number | null
  starts_at: string | null
  ends_at: string | null
}

type RebookRow = {
  service_id: string | null
  created_at: string
  duration_value: number | null
  duration_unit: string | null
  scheduled_start: string | null
}

async function getCurrentCustomerId(): Promise<string | null> {
  const { data, error } = await supabase.auth.getUser()

  if (error || !data.user) {
    return null
  }

  return data.user.id
}

export async function getCustomerFavouriteServiceIds(): Promise<Set<string>> {
  const customerId = await getCurrentCustomerId()

  if (!customerId) {
    return new Set<string>()
  }

  const { data, error } = await supabase
    .from('customer_favourite_services')
    .select('service_id')
    .eq('customer_id', customerId)

  if (error) {
    throw error
  }

  return new Set(
    (data ?? [])
      .map(row => row.service_id)
      .filter(Boolean),
  )
}

export async function setCustomerFavouriteService(
  serviceId: string,
  isFavourite: boolean,
): Promise<void> {
  const customerId = await getCurrentCustomerId()

  if (!customerId) {
    throw new Error('Please sign in to save favourite services.')
  }

  if (isFavourite) {
    const { error } = await supabase
      .from('customer_favourite_services')
      .insert({
        customer_id: customerId,
        service_id: serviceId,
      })

    if (error && error.code !== '23505') {
      throw error
    }

    return
  }

  const { error } = await supabase
    .from('customer_favourite_services')
    .delete()
    .eq('customer_id', customerId)
    .eq('service_id', serviceId)

  if (error) {
    throw error
  }
}

export async function getHomePromotions(
  availableServiceIds: Set<string>,
): Promise<HomePromotion[]> {
  const { data, error } = await supabase
    .from('home_promotions')
    .select(`
      id,
      title,
      subtitle,
      cta_text,
      service_id,
      image_url,
      sort_order,
      starts_at,
      ends_at
    `)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error) {
    throw error
  }

  const now = Date.now()

  return ((data ?? []) as PromotionRow[])
    .filter(promotion => {
      const start = promotion.starts_at
        ? new Date(promotion.starts_at).getTime()
        : Number.NEGATIVE_INFINITY
      const end = promotion.ends_at
        ? new Date(promotion.ends_at).getTime()
        : Number.POSITIVE_INFINITY

      if (!(start <= now && now < end)) {
        return false
      }

      if (promotion.service_id === null) {
        return true
      }

      return availableServiceIds.has(promotion.service_id)
    })
    .map(promotion => ({
      id: promotion.id,
      title: promotion.title,
      subtitle: promotion.subtitle,
      ctaText: promotion.cta_text,
      serviceId: promotion.service_id,
      imageUrl: promotion.image_url,
    }))
}

export async function getCustomerRebookHistory(): Promise<HomeRebook[]> {
  const customerId = await getCurrentCustomerId()

  if (!customerId) {
    return []
  }

  const { data, error } = await supabase
    .from('bookings')
    .select(`
      service_id,
      created_at,
      duration_value,
      duration_unit,
      scheduled_start
    `)
    .eq('customer_id', customerId)
    .eq('status', 'completed')
    .not('service_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) {
    throw error
  }

  const seen = new Set<string>()
  const result: HomeRebook[] = []

  for (const row of (data ?? []) as RebookRow[]) {
    if (!row.service_id || seen.has(row.service_id)) {
      continue
    }

    seen.add(row.service_id)
    result.push({
      serviceId: row.service_id,
      createdAt: row.created_at,
      durationValue: row.duration_value,
      durationUnit: row.duration_unit,
      scheduledStart: row.scheduled_start,
    })
  }

  return result
}
