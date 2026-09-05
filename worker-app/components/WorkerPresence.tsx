import { useEffect, useRef } from 'react'
import { AppState, type AppStateStatus } from 'react-native'
import * as Location from 'expo-location'
import { supabase } from '../lib/supabase'

type WorkerStatus =
  | 'offline'
  | 'available'
  | 'busy'
  | 'suspended'

const HEARTBEAT_INTERVAL_MS = 60 * 1000

export default function WorkerPresence() {
  const locationSubscription =
    useRef<Location.LocationSubscription | null>(null)

  const heartbeatTimer =
    useRef<ReturnType<typeof setInterval> | null>(null)

  const activeRef = useRef(false)
  const mountedRef = useRef(true)
  const heartbeatInProgressRef = useRef(false)

  const stopTracking = () => {
    activeRef.current = false

    if (locationSubscription.current) {
      locationSubscription.current.remove()
      locationSubscription.current = null
    }

    if (heartbeatTimer.current) {
      clearInterval(heartbeatTimer.current)
      heartbeatTimer.current = null
    }
  }

  const heartbeat = async () => {
    if (
      !mountedRef.current ||
      !activeRef.current ||
      heartbeatInProgressRef.current
    ) {
      return
    }

    heartbeatInProgressRef.current = true

    try {
      const {
        data: worker,
        error: workerError,
      } = await supabase
        .from('worker_profiles')
        .select('worker_status')
        .maybeSingle()

      if (workerError) {
        throw workerError
      }

      const status =
        worker?.worker_status as WorkerStatus | null

      if (status !== 'available') {
        stopTracking()
        return
      }

      const position =
        await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        })

      const { data, error } =
        await supabase.rpc(
          'worker_presence_heartbeat',
          {
            p_latitude:
              position.coords.latitude,
            p_longitude:
              position.coords.longitude,
          },
        )

      if (error) {
        throw error
      }

      if (!data?.success) {
        throw new Error(
          data?.error ||
            'Worker presence heartbeat failed.',
        )
      }

      console.log(
        '[TempStaff Worker] Presence heartbeat OK:',
        data.expires_at,
      )
    } catch (error) {
      console.error(
        '[TempStaff Worker] Presence heartbeat failed:',
        error,
      )
    } finally {
      heartbeatInProgressRef.current = false
    }
  }

  const startTracking = async () => {
    if (
      !mountedRef.current ||
      activeRef.current
    ) {
      return
    }

    try {
      const {
        status: permissionStatus,
      } =
        await Location.requestForegroundPermissionsAsync()

      if (permissionStatus !== 'granted') {
        console.warn(
          '[TempStaff Worker] Location permission not granted.',
        )
        return
      }

      const {
        data: worker,
        error: workerError,
      } = await supabase
        .from('worker_profiles')
        .select('worker_status')
        .maybeSingle()

      if (workerError) {
        throw workerError
      }

      if (
        worker?.worker_status !==
        'available'
      ) {
        return
      }

      activeRef.current = true

      // Immediate heartbeat.
      await heartbeat()

      if (!activeRef.current) {
        return
      }

      // GPS watcher gives us faster updates when
      // the worker actually moves.
      locationSubscription.current =
        await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 60 * 1000,
            distanceInterval: 100,
          },
          async position => {
            if (
              !mountedRef.current ||
              !activeRef.current
            ) {
              return
            }

            try {
              const { data, error } =
                await supabase.rpc(
                  'worker_presence_heartbeat',
                  {
                    p_latitude:
                      position.coords.latitude,
                    p_longitude:
                      position.coords.longitude,
                  },
                )

              if (error) {
                throw error
              }

              if (!data?.success) {
                throw new Error(
                  data?.error ||
                    'Presence heartbeat failed.',
                )
              }

              console.log(
                '[TempStaff Worker] GPS heartbeat OK:',
                data.expires_at,
              )
            } catch (error) {
              console.error(
                '[TempStaff Worker] GPS heartbeat failed:',
                error,
              )
            }
          },
        )

      // Timer guarantees renewal even if the worker
      // does not move enough to trigger the GPS watcher.
      heartbeatTimer.current =
        setInterval(() => {
          void heartbeat()
        }, HEARTBEAT_INTERVAL_MS)
    } catch (error) {
      activeRef.current = false

      console.error(
        '[TempStaff Worker] Failed to start presence:',
        error,
      )
    }
  }

  useEffect(() => {
    mountedRef.current = true

    const checkPresence = async () => {
      if (!mountedRef.current) {
        return
      }

      try {
        const {
          data: worker,
          error,
        } = await supabase
          .from('worker_profiles')
          .select('worker_status')
          .maybeSingle()

        if (error) {
          throw error
        }

        if (
          worker?.worker_status ===
          'available'
        ) {
          await startTracking()
        } else {
          stopTracking()
        }
      } catch (error) {
        console.error(
          '[TempStaff Worker] Presence check failed:',
          error,
        )
      }
    }

    void checkPresence()

    const presenceCheckTimer =
      setInterval(
        () => {
          void checkPresence()
        },
        30 * 1000,
      )

    const handleAppStateChange = (
      nextState: AppStateStatus,
    ) => {
      if (
        nextState === 'active' &&
        activeRef.current
      ) {
        void heartbeat()
      }
    }

    const subscription =
      AppState.addEventListener(
        'change',
        handleAppStateChange,
      )

    return () => {
      mountedRef.current = false

      clearInterval(
        presenceCheckTimer,
      )

      subscription.remove()

      stopTracking()
    }
  }, [])

  return null
}