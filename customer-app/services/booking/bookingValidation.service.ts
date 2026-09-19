import type { HomeService } from '../../types/service'

export type BookingValidationInput = {
  service: HomeService
  bookingType:
    | 'instant'
    | 'scheduled'
    | 'recurring'
  location: {
    latitude: number
    longitude: number
    address: string
  } | null
  startDate: Date | null
  endDate: Date | null
  startTime: Date
  endTime: Date
  selectedWeekdays: string[]
  excludedDates: string[]
  instantAvailable: boolean
}

export type BookingValidationResult = {
  valid: boolean
  errors: string[]
}

export function validateBooking(
  input: BookingValidationInput,
): BookingValidationResult {
  const errors: string[] = []

  if (!input.location) {
    errors.push(
      'Please select a service location.',
    )
  }

  if (input.service.hourlyPrice === null) {
    errors.push(
      'Pricing is currently unavailable for this service.',
    )
  }

  if (
    !Number.isFinite(input.service.hourlyPrice ?? NaN) ||
    (input.service.hourlyPrice ?? 0) < 0
  ) {
    errors.push(
      'The service price returned by the backend is invalid.',
    )
  }

  if (
    input.endTime <= input.startTime
  ) {
    errors.push(
      'End time must be later than start time.',
    )
  }

  if (
    input.bookingType === 'instant' &&
    !input.instantAvailable
  ) {
    errors.push(
      'Instant booking is not currently available.',
    )
  }

  if (
    input.bookingType === 'scheduled' ||
    input.bookingType === 'recurring'
  ) {
    if (!input.startDate) {
      errors.push(
        'Please select a start date.',
      )
    }

    if (!input.endDate) {
      errors.push(
        'Please select an end date.',
      )
    }

    if (
      input.startDate &&
      input.endDate &&
      input.endDate < input.startDate
    ) {
      errors.push(
        'End date must be on or after the start date.',
      )
    }
  }

  if (
    input.bookingType === 'recurring'
  ) {
    if (
      input.selectedWeekdays.length === 0
    ) {
      errors.push(
        'Select at least one recurring weekday.',
      )
    }

    if (
      input.startDate &&
      input.endDate &&
      input.startDate &&
      input.endDate
    ) {
      const hasOccurrence =
        hasValidRecurringOccurrence(
          input.startDate,
          input.endDate,
          input.selectedWeekdays,
          input.excludedDates,
        )

      if (!hasOccurrence) {
        errors.push(
          'The selected recurring dates contain no valid occurrences.',
        )
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

function hasValidRecurringOccurrence(
  startDate: Date,
  endDate: Date,
  selectedWeekdays: string[],
  excludedDates: string[],
): boolean {
  const selectedDayIndexes =
    new Set(
      selectedWeekdays.map(
        weekday =>
          weekdayIndex(weekday),
      ),
    )

  const excluded =
    new Set(excludedDates)

  const cursor = new Date(startDate)
  cursor.setHours(0, 0, 0, 0)

  const finalDate = new Date(endDate)
  finalDate.setHours(0, 0, 0, 0)

  while (cursor <= finalDate) {
    const weekday =
      cursor.getDay()

    const key =
      formatDateKey(cursor)

    if (
      selectedDayIndexes.has(weekday) &&
      !excluded.has(key)
    ) {
      return true
    }

    cursor.setDate(
      cursor.getDate() + 1,
    )
  }

  return false
}

function weekdayIndex(
  weekday: string,
): number {
  const indexes: Record<
    string,
    number
  > = {
    Sunday: 0,
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6,
  }

  return indexes[weekday] ?? -1
}

function formatDateKey(
  date: Date,
): string {
  const year =
    date.getFullYear()

  const month =
    String(
      date.getMonth() + 1,
    ).padStart(2, '0')

  const day =
    String(
      date.getDate(),
    ).padStart(2, '0')

  return `${year}-${month}-${day}`
}