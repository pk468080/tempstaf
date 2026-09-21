// worker-app/types/worker.ts

export type WorkerStatus =
  | 'offline'
  | 'available'
  | 'busy'
  | 'suspended'

export type WorkerLocation = {
  latitude: number
  longitude: number
  recordedAt: string
}

export type WorkerProfile = {
  id: string

  fullName: string | null
  email: string | null
  phone: string | null

  isActive: boolean

  workerStatus: WorkerStatus

  isVerified: boolean
  isFeatured: boolean

  rating: number
  totalCompletedJobs: number

  serviceRadiusKm: number

  currentLocation: WorkerLocation | null

  createdAt: string
  updatedAt: string
}

export type WorkerService = {
  workerId: string
  serviceId: string
}

export type WorkerSummary = {
  id: string
  fullName: string | null

  workerStatus: WorkerStatus
  isVerified: boolean

  rating: number
  totalCompletedJobs: number

  serviceRadiusKm: number

  currentLocation: WorkerLocation | null
}

export type WorkerPresence = {
  workerId: string

  status: WorkerStatus

  latitude: number | null
  longitude: number | null

  lastHeartbeatAt: string | null
  presenceExpiresAt: string | null
}