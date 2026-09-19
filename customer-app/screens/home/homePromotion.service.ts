import { supabase } from '../../lib/supabase'

export type HomePromotion = {
  id: string
  title: string
  subtitle: string | null
  ctaText: string | null
  serviceId: string | null
  imageUrl: string | null
  sortOrder: number
}

type HomePromotionRow = {
  id: string
  title: string
  subtitle: string | null
  cta_text: string | null
  service_id: string | null
  image_url: string | null
  sort_order: number
}

export async function getHomePromotions(): Promise<
  HomePromotion[]
> {
  const {
    data,
    error,
  } = await supabase
    .from('home_promotions')
    .select(
      `
        id,
        title,
        subtitle,
        cta_text,
        service_id,
        image_url,
        sort_order
      `,
    )
    .eq('is_active', true)
    .order('sort_order', {
      ascending: true,
    })

  if (error) {
    throw error
  }

  const rows =
    (data ?? []) as HomePromotionRow[]

  return rows.map(row => ({
    id: row.id,
    title: row.title,
    subtitle: row.subtitle,
    ctaText: row.cta_text,
    serviceId: row.service_id,
    imageUrl: row.image_url,
    sortOrder: row.sort_order,
  }))
}