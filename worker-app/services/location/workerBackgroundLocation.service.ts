import * as Location from 'expo-location'
import * as TaskManager from 'expo-task-manager'

import {
  WORKER,
} from '../../constants/worker'

import {
  ensureWorkerBackgroundLocationPermission,
} from './workerLocation.service'

import {
  sendWorkerPresenceHeartbeat,
  updateWorkerLocation,
} from '../worker/workerPresence.service'

export const WORKER_BACKGROUND_LOCATION_TASK =
  'tempstaff-worker-background-location'

type BackgroundLocationTaskData = {
  locations?: Location.LocationObject[]
}

function mapLocation(
  location: Location.LocationObject,
): {
  latitude: number
  longitude: number
} {
  const latitude =
    location.coords.latitude

  const longitude =
    location.coords.longitude

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    throw new Error(
      'Background worker location coordinates are invalid.',
    )
  }

  if (
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    throw new Error(
      'Background worker location coordinates are outside the valid range.',
    )
  }

  return {
    latitude,
    longitude,
  }
}

TaskManager.defineTask(
  WORKER_BACKGROUND_LOCATION_TASK,
  async ({
    data,
    error,
  }: {
    data?: unknown
    error?: TaskManager.TaskManagerError
  }) => {
    if (error) {
      return
    }

    const taskData =
      data as
        | BackgroundLocationTaskData
        | undefined

    const locations =
      taskData?.locations ?? []

    if (
      locations.length === 0
    ) {
      return
    }

    const latestLocation =
      locations[
        locations.length - 1
      ]

    try {
      const {
        latitude,
        longitude,
      } = mapLocation(
        latestLocation,
      )

      /*
       * Available workers need their presence
       * heartbeat refreshed so the backend does
       * not expire their online state.
       *
       * Busy workers cannot use the presence
       * heartbeat RPC, so their generic location
       * is updated instead.
       */
      try {
        const result =
          await sendWorkerPresenceHeartbeat(
            latitude,
            longitude,
          )

        if (
          result.status ===
          'available'
        ) {
          return
        }
      } catch {
        /*
         * The worker may be busy, or the presence
         * heartbeat may no longer be eligible.
         * Fall through to the generic location
         * update.
         */
      }

      await updateWorkerLocation(
        latitude,
        longitude,
        null,
      )
    } catch {
      /*
       * Background tasks should not throw for a
       * transient location/auth/network failure.
       */
    }
  },
)

export async function isWorkerBackgroundLocationTrackingAvailable(): Promise<boolean> {
  return Location.isBackgroundLocationAvailableAsync()
}

export async function isWorkerBackgroundLocationTrackingStarted(): Promise<boolean> {
  return Location.hasStartedLocationUpdatesAsync(
    WORKER_BACKGROUND_LOCATION_TASK,
  )
}

export async function startWorkerBackgroundLocationTracking(): Promise<void> {
  await ensureWorkerBackgroundLocationPermission()

  const servicesEnabled =
    await Location.hasServicesEnabledAsync()

  if (!servicesEnabled) {
    throw new Error(
      'Device location services are disabled.',
    )
  }

  const available =
    await isWorkerBackgroundLocationTrackingAvailable()

  if (!available) {
    throw new Error(
      'Background location tracking is not available on this device.',
    )
  }

  const alreadyStarted =
    await isWorkerBackgroundLocationTrackingStarted()

  if (alreadyStarted) {
    return
  }

  await Location.startLocationUpdatesAsync(
    WORKER_BACKGROUND_LOCATION_TASK,
    {
      accuracy:
        Location.Accuracy.Balanced,

      distanceInterval:
        WORKER.location
          .minimumDistanceMeters,

      timeInterval:
        WORKER.location
          .defaultUpdateIntervalSeconds *
        1000,

      pausesUpdatesAutomatically:
        false,

      showsBackgroundLocationIndicator:
        true,

      activityType:
        Location.ActivityType.OtherNavigation,

      deferredUpdatesDistance:
        WORKER.location
          .minimumDistanceMeters,

      deferredUpdatesInterval:
        WORKER.location
          .defaultUpdateIntervalSeconds *
        1000,
    },
  )
}

export async function stopWorkerBackgroundLocationTracking(): Promise<void> {
  const started =
    await isWorkerBackgroundLocationTrackingStarted()

  if (!started) {
    return
  }

  await Location.stopLocationUpdatesAsync(
    WORKER_BACKGROUND_LOCATION_TASK,
  )
}

export async function restartWorkerBackgroundLocationTracking(): Promise<void> {
  await stopWorkerBackgroundLocationTracking()

  await startWorkerBackgroundLocationTracking()
}