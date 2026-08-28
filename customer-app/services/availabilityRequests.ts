import { supabase } from '../lib/supabase'

export type ServiceAvailabilityRequestInput = {
  serviceId: string
  latitude: number
  longitude: number
}

export type ServiceAvailabilityRequest = {
  id: string
  customer_id: string
  service_id: string
  latitude: number
  longitude: number
  status: 'pending' | 'notified' | 'cancelled'
  created_at: string
  updated_at: string
}

async function getAuthenticatedUserId(): Promise<string> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error) {
    throw error
  }

  if (!user) {
    throw new Error('Customer is not authenticated.')
  }

  return user.id
}

export async function requestServiceAvailability(
  input: ServiceAvailabilityRequestInput
): Promise<ServiceAvailabilityRequest> {
  const customerId = await getAuthenticatedUserId()

  if (!input.serviceId) {
    throw new Error('Service is required.')
  }

  if (
    !Number.isFinite(input.latitude) ||
    !Number.isFinite(input.longitude)
  ) {
    throw new Error('A valid location is required.')
  }

  const { data: existing, error: existingError } = await supabase
    .from('service_availability_requests')
    .select('*')
    .eq('customer_id', customerId)
    .eq('service_id', input.serviceId)
    .eq('status', 'pending')
    .maybeSingle()

  if (existingError) {
    console.error(
      '[TempStaff] Failed to check availability request:',
      existingError
    )
    throw existingError
  }

  if (existing) {
    return existing as ServiceAvailabilityRequest
  }

  const { data, error } = await supabase
    .from('service_availability_requests')
    .insert({
      customer_id: customerId,
      service_id: input.serviceId,
      latitude: input.latitude,
      longitude: input.longitude,
      status: 'pending',
    })
    .select('*')
    .single()

  if (!error && data) {
    return data as ServiceAvailabilityRequest
  }

  if (error?.code === '23505') {
    const { data: concurrent, error: concurrentError } =
      await supabase
        .from('service_availability_requests')
        .select('*')
        .eq('customer_id', customerId)
        .eq('service_id', input.serviceId)
        .eq('status', 'pending')
        .maybeSingle()

    if (concurrentError) {
      throw concurrentError
    }

    if (concurrent) {
      return concurrent as ServiceAvailabilityRequest
    }
  }

  console.error(
  '[TempStaff] Failed to request service availability:',
  JSON.stringify(error, null, 2)
)

throw error ?? new Error(
  'Unable to request service availability.'
)

}

export async function cancelServiceAvailabilityRequest(
  serviceId: string
): Promise<void> {
  const customerId = await getAuthenticatedUserId()

  const { error } = await supabase
    .from('service_availability_requests')
    .update({
      status: 'cancelled',
    })
    .eq('customer_id', customerId)
    .eq('service_id', serviceId)
    .eq('status', 'pending')

  if (error) {
    console.error(
      '[TempStaff] Failed to cancel availability request:',
      error
    )
    throw error
  }
}
