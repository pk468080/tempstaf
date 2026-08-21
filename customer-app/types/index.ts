export type Worker = {
  id: string
  name: string
  service: string
  rating: number
  jobs: number
  distance: string
}

export type BookingMode = 'Instant' | 'Scheduled' | 'Recurring'

export type RootStackParamList = {
  Login: undefined
  OTP: { phone: string }
  Home: undefined
  Services: undefined
  Location: undefined
  Workers: undefined
  Summary: undefined
  Payment: undefined
  BookingConfirmed: undefined
  Tracking: undefined
}
