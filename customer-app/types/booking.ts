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

export type BookingCreationResult = {
  booking_id: string
  occurrence_count: number
  total_working_hours: number
  gross_amount: number
  discount_amount: number
  platform_fee?: number
  tax_amount?: number
  tax?: number
  final_amount: number
  currency: string
  timezone: string
}

export type MultiOccurrenceBookingInput = {
  serviceVariantId: string
  addressId: string
  startDate: string
  endDate: string
  startTime: string
  endTime: string
  selectedWeekdays: number[]
  excludedDates: string[]
  notes?: string | null
}