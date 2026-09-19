export type BookingType =
  | 'instant'
  | 'scheduled'
  | 'recurring'

export type BookingDraft = {
  serviceId: string
  bookingType: BookingType

  location: {
    latitude: number
    longitude: number
    address: string
  }

  startDate: string | null
  endDate: string | null

  startTime: string
  endTime: string

  selectedWeekdays: string[]
  excludedDates: string[]

  hourlyPrice: number
  currency: string | null
}