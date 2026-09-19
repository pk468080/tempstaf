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
  checkedAt: string
  errorMessage?: string
}