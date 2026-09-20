/**
 * Booking UI utility functions for date/time formatting and occurrence generation
 */

export interface DateRange {
  startDate: Date
  endDate: Date
  excludedDates: string[]
}

export interface TimeRange {
  startTime: Date
  endTime: Date
}

/**
 * Format date to YYYY-MM-DD string
 */
export function toDateString(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Format date to date key (YYYY-MM-DD)
 */
export function toDateKey(date: Date): string {
  return toDateString(date)
}

/**
 * Format time to HH:MM:SS string
 */
export function toTimeString(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return `${hours}:${minutes}:${seconds}`
}

/**
 * Format time for display (HH:MM AM/PM)
 */
export function formatTimeDisplay(date: Date): string {
  return date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Format date for display (DD MMM YYYY)
 */
export function formatDateDisplay(date: Date | null): string {
  if (!date) return 'Select date'
  return date.toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

/**
 * Get start of day (00:00:00)
 */
export function startOfDay(date: Date): Date {
  const result = new Date(date)
  result.setHours(0, 0, 0, 0)
  return result
}

/**
 * Get start of today
 */
export function startOfToday(): Date {
  return startOfDay(new Date())
}

/**
 * Check if date is today or tomorrow (within 24 hours)
 */
export function isNearTermDate(date: Date, today: Date = startOfToday()): boolean {
  const daysFromToday = Math.round(
    (startOfDay(date).getTime() - today.getTime()) / (24 * 60 * 60 * 1000),
  )
  // Near-term is TODAY (0) or TOMORROW (1) only
  return daysFromToday >= 0 && daysFromToday <= 1
}

/**
 * Get duration in hours between two times
 */
export function getDurationHours(startTime: Date, endTime: Date): number {
  const diffMs = endTime.getTime() - startTime.getTime()
  const diffHours = diffMs / (60 * 60 * 1000)
  return Math.max(1, Math.round(diffHours * 10) / 10) // Round to 1 decimal, min 1 hour
}

/**
 * Weekday index to name
 */
const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const WEEKDAY_SHORT_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const WEEKDAY_INDEXES: Record<string, number> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
}

export function getWeekdayName(dayIndex: number): string {
  return WEEKDAY_NAMES[dayIndex] ?? 'Unknown'
}

export function getWeekdayShortName(dayIndex: number): string {
  return WEEKDAY_SHORT_NAMES[dayIndex] ?? 'Unknown'
}

export function getWeekdayIndex(name: string): number {
  return WEEKDAY_INDEXES[name] ?? -1
}

/**
 * Generate all occurrences for a recurring booking
 */
export function generateRecurringOccurrences(
  startDate: Date,
  endDate: Date,
  selectedWeekdayIndexes: number[],
  excludedDates: string[],
): Date[] {
  const occurrences: Date[] = []
  const excludedSet = new Set(excludedDates)
  const selectedSet = new Set(selectedWeekdayIndexes)

  const cursor = startOfDay(new Date(startDate))
  const finalDate = startOfDay(new Date(endDate))

  while (cursor <= finalDate) {
    const dayOfWeek = cursor.getDay()
    const dateKey = toDateKey(cursor)

    if (selectedSet.has(dayOfWeek) && !excludedSet.has(dateKey)) {
      occurrences.push(new Date(cursor))
    }

    cursor.setDate(cursor.getDate() + 1)
  }

  return occurrences
}

/**
 * Generate scheduled occurrences (all days in range, excluding specified dates)
 */
export function generateScheduledOccurrences(
  startDate: Date,
  endDate: Date,
  excludedDates: string[],
): Date[] {
  const occurrences: Date[] = []
  const excludedSet = new Set(excludedDates)

  const cursor = startOfDay(new Date(startDate))
  const finalDate = startOfDay(new Date(endDate))

  while (cursor <= finalDate) {
    const dateKey = toDateKey(cursor)

    if (!excludedSet.has(dateKey)) {
      occurrences.push(new Date(cursor))
    }

    cursor.setDate(cursor.getDate() + 1)
  }

  return occurrences
}

/**
 * Format date range display (e.g., "17 Sep — 20 Sep")
 */
export function formatDateRange(startDate: Date | null, endDate: Date | null): string {
  if (!startDate || !endDate) return 'Select dates'
  
  const start = formatDateDisplay(startDate)
  const end = formatDateDisplay(endDate)
  
  // If same date
  if (toDateString(startDate) === toDateString(endDate)) {
    return start
  }
  
  return `${start} — ${end}`
}

/**
 * Calculate total hours for a list of days and time range
 */
export function calculateTotalHours(
  occurrenceCount: number,
  hoursPerOccurrence: number,
): number {
  return occurrenceCount * hoursPerOccurrence
}

/**
 * Format money with currency
 */
export function formatMoney(amount: number | undefined, currency: string | undefined): string {
  if (amount === undefined || !Number.isFinite(amount)) {
    return '—'
  }
  return `${currency ?? ''} ${amount.toFixed(2)}`.trim()
}

/**
 * Validate time range (must be at least 1 hour)
 */
export function isValidTimeRange(startTime: Date, endTime: Date): boolean {
  return endTime > startTime && getDurationHours(startTime, endTime) >= 1
}

/**
 * Validate date range (end >= start)
 */
export function isValidDateRange(startDate: Date | null, endDate: Date | null): boolean {
  if (!startDate || !endDate) return false
  return endDate >= startDate
}

/**
 * Parse ISO datetime string to Date
 */
export function parseDateTime(isoString: string): Date {
  return new Date(isoString)
}
