import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

import type {
  PropsWithChildren,
} from 'react'

import type {
  Session,
} from '@supabase/supabase-js'

import {
  supabase,
} from '../lib/supabase'

type WorkerRuntimeContextValue = {
  session: Session | null

  bookingRevision: number
  offerRevision: number
  notificationRevision: number

  latestOfferBookingId: string | null
  latestAssignedBookingId: string | null

  realtimeConnected: boolean
}

const WorkerRuntimeContext =
  createContext<
    WorkerRuntimeContextValue | null
  >(null)

type BookingRealtimeRecord = {
  id?: unknown
  worker_id?: unknown
  status?: unknown
}

type OfferRealtimeRecord = {
  booking_id?: unknown
  worker_id?: unknown
  status?: unknown
}

export function WorkerRuntimeProvider({
  children,
}: PropsWithChildren) {
  const [
    session,
    setSession,
  ] = useState<Session | null>(null)

  const [
    bookingRevision,
    setBookingRevision,
  ] = useState(0)

  const [
    offerRevision,
    setOfferRevision,
  ] = useState(0)

  const [
    notificationRevision,
    setNotificationRevision,
  ] = useState(0)

  const [
    latestOfferBookingId,
    setLatestOfferBookingId,
  ] = useState<string | null>(null)

  const [
    latestAssignedBookingId,
    setLatestAssignedBookingId,
  ] = useState<string | null>(null)

  const [
    realtimeConnected,
    setRealtimeConnected,
  ] = useState(false)

  /*
   * Keep Worker Runtime synchronized with
   * the Supabase authentication session.
   */
  useEffect(() => {
    let mounted = true

    const loadSession =
      async (): Promise<void> => {
        try {
          const {
            data,
            error,
          } =
            await supabase.auth.getSession()

          if (error) {
            throw error
          }

          if (mounted) {
            setSession(
              data.session,
            )
          }
        } catch (cause) {
          console.error(
            'Worker runtime session initialization failed:',
            cause,
          )

          if (mounted) {
            setSession(null)
          }
        }
      }

    void loadSession()

    const {
      data: {
        subscription,
      },
    } =
      supabase.auth.onAuthStateChange(
        (
          _event,
          nextSession,
        ) => {
          if (!mounted) {
            return
          }

          setSession(
            nextSession,
          )
        },
      )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  /*
   * Subscribe to all worker-specific realtime
   * events through one Worker Runtime channel.
   */
  useEffect(() => {
    const workerId =
      session?.user?.id

    if (!workerId) {
      setRealtimeConnected(false)
      setLatestOfferBookingId(null)
      setLatestAssignedBookingId(null)

      return
    }

    let active = true

    const channel =
      supabase.channel(
        `worker-runtime:${workerId}`,
      )

    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'bookings',
        filter:
          `worker_id=eq.${workerId}`,
      },
      payload => {
        if (!active) {
          return
        }

        setBookingRevision(
          current => current + 1,
        )

        const record =
          (
            payload.new ??
            {}
          ) as BookingRealtimeRecord

        const bookingId =
          typeof record.id ===
          'string'
            ? record.id
            : null

        const status =
          typeof record.status ===
          'string'
            ? record.status
            : null

        const assignedWorkerId =
          typeof record.worker_id ===
          'string'
            ? record.worker_id
            : null

        if (
          bookingId &&
          assignedWorkerId ===
            workerId &&
          status === 'assigned'
        ) {
          setLatestAssignedBookingId(
            bookingId,
          )
        }
      },
    )

    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table:
          'booking_worker_offers',
        filter:
          `worker_id=eq.${workerId}`,
      },
      payload => {
        if (!active) {
          return
        }

        setOfferRevision(
          current => current + 1,
        )

        const record =
          (
            payload.new ??
            {}
          ) as OfferRealtimeRecord

        const bookingId =
          typeof record.booking_id ===
          'string'
            ? record.booking_id
            : null

        const offerWorkerId =
          typeof record.worker_id ===
          'string'
            ? record.worker_id
            : null

        const status =
          typeof record.status ===
          'string'
            ? record.status
            : null

        if (
          !bookingId ||
          offerWorkerId !== workerId
        ) {
          return
        }

        if (
          status === 'pending'
        ) {
          setLatestOfferBookingId(
            bookingId,
          )

          return
        }

        /*
         * Once an offer is accepted, declined,
         * expired or cancelled, it should no
         * longer be treated as the active offer.
         */
        setLatestOfferBookingId(
          current =>
            current === bookingId
              ? null
              : current,
        )
      },
    )

    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter:
          `user_id=eq.${workerId}`,
      },
      () => {
        if (!active) {
          return
        }

        setNotificationRevision(
          current => current + 1,
        )
      },
    )

    channel.subscribe(
      status => {
        if (!active) {
          return
        }

        if (
          status ===
          'SUBSCRIBED'
        ) {
          setRealtimeConnected(true)
          return
        }

        if (
          status ===
            'CHANNEL_ERROR' ||
          status ===
            'TIMED_OUT' ||
          status ===
            'CLOSED'
        ) {
          setRealtimeConnected(false)
        }
      },
    )

    return () => {
      active = false
      setRealtimeConnected(
        false,
      )

      void supabase.removeChannel(
        channel,
      )
    }
  }, [
    session?.user?.id,
  ])

  const value =
    useMemo<WorkerRuntimeContextValue>(
      () => ({
        session,

        bookingRevision,
        offerRevision,
        notificationRevision,

        latestOfferBookingId,
        latestAssignedBookingId,

        realtimeConnected,
      }),
      [
        session,

        bookingRevision,
        offerRevision,
        notificationRevision,

        latestOfferBookingId,
        latestAssignedBookingId,

        realtimeConnected,
      ],
    )

  return (
    <WorkerRuntimeContext.Provider
      value={value}
    >
      {children}
    </WorkerRuntimeContext.Provider>
  )
}

export function useWorkerRuntime(): WorkerRuntimeContextValue {
  const context =
    useContext(
      WorkerRuntimeContext,
    )

  if (!context) {
    throw new Error(
      'useWorkerRuntime must be used inside WorkerRuntimeProvider.',
    )
  }

  return context
}