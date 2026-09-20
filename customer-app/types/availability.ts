export type AvailabilityStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'unavailable'
  | 'fallback'
  | 'error'

export type AvailabilityResult = {
  serviceAreaAvailable: boolean
  nearbyWorkerAvailable: boolean
  instantAvailable: boolean
  recommendedBookingType: 'instant' | 'scheduled'
  nearbyWorkerCount: number
  nearestWorkerId?: string | null
  nearestWorkerDistanceKm?: number | null
  checkedAt: string
  errorMessage?: string
}