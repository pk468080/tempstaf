import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

type Service = {
  id: string
  name: string
  description: string | null
  is_active: boolean
  worker_count: number
}

export default function Services() {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function loadServices() {
    setLoading(true)
    setError(null)

    try {
      // Load services from the existing database table.
      const {
        data: serviceRows,
        error: servicesError,
      } = await supabase
        .from('services')
        .select(`
          id,
          name,
          description,
          is_active
        `)
        .order('name', {
          ascending: true,
        })

      if (servicesError) {
        throw servicesError
      }

      // Load worker -> service relationships.
      const {
        data: workerServices,
        error: workerServicesError,
      } = await supabase
        .from('worker_services')
        .select(`
          worker_id,
          service_id
        `)

      if (workerServicesError) {
        throw workerServicesError
      }

      // Count workers for each service.
      const workerCounts = new Map<string, number>()

      for (const row of workerServices || []) {
        if (!row.service_id) continue

        workerCounts.set(
          row.service_id,
          (workerCounts.get(row.service_id) || 0) + 1
        )
      }

      const result: Service[] = (serviceRows || []).map(
        (service) => ({
          id: service.id,
          name: service.name,
          description: service.description,
          is_active: service.is_active,
          worker_count:
            workerCounts.get(service.id) || 0,
        })
      )

      setServices(result)
    } catch (err) {
      console.error(
        'Failed to load services:',
        err
      )

      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load services.'
      )

      setServices([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadServices()
  }, [])

  return (
    <div className="page-content">

      <div className="page-heading">
        <div>
          <h1>Services</h1>
          <p>
            Manage TempStaff services.
          </p>
        </div>

        <button
          className="dashboard-refresh"
          onClick={loadServices}
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="error-banner">
          Failed to load services: {error}
        </div>
      )}

      <div className="panel">

        <div className="panel-header">
          <div>
            <h2>All services</h2>
            <p>
              {loading
                ? 'Loading services...'
                : `${services.length} service${
                    services.length === 1
                      ? ''
                      : 's'
                  } found`}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="bookings-empty">
            <strong>
              Loading services...
            </strong>
            <span>
              Please wait.
            </span>
          </div>
        ) : services.length === 0 ? (
          <div className="bookings-empty">
            <strong>
              No services found
            </strong>
            <span>
              Services will appear here when
              they are added to TempStaff.
            </span>
          </div>
        ) : (
          <div className="bookings-table-wrap">
            <table className="bookings-table">
              <thead>
                <tr>
                  <th>Service</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th>Workers</th>
                </tr>
              </thead>

              <tbody>
                {services.map((service) => (
                  <tr key={service.id}>

                    <td>
                      <strong>
                        {service.name}
                      </strong>
                    </td>

                    <td>
                      <span
                        style={{
                          color: '#666',
                        }}
                      >
                        {service.description ||
                          'No description'}
                      </span>
                    </td>

                    <td>
                      <span
                        className={
                          service.is_active
                            ? 'booking-status booking-status-paid'
                            : 'booking-status booking-status-cancelled'
                        }
                      >
                        {service.is_active
                          ? 'Active'
                          : 'Inactive'}
                      </span>
                    </td>

                    <td>
                      <strong>
                        {service.worker_count}
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
