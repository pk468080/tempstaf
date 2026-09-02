import { useEffect, useState } from 'react'
import { adminAction } from '../lib/adminAction'
import { supabase } from '../lib/supabase'

type Service = {
  id: string
  name: string
  is_active: boolean
}

type Area = {
  id: string
  service_id: string
  name: string
  city: string | null
  state: string | null
  center_latitude: number
  center_longitude: number
  radius_km: number
  is_active: boolean
}

type Form = {
  id: string
  service_id: string
  name: string
  city: string
  state: string
  center_latitude: number
  center_longitude: number
  radius_km: number
  is_active: boolean
}

const emptyForm: Form = {
  id: '',
  service_id: '',
  name: '',
  city: '',
  state: '',
  center_latitude: 28.6139,
  center_longitude: 77.209,
  radius_km: 5,
  is_active: true,
}

export default function ServiceAreas() {
  const [services, setServices] = useState<Service[]>([])
  const [areas, setAreas] = useState<Area[]>([])
  const [form, setForm] = useState<Form>(emptyForm)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function loadData() {
    setLoading(true)
    setError(null)

    try {
      const [servicesResult, areasResult] =
        await Promise.all([
          supabase
            .from('services')
            .select(
              'id, name, is_active'
            )
            .order('name', {
              ascending: true,
            }),

          supabase
            .from('service_areas')
            .select(`
              id,
              service_id,
              name,
              city,
              state,
              center_latitude,
              center_longitude,
              radius_km,
              is_active
            `)
            .order('created_at', {
              ascending: false,
            }),
        ])

      if (servicesResult.error) {
        throw servicesResult.error
      }

      if (areasResult.error) {
        throw areasResult.error
      }

      setServices(
        (servicesResult.data ||
          []) as Service[]
      )

      setAreas(
        (areasResult.data ||
          []) as Area[]
      )
    } catch (err) {
      console.error(
        '[TempStaff] Failed to load service areas:',
        err
      )

      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load service areas.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  function updateForm(
    changes: Partial<Form>
  ) {
    setForm(current => ({
      ...current,
      ...changes,
    }))
  }

  function resetForm() {
    setForm(emptyForm)
    setError(null)
  }

  function editArea(area: Area) {
    setForm({
      id: area.id,
      service_id: area.service_id,
      name: area.name,
      city: area.city || '',
      state: area.state || '',
      center_latitude:
        Number(area.center_latitude),
      center_longitude:
        Number(area.center_longitude),
      radius_km: Number(area.radius_km),
      is_active: area.is_active,
    })

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  async function saveArea() {
    setError(null)

    if (!form.service_id) {
      setError('Please select a service.')
      return
    }

    if (!form.name.trim()) {
      setError('Please enter an area name.')
      return
    }

    const latitude = Number(
      form.center_latitude
    )

    const longitude = Number(
      form.center_longitude
    )

    const radius = Number(
      form.radius_km
    )

    if (
      !Number.isFinite(latitude) ||
      latitude < -90 ||
      latitude > 90
    ) {
      setError(
        'Latitude must be between -90 and 90.'
      )
      return
    }

    if (
      !Number.isFinite(longitude) ||
      longitude < -180 ||
      longitude > 180
    ) {
      setError(
        'Longitude must be between -180 and 180.'
      )
      return
    }

    if (
      !Number.isFinite(radius) ||
      radius <= 0 ||
      radius > 500
    ) {
      setError(
        'Radius must be greater than 0 and no more than 500 km.'
      )
      return
    }

    setSaving(true)

    try {
      const { error: actionError } =
        await adminAction(
          'admin_upsert_service_area_v2',
          {
            p_id: form.id || null,
            p_service_id:
              form.service_id,
            p_name: form.name.trim(),
            p_city: form.city.trim(),
            p_state: form.state.trim(),
            p_center_latitude:
              latitude,
            p_center_longitude:
              longitude,
            p_radius_km: radius,
            p_is_active:
              form.is_active,
          }
        )

      if (actionError) {
        throw actionError
      }

      resetForm()
      await loadData()
    } catch (err) {
      console.error(
        '[TempStaff] Failed to save service area:',
        err
      )

      setError(
        err instanceof Error
          ? err.message
          : 'Failed to save service area.'
      )
    } finally {
      setSaving(false)
    }
  }

  function serviceName(
    serviceId: string
  ) {
    return (
      services.find(
        service => service.id === serviceId
      )?.name ||
      'Unknown service'
    )
  }

  return (
    <div className="page-content">
      <div className="page-heading">
        <div>
          <h1>Service Areas</h1>

          <p>
            Control where each TempStaff service
            is available.
          </p>
        </div>

        <button
          className="dashboard-refresh"
          onClick={loadData}
          disabled={loading}
        >
          {loading
            ? 'Loading...'
            : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="error-banner">
          {error}
        </div>
      )}

      <div
        className="panel"
        style={{
          marginBottom: 24,
        }}
      >
        <div className="panel-header">
          <div>
            <h2>
              {form.id
                ? 'Edit service area'
                : 'Launch service in an area'}
            </h2>

            <p>
              Customers inside this radius can
              request the selected service.
            </p>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'repeat(3, minmax(0, 1fr))',
            gap: 16,
            padding: 20,
          }}
        >
          <label>
            Service

            <select
              value={form.service_id}
              onChange={event =>
                updateForm({
                  service_id:
                    event.target.value,
                })
              }
            >
              <option value="">
                Select service
              </option>

              {services
                .filter(
                  service =>
                    service.is_active
                )
                .map(service => (
                  <option
                    key={service.id}
                    value={service.id}
                  >
                    {service.name}
                  </option>
                ))}
            </select>
          </label>

          <label>
            Area / Locality

            <input
              value={form.name}
              onChange={event =>
                updateForm({
                  name: event.target.value,
                })
              }
              placeholder="e.g. Dwarka"
            />
          </label>

          <label>
            City

            <input
              value={form.city}
              onChange={event =>
                updateForm({
                  city: event.target.value,
                })
              }
              placeholder="e.g. Delhi"
            />
          </label>

          <label>
            State

            <input
              value={form.state}
              onChange={event =>
                updateForm({
                  state: event.target.value,
                })
              }
              placeholder="e.g. Delhi"
            />
          </label>

          <label>
            Center Latitude

            <input
              type="number"
              step="any"
              value={
                form.center_latitude
              }
              onChange={event =>
                updateForm({
                  center_latitude:
                    Number(
                      event.target.value
                    ),
                })
              }
            />
          </label>

          <label>
            Center Longitude

            <input
              type="number"
              step="any"
              value={
                form.center_longitude
              }
              onChange={event =>
                updateForm({
                  center_longitude:
                    Number(
                      event.target.value
                    ),
                })
              }
            />
          </label>

          <label>
            Radius (km)

            <input
              type="number"
              min="0.1"
              max="500"
              step="0.1"
              value={form.radius_km}
              onChange={event =>
                updateForm({
                  radius_km:
                    Number(
                      event.target.value
                    ),
                })
              }
            />
          </label>

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              paddingTop: 24,
            }}
          >
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={event =>
                updateForm({
                  is_active:
                    event.target.checked,
                })
              }
            />

            Service area active
          </label>

          <div
            style={{
              display: 'flex',
              alignItems: 'end',
              gap: 10,
            }}
          >
            <button
              className="dashboard-refresh"
              onClick={resetForm}
              disabled={saving}
            >
              Clear
            </button>

            <button
              className="dashboard-refresh"
              onClick={saveArea}
              disabled={saving}
            >
              {saving
                ? 'Saving...'
                : form.id
                  ? 'Save changes'
                  : 'Launch service'}
            </button>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <div>
            <h2>
              Configured service areas
            </h2>

            <p>
              {areas.length} area
              {areas.length === 1
                ? ''
                : 's'} configured
            </p>
          </div>
        </div>

        {loading ? (
          <div className="bookings-empty">
            <strong>
              Loading service areas...
            </strong>

            <span>
              Please wait.
            </span>
          </div>
        ) : areas.length === 0 ? (
          <div className="bookings-empty">
            <strong>
              No service areas configured
            </strong>

            <span>
              Add your first launch area above.
            </span>
          </div>
        ) : (
          <div className="bookings-table-wrap">
            <table className="bookings-table">
              <thead>
                <tr>
                  <th>
                    Area
                  </th>

                  <th>
                    Service
                  </th>

                  <th>
                    Location
                  </th>

                  <th>
                    Radius
                  </th>

                  <th>
                    Status
                  </th>

                  <th>
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                {areas.map(area => (
                  <tr key={area.id}>
                    <td>
                      <strong>
                        {area.name}
                      </strong>
                    </td>

                    <td>
                      {serviceName(
                        area.service_id
                      )}
                    </td>

                    <td>
                      {area.city ||
                        '—'}

                      {area.state
                        ? `, ${area.state}`
                        : ''}

                      <br />

                      <span
                        style={{
                          color: '#777',
                          fontSize: 12,
                        }}
                      >
                        {Number(
                          area.center_latitude
                        ).toFixed(6)}
                        {', '}
                        {Number(
                          area.center_longitude
                        ).toFixed(6)}
                      </span>
                    </td>

                    <td>
                      {Number(
                        area.radius_km
                      )}{' '}
                      km
                    </td>

                    <td>
                      <span
                        className={
                          area.is_active
                            ? 'booking-status booking-status-paid'
                            : 'booking-status booking-status-cancelled'
                        }
                      >
                        {area.is_active
                          ? 'Active'
                          : 'Inactive'}
                      </span>
                    </td>

                    <td>
                      <button
                        className="dashboard-refresh"
                        onClick={() =>
                          editArea(area)
                        }
                      >
                        Edit
                      </button>
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