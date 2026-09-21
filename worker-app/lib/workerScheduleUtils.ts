import type {
  WorkerDayOfWeek,
  WorkerSchedule,
  WorkerScheduleException,
  WorkerWeeklySchedule,
} from '../types/schedule'

import { SCHEDULE } from '../constants/schedule'

export function getDayOfWeek(date: Date): WorkerDayOfWeek {
  return date.getDay() as WorkerDayOfWeek
}

export function getDayLabel(dayOfWeek: WorkerDayOfWeek): string {
  return SCHEDULE.dayLabels.long[dayOfWeek]
}

export function getShortDayLabel(dayOfWeek: WorkerDayOfWeek): string {
  return SCHEDULE.dayLabels.short[dayOfWeek]
}

export function isValidTimeString(value: string): boolean {
  return /^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/.test(value)
}

export function timeToMinutes(value: string): number | null {
  if (!isValidTimeString(value)) {
    return null
  }

  const [hours, minutes] = value.split(':').map(Number)

  return hours * 60 + minutes
}

export function isValidTimeRange(
  startTime: string,
  endTime: string,
): boolean {
  const startMinutes = timeToMinutes(startTime)
  const endMinutes = timeToMinutes(endTime)

  if (startMinutes === null || endMinutes === null) {
    return false
  }

  return endMinutes > startMinutes
}

export function getDurationMinutes(
  startTime: string,
  endTime: string,
): number | null {
  const startMinutes = timeToMinutes(startTime)
  const endMinutes = timeToMinutes(endTime)

  if (startMinutes === null || endMinutes === null) {
    return null
  }

  const duration = endMinutes - startMinutes

  return duration > 0 ? duration : null
}

export function isScheduleDurationValid(
  startTime: string,
  endTime: string,
): boolean {
  const duration = getDurationMinutes(startTime, endTime)

  return (
    duration !== null &&
    duration >= SCHEDULE.validation.minimumScheduleDurationMinutes
  )
}

export function isSlotIntervalValid(minutes: number): boolean {
  return (
    Number.isInteger(minutes) &&
    minutes >= SCHEDULE.validation.minimumSlotIntervalMinutes &&
    minutes <= SCHEDULE.validation.maximumSlotIntervalMinutes
  )
}

export function findWeeklyScheduleForDay(
  schedules: WorkerWeeklySchedule[],
  dayOfWeek: WorkerDayOfWeek,
): WorkerWeeklySchedule | null {
  return (
    schedules.find(
      (schedule) =>
        schedule.dayOfWeek === dayOfWeek &&
        schedule.isActive,
    ) ?? null
  )
}

export function isExceptionActiveOnDate(
  exceptions: WorkerScheduleException[],
  dateKey: string,
): WorkerScheduleException | null {
  return (
    exceptions.find(
      (exception) =>
        exception.exceptionDate === dateKey &&
        exception.isActive,
    ) ?? null
  )
}

export function toDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

export function isDateWithinRange(
  date: Date,
  startDate: Date,
  endDate: Date,
): boolean {
  const target = new Date(date)
  const start = new Date(startDate)
  const end = new Date(endDate)

  target.setHours(0, 0, 0, 0)
  start.setHours(0, 0, 0, 0)
  end.setHours(0, 0, 0, 0)

  return target >= start && target <= end
}

export function scheduleCoversDate(
  schedule: WorkerSchedule,
  date: Date,
): boolean {
  const dayOfWeek = getDayOfWeek(date)
  const dateKey = toDateKey(date)

  const exception = isExceptionActiveOnDate(
    schedule.exceptions,
    dateKey,
  )

  if (exception) {
    return exception.exceptionType === 'available'
  }

  return findWeeklyScheduleForDay(
    schedule.weeklySchedules,
    dayOfWeek,
  ) !== null
}

export function scheduleCoversInterval(
  schedule: WorkerSchedule,
  date: Date,
  startTime: string,
  endTime: string,
): boolean {
  if (!isValidTimeRange(startTime, endTime)) {
    return false
  }

  const dayOfWeek = getDayOfWeek(date)
  const dateKey = toDateKey(date)

  const exception = isExceptionActiveOnDate(
    schedule.exceptions,
    dateKey,
  )

  if (exception) {
    if (exception.exceptionType === 'unavailable') {
      return false
    }

    if (
      exception.startTime &&
      exception.endTime &&
      isValidTimeRange(exception.startTime, exception.endTime)
    ) {
      const requestedStart = timeToMinutes(startTime)
      const requestedEnd = timeToMinutes(endTime)
      const exceptionStart = timeToMinutes(exception.startTime)
      const exceptionEnd = timeToMinutes(exception.endTime)

      if (
        requestedStart === null ||
        requestedEnd === null ||
        exceptionStart === null ||
        exceptionEnd === null
      ) {
        return false
      }

      return (
        requestedStart >= exceptionStart &&
        requestedEnd <= exceptionEnd
      )
    }

    return true
  }

  const weeklySchedule = findWeeklyScheduleForDay(
    schedule.weeklySchedules,
    dayOfWeek,
  )

  if (!weeklySchedule) {
    return false
  }

  const requestedStart = timeToMinutes(startTime)
  const requestedEnd = timeToMinutes(endTime)
  const scheduleStart = timeToMinutes(weeklySchedule.startTime)
  const scheduleEnd = timeToMinutes(weeklySchedule.endTime)

  if (
    requestedStart === null ||
    requestedEnd === null ||
    scheduleStart === null ||
    scheduleEnd === null
  ) {
    return false
  }

  return (
    requestedStart >= scheduleStart &&
    requestedEnd <= scheduleEnd
  )
}