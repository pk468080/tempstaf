import {
  useEffect,
  useRef,
  useState,
} from 'react'

import { adminAction } from '../lib/adminAction'
import { loadGoogleMaps } from '../lib/googleMaps'
import { supabase } from '../lib/supabase'

declare const google: any

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

const DEFAULT_LOCATION = {
  lat: 28.6139,
  lng: 77.209,
}

const emptyForm: Form = {
  id: '',
  service_id: '',
  name: '',
  city: '',
  state: '',
  center_latitude: DEFAULT_LOCATION.lat,
  center_longitude: DEFAULT_LOCATION.lng,
  radius_km: 5,
  is_active: true,
}

export default function ServiceAreas() {
  const [services, setServices] =
    useState<Service[]>([])

  const [areas, setAreas] =
    useState<Area[]>([])

  const [form, setForm] =
    useState<Form>(emptyForm)

  const [loading, setLoading] =
    useState(true)

  const [saving, setSaving] =
    useState(false)

  const [mapLoading, setMapLoading] =
    useState(true)

  const [mapError, setMapError] =
    useState<string | null>(null)

  const [error, setError] =
    useState<string | null>(null)

  const mapContainerRef =
    useRef<HTMLDivElement | null>(null)

  const searchInputRef =
    useRef<HTMLInputElement | null>(null)

  const mapRef =
    useRef<any>(null)

  const markerRef =
    useRef<any>(null)

  const circleRef =
    useRef<any>(null)

  const autocompleteRef =
    useRef<any>(null)

  const mapInitializedRef =
    useRef(false)

  async function loadData() {
    setLoading(true)
    setError(null)

    try {
      const [
        servicesResult,
        areasResult,
      ] = await Promise.all([
        supabase
          .from('services')
          .select(
            'id, name, is_active'
          )
          .order('name', {
            ascending: true,
          }),

        adminAction<Area[]>(
          'admin_list_service_areas'
        ),
      ])

      if (servicesResult.error) {
        throw servicesResult.error
      }

      if (areasResult.error) {
        throw areasResult.error
      }

      setServices(
        (servicesResult.data || []) as Service[]
      )

      setAreas(
        (areasResult.data || []) as Area[]
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
    void loadData()
  }, [])

  useEffect(() => {
    let cancelled = false

    async function initializeMap() {
      try {
        setMapLoading(true)
        setMapError(null)

        await loadGoogleMaps()

        if (
          cancelled ||
          !mapContainerRef.current ||
          !searchInputRef.current ||
          mapInitializedRef.current
        ) {
          return
        }

        mapInitializedRef.current = true

        const center = {
          lat: form.center_latitude,
          lng: form.center_longitude,
        }

        const map =
          new google.maps.Map(
            mapContainerRef.current,
            {
              center,
              zoom: 11,
              mapTypeControl: false,
              streetViewControl: false,
              fullscreenControl: true,
            }
          )

        mapRef.current = map

        const marker =
          new google.maps.Marker({
            position: center,
            map,
            draggable: true,
            title:
              'TempStaff service area center',
          })

        markerRef.current = marker

        const circle =
          new google.maps.Circle({
            map,
            center,
            radius:
              form.radius_km * 1000,
            editable: true,
            draggable: false,
            fillOpacity: 0.18,
            strokeWeight: 2,
          })

        circleRef.current = circle

        const autocomplete =
          new google.maps.places.Autocomplete(
            searchInputRef.current,
            {
              fields: [
                'geometry',
                'formatted_address',
                'name',
                'address_components',
              ],
              types: ['geocode'],
            }
          )

        autocompleteRef.current =
          autocomplete

        autocomplete.addListener(
          'place_changed',
          () => {
            const place =
              autocomplete.getPlace()

            const location =
              place.geometry?.location

            if (!location) {
              setMapError(
                'The selected place does not have a map location.'
              )
              return
            }

            const latitude =
              location.lat()

            const longitude =
              location.lng()

            marker.setPosition(
              location
            )

            circle.setCenter(
              location
            )

            map.panTo(location)
            map.setZoom(13)

            const components =
              place.address_components || []

            let city = ''
            let state = ''

            for (
              const component of components
            ) {
              const types =
                component.types || []

              if (
                types.includes(
                  'locality'
                )
              ) {
                city =
                  component.long_name
              }

              if (
                types.includes(
                  'administrative_area_level_1'
                )
              ) {
                state =
                  component.long_name
              }
            }

            const name =
              place.name ||
              searchInputRef.current
                ?.value ||
              form.name

            updateForm({
              name,
              city,
              state,
              center_latitude:
                latitude,
              center_longitude:
                longitude,
            })
          }
        )

        marker.addListener(
          'dragend',
          () => {
            const position =
              marker.getPosition()

            if (!position) {
              return
            }

            const latitude =
              position.lat()

            const longitude =
              position.lng()

            circle.setCenter(
              position
            )

            updateForm({
              center_latitude:
                latitude,
              center_longitude:
                longitude,
            })
          }
        )

        circle.addListener(
          'radius_changed',
          () => {
            const radiusMeters =
              circle.getRadius()

            if (
              typeof radiusMeters !==
              'number'
            ) {
              return
            }

            updateForm({
              radius_km:
                Number(
                  (
                    radiusMeters /
                    1000
                  ).toFixed(2)
                ),
            })
          }
        )

        setMapLoading(false)
      } catch (err) {
        console.error(
          '[TempStaff] Failed to initialize Google Maps:',
          err
        )

        if (!cancelled) {
          setMapError(
            err instanceof Error
              ? err.message
              : 'Failed to load Google Maps.'
          )

          setMapLoading(false)
        }
      }
    }

    void initializeMap()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (
      !mapInitializedRef.current ||
      !markerRef.current ||
      !circleRef.current ||
      !mapRef.current
    ) {
      return
    }

    const position = {
      lat: Number(
        form.center_latitude
      ),
      lng: Number(
        form.center_longitude
      ),
    }

    if (
      !Number.isFinite(position.lat) ||
      !Number.isFinite(position.lng)
    ) {
      return
    }

    markerRef.current.setPosition(
      position
    )

    circleRef.current.setCenter(
      position
    )

    circleRef.current.setRadius(
      Number(form.radius_km) * 1000
    )

    mapRef.current.panTo(position)
  }, [
    form.center_latitude,
    form.center_longitude,
  ])

  useEffect(() => {
    if (
      !circleRef.current ||
      !Number.isFinite(
        Number(form.radius_km)
      )
    ) {
      return
    }

    circleRef.current.setRadius(
      Number(form.radius_km) * 1000
    )
  }, [form.radius_km])

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
    setMapError(null)

    if (
      searchInputRef.current
    ) {
      searchInputRef.current.value =
        ''
    }

    if (
      markerRef.current &&
      circleRef.current &&
      mapRef.current
    ) {
      const position = {
        lat: DEFAULT_LOCATION.lat,
        lng: DEFAULT_LOCATION.lng,
      }

      markerRef.current.setPosition(
        position
      )

      circleRef.current.setCenter(
        position
      )

      circleRef.current.setRadius(
        emptyForm.radius_km * 1000
      )

      mapRef.current.panTo(
        position
      )

      mapRef.current.setZoom(11)
    }
  }

  function editArea(area: Area) {
    const nextForm: Form = {
      id: area.id,
      service_id:
        area.service_id,
      name: area.name,
      city:
        area.city || '',
      state:
        area.state || '',
      center_latitude:
        Number(
          area.center_latitude
        ),
      center_longitude:
        Number(
          area.center_longitude
        ),
      radius_km:
        Number(area.radius_km),
      is_active:
        area.is_active,
    }

    setForm(nextForm)
    setError(null)

    if (
      searchInputRef.current
    ) {
      searchInputRef.current.value =
        area.name
    }

    if (
      markerRef.current &&
      circleRef.current &&
      mapRef.current
    ) {
      const position = {
        lat:
          nextForm.center_latitude,
        lng:
          nextForm.center_longitude,
      }

      markerRef.current.setPosition(
        position
      )

      circleRef.current.setCenter(
        position
      )

      circleRef.current.setRadius(
        nextForm.radius_km * 1000
      )

      mapRef.current.panTo(
        position
      )

      mapRef.current.setZoom(13)
    }

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  async function saveArea() {
    setError(null)

    if (!form.service_id) {
      setError(
        'Please select a service.'
      )
      return
    }

    if (!form.name.trim()) {
      setError(
        'Please enter an area name.'
      )
      return
    }

    const latitude =
      Number(
        form.center_latitude
      )

    const longitude =
      Number(
        form.center_longitude
      )

    const radius =
      Number(
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
      const {
        error: actionError,
      } = await adminAction(
        'admin_upsert_service_area_v2',
        {
          p_id:
            form.id || null,

          p_service_id:
            form.service_id,

          p_name:
            form.name.trim(),

          p_city:
            form.city.trim(),

          p_state:
            form.state.trim(),

          p_center_latitude:
            latitude,

          p_center_longitude:
            longitude,

          p_radius_km:
            radius,

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
        service =>
          service.id ===
          serviceId
      )?.name ||
      'Unknown service'
    )
  }

  return (
    <div className="page-content">
      <div className="page-heading">
        <div>
          <h1>
            Service Areas
          </h1>

          <p>
            Control where each
            TempStaff service is
            available.
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
              Search for a location,
              position the marker and
              define the service radius.
            </p>
          </div>
        </div>

        <div
          style={{
            padding: 20,
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(3, minmax(0, 1fr))',
              gap: 16,
              marginBottom: 18,
            }}
          >
            <label>
              Service

              <select
                value={
                  form.service_id
                }
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
      service.is_active ||
      service.id === form.service_id
  )
  .map(service => (
                    <option
                      key={
                        service.id
                      }
                      value={
                        service.id
                      }
                    >
                      {service.name}
                    </option>
                  ))}
              </select>
            </label>

            <label>
              Search location

              <input
                ref={
                  searchInputRef
                }
                placeholder="Search locality, city or address"
                autoComplete="off"
              />
            </label>

            <label>
              Area / Locality

              <input
                value={
                  form.name
                }
                onChange={event =>
                  updateForm({
                    name:
                      event.target.value,
                  })
                }
                placeholder="e.g. Dwarka"
              />
            </label>

            <label>
              City

              <input
                value={
                  form.city
                }
                onChange={event =>
                  updateForm({
                    city:
                      event.target.value,
                  })
                }
                placeholder="e.g. Delhi"
              />
            </label>

            <label>
              State

              <input
                value={
                  form.state
                }
                onChange={event =>
                  updateForm({
                    state:
                      event.target.value,
                  })
                }
                placeholder="e.g. Delhi"
              />
            </label>

            <label>
              Radius (km)

              <input
                type="number"
                min="0.1"
                max="500"
                step="0.1"
                value={
                  form.radius_km
                }
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
          </div>

          <div
            style={{
              position: 'relative',
              width: '100%',
              height: 450,
              borderRadius: 12,
              overflow: 'hidden',
              border:
                '1px solid #d9dde5',
              background:
                '#f5f7fa',
            }}
          >
            <div
              ref={
                mapContainerRef
              }
              style={{
                width: '100%',
                height: '100%',
              }}
            />

            {mapLoading && (
              <div
                style={{
                  position:
                    'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems:
                    'center',
                  justifyContent:
                    'center',
                  background:
                    'rgba(255,255,255,0.88)',
                  fontWeight: 600,
                }}
              >
                Loading Google Maps...
              </div>
            )}

            {mapError && (
              <div
                style={{
                  position:
                    'absolute',
                  left: 16,
                  right: 16,
                  bottom: 16,
                  padding: 14,
                  borderRadius: 8,
                  background:
                    '#fff1f1',
                  color:
                    '#a21b1b',
                  border:
                    '1px solid #f0b8b8',
                  fontSize: 14,
                }}
              >
                {mapError}
              </div>
            )}
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(3, minmax(0, 1fr))',
              gap: 16,
              marginTop: 16,
            }}
          >
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

            <label
              style={{
                display: 'flex',
                alignItems:
                  'center',
                gap: 8,
                paddingTop: 24,
              }}
            >
              <input
                type="checkbox"
                checked={
                  form.is_active
                }
                onChange={event =>
                  updateForm({
                    is_active:
                      event.target
                        .checked,
                  })
                }
              />

              Service area active
            </label>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent:
                'space-between',
              alignItems: 'center',
              marginTop: 18,
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            <div
              style={{
                fontSize: 13,
                color: '#666',
              }}
            >
              Drag the marker to
              change the center.
              Resize the circle to
              change the coverage radius.
            </div>

            <div
              style={{
                display: 'flex',
                gap: 10,
              }}
            >
              <button
                className="dashboard-refresh"
                onClick={
                  resetForm
                }
                disabled={saving}
              >
                Clear
              </button>

              <button
                className="dashboard-refresh"
                onClick={
                  saveArea
                }
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
      </div>

      <div className="panel">
        <div className="panel-header">
          <div>
            <h2>
              Configured service
              areas
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
              Loading service
              areas...
            </strong>

            <span>
              Please wait.
            </span>
          </div>
        ) : areas.length ===
          0 ? (
          <div className="bookings-empty">
            <strong>
              No service areas
              configured
            </strong>

            <span>
              Add your first launch
              area above.
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
                  <tr
                    key={
                      area.id
                    }
                  >
                    <td>
                      <strong>
                        {
                          area.name
                        }
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
                          color:
                            '#777',
                          fontSize:
                            12,
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
                          editArea(
                            area
                          )
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