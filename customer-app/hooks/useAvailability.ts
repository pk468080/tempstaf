import {
  useCallback,
  useState,
} from 'react'

import {
  checkInstantAvailability,
} from '../services/availability/instantAvailability.service'

import type {
  AvailabilityResult,
  AvailabilityStatus,
} from '../types/availability'

export function useAvailability() {
  const [status, setStatus] =
    useState<AvailabilityStatus>('idle')

  const [result, setResult] =
    useState<AvailabilityResult | null>(null)

  const [error, setError] =
    useState<string | null>(null)

  const checkInstant = useCallback(
    async (
      serviceId: string,
      latitude: number,
      longitude: number,
    ) => {
      setStatus('checking')
      setError(null)

      try {
        const nextResult =
          await checkInstantAvailability(
            serviceId,
            latitude,
            longitude,
          )

        setResult(nextResult)

        setStatus(
          nextResult.instantAvailable
            ? 'available'
            : 'fallback',
        )

        return nextResult
      } catch (nextError) {
        const message =
          nextError instanceof Error
            ? nextError.message
            : 'Unable to check availability.'

        setResult(null)
        setError(message)
        setStatus('error')

        return null
      }
    },
    [],
  )

  return {
    status,
    result,
    error,
    checkInstant,
  }
}