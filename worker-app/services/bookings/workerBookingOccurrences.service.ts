import { supabase } from '../../lib/supabase'

import type {
  WorkerBookingActionResponse,
  WorkerBookingOccurrence,
  WorkerOccurrenceAction,
} from '../../types/booking'

type WorkerBookingOccurrenceRow = {
  id: string
  booking_id: string
  worker_id: string | null

  occurrence_index: number
  occurrence_date: string

  scheduled_start: string
  scheduled_end: string

  status: string

  created_at: string
  updated_at: string

  base_amount: number
  discount_amount: number
  platform_fee: number
  tax_amount: number
  total_amount: number

  pricing_snapshot: unknown

  journey_started_at: string | null
  arrived_at: string | null
  started_at: string | null
  start_otp_verified_at: string | null
  completed_at: string | null
  end_otp_verified_at: string | null

  original_occurrence_date: string | null

  last_modified_at: string | null
  last_modified_by: string | null
}

type WorkerOccurrenceActionRpcResult = {
  success?: boolean

  occurrence_id?: string
  action?: string

  old_status?: string
  status?: string

  error?: string
}

const OCCURRENCE_SELECT = `
  id,
  booking_id,
  worker_id,
  occurrence_index,
  occurrence_date,
  scheduled_start,
  scheduled_end,
  status,
  created_at,
  updated_at,
  base_amount,
  discount_amount,
  platform_fee,
  tax_amount,
  total_amount,
  pricing_snapshot,
  journey_started_at,
  arrived_at,
  started_at,
  start_otp_verified_at,
  completed_at,
  end_otp_verified_at,
  original_occurrence_date,
  last_modified_at,
  last_modified_by
`

const ALLOWED_ACTIONS: WorkerOccurrenceAction[] = [
  'on_the_way',
  'arrived',
  'cancel',
]

