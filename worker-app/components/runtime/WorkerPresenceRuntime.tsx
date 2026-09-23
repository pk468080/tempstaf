import {
  useEffect,
  useRef,
} from 'react'

import {
  useWorkerRuntime,
} from '../../context/WorkerRuntimeContext'

import {
  getWorkerPresence,
  sendWorkerPresenceHeartbeat,
} from '../../services/worker/workerPresence.service'

import {
  getCurrentWorkerLocation,
} from '../../services/location/workerLocation.service'

import {
  startWorkerBackgroundLocationTracking,
  stopWorkerBackgroundLocationTracking,
} from '../../services/location/workerBackgroundLocation.service'

const PRESENCE_POLL_INTERVAL_MS = 15_000
const HEARTBEAT_INTERVAL_MS = 30_000

export default function WorkerPresenceRuntime() {
  const {
    session,
  } = useWorkerRuntime()

  const stoppedRef =
    useRef(false)

  useEffect(() => {
    if (!session?.user?.id) {
      return
    }

    stoppedRef.current = false

    let backgroundTrackingAttempted =
      false

    let lastHeartbeatAt = 0

    let inFlight =
      false

    async function stopBackgroundTracking() {
      try {
        await stopWorkerBackgroundLocationTracking()
      } catch (cause) {
        console.warn(
          'Unable to stop worker background location tracking:',
          cause,
        )
      }
    }

    async function runCycle() {
      if (
        stoppedRef.current ||
        inFlight
      ) {
        return
      }

      inFlight = true

      try {
        const presence =
          await getWorkerPresence()

        if (stoppedRef.current) {
          return
        }

        const workerIsAvailable =
          presence?.status ===
          'available'

        if (!workerIsAvailable) {
          if (
            backgroundTrackingAttempted
          ) {
            await stopBackgroundTracking()

            backgroundTrackingAttempted =
              false
          }

          return
        }

        if (
          !backgroundTrackingAttempted
        ) {
          backgroundTrackingAttempted =
            true

          try {
            await startWorkerBackgroundLocationTracking()
          } catch (cause) {
            /*
             * Background location permission may not yet
             * be granted. Foreground heartbeat continues
             * to keep the presence alive while the app is active.
             */
            console.warn(
              'Worker background location tracking is unavailable:',
              cause,
            )
          }
        }

        const now =
          Date.now()

        if (
          now -
            lastHeartbeatAt <
          HEARTBEAT_INTERVAL_MS
        ) {
          return
        }

        const location =
          await getCurrentWorkerLocation({
            maximumAge: 5_000,
            timeout: 10_000,
          })

        if (stoppedRef.current) {
          return
        }

        await sendWorkerPresenceHeartbeat(
          location.latitude,
          location.longitude,
        )

        lastHeartbeatAt =
          Date.now()
      } catch (cause) {
        /*
         * A temporary location/network failure must not
         * crash the Worker App. The next cycle retries.
         */
        console.warn(
          'Worker presence runtime update failed:',
          cause,
        )
      } finally {
        inFlight = false
      }
    }

    void runCycle()

    const intervalId =
      setInterval(
        () => {
          void runCycle()
        },
        PRESENCE_POLL_INTERVAL_MS,
      )

    return () => {
      stoppedRef.current = true

      clearInterval(
        intervalId,
      )

      void stopBackgroundTracking()
    }
  }, [
    session?.user?.id,
  ])

  return null
}