import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

type Booking = {
  id: string
  customer_id: string
  worker_id: string | null
  service_id: string
  fulfillment_type: string | null
  status: string
  scheduled_start: string
  scheduled_end: string
  base_amount: number
  platform_fee: number
  tax_amount: number
  total_amount: number
}

type Profile = {
  id: string
  full_name: string | null
}

type Service = {
  id: string
  name: string
}

type EligibleWorker = {
  worker_id: string
  worker_status: string | null
  rating: number | null
  total_completed_jobs: number | null
  distance_km: number | null
}

export default function Bookings() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [services, setServices] = useState<Service[]>([])

  const [eligibleWorkers, setEligibleWorkers] =
    useState<Record<string, EligibleWorker[]>>({})

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [assigningBookingId, setAssigningBookingId] =
    useState<string | null>(null)

  const [loadingWorkersFor, setLoadingWorkersFor] =
    useState<string | null>(null)

  const [showOnlyNeedsAssignment, setShowOnlyNeedsAssignment] =
    useState(true)

  async function loadBookings() {
    setLoading(true)
    setError(null)

    const [
      bookingsResult,
      profilesResult,
      servicesResult,
    ] = await Promise.all([
      supabase
        .from('bookings')
        .select(`
          id,
          customer_id,
          worker_id,
          service_id,
          fulfillment_type,
          status,
          scheduled_start,
          scheduled_end,
          base_amount,
          platform_fee,
          tax_amount,
          total_amount
        `)
        .order('scheduled_start', {
          ascending: true,
        }),

      supabase
        .from('profiles')
        .select('id, full_name'),

      supabase
        .from('services')
        .select('id, name'),
    ])

    if (bookingsResult.error) {
      console.error(
        'Failed to load bookings:',
        bookingsResult.error
      )

      setError(bookingsResult.error.message)
      setLoading(false)

      return
    }

    if (profilesResult.error) {
      console.error(
        'Failed to load profiles:',
        profilesResult.error
      )
    }

    if (servicesResult.error) {
      console.error(
        'Failed to load services:',
        servicesResult.error
      )
    }

    setBookings(
      (bookingsResult.data || []) as Booking[]
    )

    setProfiles(
      (profilesResult.data || []) as Profile[]
    )

    setServices(
      (servicesResult.data || []) as Service[]
    )

    setEligibleWorkers({})
    setLoading(false)
  }

  useEffect(() => {
    loadBookings()
  }, [])

  const needsAssignment = useMemo(() => {
    return bookings.filter(
      (booking) =>
        !booking.worker_id &&
        (
          booking.status === 'paid' ||
          booking.status === 'searching_worker'
        )
    )
  }, [bookings])

  const displayedBookings = useMemo(() => {
    if (showOnlyNeedsAssignment) {
      return needsAssignment
    }

    return bookings
  }, [
    bookings,
    needsAssignment,
    showOnlyNeedsAssignment,
  ])

  async function loadEligibleWorkers(
    bookingId: string
  ) {
    if (eligibleWorkers[bookingId]) {
      return
    }

    setLoadingWorkersFor(bookingId)
    setError(null)

    const {
      data,
      error: rpcError,
    } = await supabase.rpc(
      'get_eligible_workers',
      {
        p_booking_id: bookingId,
      }
    )

    setLoadingWorkersFor(null)

    if (rpcError) {
      console.error(
        'Failed to load eligible workers:',
        rpcError
      )

      setError(rpcError.message)

      return
    }

    setEligibleWorkers(
      (current) => ({
        ...current,
        [bookingId]:
          (data || []) as EligibleWorker[],
      })
    )
  }

  async function cancelBooking(
    bookingId: string
  ) {
    const confirmed = window.confirm(
      'Cancel this booking? This will remove the worker and change the booking status.'
    )

    if (!confirmed) {
      return
    }

    setError(null)

    const {
      error: rpcError,
    } = await supabase.rpc(
      'customer_booking_action',
      {
        p_booking_id: bookingId,
        p_action: 'cancel',
      }
    )

    if (rpcError) {
      console.error(
        'Failed to cancel booking:',
        rpcError
      )

      setError(rpcError.message)

      return
    }

    await loadBookings()
  }

  async function assignWorker(
    bookingId: string,
    workerId: string
  ) {
    if (!workerId) {
      return
    }

    const confirmed = window.confirm(
      'Assign this worker to the booking?'
    )

    if (!confirmed) {
      return
    }

    setAssigningBookingId(bookingId)
    setError(null)

    const booking = bookings.find(
      (item) => item.id === bookingId
    )

    if (!booking) {
      setAssigningBookingId(null)
      setError('Booking not found.')
      return
    }

    if (
      booking.worker_id &&
      booking.status !== 'paid' &&
      booking.status !== 'searching_worker'
    ) {
      const {
        error: clearError,
      } = await supabase
        .from('bookings')
        .update({
          worker_id: null,
          status: 'searching_worker',
          updated_at: new Date().toISOString(),
        })
        .eq('id', bookingId)

      if (clearError) {
        setAssigningBookingId(null)
        setError(clearError.message)
        return
      }
    }

    const {
      error: rpcError,
    } = await supabase.rpc(
      'admin_assign_booking_worker',
      {
        p_booking_id: bookingId,
        p_worker_id: workerId,
      }
    )

    setAssigningBookingId(null)

    if (rpcError) {
      console.error(
        'Failed to assign worker:',
        rpcError
      )

      setError(rpcError.message)

      return
    }

    await loadBookings()
  }

  function getProfileName(
    id: string | null
  ) {
    if (!id) {
      return 'Unassigned'
    }

    return (
      profiles.find(
        (profile) => profile.id === id
      )?.full_name ||
      'Unknown'
    )
  }

  function getServiceName(
    id: string
  ) {
    return (
      services.find(
        (service) => service.id === id
      )?.name ||
      'Unknown service'
    )
  }

  function formatDate(
    value: string
  ) {
    if (!value) {
      return '—'
    }

    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
      return '—'
    }

    return date.toLocaleString(
      'en-IN',
      {
        dateStyle: 'medium',
        timeStyle: 'short',
      }
    )
  }

  function formatAmount(
    value: number
  ) {
    return `₹${Number(
      value || 0
    ).toLocaleString('en-IN')}`
  }

  function formatWorkerLabel(
    worker: EligibleWorker
  ) {
    const name = getProfileName(
      worker.worker_id
    )

    const distance =
      worker.distance_km == null
        ? 'distance n/a'
        : `${worker.distance_km.toFixed(
            1
          )} km`

    const rating =
      worker.rating == null
        ? 'new'
        : `${Number(
            worker.rating
          ).toFixed(1)}★`

    const jobs =
      worker.total_completed_jobs == null
        ? '0 jobs'
        : `${worker.total_completed_jobs} jobs`

    return `${name} — ${distance} — ${rating} — ${jobs}`
  }

  function statusClass(
    status: string
  ) {
    return (
      'booking-status booking-status-' +
      status
        .toLowerCase()
        .replace(
          /[^a-z0-9]+/g,
          '-'
        )
    )
  }

  return (
    <div className="page-content">
      <div className="page-heading">
        <div>
          <h1>Bookings</h1>

          <p>
            Manage TempStaff bookings and worker
            assignments.
          </p>
        </div>

        <button
          className="dashboard-refresh"
          onClick={loadBookings}
          disabled={loading}
        >
          {loading
            ? 'Loading...'
            : 'Refresh'}
        </button>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(3, minmax(0, 1fr))',
          gap: 12,
          marginBottom: 20,
        }}
      >
        <div className="panel">
          <strong>Needs assignment</strong>
          <div
            style={{
              fontSize: 28,
              fontWeight: 800,
              marginTop: 6,
            }}
          >
            {needsAssignment.length}
          </div>
        </div>

        <div className="panel">
          <strong>All bookings</strong>
          <div
            style={{
              fontSize: 28,
              fontWeight: 800,
              marginTop: 6,
            }}
          >
            {bookings.length}
          </div>
        </div>

        <div className="panel">
          <strong>View</strong>

          <div
            style={{
              marginTop: 10,
            }}
          >
            <button
              className="dashboard-refresh"
              onClick={() =>
                setShowOnlyNeedsAssignment(
                  (value) => !value
                )
              }
            >
              {showOnlyNeedsAssignment
                ? 'Show all bookings'
                : 'Show assignment queue'}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          Booking operation failed:{' '}
          {error}
        </div>
      )}

      <div className="panel bookings-panel">
        <div className="panel-header">
          <div>
            <h2>
              {showOnlyNeedsAssignment
                ? 'Needs assignment'
                : 'All bookings'}
            </h2>

            <p>
              {loading
                ? 'Loading bookings...'
                : `${displayedBookings.length} booking${
                    displayedBookings.length === 1
                      ? ''
                      : 's'
                  }`}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="bookings-empty">
            <strong>
              Loading bookings...
            </strong>

            <span>
              Please wait.
            </span>
          </div>
        ) : displayedBookings.length === 0 ? (
          <div className="bookings-empty">
            <strong>
              {showOnlyNeedsAssignment
                ? 'Assignment queue is clear'
                : 'No bookings yet'}
            </strong>

            <span>
              {showOnlyNeedsAssignment
                ? 'There are no paid or searching bookings waiting for a worker.'
                : 'New TempStaff bookings will appear here.'}
            </span>
          </div>
        ) : (
          <div className="bookings-table-wrap">
            <table className="bookings-table">
              <thead>
                <tr>
                  <th>Booking</th>
                  <th>Customer</th>
                  <th>Service</th>
                  <th>Mode</th>
                  <th>Schedule</th>
                  <th>Status</th>
                  <th>Worker / Assignment</th>
                  <th>Total</th>
                </tr>
              </thead>

              <tbody>
                {displayedBookings.map(
                  (booking) => {
                    const workers =
                      eligibleWorkers[
                        booking.id
                      ]

                    return (
                      <tr key={booking.id}>
                        <td>
                          <strong>
                            #
                            {booking.id.slice(
                              0,
                              8
                            )}
                          </strong>
                        </td>

                        <td>
                          {getProfileName(
                            booking.customer_id
                          )}
                        </td>

                        <td>
                          <strong>
                            {getServiceName(
                              booking.service_id
                            )}
                          </strong>
                        </td>

                        <td>
                          <span
                            className={
                              'booking-status'
                            }
                          >
                            {booking.fulfillment_type ===
                            'instant'
                              ? 'Instant'
                              : 'Scheduled'}
                          </span>
                        </td>

                        <td>
                          {formatDate(
                            booking.scheduled_start
                          )}
                        </td>

                        <td>
                          <span
                            className={statusClass(
                              booking.status
                            )}
                          >
                            {booking.status}
                          </span>
                        </td>

                        <td>
                          {booking.worker_id ? (
                            <div
                              style={{
                                minWidth: 260,
                              }}
                            >
                              <strong>
                                {getProfileName(
                                  booking.worker_id
                                )}
                              </strong>

                              <div
                                style={{
                                  fontSize: 12,
                                  marginTop: 4,
                                  opacity: 0.7,
                                }}
                              >
                                Assigned
                              </div>

                              <div
                                style={{
                                  marginTop: 10,
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: 8,
                                }}
                              >
                                {!workers ? (
                                  <button
                                    className="dashboard-refresh"
                                    onClick={() =>
                                      loadEligibleWorkers(
                                        booking.id
                                      )
                                    }
                                    disabled={
                                      loadingWorkersFor ===
                                      booking.id
                                    }
                                  >
                                    {loadingWorkersFor ===
                                    booking.id
                                      ? 'Finding workers...'
                                      : 'Reassign worker'}
                                  </button>
                                ) : workers.length === 0 ? (
                                  <div>
                                    <strong>
                                      No eligible workers
                                    </strong>

                                    <div
                                      style={{
                                        fontSize: 12,
                                        marginTop: 4,
                                        opacity: 0.7,
                                      }}
                                    >
                                      Check worker availability,
                                      service, location, or
                                      schedule.
                                    </div>
                                  </div>
                                ) : (
                                  <select
                                    defaultValue=""
                                    disabled={
                                      assigningBookingId ===
                                      booking.id
                                    }
                                    onChange={(event) =>
                                      assignWorker(
                                        booking.id,
                                        event.target.value
                                      )
                                    }
                                  >
                                    <option value="" disabled>
                                      Select replacement worker
                                    </option>

                                    {workers.map((worker) => (
                                      <option
                                        key={worker.worker_id}
                                        value={worker.worker_id}
                                      >
                                        {formatWorkerLabel(worker)}
                                      </option>
                                    ))}
                                  </select>
                                )}

                                <button
                                  className="dashboard-refresh"
                                  onClick={() =>
                                    cancelBooking(booking.id)
                                  }
                                >
                                  Cancel booking
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div
                              style={{
                                minWidth: 260,
                              }}
                            >
                              {!workers ? (
                                <button
                                  className="dashboard-refresh"
                                  onClick={() =>
                                    loadEligibleWorkers(
                                      booking.id
                                    )
                                  }
                                  disabled={
                                    loadingWorkersFor ===
                                    booking.id
                                  }
                                >
                                  {loadingWorkersFor ===
                                  booking.id
                                    ? 'Finding workers...'
                                    : 'Find eligible workers'}
                                </button>
                              ) : workers.length === 0 ? (
                                <div>
                                  <strong>
                                    No eligible workers
                                  </strong>

                                  <div
                                    style={{
                                      fontSize: 12,
                                      marginTop: 4,
                                      opacity: 0.7,
                                    }}
                                  >
                                    Check worker availability,
                                    service, location, or
                                    schedule.
                                  </div>
                                </div>
                              ) : (
                                <select
                                  defaultValue=""
                                  disabled={
                                    assigningBookingId ===
                                    booking.id
                                  }
                                  onChange={(event) =>
                                    assignWorker(
                                      booking.id,
                                      event.target.value
                                    )
                                  }
                                >
                                  <option value="" disabled>
                                    Select worker
                                  </option>

                                  {workers.map((worker) => (
                                    <option
                                      key={worker.worker_id}
                                      value={worker.worker_id}
                                    >
                                      {formatWorkerLabel(worker)}
                                    </option>
                                  ))}
                                </select>
                              )}

                              {assigningBookingId === booking.id && (
                                <div
                                  style={{
                                    fontSize: 12,
                                    marginTop: 5,
                                  }}
                                >
                                  Assigning worker...
                                </div>
                              )}
                            </div>
                          )}
                        </td>

                        <td>
                          <strong>
                            {formatAmount(
                              booking.total_amount
                            )}
                          </strong>
                        </td>
                      </tr>
                    )
                  }
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}