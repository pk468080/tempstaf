import { supabase } from '../lib/supabase'

export type ServiceAvailability = {
  available: boolean
  available_workers: number
}

export async function checkServiceAvailability(
  serviceId: string,
  latitude: number,
  longitude: number
): Promise<ServiceAvailability> {
  const { data, error } = await supabase.rpc(
    'check_service_availability',
    {
      p_service_id: serviceId,
      p_customer_latitude: latitude,
      p_customer_longitude: longitude,
    }
  )

  if (error) {
    console.error(
      '[TempStaff] Service availability check failed:',
      error
    )

    throw error
  }

  const result = Array.isArray(data)
    ? data[0]
    : data

  return {
    available: Boolean(result?.available),
    available_workers:
      Number(result?.available_workers ?? 0),
  }
}