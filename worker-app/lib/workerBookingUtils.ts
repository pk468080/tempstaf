import type {
  BookingStatus,
  BookingType,
  WorkerBooking,
  WorkerBookingOccurrence,
} from '../types/booking'

import { BOOKING } from '../constants/booking'

export function isRecurringBooking(booking: WorkerBooking): boolean {
  return booking.bookingType === BOOKING.types.recurring
}

export function isScheduledBooking(booking: WorkerBooking): boolean {
  return booking.bookingType === BOOKING.types.scheduled
}

export function isInstantBooking(booking: WorkerBooking): boolean {
  return booking.bookingType === BOOKING.types.instant
}

export function hasOccurrences(booking: WorkerBooking): boolean {
  return isRecurringBooking(booking)
}

export function isTerminalBookingStatus(status: BookingStatus): boolean {
  return (
    status === BOOKING.status.completed ||
    status === BOOKING.status.cancelled ||
    status === BOOKING.status.expired ||
    status === BOOKING.status.paymentFailed
  )
}

export function isActiveBookingStatus(status: BookingStatus): boolean {
  return (
    status === BOOKING.status.assigned ||
    status === BOOKING.status.onTheWay ||
    status === BOOKING.status.arrived ||
    status === BOOKING.status.inProgress
  )
}

export function isStartOtpRequired(booking: WorkerBooking): boolean {
  return (
    booking.status === BOOKING.status.arrived &&
    booking.startedAt === null &&
    booking.startOtpVerifiedAt === null
  )
}

export function isEndOtpRequired(booking: WorkerBooking): boolean {
  return (
    booking.status === BOOKING.status.inProgress &&
    booking.completedAt === null &&
    booking.endOtpVerifiedAt === null
  )
}

export function getBookingTypeLabel(bookingType: BookingType): string {
  return BOOKING.labels.bookingType[bookingType]
}

export function getBookingStatusLabel(status: string): string {
  return (
    BOOKING.labels.status[status as keyof typeof BOOKING.labels.status] ??
    status
  )
}

export function formatBookingAmount(
  amount: number | null | undefined,
  currency: string | null | undefined,
): string {
  if (amount === null || amount === undefined || !Number.isFinite(amount)) {
    return '—'
  }

  const currencyLabel = currency ? `${currency} ` : ''

  return `${currencyLabel}${amount.toFixed(2)}`
}

export function formatBookingDate(
  value: string | null | undefined,
): string {
  if (!value) {
    return '—'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return '—'
  }

  return date.toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function formatBookingTime(
  value: string | null | undefined,
): string {
  if (!value) {
    return '—'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return '—'
  }

  return date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatBookingDateTime(
  value: string | null | undefined,
): string {
  if (!value) {
    return '—'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return '—'
  }

  return date.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function getBookingDurationHours(
  booking: WorkerBooking,
): number | null {
  if (booking.totalWorkingHours !== null) {
    return booking.totalWorkingHours
  }

  if (!booking.scheduledStart || !booking.scheduledEnd) {
    return null
  }

  const start = new Date(booking.scheduledStart)
  const end = new Date(booking.scheduledEnd)

  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime()) ||
    end <= start
  ) {
    return null
  }

  const hours =
    (end.getTime() - start.getTime()) / (1000 * 60 * 60)

  return Math.round(hours * 10) / 10
}

export function sortOccurrences(
  occurrences: WorkerBookingOccurrence[],
): WorkerBookingOccurrence[] {
  return [...occurrences].sort((a, b) => {
    const dateDifference =
      a.occurrenceDate.localeCompare(b.occurrenceDate)

    if (dateDifference !== 0) {
      return dateDifference
    }

    return a.occurrenceIndex - b.occurrenceIndex
  })
}

export function getNextPendingOccurrence(
  occurrences: WorkerBookingOccurrence[],
): WorkerBookingOccurrence | null {
  const sorted = sortOccurrences(occurrences)

  return (
    sorted.find(
      (occurrence) =>
        occurrence.status === 'scheduled' ||
        occurrence.status === 'assigned' ||
        occurrence.status === 'on_the_way' ||
        occurrence.status === 'arrived' ||
        occurrence.status === 'in_progress',
    ) ?? null
  )
}

export function getCompletedOccurrenceCount(
  occurrences: WorkerBookingOccurrence[],
): number {
  return occurrences.filter(
    (occurrence) => occurrence.status === 'completed',
  ).length
}

export function getRemainingOccurrenceCount(
  occurrences: WorkerBookingOccurrence[],
): number {
  return occurrences.filter(
    (occurrence) =>
      occurrence.status !== 'completed' &&
      occurrence.status !== 'cancelled',
  ).length
}