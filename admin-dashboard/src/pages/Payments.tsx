import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Payments() {
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function loadPayments() {
    setLoading(true)
    setError(null)

    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .limit(100)

    console.log('PAYMENTS DATA:', data)
    console.log('PAYMENTS ERROR:', error)

    if (error) {
      setError(error.message)
      setPayments([])
    } else {
      setPayments(data || [])
    }

    setLoading(false)
  }

  useEffect(() => {
    loadPayments()
  }, [])

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
                  {Object.keys(payments[0]).map((key) => (
                    <th key={key}>{key}</th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {payments.map((payment, index) => (
                  <tr key={payment.id || index}>
                    {Object.keys(payments[0]).map((key) => (
                      <td key={key}>
                        {payment[key] === null ||
                        payment[key] === undefined
                          ? '—'
                          : String(payment[key])}
                      </td>
                    ))}
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
