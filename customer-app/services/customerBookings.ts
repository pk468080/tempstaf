import { supabase } from '../lib/supabase'

export type CustomerBooking = {
  id: string
  customer_id: string
  worker_id: string | null
  service_id: string
  address_id: string
  status: string
  duration_value: number
  duration_unit: string
  scheduled_start: string
  scheduled_end: string
  base_amount: number
  platform_fee: number
  tax_amount: number
  total_amount: number
  notes: string | null
  created_at: string
  updated_at: string
  service?: {
    id: string
    name: string
    description: string | null
  } | null
  address?: {
    id: string
    label: string | null
    address_line: string
    latitude: number
    longitude: number
  } | null
  worker?: {
    id: string
    full_name: string | null
    phone: string | null
    avatar_url: string | null
  } | null
}

export async function getCustomerBookings(): Promise<CustomerBooking[]> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) {
    throw userError
  }

  if (!user) {
    throw new Error('Customer is not authenticated.')
  }

  const { data, error } = await supabase
    .from('bookings')
    .select(`
      id,
      customer_id,
      worker_id,
      service_id,
      address_id,
      status,
      duration_value,
      duration_unit,
      scheduled_start,
      scheduled_end,
      base_amount,
      platform_fee,
      tax_amount,
      total_amount,
      notes,
      created_at,
      updated_at,
      services (
        id,
        name,
        description
      ),
      addresses (
        id,
        label,
        address_line,
        latitude,
        longitude
      )
    `)
    .eq('customer_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error(
      '[TempStaff] Failed to load customer bookings:',
      error
    )

    throw error
  }

  const bookings = (data ?? []) as any[]

  const workerIds = Array.from(
    new Set(
      bookings
        .map((booking) => booking.worker_id)
        .filter(Boolean)
    )
  )

  let workerMap: Record<string, any> = {}

  if (workerIds.length > 0) {
    const { data: workers, error: workersError } =
      await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          phone,
          avatar_url
        `)
        .in('id', workerIds)

    if (workersError) {
      console.warn(
        '[TempStaff] Failed to load worker profiles:',
        workersError
      )
    } else {
      workerMap = Object.fromEntries(
        (workers ?? []).map((worker) => [
          worker.id,
          worker,
        ])
      )
    }
  }

  return bookings.map((booking) => ({
    ...booking,
    service: booking.services ?? null,
    address: booking.addresses ?? null,
    worker: booking.worker_id
      ? workerMap[booking.worker_id] ?? null
      : null,
  }))
}

export async function getCustomerBooking(
  bookingId: string
): Promise<CustomerBooking> {
  if (!bookingId) {
    throw new Error('Booking ID is required.')
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) {
    throw userError
  }

  if (!user) {
    throw new Error('Customer is not authenticated.')
  }

  const { data, error } = await supabase
    .from('bookings')
    .select(`
      id,
      customer_id,
      worker_id,
      service_id,
      address_id,
      status,
      duration_value,
      duration_unit,
      scheduled_start,
      scheduled_end,
      base_amount,
      platform_fee,
      tax_amount,
      total_amount,
      notes,
      created_at,
      updated_at,
      services (
        id,
        name,
        description
      ),
      addresses (
        id,
        label,
        address_line,
        latitude,
        longitude
      )
    `)
    .eq('id', bookingId)
    .eq('customer_id', user.id)
    .single()

  if (error) {
    console.error(
      '[TempStaff] Failed to load booking:',
      error
    )

    throw error
  }

  let worker = null

  if (data.worker_id) {
    const { data: workerData } = await supabase
      .from('profiles')
      .select(`
        id,
        full_name,
        phone,
        avatar_url
      `)
      .eq('id', data.worker_id)
      .maybeSingle()

    worker = workerData ?? null
  }

  return {
    ...(data as any),
    service: (data as any).services ?? null,
    address: (data as any).addresses ?? null,
    worker,
  }
}