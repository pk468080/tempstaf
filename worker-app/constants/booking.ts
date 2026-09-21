import type {
  BookingOccurrenceStatus,
  BookingStatus,
  BookingType,
  WorkerBookingAction,
  WorkerOccurrenceAction,
  WorkerOtpType,
} from '../types/booking'

export const BOOKING = {
  types: {
    instant: 'instant' as BookingType,
    scheduled: 'scheduled' as BookingType,
    recurring: 'recurring' as BookingType,
  },

  status: {
    pendingPayment: 'pending_payment' as BookingStatus,
    paid: 'paid' as BookingStatus,
    searchingWorker: 'searching_worker' as BookingStatus,
    assigned: 'assigned' as BookingStatus,
    onTheWay: 'on_the_way' as BookingStatus,
    arrived: 'arrived' as BookingStatus,
    inProgress: 'in_progress' as BookingStatus,
    completed: 'completed' as BookingStatus,
    cancelled: 'cancelled' as BookingStatus,
    expired: 'expired' as BookingStatus,
    paymentFailed: 'payment_failed' as BookingStatus,
  },

  occurrenceStatus: {
    scheduled: 'scheduled' as BookingOccurrenceStatus,
    assigned: 'assigned' as BookingOccurrenceStatus,
    onTheWay: 'on_the_way' as BookingOccurrenceStatus,
    arrived: 'arrived' as BookingOccurrenceStatus,
    inProgress: 'in_progress' as BookingOccurrenceStatus,
    completed: 'completed' as BookingOccurrenceStatus,
    cancelled: 'cancelled' as BookingOccurrenceStatus,
  },

  workerActions: {
    accept: 'accept' as WorkerBookingAction,
    decline: 'decline' as WorkerBookingAction,
    onTheWay: 'on_the_way' as WorkerBookingAction,
    arrived: 'arrived' as WorkerBookingAction,
    cancel: 'cancel' as WorkerBookingAction,
  },

  occurrenceActions: {
    onTheWay: 'on_the_way' as WorkerOccurrenceAction,
    arrived: 'arrived' as WorkerOccurrenceAction,
    cancel: 'cancel' as WorkerOccurrenceAction,
  },

  otpTypes: {
    start: 'start' as WorkerOtpType,
    end: 'end' as WorkerOtpType,
  },

  labels: {
    bookingType: {
      instant: 'Instant',
      scheduled: 'Scheduled',
      recurring: 'Recurring',
    },

    status: {
      pending_payment: 'Pending Payment',
      paid: 'Paid',
      searching_worker: 'Searching for Worker',
      assigned: 'Assigned',
      on_the_way: 'On the Way',
      arrived: 'Arrived',
      in_progress: 'In Progress',
      completed: 'Completed',
      cancelled: 'Cancelled',
      expired: 'Expired',
      payment_failed: 'Payment Failed',
    },

    occurrenceStatus: {
      scheduled: 'Scheduled',
      assigned: 'Assigned',
      on_the_way: 'On the Way',
      arrived: 'Arrived',
      in_progress: 'In Progress',
      completed: 'Completed',
      cancelled: 'Cancelled',
    },

    actions: {
      accept: 'Accept',
      decline: 'Decline',
      on_the_way: 'Start Journey',
      arrived: 'Mark Arrived',
      cancel: 'Cancel Booking',
    },

    otp: {
      start: 'Start OTP',
      end: 'End OTP',
    },
  },

  timing: {
    offerExpirySeconds: 120,
    otpLength: 6,
  },
} as const