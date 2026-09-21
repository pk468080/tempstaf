// worker-app/types/occurrence.ts

import type { BookingOccurrenceStatus } from './booking'

export type BookingOccurrence = {
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

  pricingSnapshot: Record<string, unknown>

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

export type BookingOccurrenceSummary = {
  id: string
  bookingId: string
  occurrenceIndex: number
  occurrenceDate: string

  scheduledStart: string
  scheduledEnd: string

  status: BookingOccurrenceStatus

  workerId: string | null

  totalAmount: number

  journeyStartedAt: string | null
  arrivedAt: string | null
  startedAt: string | null
  completedAt: string | null
}

export type BookingOccurrenceActionState = {
  occurrenceId: string

  canStartJourney: boolean
  canMarkArrived: boolean
  canStartWork: boolean
  canComplete: boolean
  canCancel: boolean
}