import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

type Worker = {
  id: string
  full_name: string | null
  email: string | null
  worker_status: string
  is_verified: boolean
  rating: number
  total_completed_jobs: number
  service_radius_km: number
  current_location: unknown
}

type Service = {
  id: string
  name: string
}

const statuses = ['all', 'available', 'busy', 'offline', 'suspended']

export default function Workers() {
  const [workers, setWorkers] = useState<Worker[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showAddWorker, setShowAddWorker] = useState(false)
  const [creatingWorker, setCreatingWorker] = useState(false)

  const [workerForm, setWorkerForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    serviceIds: [] as string[],
  })

  async function loadWorkers() {
    setLoading(true)
    setError('')

    const { data, error } = await supabase
      .from('worker_profiles')
      .select(`
        id,
        worker_status,
        is_verified,
        rating,
        total_completed_jobs,
        service_radius_km,
        current_location,
        profiles!worker_profiles_id_fkey (
          full_name,
          email
        )
      `)
      .order('rating', { ascending: false })

    if (error) {
      console.error(error)
      setError(error.message)
      setLoading(false)
      return
    }

    const formatted = (data ?? []).map((worker: any) => ({
      id: worker.id,
      full_name: worker.profiles?.full_name ?? null,
      email: worker.profiles?.email ?? null,
      worker_status: worker.worker_status,
      is_verified: worker.is_verified,
      rating: Number(worker.rating ?? 0),
      total_completed_jobs: Number(worker.total_completed_jobs ?? 0),
      service_radius_km: Number(worker.service_radius_km ?? 0),
      current_location: worker.current_location,
    }))

    setWorkers(formatted)
    setLoading(false)
  }

  async function loadServices() {
    const { data, error } = await supabase
      .from('services')
      .select('id, name')
      .eq('is_active', true)
      .order('name')

    if (error) {
      console.error(error)
      setError(error.message)
      return
    }

    setServices(data ?? [])
  }

  async function createWorker() {
    setError('')

    if (!workerForm.fullName.trim()) {
      setError('Full name is required.')
      return
    }

    if (!workerForm.email.trim()) {
      setError('Email is required.')
      return
    }

    if (!workerForm.phone.trim()) {
      setError('Mobile number is required.')
      return
    }

    if (workerForm.password.length < 8) {
      setError('Password must contain at least 8 characters.')
      return
    }

    if (workerForm.serviceIds.length === 0) {
      setError('Select at least one service.')
      return
    }

    setCreatingWorker(true)

    const { data, error } = await supabase.functions.invoke(
      'create-worker',
      {
        body: {
          fullName: workerForm.fullName.trim(),
          email: workerForm.email.trim().toLowerCase(),
          phone: workerForm.phone.trim(),
          password: workerForm.password,
          serviceIds: workerForm.serviceIds,
        },
      }
    )

    setCreatingWorker(false)

    if (error) {
      console.error(error)
      setError(error.message)
      return
    }

    if (!data?.success) {
      setError(data?.error || 'Unable to create worker.')
      return
    }

    setWorkerForm({
      fullName: '',
      email: '',
      phone: '',
      password: '',
      serviceIds: [],
    })

    setShowAddWorker(false)

    await loadWorkers()
  }

  async function updateStatus(workerId: string, status: string) {
    const { error } = await supabase
      .from('worker_profiles')
      .update({
        worker_status: status,
      })
      .eq('id', workerId)

    if (error) {
      alert(error.message)
      return
    }

    await loadWorkers()
  }

  async function toggleVerification(
    workerId: string,
    verified: boolean
  ) {
    const { error } = await supabase
      .from('worker_profiles')
      .update({
        is_verified: verified,
      })
      .eq('id', workerId)

    if (error) {
      alert(error.message)
      return
    }

    await loadWorkers()
  }

  async function updateWorker(
    workerId: string,
    values: Record<string, unknown>
  ) {
    const { error: updateError } = await supabase
      .from('worker_profiles')
      .update(values)
      .eq('id', workerId)

    if (updateError) {
      setError(updateError.message)
      return
    }

    await loadWorkers()
  }

  useEffect(() => {
    loadWorkers()
    loadServices()
  }, [])

  const normalizedSearch = search.trim().toLowerCase()

  const filteredWorkers = workers.filter((worker) => {
    const matchesStatus =
      statusFilter === 'all' ||
      worker.worker_status === statusFilter

    const matchesSearch =
      !normalizedSearch ||
      [worker.full_name, worker.email, worker.id].some(
        (value) =>
          value?.toLowerCase().includes(normalizedSearch)
      )

    return matchesStatus && matchesSearch
  })

  function toggleService(serviceId: string) {
    setWorkerForm((current) => ({
      ...current,
      serviceIds: current.serviceIds.includes(serviceId)
        ? current.serviceIds.filter((id) => id !== serviceId)
        : [...current.serviceIds, serviceId],
    }))
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Workers</h1>

          <p style={styles.subtitle}>
            Manage profiles, access and worker operations
          </p>
        </div>

        <div style={styles.headerActions}>
          <button
            onClick={loadWorkers}
            style={styles.refresh}
            disabled={loading}
          >
            Refresh
          </button>

          <button
            onClick={() => {
              setError('')
              setShowAddWorker(true)
            }}
            style={styles.addButton}
          >
            + Add Worker
          </button>
        </div>
      </div>

      <div style={styles.toolbar}>
        <input
          aria-label="Search workers"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search name, email or worker ID"
          style={styles.search}
        />

        <select
          aria-label="Filter workers by status"
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(event.target.value)
          }
          style={styles.filter}
        >
          {statuses.map((option) => (
            <option key={option} value={option}>
              {option === 'all' ? 'All statuses' : option}
            </option>
          ))}
        </select>

        <span style={styles.resultCount}>
          {filteredWorkers.length} of {workers.length} workers
        </span>
      </div>

      {error && !showAddWorker && (
        <div style={styles.error}>
          {error}
        </div>
      )}

      {loading ? (
        <p>Loading workers...</p>
      ) : filteredWorkers.length === 0 ? (
        <div style={styles.empty}>
          No workers match the current filters.
        </div>
      ) : (
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Worker</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Verified</th>
                <th style={styles.th}>Rating</th>
                <th style={styles.th}>Jobs</th>
                <th style={styles.th}>Radius</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredWorkers.map((worker) => (
                <tr key={worker.id}>
                  <td style={styles.td}>
                    <Link
                      to={`/workers/${worker.id}`}
                      style={styles.workerLink}
                    >
                      {worker.full_name || 'Unnamed Worker'}
                    </Link>

                    <div style={styles.email}>
                      {worker.email || 'No email'}
                    </div>
                  </td>

                  <td style={styles.td}>
                    <span
                      style={{
                        ...styles.status,
                        ...statusStyle(worker.worker_status),
                      }}
                    >
                      {worker.worker_status}
                    </span>
                  </td>

                  <td style={styles.td}>
                    {worker.is_verified ? (
                      <button
                        style={styles.verifiedButton}
                        onClick={() =>
                          updateWorker(worker.id, {
                            is_verified: false,
                          })
                        }
                      >
                        Verified
                      </button>
                    ) : (
                      <button
                        onClick={() =>
                          toggleVerification(worker.id, true)
                        }
                      >
                        Verify
                      </button>
                    )}
                  </td>

                  <td style={styles.td}>
                    ⭐ {worker.rating.toFixed(1)}
                  </td>

                  <td style={styles.td}>
                    {worker.total_completed_jobs}
                  </td>

                  <td style={styles.td}>
                    {worker.service_radius_km} km
                  </td>

                  <td style={styles.td}>
                    <select
                      value={worker.worker_status}
                      onChange={(event) =>
                        updateStatus(
                          worker.id,
                          event.target.value
                        )
                      }
                    >
                      <option value="offline">
                        Offline
                      </option>

                      <option value="available">
                        Available
                      </option>

                      <option value="busy">
                        Busy
                      </option>

                      <option value="suspended">
                        Suspended
                      </option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAddWorker && (
        <div
          style={styles.modalOverlay}
          onClick={() => {
            if (!creatingWorker) {
              setShowAddWorker(false)
              setError('')
            }
          }}
        >
          <div
            style={styles.modal}
            onClick={(event) => event.stopPropagation()}
          >
            <div style={styles.modalHeader}>
              <div>
                <h2 style={styles.modalTitle}>
                  Add Worker
                </h2>

                <p style={styles.modalSubtitle}>
                  Create a worker account and give the worker
                  login credentials.
                </p>
              </div>

              <button
                onClick={() => {
                  if (!creatingWorker) {
                    setShowAddWorker(false)
                    setError('')
                  }
                }}
                style={styles.closeButton}
                disabled={creatingWorker}
              >
                ×
              </button>
            </div>

            {error && (
              <div style={styles.error}>
                {error}
              </div>
            )}

            <div style={styles.form}>
              <label style={styles.label}>
                Full Name
                <input
                  value={workerForm.fullName}
                  onChange={(event) =>
                    setWorkerForm({
                      ...workerForm,
                      fullName: event.target.value,
                    })
                  }
                  placeholder="Worker full name"
                  style={styles.input}
                  disabled={creatingWorker}
                />
              </label>

              <label style={styles.label}>
                Email
                <input
                  type="email"
                  value={workerForm.email}
                  onChange={(event) =>
                    setWorkerForm({
                      ...workerForm,
                      email: event.target.value,
                    })
                  }
                  placeholder="worker@example.com"
                  style={styles.input}
                  disabled={creatingWorker}
                />
              </label>

              <label style={styles.label}>
                Mobile Number
                <input
                  type="tel"
                  value={workerForm.phone}
                  onChange={(event) =>
                    setWorkerForm({
                      ...workerForm,
                      phone: event.target.value,
                    })
                  }
                  placeholder="Mobile number"
                  style={styles.input}
                  disabled={creatingWorker}
                />
              </label>

              <label style={styles.label}>
                Temporary Password
                <input
                  type="password"
                  value={workerForm.password}
                  onChange={(event) =>
                    setWorkerForm({
                      ...workerForm,
                      password: event.target.value,
                    })
                  }
                  placeholder="Minimum 8 characters"
                  style={styles.input}
                  disabled={creatingWorker}
                />

                <span style={styles.helpText}>
                  Give this password to the worker securely.
                </span>
              </label>

              <div style={styles.label}>
                <span>Services</span>

                {services.length === 0 ? (
                  <div style={styles.noServices}>
                    No active services found.
                  </div>
                ) : (
                  <div style={styles.serviceList}>
                    {services.map((service) => {
                      const selected =
                        workerForm.serviceIds.includes(
                          service.id
                        )

                      return (
                        <label
                          key={service.id}
                          style={{
                            ...styles.serviceOption,
                            ...(selected
                              ? styles.serviceSelected
                              : {}),
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() =>
                              toggleService(service.id)
                            }
                            disabled={creatingWorker}
                          />

                          <span>{service.name}</span>
                        </label>
                      )
                    })}
                  </div>
                )}
              </div>

              <div style={styles.formActions}>
                <button
                  type="button"
                  onClick={() => {
                    if (!creatingWorker) {
                      setShowAddWorker(false)
                      setError('')
                    }
                  }}
                  style={styles.cancelButton}
                  disabled={creatingWorker}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={createWorker}
                  style={styles.createButton}
                  disabled={creatingWorker}
                >
                  {creatingWorker
                    ? 'Creating...'
                    : 'Create Worker'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function statusStyle(status: string) {
  if (status === 'available') {
    return {
      background: '#dcfce7',
      color: '#166534',
    }
  }

  if (status === 'busy') {
    return {
      background: '#fef3c7',
      color: '#92400e',
    }
  }

  if (status === 'suspended') {
    return {
      background: '#fee2e2',
      color: '#991b1b',
    }
  }

  return {
    background: '#e5e7eb',
    color: '#374151',
  }
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    padding: 32,
  },

  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },

  headerActions: {
    display: 'flex',
    gap: 10,
  },

  title: {
    margin: 0,
    fontSize: 32,
  },

  subtitle: {
    marginTop: 6,
    color: '#6b7280',
  },

  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
    marginBottom: 20,
  },

  search: {
    minWidth: 280,
    flex: '1 1 320px',
    padding: '11px 13px',
    border: '1px solid #d1d5db',
    borderRadius: 7,
  },

  filter: {
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: 7,
    background: '#fff',
  },

  resultCount: {
    color: '#64748b',
    fontSize: 13,
  },

  refresh: {
    padding: '10px 18px',
    borderRadius: 8,
    border: '1px solid #d1d5db',
    background: '#fff',
    cursor: 'pointer',
  },

  addButton: {
    padding: '10px 18px',
    borderRadius: 8,
    border: '1px solid #111827',
    background: '#fff',
    cursor: 'pointer',
    fontWeight: 600,
  },

  error: {
    padding: 14,
    marginBottom: 16,
    background: '#fee2e2',
    color: '#991b1b',
    borderRadius: 8,
  },

  empty: {
    padding: 40,
    textAlign: 'center',
    background: '#f9fafb',
    borderRadius: 12,
  },

  tableWrapper: {
    overflowX: 'auto',
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: 12,
  },

  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },

  th: {
    textAlign: 'left',
    padding: 16,
    borderBottom: '1px solid #e5e7eb',
    background: '#f9fafb',
  },

  td: {
    padding: 16,
    borderBottom: '1px solid #f1f5f9',
  },

  workerLink: {
    color: '#0f766e',
    fontWeight: 700,
    textDecoration: 'none',
  },

  email: {
    marginTop: 4,
    color: '#6b7280',
    fontSize: 13,
  },

  status: {
    display: 'inline-block',
    padding: '5px 10px',
    borderRadius: 999,
    fontSize: 13,
    fontWeight: 600,
  },

  verifiedButton: {
    border: 0,
    background: 'transparent',
    color: '#166534',
    padding: 0,
    fontWeight: 600,
    cursor: 'pointer',
  },

  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(15, 23, 42, 0.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    zIndex: 1000,
  },

  modal: {
    width: '100%',
    maxWidth: 560,
    maxHeight: '90vh',
    overflowY: 'auto',
    background: '#fff',
    borderRadius: 16,
    padding: 24,
    boxShadow: '0 20px 50px rgba(0,0,0,0.2)',
  },

  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 20,
    marginBottom: 20,
  },

  modalTitle: {
    margin: 0,
    fontSize: 24,
  },

  modalSubtitle: {
    margin: '6px 0 0',
    color: '#6b7280',
    lineHeight: 1.5,
  },

  closeButton: {
    border: 0,
    background: 'transparent',
    fontSize: 30,
    lineHeight: 1,
    cursor: 'pointer',
    color: '#64748b',
  },

  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },

  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: 7,
    fontWeight: 600,
    color: '#111827',
  },

  input: {
    width: '100%',
    boxSizing: 'border-box',
    padding: '12px 13px',
    border: '1px solid #d1d5db',
    borderRadius: 8,
    fontSize: 15,
  },

  helpText: {
    color: '#6b7280',
    fontSize: 12,
    fontWeight: 400,
  },

  serviceList: {
    display: 'grid',
    gridTemplateColumns:
      'repeat(auto-fit, minmax(200px, 1fr))',
    gap: 8,
  },

  serviceOption: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 11,
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    cursor: 'pointer',
    fontWeight: 500,
  },

  serviceSelected: {
    border: '1px solid #0f766e',
    background: '#f0fdfa',
  },

  noServices: {
    padding: 12,
    background: '#f9fafb',
    borderRadius: 8,
    color: '#6b7280',
    fontWeight: 400,
  },

  formActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 8,
  },

  cancelButton: {
    padding: '11px 18px',
    borderRadius: 8,
    border: '1px solid #d1d5db',
    background: '#fff',
    cursor: 'pointer',
  },

  createButton: {
    padding: '11px 20px',
    borderRadius: 8,
    border: '1px solid #0f766e',
    background: '#0f766e',
    color: '#fff',
    cursor: 'pointer',
    fontWeight: 600,
  },
}