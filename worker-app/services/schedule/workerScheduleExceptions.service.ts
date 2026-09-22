import { supabase } from '../../lib/supabase'

import type {
  WorkerScheduleException,
  WorkerScheduleExceptionInput,
  WorkerScheduleExceptionType,
} from '../../types/schedule'

import {
  isValidTimeRange,
  isValidTimeString,
} from '../../lib/workerScheduleUtils'

type WorkerScheduleExceptionRow = {
  id: string
  worker_id: string
  exception_date: string
  exception_type: WorkerScheduleExceptionType
  start_time: string | null
  end_time: string | null
  reason: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

function mapScheduleException(
  row: WorkerScheduleExceptionRow,
): WorkerScheduleException {
  return {
    id: row.id,
    workerId: row.worker_id,

    exceptionDate:
      row.exception_date,

    exceptionType:
      row.exception_type,

    startTime:
      row.start_time,

    endTime:
      row.end_time,

    reason:
      row.reason,

    isActive:
      row.is_active,

    createdAt:
      row.created_at,

    updatedAt:
      row.updated_at,
  }
}

async function getCurrentWorkerId(): Promise<string> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error) {
    throw error
  }

  if (!user) {
    throw new Error(
      'A worker authentication session is required.',
    )
  }

  return user.id
}

function validateExceptionDate(
  exceptionDate: string,
): void {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      exceptionDate,
    )
  ) {
    throw new Error(
      'Exception date must use YYYY-MM-DD format.',
    )
  }

  const [
    year,
    month,
    day,
  ] = exceptionDate
    .split('-')
    .map(Number)

  const daysInMonth = [
    31,
    28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ]

  if (
    month < 1 ||
    month > 12
  ) {
    throw new Error(
      'Exception date is invalid.',
    )
  }

  let maximumDay =
    daysInMonth[month - 1]

  const isLeapYear =
    year % 4 === 0 &&
    (
      year % 100 !== 0 ||
      year % 400 === 0
    )

  if (
    month === 2 &&
    isLeapYear
  ) {
    maximumDay = 29
  }

  if (
    day < 1 ||
    day > maximumDay
  ) {
    throw new Error(
      'Exception date is invalid.',
    )
  }
}

function validateExceptionInput(
  input: WorkerScheduleExceptionInput,
): void {
  validateExceptionDate(
    input.exceptionDate,
  )

  if (
    input.exceptionType !==
      'available' &&
    input.exceptionType !==
      'unavailable'
  ) {
    throw new Error(
      'Invalid schedule exception type.',
    )
  }

  const hasStart =
    input.startTime !== null &&
    input.startTime !== undefined

  const hasEnd =
    input.endTime !== null &&
    input.endTime !== undefined

  if (hasStart !== hasEnd) {
    throw new Error(
      'Exception start and end times must be provided together.',
    )
  }

  if (hasStart && hasEnd) {
    if (
      !isValidTimeString(
        input.startTime!,
      ) ||
      !isValidTimeString(
        input.endTime!,
      )
    ) {
      throw new Error(
        'Exception times must use HH:MM format.',
      )
    }

    if (
      !isValidTimeRange(
        input.startTime!,
        input.endTime!,
      )
    ) {
      throw new Error(
        'Exception end time must be after the start time.',
      )
    }
  }

  if (
    input.reason !== null &&
    input.reason !== undefined
  ) {
    if (
      !input.reason.trim()
    ) {
      throw new Error(
        'Exception reason cannot be blank.',
      )
    }
  }
}

async function getExceptionById(
  workerId: string,
  exceptionId: string,
): Promise<WorkerScheduleException> {
  const {
    data,
    error,
  } = await supabase
    .from('worker_schedule_exceptions')
    .select(
      'id, worker_id, exception_date, exception_type, start_time, end_time, reason, is_active, created_at, updated_at',
    )
    .eq('id', exceptionId)
    .eq('worker_id', workerId)
    .single()

  if (error) {
    throw error
  }

  return mapScheduleException(
    data,
  )
}

export async function getWorkerScheduleExceptions(): Promise<
  WorkerScheduleException[]
> {
  const workerId =
    await getCurrentWorkerId()

  const {
    data,
    error,
  } = await supabase
    .from('worker_schedule_exceptions')
    .select(
      'id, worker_id, exception_date, exception_type, start_time, end_time, reason, is_active, created_at, updated_at',
    )
    .eq('worker_id', workerId)
    .order('exception_date', {
      ascending: true,
    })
    .order('start_time', {
      ascending: true,
      nullsFirst: true,
    })

  if (error) {
    throw error
  }

  return (data ?? []).map(
    mapScheduleException,
  )
}

