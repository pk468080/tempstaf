export type Worker = {
  id: string
  name: string
  service: string
  rating: number
  jobs: number
  distance: string
}

export type BookingMode =
  | 'Instant'
  | 'Scheduled'
  | 'Recurring'

export type RootStackParamList = {
  Splash: undefined
  Login: undefined
  OTP: { phone: string }

  CustomerDetails: undefined

  Home: undefined
  Services: undefined
  Location: undefined
  Workers: undefined
  Summary: undefined
Payment: undefined
Schedule: undefined
Checkout: undefined
BookingConfirmed: undefined

  MyBookings: undefined

  BookingDetails: {
    bookingId: string
  }

  Tracking: {
    bookingId?: string
  }
}