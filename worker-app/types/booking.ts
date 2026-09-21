// worker-app/types/booking.ts

export type BookingType =
  | 'instant'
  | 'scheduled'
  | 'recurring'

export type BookingStatus =
  | 'pending_payment'
  | 'paid'
  | 'searching_worker'
  | 'assigned'
  | 'on_the_way'
  | 'arrived'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'expired'
  | 'payment_failed'

export type BookingOccurrenceStatus =
  | 'scheduled'
  | 'assigned'
  | 'on_the_way'
  | 'arrived'
  | 'in_progress'
  | 'completed'
  | 'cancelled'

export type WorkerBooking = {
  id: string

  customerId: string
  workerId: string | null

  serviceId: string
  serviceVariantId: string
  addressId: string

  status: BookingStatus
  bookingType: BookingType

  durationValue: number
  durationUnit: string

  scheduledStart: string
  scheduledEnd: string

  totalWorkingHours: number | null
  totalAmount: number
  currency: string | null

  notes: string | null

  workerAcceptedAt: string | null
  journeyStartedAt: string | null
  arrivedAt: string | null
  startedAt: string | null
  startOtpVerifiedAt: string | null
  completedAt: string | null
  endOtpVerifiedAt: string | null

  scheduleStartDate: string | null
  scheduleEndDate: string | null
  dailyStartTime: string | null
  dailyEndTime: string | null

  selectedWeekdays: number[]
  offDates: string[]

  createdAt: string
  updatedAt: string
}

export type WorkerBookingOccurrence = {
  id: string
  bookingId: string
  workerId: string | null

  occurrenceIndex: number
  occurrenceDate: string

  scheduledStart: string
  scheduledEnd: string

  status: BookingOccurrenceStatus

  baseAmount: number
  discountAmount: number
  platformFee: number
  taxAmount: number
  totalAmount: number

  journeyStartedAt: string | null
  arrivedAt: string | null
  startedAt: string | null
  startOtpVerifiedAt: string | null
  completedAt: string | null
  endOtpVerifiedAt: string | null

  originalOccurrenceDate: string | null
  lastModifiedAt: string | null
  lastModifiedBy: string | null

  createdAt: string
  updatedAt: string
}

export type WorkerBookingWithOccurrences = WorkerBooking & {
  occurrences: WorkerBookingOccurrence[]
}

export type WorkerBookingAction =
  | 'accept'
  | 'decline'
  | 'on_the_way'
  | 'arrived'
  | 'cancel'

export type WorkerOccurrenceAction =
  | 'on_the_way'
  | 'arrived'
  | 'cancel'

export type WorkerOtpType =
  | 'start'
  | 'end'

export type WorkerBookingActionResponse = {
  success: boolean

  bookingId?: string
  occurrenceId?: string

  action?: WorkerBookingAction | WorkerOccurrenceAction

  status?: BookingStatus | BookingOccurrenceStatus | string

  oldStatus?: string

  parentStatus?: BookingStatus | string
  parentOldStatus?: BookingStatus | string

  workerAcceptedAt?: string | null

  error?: string
}

export type WorkerOtpVerificationResponse = {
  success: boolean

  bookingId?: string
  occurrenceId?: string | null

  otpType?: WorkerOtpType

  status?: BookingStatus | BookingOccurrenceStatus | string

  bookingCompleted?: boolean

  error?: string
}