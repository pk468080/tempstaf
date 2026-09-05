import { useEffect, useRef } from 'react'
import { AppState } from 'react-native'
import * as Location from 'expo-location'

import { supabase } from '../lib/supabase'

type WorkerStatus =
  | 'offline'
  | 'available'
  | 'busy'
  | 'suspended'

const RENEW_INTERVAL_MS = 5 * 60 * 1000

export default function WorkerPresence() {
  const locationSubscription =
    useRef<Location.LocationSubscription | null>(null)

  const renewTimer =
    useRef<ReturnType<typeof setInterval> | null>(null)

  const activeRef =
    useRef(false)

  const stopTracking = () => {
    if (locationSubscription.current) {
      locationSubscription.current.remove()
      locationSubscription.current = null
    }

    if (renewTimer.current) {
      clearInterval(renewTimer.current)
      renewTimer.current = null
    }

    activeRef.current = false
  }

  const updateLocation = async () => {
    if (!activeRef.current) {
      return
    }

    try {
      const position =
        await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        })

      const { error } =
        await supabase.rpc(
          'worker_update_location',
          {
            p_latitude:
              position.coords.latitude,
            p_longitude:
              position.coords.longitude,
            p_booking_id: null,
          }
        )

      if (error) {
        console.error(
          '[TempStaff Worker] Location update failed:',
          error
        )
      }
    } catch (error) {
      console.error(
        '[TempStaff Worker] Failed to get location:',
        error
      )
    }
  }

  const renewPresence = async () => {
    if (!activeRef.current) {
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

      const status =
        worker?.worker_status as
          | WorkerStatus
          | null

      if (status !== 'available') {
        stopTracking()
        return
      }

      const {
        error: presenceError,
      } = await supabase.rpc(
        'worker_set_presence',
        {
          p_available: true,
        }
      )

      if (presenceError) {
        throw presenceError
      }

      await updateLocation()
    } catch (error) {
      console.error(
        '[TempStaff Worker] Presence renewal failed:',
        error
      )
    }
  }

  const startTracking = async () => {
    if (activeRef.current) {
      return
    }

    try {
      const {
        status,
      } =
        await Location.requestForegroundPermissionsAsync()

      if (status !== 'granted') {
        console.warn(
          '[TempStaff Worker] Location permission not granted.'
        )
        return
      }

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
        worker?.worker_status !==
        'available'
      ) {
        return
      }

      activeRef.current = true

      await supabase.rpc(
        'worker_set_presence',
        {
          p_available: true,
        }
      )

      await updateLocation()

      locationSubscription.current =
        await Location.watchPositionAsync(
          {
            accuracy:
              Location.Accuracy.High,
            timeInterval: 60 * 1000,
            distanceInterval: 100,
          },
          async position => {
            if (!activeRef.current) {
              return
            }

            try {
              const {
                error,
              } = await supabase.rpc(
                'worker_update_location',
                {
                  p_latitude:
                    position.coords.latitude,
                  p_longitude:
                    position.coords.longitude,
                  p_booking_id: null,
                }
              )

              if (error) {
                console.error(
                  '[TempStaff Worker] GPS update failed:',
                  error
                )
                return
              }

              await supabase.rpc(
                'worker_set_presence',
                {
                  p_available: true,
                }
              )
            } catch (error) {
              console.error(
                '[TempStaff Worker] GPS processing failed:',
                error
              )
            }
          }
        )

      renewTimer.current =
        setInterval(
          renewPresence,
          RENEW_INTERVAL_MS
        )
    } catch (error) {
      activeRef.current = false

      console.error(
        '[TempStaff Worker] Failed to start presence:',
        error
      )
    }
  }

  useEffect(() => {
    let mounted = true

    const checkPresence = async () => {
      if (!mounted) {
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
          error
        )
      }
    }

    void checkPresence()

    const interval =
      setInterval(
        checkPresence,
        30 * 1000
      )

    const subscription =
      AppState.addEventListener(
        'change',
        nextState => {
          if (
            nextState ===
              'active' &&
            activeRef.current
          ) {
            void renewPresence()
          }
        }
      )

    return () => {
      mounted = false
      clearInterval(interval)
      subscription.remove()
      stopTracking()
    }
  }, [])

  return null
}