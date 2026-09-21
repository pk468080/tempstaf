import { supabase } from '../../lib/supabase'

import type {
  WorkerBookingAction,
  WorkerBookingActionResponse,
} from '../../types/booking'

type WorkerBookingActionRpcResult = {
  success?: boolean

  booking_id?: string
  occurrence_id?: string

  action?: string

  status?: string
  old_status?: string

  parent_status?: string
  parent_old_status?: string

  worker_accepted_at?: string | null

  error?: string
}

const ALLOWED_ACTIONS: WorkerBookingAction[] = [
  'accept',
  'decline',
  'on_the_way',
  'arrived',
  'cancel',
]

function validateBookingId(
  bookingId: string,
): void {
  if (!bookingId.trim()) {
    throw new Error(
      'Booking id is required.',
    )
  }
}

function validateAction(
  action: WorkerBookingAction,
): void {
  if (
    !ALLOWED_ACTIONS.includes(
      action,
    )
  ) {
    throw new Error(
      'Unsupported worker booking action.',
    )
  }
}

function mapActionResponse(
  result: WorkerBookingActionRpcResult,
): WorkerBookingActionResponse {
  return {
    success:
      result.success === true,

    bookingId:
      result.booking_id,

    occurrenceId:
      result.occurrence_id,

    action:
      result.action as
        | WorkerBookingAction
        | undefined,

    status:
      result.status,

    oldStatus:
      result.old_status,

    parentStatus:
      result.parent_status,

    parentOldStatus:
      result.parent_old_status,

    workerAcceptedAt:
      result.worker_accepted_at,

    error:
      result.error,
  }
}

async function runWorkerBookingAction(
  bookingId: string,
  action: WorkerBookingAction,
): Promise<WorkerBookingActionResponse> {
  validateBookingId(
    bookingId,
  )

  validateAction(
    action,
  )

  const {
    data,
    error,
  } = await supabase.rpc(
    'worker_booking_action',
    {
      p_booking_id:
        bookingId,

      p_action:
        action,
    },
  )

  if (error) {
    throw error
  }

  const result =
    (data ?? {}) as WorkerBookingActionRpcResult

  const response =
    mapActionResponse(
      result,
    )

  if (!response.success) {
    throw new Error(
      response.error ||
        'Worker booking action could not be completed.',
    )
  }

  if (
    response.bookingId &&
    response.bookingId !== bookingId
  ) {
    throw new Error(
      'Booking action response belongs to a different booking.',
    )
  }

  return response
}

export async function acceptWorkerBooking(
  bookingId: string,
): Promise<WorkerBookingActionResponse> {
  return runWorkerBookingAction(
    bookingId,
    'accept',
  )
}

export async function declineWorkerBooking(
  bookingId: string,
): Promise<WorkerBookingActionResponse> {
  return runWorkerBookingAction(
    bookingId,
    'decline',
  )
}

export async function markWorkerBookingOnTheWay(
  bookingId: string,
): Promise<WorkerBookingActionResponse> {
  return runWorkerBookingAction(
    bookingId,
    'on_the_way',
  )
}

export async function markWorkerBookingArrived(
  bookingId: string,
): Promise<WorkerBookingActionResponse> {
  return runWorkerBookingAction(
    bookingId,
    'arrived',
  )
}

export async function cancelWorkerBooking(
  bookingId: string,
): Promise<WorkerBookingActionResponse> {
  return runWorkerBookingAction(
    bookingId,
    'cancel',
  )
}

export async function performWorkerBookingAction(
  bookingId: string,
  action: WorkerBookingAction,
): Promise<WorkerBookingActionResponse> {
  return runWorkerBookingAction(
    bookingId,
    action,
  )
}

export function isWorkerBookingActionSuccessful(
  response: WorkerBookingActionResponse,
): boolean {
  return response.success === true
}

export function getWorkerBookingActionError(
  response: WorkerBookingActionResponse,
): string | null {
  return response.success
    ? null
    : response.error ||
        'Worker booking action failed.'
}