export type Worker = {
  id: string
  name: string
  service: string
  rating: number
  jobs?: number
  distance?: string
  completedJobs?: number
  verified?: boolean
  available?: boolean
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

  Home:
  | undefined
  | {
      latitude: number
      longitude: number
      label: string
      detail: string
    }
    ManualLocation: undefined
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

  WorkerProfile: {
    worker: Worker
    service?: string
    duration?: string
  }

  Tracking: {
    bookingId?: string
  }

  SavedAddresses: undefined

  Profile: undefined
  EditProfile: undefined
  Money: undefined
  HelpSupport: undefined
  AboutUs: undefined
  TermsOfService: undefined
  PrivacyPolicy: undefined
  DeleteAccount: undefined
}