import type {
  WorkerDayOfWeek,
  WorkerScheduleExceptionType,
} from '../types/schedule'

export const SCHEDULE = {
  days: {
    sunday: 0 as WorkerDayOfWeek,
    monday: 1 as WorkerDayOfWeek,
    tuesday: 2 as WorkerDayOfWeek,
    wednesday: 3 as WorkerDayOfWeek,
    thursday: 4 as WorkerDayOfWeek,
    friday: 5 as WorkerDayOfWeek,
    saturday: 6 as WorkerDayOfWeek,
  },

  dayLabels: {
    short: {
      0: 'Sun',
      1: 'Mon',
      2: 'Tue',
      3: 'Wed',
      4: 'Thu',
      5: 'Fri',
      6: 'Sat',
    },

    long: {
      0: 'Sunday',
      1: 'Monday',
      2: 'Tuesday',
      3: 'Wednesday',
      4: 'Thursday',
      5: 'Friday',
      6: 'Saturday',
    },
  },

  exceptionTypes: {
    unavailable: 'unavailable' as WorkerScheduleExceptionType,
    available: 'available' as WorkerScheduleExceptionType,
  },

  labels: {
    exceptionType: {
      unavailable: 'Unavailable',
      available: 'Available',
    },
  },

  defaults: {
    timezone: 'Asia/Kolkata',
    slotIntervalMinutes: 30,
  },

  validation: {
    minimumSlotIntervalMinutes: 15,
    maximumSlotIntervalMinutes: 120,
    minimumScheduleDurationMinutes: 30,
  },

  time: {
    startOfDay: '00:00',
    endOfDay: '23:59',
  },
} as const