import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

type Payment = {
  id: string
  booking_id?: string | null
  amount: number | string | null
  status: string | null
  created_at?: string | null
}

const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

function formatDate(value: string | null | undefined) {
  if (!value) return '—'

  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export default function Payments() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function loadPayments() {
    setLoading(true)
    setError(null)

    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      setError(error.message)
      setPayments([])
    } else {
      setPayments((data || []) as Payment[])
    }

    setLoading(false)
  }

  useEffect(() => {
    loadPayments()
  }, [])

  const paidPayments = payments.filter(
    payment => payment.status === 'paid'
  )

  const paidTotal = paidPayments.reduce(
    (total, payment) => total + Number(payment.amount || 0),
    0
  )

  return (
    <div className="page-content">
      <div className="page-heading">
        <div>
          <h1>Payments</h1>
          <p>Monitor payments and platform revenue.</p>
        </div>

        <button
          className="dashboard-refresh"
          onClick={loadPayments}
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="error-banner">
          Failed to load payments: {error}
        </div>
      )}

      <div className="metric-grid">
        <div className="panel metric-card">
          <span className="metric-label">Paid revenue</span>
          <strong>{currency.format(paidTotal)}</strong>
          <small>Successful transactions</small>
        </div>

        <div className="panel metric-card">
          <span className="metric-label">Successful payments</span>
          <strong>{paidPayments.length}</strong>
          <small>Of {payments.length} recent records</small>
        </div>

        <div className="panel metric-card">
          <span className="metric-label">Average paid value</span>
          <strong>
            {currency.format(
              paidPayments.length ? paidTotal / paidPayments.length : 0
            )}
          </strong>
          <small>Across successful payments</small>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <div>
            <h2>All payments</h2>
            <p>
              {loading
                ? 'Loading payments...'
                : `${payments.length} payment${
                    payments.length === 1 ? '' : 's'
                  } found`}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="bookings-empty">
            <strong>Loading payments...</strong>
            <span>Please wait.</span>
          </div>
        ) : payments.length === 0 ? (
          <div className="bookings-empty">
            <strong>No payments yet</strong>
            <span>
              Payment records will appear here.
            </span>
          </div>
        ) : (
          <div className="bookings-table-wrap">
            <table className="bookings-table">
              <thead>
                <tr>
                  <th>Payment</th>
                  <th>Booking</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>

              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <td>
                      <strong>{payment.id.slice(0, 8)}...</strong>
                    </td>
                    <td>{payment.booking_id || '—'}</td>
                    <td>{currency.format(Number(payment.amount || 0))}</td>
                    <td>
                      <span className={`booking-status booking-status-${payment.status || 'unknown'}`}>
                        {payment.status || 'Unknown'}
                      </span>
                    </td>
                    <td>{formatDate(payment.created_at)}</td>
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
