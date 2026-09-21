import type {
  WorkerPresence,
  WorkerProfile,
  WorkerStatus,
} from '../types/worker'

import { WORKER } from '../constants/worker'

export function getWorkerStatusLabel(status: WorkerStatus): string {
  return WORKER.labels.status[status]
}

export function isWorkerAvailable(status: WorkerStatus): boolean {
  return status === WORKER.status.available
}

export function isWorkerBusy(status: WorkerStatus): boolean {
  return status === WORKER.status.busy
}

export function isWorkerOffline(status: WorkerStatus): boolean {
  return status === WORKER.status.offline
}

export function isWorkerSuspended(status: WorkerStatus): boolean {
  return status === WORKER.status.suspended
}

export function canWorkerAcceptBookings(
  worker: WorkerProfile,
): boolean {
  return (
    worker.isActive &&
    worker.isVerified &&
    worker.workerStatus === WORKER.status.available &&
    !isPresenceExpired(worker.currentLocation?.recordedAt ?? null)
  )
}

export function canWorkerAcceptOffers(
  worker: WorkerProfile,
): boolean {
  return (
    worker.isActive &&
    worker.workerStatus === WORKER.status.available &&
    worker.workerStatus !== WORKER.status.suspended
  )
}

export function isPresenceExpired(
  expiresAt: string | null,
  now: Date = new Date(),
): boolean {
  if (!expiresAt) {
    return true
  }

  const expiry = new Date(expiresAt)

  if (Number.isNaN(expiry.getTime())) {
    return true
  }

  return expiry.getTime() <= now.getTime()
}

export function hasRecentLocation(
  recordedAt: string | null,
  maxAgeSeconds: number = WORKER.presence.expirySeconds,
  now: Date = new Date(),
): boolean {
  if (!recordedAt) {
    return false
  }

  const recorded = new Date(recordedAt)

  if (Number.isNaN(recorded.getTime())) {
    return false
  }

  const ageMs = now.getTime() - recorded.getTime()

  return ageMs >= 0 && ageMs <= maxAgeSeconds * 1000
}

export function isPresenceActive(
  presence: WorkerPresence,
  now: Date = new Date(),
): boolean {
  return (
    presence.status === WORKER.status.available &&
    !isPresenceExpired(presence.presenceExpiresAt, now)
  )
}

export function getStatusMessage(status: WorkerStatus): string {
  switch (status) {
    case WORKER.status.available:
      return 'You are available for new jobs.'

    case WORKER.status.busy:
      return 'You are currently handling a job.'

    case WORKER.status.offline:
      return 'You are offline and will not receive new jobs.'

    case WORKER.status.suspended:
      return 'Your account is currently suspended.'

    default:
      return ''
  }
}

export function getNextStatus(
  status: WorkerStatus,
): WorkerStatus {
  switch (status) {
    case WORKER.status.offline:
      return WORKER.status.available

    case WORKER.status.available:
      return WORKER.status.offline

    case WORKER.status.busy:
      return WORKER.status.offline

    case WORKER.status.suspended:
      return WORKER.status.suspended

    default:
      return WORKER.status.offline
  }
}