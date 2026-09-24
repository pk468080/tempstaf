import { useEffect, useMemo, useState } from 'react'
import { Image as ImageIcon, Plus, RefreshCw, Upload, X } from 'lucide-react'

import { supabase } from '../lib/supabase'
import { adminAction } from '../lib/adminAction'

type Service = {
  id: string
  name: string
  description: string | null
  image_url: string | null
  is_active: boolean
  worker_count: number
}

const MAX_IMAGE_SIZE = 5 * 1024 * 1024
const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
])

export default function Services() {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<
    'all' | 'active' | 'inactive'
  >('all')

  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const [serviceName, setServiceName] = useState('')
  const [description, setDescription] = useState('')
  const [hourlyPrice, setHourlyPrice] = useState('')
  const [currency, setCurrency] = useState('INR')
  const [isActive, setIsActive] = useState(true)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  function resetCreateForm() {
    if (imagePreview) {
      window.URL.revokeObjectURL(imagePreview)
    }

    setServiceName('')
    setDescription('')
    setHourlyPrice('')
    setCurrency('INR')
    setIsActive(true)
    setImageFile(null)
    setImagePreview(null)
    setCreateError(null)
  }

  function closeCreateForm() {
    if (creating) {
      return
    }

    setCreateOpen(false)
    resetCreateForm()
  }

  function openCreateForm() {
    setCreateError(null)
    setCreateOpen(true)
  }

  function handleImageChange(file: File | null) {
    if (!file) {
      if (imagePreview) {
        window.URL.revokeObjectURL(imagePreview)
      }

      setImageFile(null)
      setImagePreview(null)
      setCreateError(null)
      return
    }

    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      setCreateError(
        'Use a JPG, PNG, or WebP image.'
      )
      return
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setCreateError(
        'Image must be 5 MB or smaller.'
      )
      return
    }

    if (imagePreview) {
      window.URL.revokeObjectURL(imagePreview)
    }

    setCreateError(null)
    setImageFile(file)
    setImagePreview(window.URL.createObjectURL(file))
  }

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
          image_url,
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
          image_url: service.image_url,
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

  async function createService() {
    const name = serviceName.trim()
    const descriptionValue = description.trim()
    const price = Number(hourlyPrice)
    const normalizedCurrency = currency.trim().toUpperCase()

    if (!name) {
      setCreateError('Service name is required.')
      return
    }

    if (!Number.isFinite(price) || price < 0) {
      setCreateError(
        'Enter a valid hourly price.'
      )
      return
    }

    if (!normalizedCurrency) {
      setCreateError('Currency is required.')
      return
    }

    setCreating(true)
    setCreateError(null)
    setError(null)

    let uploadedPath: string | null = null

    try {
      let imageUrl: string | null = null

      if (imageFile) {
        const extension =
          imageFile.name
            .split('.')
            .pop()
            ?.toLowerCase() || 'jpg'

        const safeName = name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')
          .slice(0, 60) || 'service'

        const uniqueId =
          typeof crypto !== 'undefined' &&
          typeof crypto.randomUUID === 'function'
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random()
                .toString(36)
                .slice(2, 10)}`

        uploadedPath =
          `services/${uniqueId}-${safeName}.${extension}`

        const {
          error: uploadError,
        } = await supabase
          .storage
          .from('service-images')
          .upload(
            uploadedPath,
            imageFile,
            {
              cacheControl: '3600',
              contentType: imageFile.type,
              upsert: false,
            }
          )

        if (uploadError) {
          throw uploadError
        }

        const {
          data: publicUrlData,
        } = supabase
          .storage
          .from('service-images')
          .getPublicUrl(uploadedPath)

        imageUrl =
          publicUrlData.publicUrl
      }

      const {
        error: rpcError,
      } = await adminAction(
        'admin_create_service',
        {
          p_name: name,
          p_description:
            descriptionValue || null,
          p_hourly_price: price,
          p_currency:
            normalizedCurrency,
          p_image_url: imageUrl,
          p_is_active: isActive,
        }
      )

      if (rpcError) {
        throw rpcError
      }

      setCreateOpen(false)
      resetCreateForm()
      await loadServices()
    } catch (err) {
      console.error(
        'Failed to create service:',
        err
      )

      if (uploadedPath) {
        const {
          error: cleanupError,
        } = await supabase
          .storage
          .from('service-images')
          .remove([uploadedPath])

        if (cleanupError) {
          console.error(
            'Failed to clean up uploaded service image:',
            cleanupError
          )
        }
      }

      setCreateError(
        err instanceof Error
          ? err.message
          : 'Failed to create service.'
      )
    } finally {
      setCreating(false)
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
    void loadServices()

    return () => {
      if (imagePreview) {
        window.URL.revokeObjectURL(imagePreview)
      }
    }
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
            Manage the staffing catalog and publish new hourly services.
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            gap: 10,
            alignItems: 'center',
          }}
        >
          <button
            className="dashboard-refresh"
            onClick={() => void loadServices()}
            disabled={loading}
          >
            <RefreshCw
              size={15}
              style={{
                marginRight: 7,
                verticalAlign: -2,
              }}
            />
            {loading ? 'Loading...' : 'Refresh'}
          </button>

          <button
            className="dashboard-refresh"
            onClick={openCreateForm}
            disabled={creating}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              background: '#062F52',
              color: '#FFFFFF',
            }}
          >
            <Plus
              size={16}
              style={{
                marginRight: 6,
              }}
            />
            Add service
          </button>
        </div>
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
                    services.length === 1 ? '' : 's'
                  }`}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="bookings-empty">
            <strong>Loading services...</strong>
            <span>Please wait.</span>
          </div>
        ) : filteredServices.length === 0 ? (
          <div className="bookings-empty">
            <strong>No services found</strong>
            <span>
              Try changing the search or status filter.
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
                  <th>Image</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredServices.map(
                  (service) => (
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

                      <td>
                        {service.image_url ? (
                          <img
                            src={service.image_url}
                            alt={service.name}
                            style={{
                              width: 52,
                              height: 52,
                              borderRadius: 12,
                              objectFit: 'cover',
                              border:
                                '1px solid #E3EBEF',
                              display: 'block',
                            }}
                          />
                        ) : (
                          <span
                            style={{
                              display: 'inline-flex',
                              width: 52,
                              height: 52,
                              borderRadius: 12,
                              background: '#E8F8F8',
                              color: '#007E80',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <ImageIcon size={18} />
                          </span>
                        )}
                      </td>

                      <td>
                        <button
                          className="dashboard-refresh"
                          disabled={
                            processingId ===
                            service.id
                          }
                          onClick={() =>
                            void setServiceActive(
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

      {createOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-service-title"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(7, 28, 43, 0.42)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            zIndex: 1000,
          }}
        >
          <div
            style={{
              width: 'min(760px, 100%)',
              maxHeight: '90vh',
              overflowY: 'auto',
              background: '#FFFFFF',
              borderRadius: 22,
              boxShadow:
                '0 24px 70px rgba(6, 47, 82, 0.20)',
              padding: 24,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: 20,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 900,
                    letterSpacing: 1,
                    color: '#007E80',
                  }}
                >
                  CATALOG
                </div>

                <h2
                  id="create-service-title"
                  style={{
                    margin:
                      '5px 0 4px',
                    color: '#062F52',
                  }}
                >
                  Add a new service
                </h2>

                <p
                  style={{
                    margin: 0,
                    color: '#71818C',
                  }}
                >
                  Create the service, hourly variant, and starting price together.
                </p>
              </div>

              <button
                type="button"
                onClick={closeCreateForm}
                disabled={creating}
                aria-label="Close"
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  border:
                    '1px solid #E3EBEF',
                  background: '#F7FAFB',
                  cursor: 'pointer',
                }}
              >
                <X size={18} color="#456174" />
              </button>
            </div>

            {createError && (
              <div
                className="error-banner"
                style={{
                  marginTop: 18,
                }}
              >
                {createError}
              </div>
            )}

            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  'minmax(0, 1.4fr) minmax(220px, .8fr)',
                gap: 18,
                marginTop: 22,
              }}
            >
              <div>
                <label
                  style={{
                    display: 'block',
                    marginBottom: 14,
                  }}
                >
                  <strong>Service name</strong>
                  <input
                    value={serviceName}
                    onChange={(event) =>
                      setServiceName(
                        event.target.value
                      )
                    }
                    placeholder="e.g. Water"
                    style={{
                      width: '100%',
                      marginTop: 6,
                    }}
                    disabled={creating}
                  />
                </label>

                <label
                  style={{
                    display: 'block',
                    marginBottom: 14,
                  }}
                >
                  <strong>Description</strong>
                  <textarea
                    value={description}
                    onChange={(event) =>
                      setDescription(
                        event.target.value
                      )
                    }
                    placeholder="Describe what this service provides."
                    rows={5}
                    style={{
                      width: '100%',
                      marginTop: 6,
                      resize: 'vertical',
                    }}
                    disabled={creating}
                  />
                </label>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns:
                      '1fr 120px',
                    gap: 12,
                  }}
                >
                  <label>
                    <strong>Hourly price</strong>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={hourlyPrice}
                      onChange={(event) =>
                        setHourlyPrice(
                          event.target.value
                        )
                      }
                      placeholder="100"
                      style={{
                        width: '100%',
                        marginTop: 6,
                      }}
                      disabled={creating}
                    />
                  </label>

                  <label>
                    <strong>Currency</strong>
                    <input
                      value={currency}
                      maxLength={3}
                      onChange={(event) =>
                        setCurrency(
                          event.target.value
                            .toUpperCase()
                        )
                      }
                      placeholder="INR"
                      style={{
                        width: '100%',
                        marginTop: 6,
                      }}
                      disabled={creating}
                    />
                  </label>
                </div>

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 9,
                    marginTop: 18,
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(event) =>
                      setIsActive(
                        event.target.checked
                      )
                    }
                    disabled={creating}
                  />
                  <span>
                    Publish immediately
                  </span>
                </label>
              </div>

              <div>
                <strong>Service image</strong>

                <div
                  style={{
                    marginTop: 7,
                    border:
                      '1px dashed #B8D2D9',
                    borderRadius: 18,
                    background: '#F7FBFC',
                    minHeight: 280,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    position: 'relative',
                  }}
                >
                  {imagePreview ? (
                    <>
                      <img
                        src={imagePreview}
                        alt="Selected service preview"
                        style={{
                          width: '100%',
                          height: '100%',
                          minHeight: 280,
                          objectFit: 'cover',
                        }}
                      />

                      <button
                        type="button"
                        onClick={() =>
                          handleImageChange(
                            null
                          )
                        }
                        disabled={creating}
                        style={{
                          position: 'absolute',
                          top: 10,
                          right: 10,
                          width: 36,
                          height: 36,
                          borderRadius: 12,
                          border:
                            '1px solid rgba(255,255,255,.8)',
                          background:
                            'rgba(6,47,82,.86)',
                          color: '#FFF',
                          cursor: 'pointer',
                        }}
                        aria-label="Remove image"
                      >
                        <X size={17} />
                      </button>
                    </>
                  ) : (
                    <label
                      style={{
                        width: '100%',
                        minHeight: 280,
                        padding: 24,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textAlign: 'center',
                        cursor: creating
                          ? 'default'
                          : 'pointer',
                      }}
                    >
                      <Upload
                        size={28}
                        color="#007E80"
                      />

                      <strong
                        style={{
                          marginTop: 12,
                          color: '#062F52',
                        }}
                      >
                        Upload service image
                      </strong>

                      <span
                        style={{
                          marginTop: 6,
                          fontSize: 13,
                          color: '#71818C',
                        }}
                      >
                        JPG, PNG, or WebP · max 5 MB
                      </span>

                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(event) =>
                          handleImageChange(
                            event.target.files?.[0] || null
                          )
                        }
                        disabled={creating}
                        style={{
                          display: 'none',
                        }}
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 10,
                marginTop: 24,
              }}
            >
              <button
                type="button"
                className="dashboard-refresh"
                onClick={closeCreateForm}
                disabled={creating}
              >
                Cancel
              </button>

              <button
                type="button"
                className="dashboard-refresh"
                onClick={() => void createService()}
                disabled={creating}
                style={{
                  minWidth: 150,
                  background: '#062F52',
                  color: '#FFFFFF',
                }}
              >
                {creating
                  ? 'Creating...'
                  : 'Create service'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
