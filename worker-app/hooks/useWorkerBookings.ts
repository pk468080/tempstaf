import {
  useCallback,
  useEffect,
  useState,
} from 'react'

import {
  useWorkerRuntime,
} from '../context/WorkerRuntimeContext'

import type {
  BookingStatus,
  WorkerBooking,
} from '../types/booking'

import {
  getActiveWorkerBookings,
  getCompletedWorkerBookings,
  getUpcomingWorkerBookings,
  getWorkerBooking,
  getWorkerBookings,
  getWorkerBookingsByStatus,
} from '../services/bookings/workerBookings.service'

export type UseWorkerBookingsResult = {
  bookings: WorkerBooking[]
  activeBookings: WorkerBooking[]
  upcomingBookings: WorkerBooking[]
  completedBookings: WorkerBooking[]

  loading: boolean
  error: string | null

  refresh: () => Promise<void>

  refreshActive: () => Promise<void>

  refreshUpcoming: (
    limit?: number,
  ) => Promise<void>

  refreshCompleted: (
    limit?: number,
  ) => Promise<void>

  getBooking: (
    bookingId: string,
  ) => Promise<WorkerBooking | null>

  getByStatus: (
    status: BookingStatus,
  ) => Promise<WorkerBooking[]>

  clearError: () => void
}

export function useWorkerBookings(
  autoLoad = true,
): UseWorkerBookingsResult {
  const {
    bookingRevision,
  } = useWorkerRuntime()

  const [
    bookings,
    setBookings,
  ] = useState<WorkerBooking[]>([])

  const [
    activeBookings,
    setActiveBookings,
  ] = useState<WorkerBooking[]>([])

  const [
    upcomingBookings,
    setUpcomingBookings,
  ] = useState<WorkerBooking[]>([])

  const [
    completedBookings,
    setCompletedBookings,
  ] = useState<WorkerBooking[]>([])

  const [
    loading,
    setLoading,
  ] = useState(autoLoad)

  const [
    error,
    setError,
  ] = useState<string | null>(null)

  const refresh =
    useCallback(
      async (): Promise<void> => {
        setLoading(true)
        setError(null)

        try {
          const [
            nextBookings,
            nextActiveBookings,
            nextUpcomingBookings,
            nextCompletedBookings,
          ] = await Promise.all([
            getWorkerBookings(),
            getActiveWorkerBookings(),
            getUpcomingWorkerBookings(),
            getCompletedWorkerBookings(),
          ])

          setBookings(
            nextBookings,
          )

          setActiveBookings(
            nextActiveBookings,
          )

          setUpcomingBookings(
            nextUpcomingBookings,
          )

          setCompletedBookings(
            nextCompletedBookings,
          )
        } catch (cause) {
          setError(
            cause instanceof Error
              ? cause.message
              : 'Unable to load worker bookings.',
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
    if (bookingRevision === 0) {
      return
    }

    void refresh()
  }, [
    bookingRevision,
    refresh,
  ])

  const refreshActive =
    useCallback(
      async (): Promise<void> => {
        setError(null)

        try {
          const nextActiveBookings =
            await getActiveWorkerBookings()

          setActiveBookings(
            nextActiveBookings,
          )
        } catch (cause) {
          setError(
            cause instanceof Error
              ? cause.message
              : 'Unable to load active worker bookings.',
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
          const nextUpcomingBookings =
            await getUpcomingWorkerBookings(
              limit,
            )

          setUpcomingBookings(
            nextUpcomingBookings,
          )
        } catch (cause) {
          setError(
            cause instanceof Error
              ? cause.message
              : 'Unable to load upcoming worker bookings.',
          )
        }
      },
      [],
    )

  const refreshCompleted =
    useCallback(
      async (
        limit = 25,
      ): Promise<void> => {
        setError(null)

        try {
          const nextCompletedBookings =
            await getCompletedWorkerBookings(
              limit,
            )

          setCompletedBookings(
            nextCompletedBookings,
          )
        } catch (cause) {
          setError(
            cause instanceof Error
              ? cause.message
              : 'Unable to load completed worker bookings.',
          )
        }
      },
      [],
    )

  const getBooking =
    useCallback(
      async (
        bookingId: string,
      ): Promise<WorkerBooking | null> => {
        setError(null)

        try {
          return await getWorkerBooking(
            bookingId,
          )
        } catch (cause) {
          setError(
            cause instanceof Error
              ? cause.message
              : 'Unable to load worker booking.',
          )

          throw cause
        }
      },
      [],
    )

  const getByStatus =
    useCallback(
      async (
        status: BookingStatus,
      ): Promise<WorkerBooking[]> => {
        setError(null)

        try {
          return await getWorkerBookingsByStatus(
            status,
          )
        } catch (cause) {
          setError(
            cause instanceof Error
              ? cause.message
              : 'Unable to load worker bookings by status.',
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
    bookings,

    activeBookings,

    upcomingBookings,

    completedBookings,

    loading,
    error,

    refresh,

    refreshActive,

    refreshUpcoming,

    refreshCompleted,

    getBooking,

    getByStatus,

    clearError,
  }
}