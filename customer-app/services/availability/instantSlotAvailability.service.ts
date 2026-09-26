import { supabase } from '../../lib/supabase'

export type InstantAvailabilitySlot = {
  start: string
  end: string
  available_worker_count: number
}

export type InstantAvailabilityResult = {
  service_area_available: boolean
  instant_available: boolean
  slots: InstantAvailabilitySlot[]
}

export async function getInstantAvailabilitySlots(
  serviceVariantId: string,
  addressId: string,
  durationHours = 1,
): Promise<InstantAvailabilityResult> {
  const { data, error } = await supabase.rpc(
    'get_customer_instant_availability_slots',
    {
      p_service_variant_id: serviceVariantId,
      p_address_id: addressId,
      p_duration_hours: durationHours,
    },
  )

  if (error) {
    throw error
  }

  if (!data || typeof data !== 'object') {
    throw new Error(
      'The backend did not return instant availability slots.',
    )
  }

  const result = data as {
    service_area_available?: unknown
    instant_available?: unknown
    slots?: unknown
  }

  return {
    service_area_available:
      result.service_area_available === true,
    instant_available:
      result.instant_available === true,
    slots: Array.isArray(result.slots)
      ? (result.slots as InstantAvailabilitySlot[])
      : [],
  }
}