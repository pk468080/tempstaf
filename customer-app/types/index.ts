export type BookingMode =
  | 'Instant'
  | 'Scheduled'
  | 'Recurring'

export type RootStackParamList = {
  Splash: undefined
  Login: undefined

  VerifyOtp: {
    phone: string
  }

  CustomerDetails: undefined
  CustomerLocation: undefined

  Home: undefined

  Booking: undefined
  Summary: undefined
  Payment: undefined
  BookingConfirmed: undefined

  MyBookings: undefined
  Profile: undefined
}