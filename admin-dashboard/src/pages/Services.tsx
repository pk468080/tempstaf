import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { adminAction } from '../lib/adminAction'

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
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<
    'all' | 'active' | 'inactive'
  >('all')

  async function loadServices() {
    setLoading(true)
    setError(null)

    try {
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

      const workerCounts = new Map<string, number>()

      for (const row of workerServices || []) {
        if (!row.service_id) {
          continue
        }

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
          is_active: Boolean(service.is_active),
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

  async function setServiceActive(
    service: Service
  ) {
    const nextState = !service.is_active

    const action = nextState
      ? 'activate'
      : 'deactivate'

    const confirmed = window.confirm(
      nextState
        ? `Activate ${service.name}?`
        : `Deactivate ${service.name}?`
    )

    if (!confirmed) {
      return
    }

    setProcessingId(service.id)
    setError(null)

    const {
      error: rpcError,
    } = await adminAction(
      'admin_set_service_active',
      {
        p_service_id: service.id,
        p_is_active: nextState,
      }
    )

    setProcessingId(null)

    if (rpcError) {
      console.error(
        `Failed to ${action} service:`,
        rpcError
      )

      setError(
        `Failed to ${action} service: ${rpcError.message}`
      )

      return
    }

    await loadServices()
  }

  useEffect(() => {
    loadServices()
  }, [])

  const filteredServices = useMemo(() => {
    const normalizedSearch =
      search.trim().toLowerCase()

    return services.filter((service) => {
      const matchesStatus =
        status === 'all' ||
        (status === 'active' &&
          service.is_active) ||
        (status === 'inactive' &&
          !service.is_active)

      if (!matchesStatus) {
        return false
      }

      if (!normalizedSearch) {
        return true
      }

      return [
        service.name,
        service.description,
        service.id,
      ].some(
        (value) =>
          value
            ?.toLowerCase()
            .includes(normalizedSearch)
      )
    })
  }, [services, search, status])

  const activeCount = services.filter(
    (service) => service.is_active
  ).length

  const inactiveCount = services.filter(
    (service) => !service.is_active
  ).length

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
          {loading
            ? 'Loading...'
            : 'Refresh'}
        </button>
      </div>

      {error && (
        <div
          className="error-banner"
          style={{
            marginBottom: 20,
          }}
        >
          {error}
        </div>
      )}

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
          <strong>Total services</strong>

          <div
            style={{
              fontSize: 28,
              fontWeight: 800,
              marginTop: 6,
            }}
          >
            {services.length}
          </div>
        </div>

        <div className="panel">
          <strong>Active</strong>

          <div
            style={{
              fontSize: 28,
              fontWeight: 800,
              marginTop: 6,
            }}
          >
            {activeCount}
          </div>
        </div>

        <div className="panel">
          <strong>Inactive</strong>

          <div
            style={{
              fontSize: 28,
              fontWeight: 800,
              marginTop: 6,
            }}
          >
            {inactiveCount}
          </div>
        </div>
      </div>

      <div
        className="panel"
        style={{
          marginBottom: 20,
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'minmax(260px, 1fr) 180px auto',
            gap: 12,
            alignItems: 'end',
          }}
        >
          <label>
            <strong>Search</strong>

            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Service name or ID"
              style={{
                width: '100%',
                marginTop: 6,
              }}
            />
          </label>

          <label>
            <strong>Status</strong>

            <select
              value={status}
              onChange={(event) =>
                setStatus(
                  event.target.value as
                    | 'all'
                    | 'active'
                    | 'inactive'
                )
              }
              style={{
                width: '100%',
                marginTop: 6,
              }}
            >
              <option value="all">
                All
              </option>

              <option value="active">
                Active
              </option>

              <option value="inactive">
                Inactive
              </option>
            </select>
          </label>

          <button
            className="dashboard-refresh"
            onClick={() => {
              setSearch('')
              setStatus('all')
            }}
          >
            Reset
          </button>
        </div>
      </div>

      <div className="panel">

        <div className="panel-header">
          <div>
            <h2>All services</h2>

            <p>
              {loading
                ? 'Loading services...'
                : `${filteredServices.length} of ${services.length} service${
                    services.length === 1
                      ? ''
                      : 's'
                  }`}
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
        ) : filteredServices.length ===
          0 ? (
          <div className="bookings-empty">
            <strong>
              No services found
            </strong>

            <span>
              Try changing the search or
              status filter.
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
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredServices.map(
                  (service) => (
                    <tr
                      key={service.id}
                    >

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

                      <td>
                        <button
                          className="dashboard-refresh"
                          disabled={
                            processingId ===
                            service.id
                          }
                          onClick={() =>
                            setServiceActive(
                              service
                            )
                          }
                        >
                          {processingId ===
                          service.id
                            ? 'Saving...'
                            : service.is_active
                              ? 'Deactivate'
                              : 'Activate'}
                        </button>
                      </td>

                    </tr>
                  )
                )}
              </tbody>

            </table>
          </div>
        )}

      </div>

    </div>
  )
}