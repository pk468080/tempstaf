// worker-app/constants/worker.ts

import type { WorkerStatus } from '../types/worker'

export const WORKER = {
  status: {
    offline: 'offline' as WorkerStatus,
    available: 'available' as WorkerStatus,
    busy: 'busy' as WorkerStatus,
    suspended: 'suspended' as WorkerStatus,
  },

  labels: {
    status: {
      offline: 'Offline',
      available: 'Available',
      busy: 'Busy',
      suspended: 'Suspended',
    },
  },

  serviceRadius: {
    defaultKm: 5,
    minKm: 0.5,
    maxKm: 10,
  },

  location: {
    defaultUpdateIntervalSeconds: 30,
    activeBookingUpdateIntervalSeconds: 10,
    minimumDistanceMeters: 25,
  },

  presence: {
    heartbeatIntervalSeconds: 30,
    expirySeconds: 90,
  },

  profile: {
    minimumRating: 0,
    maximumRating: 5,
    minimumCompletedJobs: 0,
  },

  onboarding: {
    initialStep: 1,
  },
} as const