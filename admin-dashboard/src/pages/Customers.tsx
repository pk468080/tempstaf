import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

type Customer = {
  id: string
  full_name: string | null
  avatar_url: string | null
  is_active: boolean
  booking_count: number
}

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
async function loadCustomers() {
  setLoading(true)
  setError(null)

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        id,
        full_name,
        avatar_url,
        is_active
      `)
      .eq('role', 'customer')
      .order('created_at', {
        ascending: false,
      })

    if (error) {
      throw error
    }

    const customerIds = (data || []).map(
      (customer) => customer.id
    )

    let bookingCounts = new Map<string, number>()

    if (customerIds.length > 0) {
      const {
        data: bookings,
        error: bookingsError,
      } = await supabase
        .from('bookings')
        .select('customer_id')
        .in('customer_id', customerIds)

      if (bookingsError) {
        console.warn(
          'Could not load booking counts:',
          bookingsError
        )
      } else {
        for (const booking of bookings || []) {
          if (!booking.customer_id) continue

          bookingCounts.set(
            booking.customer_id,
            (bookingCounts.get(booking.customer_id) || 0) + 1
          )
        }
      }
    }

    const result: Customer[] = (data || []).map(
      (profile) => ({
        id: profile.id,
        full_name: profile.full_name,
        avatar_url: profile.avatar_url,
        is_active: profile.is_active,
        booking_count:
          bookingCounts.get(profile.id) || 0,
      })
    )

    setCustomers(result)
  } catch (err) {
    console.error(
      'Failed to load customers:',
      err
    )

    setError(
      err instanceof Error
        ? err.message
        : 'Failed to load customers.'
    )

    setCustomers([])
  } finally {
    setLoading(false)
  }
}   

  useEffect(() => {
    loadCustomers()
  }, [])

  return (
    <div className="page-content">

      <div className="page-heading">
        <div>
          <h1>Customers</h1>
          <p>
            Manage TempStaff customers.
          </p>
        </div>

        <button
          className="dashboard-refresh"
          onClick={loadCustomers}
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="error-banner">
          Failed to load customers: {error}
        </div>
      )}

      <div className="panel">

        <div className="panel-header">
          <div>
            <h2>All customers</h2>
            <p>
              {loading
                ? 'Loading customers...'
                : `${customers.length} customer${
                    customers.length === 1
                      ? ''
                      : 's'
                  } found`}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="bookings-empty">
            <strong>Loading customers...</strong>
            <span>Please wait.</span>
          </div>

        ) : customers.length === 0 ? (
          <div className="bookings-empty">
            <strong>No customers found</strong>
            <span>
              Registered customers will appear here.
            </span>
          </div>

        ) : (
          <div className="bookings-table-wrap">
            <table className="bookings-table">

              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Customer ID</th>
                  <th>Status</th>
                  <th>Bookings</th>
                </tr>
              </thead>

              <tbody>
                {customers.map((customer) => (
                  <tr key={customer.id}>

                    <td>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                        }}
                      >
                        {customer.avatar_url ? (
                          <img
                            src={customer.avatar_url}
                            alt=""
                            style={{
                              width: 38,
                              height: 38,
                              borderRadius: '50%',
                              objectFit: 'cover',
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: 38,
                              height: 38,
                              borderRadius: '50%',
                              background: '#eef0f3',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                            }}
                          >
                            {(customer.full_name || 'C')
                              .charAt(0)
                              .toUpperCase()}
                          </div>
                        )}

                        <strong>
                          {customer.full_name ||
                            'Unnamed Customer'}
                        </strong>
                      </div>
                    </td>

                    <td>
                      <span className="booking-id">
                        {customer.id.slice(0, 8)}
                      </span>
                    </td>

                    <td>
                      <span
                        className={
                          customer.is_active
                            ? 'booking-status booking-status-paid'
                            : 'booking-status booking-status-cancelled'
                        }
                      >
                        {customer.is_active
                          ? 'Active'
                          : 'Inactive'}
                      </span>
                    </td>

                    <td>
                      <strong>
                        {customer.booking_count}
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
