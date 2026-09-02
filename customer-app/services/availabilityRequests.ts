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
  await getAuthenticatedUserId()

  if (!input.serviceId) {
    throw new Error('Service is required.')
  }

  if (
    !Number.isFinite(input.latitude) ||
    !Number.isFinite(input.longitude) ||
    input.latitude < -90 ||
    input.latitude > 90 ||
    input.longitude < -180 ||
    input.longitude > 180
  ) {
    throw new Error('A valid location is required.')
  }

  const { data, error } = await supabase.rpc(
    'request_service_availability',
    {
      p_service_id: input.serviceId,
      p_latitude: input.latitude,
      p_longitude: input.longitude,
    }
  )

  if (error) {
    console.error(
      '[TempStaff] Failed to request service availability:',
      error
    )

    throw error
  }

  if (!data) {
    throw new Error(
      'Unable to request service availability.'
    )
  }

  return data as ServiceAvailabilityRequest
}

export async function cancelServiceAvailabilityRequest(
  serviceId: string
): Promise<void> {
  await getAuthenticatedUserId()

  if (!serviceId) {
    throw new Error('Service is required.')
  }

  const { error } = await supabase
    .from('service_availability_requests')
    .update({
      status: 'cancelled',
    })
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