import { supabase } from '../../lib/supabase'
import type { HomeService } from '../../types/service'

type ServiceRow = {
  id: string
  name: string
  description: string | null
}

export async function getHomeServices(): Promise<HomeService[]> {
  const { data, error } = await supabase
    .from('services')
    .select('id,name,description')
    .eq('is_active', true)
    .order('name', { ascending: true })

  if (error) {
    throw error
  }

  return ((data ?? []) as ServiceRow[]).map(
    (service) => ({
      id: service.id,
      name: service.name,
      description: service.description,
      hourlyPrice: 0,
      currency: '',
    }),
  )
}