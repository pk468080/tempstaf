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
  updateWorkerLocation,
} from '../../services/worker/workerPresence.service'

import {
  getCurrentWorkerLocation,
} from '../../services/location/workerLocation.service'

import {
  startWorkerBackgroundLocationTracking,
  stopWorkerBackgroundLocationTracking,
} from '../../services/location/workerBackgroundLocation.service'

import {
  getActiveWorkerBookings,
} from '../../services/bookings/workerBookings.service'

import {
  supabase,
} from '../../lib/supabase'

const PRESENCE_POLL_INTERVAL_MS = 15_000
const HEARTBEAT_INTERVAL_MS = 30_000

const LIVE_TRACKING_STATUSES = [
  'on_the_way',
  'arrived',
  'in_progress',
] as const

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

    const workerId =
      session.user.id

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

    async function hasActiveTrackingBooking(): Promise<boolean> {
      /*
       * Check parent bookings first.
       */
      const activeBookings =
        await getActiveWorkerBookings()

      const hasLiveParentBooking =
        activeBookings.some(
          (booking) =>
            LIVE_TRACKING_STATUSES.includes(
              booking.status as (
                typeof LIVE_TRACKING_STATUSES
              )[number],
            ),
        )

      if (hasLiveParentBooking) {
        return true
      }

      /*
       * Recurring bookings use occurrence-level
       * journey states, so check active occurrences too.
       */
      const {
        data,
        error,
      } = await supabase
        .from(
          'booking_schedule_occurrences',
        )
        .select('id')
        .eq(
          'worker_id',
          workerId,
        )
        .in(
          'status',
          [
            ...LIVE_TRACKING_STATUSES,
          ],
        )
        .limit(1)

      if (error) {
        throw error
      }

      return (
        (data?.length ?? 0) > 0
      )
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

        /*
         * A worker can be unavailable in presence because
         * they are busy, while still actively travelling
         * to or serving a customer.
         */
        const activeTrackingBooking =
          await hasActiveTrackingBooking()

        if (stoppedRef.current) {
          return
        }

        const shouldTrackLocation =
          workerIsAvailable ||
          activeTrackingBooking

        /*
         * Stop location tracking only when the worker is
         * neither available nor actively handling a booking.
         */
        if (!shouldTrackLocation) {
          if (
            backgroundTrackingAttempted
          ) {
            await stopBackgroundTracking()

            backgroundTrackingAttempted =
              false
          }

          return
        }

        /*
         * Keep background location tracking alive for:
         *
         * - available workers
         * - workers actively handling a booking
         */
        if (
          !backgroundTrackingAttempted
        ) {
          try {
            await startWorkerBackgroundLocationTracking()

            backgroundTrackingAttempted =
              true
          } catch (cause) {
            /*
             * Background permission may not be available.
             * Foreground location updates can still continue.
             */
            console.warn(
              'Worker background location tracking is unavailable:',
              cause,
            )

            backgroundTrackingAttempted =
              false
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

        /*
         * Available worker:
         * keep worker presence alive.
         */
        if (workerIsAvailable) {
          await sendWorkerPresenceHeartbeat(
            location.latitude,
            location.longitude,
          )
        }
        /*
         * Busy worker with an active booking:
         * write the location through worker_update_location.
         *
         * The backend creates booking-scoped tracking rows
         * for active parent bookings and active recurring
         * occurrences.
         */
        else if (
          activeTrackingBooking
        ) {
          await updateWorkerLocation(
            location.latitude,
            location.longitude,
            null,
          )
        }

        lastHeartbeatAt =
          Date.now()
      } catch (cause) {
        /*
         * Temporary network/location/database failures
         * should not crash the Worker App.
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