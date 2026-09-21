import { supabase } from '../../lib/supabase'

import type {
  WorkerService,
} from '../../types/worker'

export type WorkerAvailableService = {
  id: string
  name: string
  description: string | null
}

type ServiceRow = {
  id: string
  name: string
  description: string | null
  is_active: boolean
}

type WorkerServiceRow = {
  worker_id: string
  service_id: string
}

type SetWorkerServicesResult = {
  success?: boolean
  error?: string
  worker_id?: string
  service_count?: number
}

function mapWorkerService(
  row: WorkerServiceRow,
): WorkerService {
  return {
    workerId: row.worker_id,
    serviceId: row.service_id,
  }
}

function mapAvailableService(
  row: ServiceRow,
): WorkerAvailableService {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
  }
}

async function getCurrentWorkerId(): Promise<string> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error) {
    throw error
  }

  if (!user) {
    throw new Error(
      'A worker authentication session is required.',
    )
  }

  return user.id
}

function validateServiceIds(
  serviceIds: string[],
): void {
  if (!Array.isArray(serviceIds)) {
    throw new Error(
      'Service selection is invalid.',
    )
  }

  const normalizedIds = serviceIds
    .map((id) => id.trim())
    .filter(Boolean)

  if (normalizedIds.length === 0) {
    throw new Error(
      'Select at least one service.',
    )
  }

  if (
    new Set(normalizedIds).size !==
    normalizedIds.length
  ) {
    throw new Error(
      'Duplicate services are not allowed.',
    )
  }
}

export async function getAvailableWorkerServices(): Promise<
  WorkerAvailableService[]
> {
  const {
    data,
    error,
  } = await supabase
    .from('services')
    .select(
      'id, name, description, is_active',
    )
    .eq('is_active', true)
    .order('name', {
      ascending: true,
    })

  if (error) {
    throw error
  }

  return (data ?? []).map(
    mapAvailableService,
  )
}

export async function getWorkerServices(): Promise<
  WorkerService[]
> {
  const workerId =
    await getCurrentWorkerId()

  const {
    data,
    error,
  } = await supabase
    .from('worker_services')
    .select(
      'worker_id, service_id',
    )
    .eq('worker_id', workerId)
    .order('service_id', {
      ascending: true,
    })

  if (error) {
    throw error
  }

  return (data ?? []).map(
    mapWorkerService,
  )
}

export async function getWorkerServiceIds(): Promise<
  string[]
> {
  const services =
    await getWorkerServices()

  return services.map(
    (service) => service.serviceId,
  )
}

export async function saveWorkerServices(
  serviceIds: string[],
): Promise<WorkerService[]> {
  validateServiceIds(
    serviceIds,
  )

  const workerId =
    await getCurrentWorkerId()

  const normalizedIds = [
    ...new Set(
      serviceIds
        .map((id) => id.trim())
        .filter(Boolean),
    ),
  ]

  const availableServices =
    await getAvailableWorkerServices()

  const availableIds = new Set(
    availableServices.map(
      (service) => service.id,
    ),
  )

  const invalidIds =
    normalizedIds.filter(
      (serviceId) =>
        !availableIds.has(serviceId),
    )

  if (invalidIds.length > 0) {
    throw new Error(
      'One or more selected services are no longer available.',
    )
  }

  const {
    data,
    error,
  } = await supabase.rpc(
    'set_worker_services',
    {
      p_service_ids: normalizedIds,
    },
  )

  if (error) {
    throw error
  }

  const result =
    (data ?? {}) as SetWorkerServicesResult

  if (result.success !== true) {
    throw new Error(
      result.error ||
        'Worker services could not be saved.',
    )
  }

  if (
    result.worker_id &&
    result.worker_id !== workerId
  ) {
    throw new Error(
      'The saved services belong to a different worker account.',
    )
  }

  return getWorkerServices()
}

export async function replaceWorkerServices(
  serviceIds: string[],
): Promise<WorkerService[]> {
  return saveWorkerServices(
    serviceIds,
  )
}

export async function hasWorkerService(
  serviceId: string,
): Promise<boolean> {
  const normalizedId =
    serviceId.trim()

  if (!normalizedId) {
    return false
  }

  const workerId =
    await getCurrentWorkerId()

  const {
    data,
    error,
  } = await supabase
    .from('worker_services')
    .select(
      'worker_id, service_id',
    )
    .eq('worker_id', workerId)
    .eq('service_id', normalizedId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return Boolean(data)
}