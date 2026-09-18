export type BookingMode = 'Instant' | 'Scheduled' | 'Recurring';

export type RootStackParamList = {
  Splash: undefined;
  Login: undefined;
  VerifyOtp: undefined;
  CustomerDetails: undefined;
  CustomerLocation: undefined;

  // Main app
  Home: undefined;

  // New booking flow
  Booking: undefined;
  Summary: undefined;
  Payment: undefined;
  BookingConfirmed: undefined;

  // Existing non-booking screens
  MyBookings: undefined;
  BookingDetails: { bookingId: string };
  Tracking: { bookingId: string };
  WorkerProfile: { workerId: string };

  Profile: undefined;
  EditProfile: undefined;
  SavedAddresses: undefined;
  Money: undefined;
  HelpSupport: undefined;
  AboutUs: undefined;
  PrivacyPolicy: undefined;
  DeleteAccount: undefined;
  ManualLocation: undefined;
};