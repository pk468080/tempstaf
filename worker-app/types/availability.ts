// worker-app/types/availability.ts

export type WorkerAvailability = {
  id: string
  workerId: string

  availableFrom: string
  availableUntil: string

  isAvailable: boolean
}

export type WorkerAvailabilityWindow = {
  availableFrom: string
  availableUntil: string

  isAvailable: boolean
}

export type WorkerAvailabilityUpdate = {
  availableFrom: string
  availableUntil: string

  isAvailable: boolean
}

export type WorkerAvailabilityState =
  | 'available'
  | 'unavailable'

export type WorkerAvailabilitySummary = {
  workerId: string

  state: WorkerAvailabilityState

  windows: WorkerAvailability[]
}