export async function getWorkerScheduleException(
  exceptionId: string,
): Promise<WorkerScheduleException | null> {
  if (!exceptionId.trim()) {
    throw new Error(
      'Schedule exception id is required.',
    )
  }

  const workerId =
    await getCurrentWorkerId()

  const {
    data,
    error,
  } = await supabase
    .from('worker_schedule_exceptions')
    .select(
      'id, worker_id, exception_date, exception_type, start_time, end_time, reason, is_active, created_at, updated_at',
    )
    .eq('id', exceptionId)
    .eq('worker_id', workerId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data
    ? mapScheduleException(data)
    : null
}

export async function createWorkerScheduleException(
  input: WorkerScheduleExceptionInput,
): Promise<WorkerScheduleException> {
  validateExceptionInput(
    input,
  )

  const workerId =
    await getCurrentWorkerId()

  const {
    data,
    error,
  } = await supabase
    .from('worker_schedule_exceptions')
    .insert({
      worker_id:
        workerId,

      exception_date:
        input.exceptionDate,

      exception_type:
        input.exceptionType,

      start_time:
        input.startTime ??
        null,

      end_time:
        input.endTime ??
        null,

      reason:
        input.reason?.trim() ??
        null,

      is_active:
        input.isActive,
    })
    .select(
      'id, worker_id, exception_date, exception_type, start_time, end_time, reason, is_active, created_at, updated_at',
    )
    .single()

  if (error) {
    throw error
  }

  return mapScheduleException(
    data,
  )
}

export async function updateWorkerScheduleException(
  exceptionId: string,
  input: WorkerScheduleExceptionInput,
): Promise<WorkerScheduleException> {
  if (!exceptionId.trim()) {
    throw new Error(
      'Schedule exception id is required.',
    )
  }

  validateExceptionInput(
    input,
  )

  const workerId =
    await getCurrentWorkerId()

  const {
    data,
    error,
  } = await supabase
    .from('worker_schedule_exceptions')
    .update({
      exception_date:
        input.exceptionDate,

      exception_type:
        input.exceptionType,

      start_time:
        input.startTime ??
        null,

      end_time:
        input.endTime ??
        null,

      reason:
        input.reason?.trim() ??
        null,

      is_active:
        input.isActive,
    })
    .eq('id', exceptionId)
    .eq('worker_id', workerId)
    .select(
      'id, worker_id, exception_date, exception_type, start_time, end_time, reason, is_active, created_at, updated_at',
    )
    .single()

  if (error) {
    throw error
  }

  return mapScheduleException(
    data,
  )
}

export async function deleteWorkerScheduleException(
  exceptionId: string,
): Promise<void> {
  if (!exceptionId.trim()) {
    throw new Error(
      'Schedule exception id is required.',
    )
  }

  const workerId =
    await getCurrentWorkerId()

  const {
    error,
  } = await supabase
    .from('worker_schedule_exceptions')
    .delete()
    .eq('id', exceptionId)
    .eq('worker_id', workerId)

  if (error) {
    throw error
  }
}

export async function deactivateWorkerScheduleException(
  exceptionId: string,
): Promise<WorkerScheduleException> {
  if (!exceptionId.trim()) {
    throw new Error(
      'Schedule exception id is required.',
    )
  }

  const workerId =
    await getCurrentWorkerId()

  const {
    data,
    error,
  } = await supabase
    .from('worker_schedule_exceptions')
    .update({
      is_active: false,
    })
    .eq('id', exceptionId)
    .eq('worker_id', workerId)
    .select(
      'id, worker_id, exception_date, exception_type, start_time, end_time, reason, is_active, created_at, updated_at',
    )
    .single()

  if (error) {
    throw error
  }

  return mapScheduleException(
    data,
  )
}

export async function getActiveWorkerScheduleExceptions(): Promise<
  WorkerScheduleException[]
> {
  const exceptions =
    await getWorkerScheduleExceptions()

  return exceptions.filter(
    (exception) =>
      exception.isActive,
  )
}

export async function hasActiveExceptionOnDate(
  exceptionDate: string,
): Promise<boolean> {
  validateExceptionDate(
    exceptionDate,
  )

  const workerId =
    await getCurrentWorkerId()

  const {
    data,
    error,
  } = await supabase
    .from('worker_schedule_exceptions')
    .select('id')
    .eq('worker_id', workerId)
    .eq(
      'exception_date',
      exceptionDate,
    )
    .eq('is_active', true)
    .limit(1)

  if (error) {
    throw error
  }

  return (data ?? []).length > 0
}