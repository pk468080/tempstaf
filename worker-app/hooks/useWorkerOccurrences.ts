import {
  useCallback,
  useEffect,
  useState,
} from 'react'

import {
  useWorkerRuntime,
} from '../context/WorkerRuntimeContext'

import type {
  WorkerBookingOccurrence,
} from '../types/booking'

import {
  getActiveWorkerOccurrences,
  getPendingWorkerOccurrences,
  getUpcomingWorkerOccurrences,
  getWorkerBookingOccurrence,
  getWorkerBookingOccurrences,
  getWorkerBookingOccurrencesForBooking,
} from '../services/bookings/workerBookingOccurrences.service'

export type UseWorkerOccurrencesResult = {
  occurrences: WorkerBookingOccurrence[]
  activeOccurrences: WorkerBookingOccurrence[]
  upcomingOccurrences: WorkerBookingOccurrence[]
  pendingOccurrences: WorkerBookingOccurrence[]

  loading: boolean
  error: string | null

  refresh: () => Promise<void>

  refreshActive: () => Promise<void>

  refreshUpcoming: (
    limit?: number,
  ) => Promise<void>

  refreshPending: () => Promise<void>

  getOccurrence: (
    occurrenceId: string,
  ) => Promise<WorkerBookingOccurrence | null>

  getForBooking: (
    bookingId: string,
  ) => Promise<WorkerBookingOccurrence[]>

  clearError: () => void
}

export function useWorkerOccurrences(
  autoLoad = true,
): UseWorkerOccurrencesResult {
  const {
    occurrenceRevision,
  } = useWorkerRuntime()

  const [
    occurrences,
    setOccurrences,
  ] = useState<WorkerBookingOccurrence[]>(
    [],
  )

  const [
    activeOccurrences,
    setActiveOccurrences,
  ] = useState<WorkerBookingOccurrence[]>(
    [],
  )

  const [
    upcomingOccurrences,
    setUpcomingOccurrences,
  ] = useState<WorkerBookingOccurrence[]>(
    [],
  )

  const [
    pendingOccurrences,
    setPendingOccurrences,
  ] = useState<WorkerBookingOccurrence[]>(
    [],
  )

  const [
    loading,
    setLoading,
  ] = useState(
    autoLoad,
  )

  const [
    error,
    setError,
  ] = useState<string | null>(
    null,
  )

  const refresh =
    useCallback(
      async (): Promise<void> => {
        setLoading(true)
        setError(null)

        try {
          const [
            nextOccurrences,
            nextActiveOccurrences,
            nextUpcomingOccurrences,
            nextPendingOccurrences,
          ] = await Promise.all([
            getWorkerBookingOccurrences(),
            getActiveWorkerOccurrences(),
            getUpcomingWorkerOccurrences(),
            getPendingWorkerOccurrences(),
          ])

          setOccurrences(
            nextOccurrences,
          )

          setActiveOccurrences(
            nextActiveOccurrences,
          )

          setUpcomingOccurrences(
            nextUpcomingOccurrences,
          )

          setPendingOccurrences(
            nextPendingOccurrences,
          )
        } catch (cause) {
          const message =
            cause instanceof Error
              ? cause.message
              : 'Unable to load worker booking occurrences.'

          setError(
            message,
          )
        } finally {
          setLoading(false)
        }
      },
      [],
    )

  useEffect(() => {
    if (!autoLoad) {
      return
    }

    void refresh()
  }, [
    autoLoad,
    refresh,
  ])

  useEffect(() => {
    if (
      occurrenceRevision === 0
    ) {
      return
    }

    void refresh()
  }, [
    occurrenceRevision,
    refresh,
  ])

  const refreshActive =
    useCallback(
      async (): Promise<void> => {
        setError(null)

        try {
          const nextActiveOccurrences =
            await getActiveWorkerOccurrences()

          setActiveOccurrences(
            nextActiveOccurrences,
          )
        } catch (cause) {
          const message =
            cause instanceof Error
              ? cause.message
              : 'Unable to load active worker occurrences.'

          setError(
            message,
          )
        }
      },
      [],
    )

  const refreshUpcoming =
    useCallback(
      async (
        limit = 10,
      ): Promise<void> => {
        setError(null)

        try {
          const nextUpcomingOccurrences =
            await getUpcomingWorkerOccurrences(
              limit,
            )

          setUpcomingOccurrences(
            nextUpcomingOccurrences,
          )
        } catch (cause) {
          const message =
            cause instanceof Error
              ? cause.message
              : 'Unable to load upcoming worker occurrences.'

          setError(
            message,
          )
        }
      },
      [],
    )

  const refreshPending =
    useCallback(
      async (): Promise<void> => {
        setError(null)

        try {
          const nextPendingOccurrences =
            await getPendingWorkerOccurrences()

          setPendingOccurrences(
            nextPendingOccurrences,
          )
        } catch (cause) {
          const message =
            cause instanceof Error
              ? cause.message
              : 'Unable to load pending worker occurrences.'

          setError(
            message,
          )
        }
      },
      [],
    )

  const getOccurrence =
    useCallback(
      async (
        occurrenceId: string,
      ): Promise<WorkerBookingOccurrence | null> => {
        setError(null)

        try {
          return await getWorkerBookingOccurrence(
            occurrenceId,
          )
        } catch (cause) {
          const message =
            cause instanceof Error
              ? cause.message
              : 'Unable to load worker booking occurrence.'

          setError(
            message,
          )

          throw cause
        }
      },
      [],
    )

  const getForBooking =
    useCallback(
      async (
        bookingId: string,
      ): Promise<WorkerBookingOccurrence[]> => {
        setError(null)

        try {
          return await getWorkerBookingOccurrencesForBooking(
            bookingId,
          )
        } catch (cause) {
          const message =
            cause instanceof Error
              ? cause.message
              : 'Unable to load booking occurrences.'

          setError(
            message,
          )

          throw cause
        }
      },
      [],
    )

  const clearError =
    useCallback(
      (): void => {
        setError(null)
      },
      [],
    )

  return {
    occurrences,

    activeOccurrences,

    upcomingOccurrences,

    pendingOccurrences,

    loading,

    error,

    refresh,

    refreshActive,

    refreshUpcoming,

    refreshPending,

    getOccurrence,

    getForBooking,

    clearError,
  }
}