function mapWorkerBookingOccurrence(
  row: WorkerBookingOccurrenceRow,
): WorkerBookingOccurrence {
  return {
    id:
      row.id,

    bookingId:
      row.booking_id,

    workerId:
      row.worker_id,

    occurrenceIndex:
      Number(
        row.occurrence_index,
      ),

    occurrenceDate:
      row.occurrence_date,

    scheduledStart:
      row.scheduled_start,

    scheduledEnd:
      row.scheduled_end,

    status:
      row.status as WorkerBookingOccurrence['status'],

    baseAmount:
      Number(
        row.base_amount,
      ),

    discountAmount:
      Number(
        row.discount_amount,
      ),

    platformFee:
      Number(
        row.platform_fee,
      ),

    taxAmount:
      Number(
        row.tax_amount,
      ),

    totalAmount:
      Number(
        row.total_amount,
      ),

    journeyStartedAt:
      row.journey_started_at,

    arrivedAt:
      row.arrived_at,

    startedAt:
      row.started_at,

    startOtpVerifiedAt:
      row.start_otp_verified_at,

    completedAt:
      row.completed_at,

    endOtpVerifiedAt:
      row.end_otp_verified_at,

    originalOccurrenceDate:
      row.original_occurrence_date,

    lastModifiedAt:
      row.last_modified_at,

    lastModifiedBy:
      row.last_modified_by,

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

function validateOccurrenceId(
  occurrenceId: string,
): void {
  if (!occurrenceId.trim()) {
    throw new Error(
      'Occurrence id is required.',
    )
  }
}

function validateBookingId(
  bookingId: string,
): void {
  if (!bookingId.trim()) {
    throw new Error(
      'Booking id is required.',
    )
  }
}

function validateOccurrenceAction(
  action: WorkerOccurrenceAction,
): void {
  if (
    !ALLOWED_ACTIONS.includes(
      action,
    )
  ) {
    throw new Error(
      'Unsupported worker occurrence action.',
    )
  }
}

export async function getWorkerBookingOccurrences(): Promise<
  WorkerBookingOccurrence[]
> {
  const workerId =
    await getCurrentWorkerId()

  const {
    data,
    error,
  } = await supabase
    .from('booking_schedule_occurrences')
    .select(
      OCCURRENCE_SELECT,
    )
    .eq('worker_id', workerId)
    .order('scheduled_start', {
      ascending: true,
    })

  if (error) {
    throw error
  }

  return (data ?? []).map(
    (row) =>
      mapWorkerBookingOccurrence(
        row as WorkerBookingOccurrenceRow,
      ),
  )
}

export async function getWorkerBookingOccurrencesForBooking(
  bookingId: string,
): Promise<WorkerBookingOccurrence[]> {
  validateBookingId(
    bookingId,
  )

  const workerId =
    await getCurrentWorkerId()

  const {
    data,
    error,
  } = await supabase
    .from('booking_schedule_occurrences')
    .select(
      OCCURRENCE_SELECT,
    )
    .eq('booking_id', bookingId)
    .eq('worker_id', workerId)
    .order('occurrence_index', {
      ascending: true,
    })

  if (error) {
    throw error
  }

  return (data ?? []).map(
    (row) =>
      mapWorkerBookingOccurrence(
        row as WorkerBookingOccurrenceRow,
      ),
  )
}

export async function getWorkerBookingOccurrence(
  occurrenceId: string,
): Promise<WorkerBookingOccurrence | null> {
  validateOccurrenceId(
    occurrenceId,
  )

  const workerId =
    await getCurrentWorkerId()

  const {
    data,
    error,
  } = await supabase
    .from('booking_schedule_occurrences')
    .select(
      OCCURRENCE_SELECT,
    )
    .eq('id', occurrenceId)
    .eq('worker_id', workerId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data
    ? mapWorkerBookingOccurrence(
        data as WorkerBookingOccurrenceRow,
      )
    : null
}

export async function requireWorkerBookingOccurrence(
  occurrenceId: string,
): Promise<WorkerBookingOccurrence> {
  const occurrence =
    await getWorkerBookingOccurrence(
      occurrenceId,
    )

  if (!occurrence) {
    throw new Error(
      'Booking occurrence not found or not assigned to this worker.',
    )
  }

  return occurrence
}

export async function getUpcomingWorkerOccurrences(
  limit = 10,
): Promise<WorkerBookingOccurrence[]> {
  const workerId =
    await getCurrentWorkerId()

  const safeLimit =
    Math.max(
      1,
      Math.min(
        Math.trunc(limit),
        50,
      ),
    )

  const {
    data,
    error,
  } = await supabase
    .from('booking_schedule_occurrences')
    .select(
      OCCURRENCE_SELECT,
    )
    .eq('worker_id', workerId)
    .in('status', [
      'scheduled',
      'assigned',
      'on_the_way',
      'arrived',
      'in_progress',
    ])
    .gte(
      'scheduled_end',
      new Date().toISOString(),
    )
    .order('scheduled_start', {
      ascending: true,
    })
    .limit(safeLimit)

  if (error) {
    throw error
  }

  return (data ?? []).map(
    (row) =>
      mapWorkerBookingOccurrence(
        row as WorkerBookingOccurrenceRow,
      ),
  )
}

export async function getActiveWorkerOccurrences(): Promise<
  WorkerBookingOccurrence[]
> {
  const workerId =
    await getCurrentWorkerId()

  const {
    data,
    error,
  } = await supabase
    .from('booking_schedule_occurrences')
    .select(
      OCCURRENCE_SELECT,
    )
    .eq('worker_id', workerId)
    .in('status', [
      'assigned',
      'on_the_way',
      'arrived',
      'in_progress',
    ])
    .order('scheduled_start', {
      ascending: true,
    })

  if (error) {
    throw error
  }

  return (data ?? []).map(
    (row) =>
      mapWorkerBookingOccurrence(
        row as WorkerBookingOccurrenceRow,
      ),
  )
}

export async function getPendingWorkerOccurrences(): Promise<
  WorkerBookingOccurrence[]
> {
  const workerId =
    await getCurrentWorkerId()

  const {
    data,
    error,
  } = await supabase
    .from('booking_schedule_occurrences')
    .select(
      OCCURRENCE_SELECT,
    )
    .eq('worker_id', workerId)
    .in('status', [
      'scheduled',
      'assigned',
    ])
    .order('scheduled_start', {
      ascending: true,
    })

  if (error) {
    throw error
  }

  return (data ?? []).map(
    (row) =>
      mapWorkerBookingOccurrence(
        row as WorkerBookingOccurrenceRow,
      ),
  )
}

async function runWorkerOccurrenceAction(
  occurrenceId: string,
  action: WorkerOccurrenceAction,
): Promise<WorkerBookingActionResponse> {
  validateOccurrenceId(
    occurrenceId,
  )

  validateOccurrenceAction(
    action,
  )

  const {
    data,
    error,
  } = await supabase.rpc(
    'worker_occurrence_action',
    {
      p_occurrence_id:
        occurrenceId,

      p_action:
        action,
    },
  )

  if (error) {
    throw error
  }

  const result =
    (data ?? {}) as WorkerOccurrenceActionRpcResult

  if (result.success !== true) {
    throw new Error(
      result.error ||
        'Worker occurrence action could not be completed.',
    )
  }

  if (
    result.occurrence_id &&
    result.occurrence_id !== occurrenceId
  ) {
    throw new Error(
      'Occurrence action response belongs to a different occurrence.',
    )
  }

  return {
    success: true,

    occurrenceId:
      result.occurrence_id,

    action:
      result.action as WorkerOccurrenceAction,

    oldStatus:
      result.old_status,

    status:
      result.status,

    error:
      result.error,
  }
}

export async function markWorkerOccurrenceOnTheWay(
  occurrenceId: string,
): Promise<WorkerBookingActionResponse> {
  return runWorkerOccurrenceAction(
    occurrenceId,
    'on_the_way',
  )
}

export async function markWorkerOccurrenceArrived(
  occurrenceId: string,
): Promise<WorkerBookingActionResponse> {
  return runWorkerOccurrenceAction(
    occurrenceId,
    'arrived',
  )
}

export async function cancelWorkerOccurrence(
  occurrenceId: string,
): Promise<WorkerBookingActionResponse> {
  return runWorkerOccurrenceAction(
    occurrenceId,
    'cancel',
  )
}

export async function performWorkerOccurrenceAction(
  occurrenceId: string,
  action: WorkerOccurrenceAction,
): Promise<WorkerBookingActionResponse> {
  return runWorkerOccurrenceAction(
    occurrenceId,
    action,
  )
}

export function isOccurrencePending(
  occurrence: WorkerBookingOccurrence,
): boolean {
  return (
    occurrence.status === 'scheduled' ||
    occurrence.status === 'assigned'
  )
}

export function isOccurrenceActive(
  occurrence: WorkerBookingOccurrence,
): boolean {
  return (
    occurrence.status === 'assigned' ||
    occurrence.status === 'on_the_way' ||
    occurrence.status === 'arrived' ||
    occurrence.status === 'in_progress'
  )
}

export function isOccurrenceCompleted(
  occurrence: WorkerBookingOccurrence,
): boolean {
  return occurrence.status === 'completed'
}

export function isOccurrenceCancelled(
  occurrence: WorkerBookingOccurrence,
): boolean {
  return occurrence.status === 'cancelled'
}

export function isOccurrenceTerminal(
  occurrence: WorkerBookingOccurrence,
): boolean {
  return (
    occurrence.status === 'completed' ||
    occurrence.status === 'cancelled'
  )
}