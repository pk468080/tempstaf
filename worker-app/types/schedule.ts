// worker-app/types/schedule.ts

export type WorkerDayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6

export type WorkerScheduleExceptionType =
  | 'unavailable'
  | 'available'

export type WorkerWeeklySchedule = {
  id: string
  workerId: string

  dayOfWeek: WorkerDayOfWeek

  startTime: string
  endTime: string

  isActive: boolean

  createdAt: string
  updatedAt: string
}

export type WorkerScheduleException = {
  id: string
  workerId: string

  exceptionDate: string

  exceptionType: WorkerScheduleExceptionType

  startTime: string | null
  endTime: string | null

  reason: string | null

  isActive: boolean

  createdAt: string
  updatedAt: string
}

export type WorkerScheduleSettings = {
  workerId: string

  timezone: string

  slotIntervalMinutes: number | null

  createdAt: string
  updatedAt: string
}

export type WorkerSchedule = {
  workerId: string

  weeklySchedules: WorkerWeeklySchedule[]

  exceptions: WorkerScheduleException[]

  settings: WorkerScheduleSettings | null
}

export type WorkerWeeklyScheduleInput = {
  dayOfWeek: WorkerDayOfWeek

  startTime: string
  endTime: string

  isActive: boolean
}

export type WorkerScheduleExceptionInput = {
  exceptionDate: string

  exceptionType: WorkerScheduleExceptionType

  startTime?: string | null
  endTime?: string | null

  reason?: string | null

  isActive: boolean
}

export type WorkerScheduleSettingsInput = {
  timezone: string

  slotIntervalMinutes?: number | null
}