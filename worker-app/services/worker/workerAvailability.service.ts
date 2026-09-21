import { supabase } from '../../lib/supabase'

import type {
  WorkerAvailability,
  WorkerAvailabilityState,
  WorkerAvailabilitySummary,
} from '../../types/availability'

type WorkerAvailabilityRow = {
  id: string
  worker_id: string
  available_from: string
  available_until: string
  is_available: boolean
}

function mapWorkerAvailability(
  row: WorkerAvailabilityRow,
): WorkerAvailability {
  return {
    id: row.id,
    workerId: row.worker_id,
    availableFrom: row.available_from,
    availableUntil: row.available_until,
    isAvailable: row.is_available,
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

export async function getWorkerAvailability(): Promise<
  WorkerAvailability[]
> {
  const workerId =
    await getCurrentWorkerId()

  const {
    data,
    error,
  } = await supabase
    .from('worker_availability')
    .select(
      'id, worker_id, available_from, available_until, is_available',
    )
    .eq('worker_id', workerId)
    .order('available_from', {
      ascending: true,
    })

  if (error) {
    throw error
  }

  return (data ?? []).map(
    mapWorkerAvailability,
  )
}

export async function getWorkerAvailabilitySummary(): Promise<
  WorkerAvailabilitySummary
> {
  const workerId =
    await getCurrentWorkerId()

  const windows =
    await getWorkerAvailability()

  const hasAvailableWindow =
    windows.some(
      (window) =>
        window.isAvailable &&
        new Date(
          window.availableUntil,
        ).getTime() >
          new Date().getTime(),
    )

  const state: WorkerAvailabilityState =
    hasAvailableWindow
      ? 'available'
      : 'unavailable'

  return {
    workerId,
    state,
    windows,
  }
}

export async function isWorkerAvailableForWindow(
  start: Date,
  end: Date,
): Promise<boolean> {
  if (
    start.getTime() >=
    end.getTime()
  ) {
    throw new Error(
      'Availability window start must be before its end.',
    )
  }

  const windows =
    await getWorkerAvailability()

  return windows.some(
    (window) => {
      if (!window.isAvailable) {
        return false
      }

      const availableFrom =
        new Date(
          window.availableFrom,
        ).getTime()

      const availableUntil =
        new Date(
          window.availableUntil,
        ).getTime()

      return (
        availableFrom <= start.getTime() &&
        availableUntil >= end.getTime()
      )
    },
  )
}

export function sortWorkerAvailability(
  windows: WorkerAvailability[],
): WorkerAvailability[] {
  return [...windows].sort(
    (a, b) =>
      new Date(
        a.availableFrom,
      ).getTime() -
      new Date(
        b.availableFrom,
      ).getTime(),
  )
}