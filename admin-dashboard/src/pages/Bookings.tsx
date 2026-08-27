import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

type Booking = {
  id: string
  customer_id: string
  worker_id: string | null
  service_id: string
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

type Worker = {
  id: string
  worker_status: string | null
  is_verified: boolean
}

export default function Bookings() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [workers, setWorkers] = useState<Worker[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [assigningBookingId, setAssigningBookingId] =
    useState<string | null>(null)

  async function loadBookings() {
    setLoading(true)
    setError(null)

    const [
      bookingsResult,
      profilesResult,
      servicesResult,
      workersResult,
    ] = await Promise.all([
      supabase
        .from('bookings')
        .select(`
          id,
          customer_id,
          worker_id,
          service_id,
          status,
          scheduled_start,
          scheduled_end,
          base_amount,
          platform_fee,
          tax_amount,
          total_amount
        `)
        .order('scheduled_start', {
          ascending: false,
        }),

      supabase
        .from('profiles')
        .select(`
          id,
          full_name
        `),

      supabase
        .from('services')
        .select(`
          id,
          name
        `),

      supabase
        .from('worker_profiles')
        .select(`
          id,
          worker_status,
          is_verified
        `)
        .eq('is_verified', true)
        .in('worker_status', ['available', 'busy']),
    ])

    if (bookingsResult.error) {
      console.error(
        'Failed to load bookings:',
        bookingsResult.error
      )

      setError(bookingsResult.error.message)
      setBookings([])
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

    if (workersResult.error) {
      console.error(
        'Failed to load workers:',
        workersResult.error
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

    setWorkers(
      (workersResult.data || []) as Worker[]
    )

    setLoading(false)
  }

  useEffect(() => {
    loadBookings()
  }, [])

  async function assignWorker(
  bookingId: string,
  workerId: string
) {
  if (!workerId) return

  setAssigningBookingId(bookingId)
  setError(null)

  const { error } = await supabase.rpc(
    'admin_assign_booking_worker',
    {
      p_booking_id: bookingId,
      p_worker_id: workerId,
    }
  )

  setAssigningBookingId(null)

  if (error) {
    console.error(
      'Failed to assign worker:',
      error
    )

    setError(error.message)
    return
  }

  await loadBookings()
}

  function getProfileName(id: string | null) {
    if (!id) return 'Unassigned'

    const profile = profiles.find(
      (item) => item.id === id
    )

    return profile?.full_name || 'Unknown'
  }

  function getWorkerName(workerId: string) {
    const worker = workers.find(
      (item) => item.id === workerId
    )

    if (!worker) {
      return getProfileName(workerId)
    }

    return getProfileName(worker.id)
  }

  function getServiceName(id: string) {
    const service = services.find(
      (item) => item.id === id
    )

    return service?.name || 'Unknown service'
  }

  function formatDate(value: string) {
    if (!value) return '—'

    return new Date(value).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  }

  function formatAmount(value: number) {
    return `₹${Number(value || 0).toLocaleString(
      'en-IN'
    )}`
  }

  function statusClass(status: string) {
    return `booking-status booking-status-${status
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')}`
  }

  return (
    <div className="page-content">

      <div className="page-heading">
        <div>
          <h1>Bookings</h1>

          <p>
            Manage all TempStaff bookings.
          </p>
        </div>

        <button
          className="dashboard-refresh"
          onClick={loadBookings}
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="error-banner">
          Failed to load bookings: {error}
        </div>
      )}

      <div className="panel bookings-panel">

        <div className="panel-header">
          <div>
            <h2>All bookings</h2>

            <p>
              {loading
                ? 'Loading bookings...'
                : `${bookings.length} booking${
                    bookings.length === 1
                      ? ''
                      : 's'
                  } found`}
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
        ) : bookings.length === 0 ? (
          <div className="bookings-empty">
            <strong>
              No bookings yet
            </strong>

            <span>
              New TempStaff bookings will
              appear here.
            </span>
          </div>
        ) : (
          <div className="bookings-table-wrap">

            <table className="bookings-table">

              <thead>
                <tr>
                  <th>Booking</th>
                  <th>Customer</th>
                  <th>Worker</th>
                  <th>Service</th>
                  <th>Schedule</th>
                  <th>Status</th>
                  <th>Total</th>
                </tr>
              </thead>

              <tbody>

                {bookings.map((booking) => (

                  <tr key={booking.id}>

                    <td>
                      <strong>
                        #{booking.id.slice(0, 8)}
                      </strong>
                    </td>

                    <td>
                      <strong>
                        {getProfileName(
                          booking.customer_id
                        )}
                      </strong>
                    </td>

                    <td>
                      {booking.worker_id ? (
                        <div>
                          <strong>
                            {getWorkerName(
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
                        </div>
                      ) : (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            flexWrap: 'wrap',
                          }}
                        >
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
                            <option
                              value=""
                              disabled
                            >
                              Select worker
                            </option>

                            {workers.map(
                              (worker) => (
                                <option
                                  key={worker.id}
                                  value={worker.id}
                                >
                                  {getProfileName(
                                    worker.id
                                  )}
                                  {' — '}
                                  {worker.worker_status ||
                                    'available'}
                                </option>
                              )
                            )}
                          </select>

                          {assigningBookingId ===
                            booking.id && (
                            <span>
                              Assigning...
                            </span>
                          )}
                        </div>
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
                      <strong>
                        {formatAmount(
                          booking.total_amount
                        )}
                      </strong>
                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>
        )}

      </div>

    </div>
  )
}