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
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showAddWorker, setShowAddWorker] = useState(false)
const [services, setServices] = useState<Service[]>([])
const [creatingWorker, setCreatingWorker] = useState(false)

const [workerForm, setWorkerForm] = useState({
  fullName: '',
  email: '',
  phone: '',
  password: '',
  serviceIds: [] as string[],
})
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

  if (workerForm.password.length < 8) {
    setError('Password must contain at least 8 characters.')
    return
  }

  if (workerForm.serviceIds.length === 0) {
    setError('Select at least one service.')
    return
  }

  setCreatingWorker(true)

  const { data, error } =
    await supabase.functions.invoke('create-worker', {
      body: {
        fullName: workerForm.fullName.trim(),
        email: workerForm.email.trim().toLowerCase(),
        phone: workerForm.phone.trim(),
        password: workerForm.password,
        serviceIds: workerForm.serviceIds,
      },
    })

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
      total_completed_jobs: Number(
        worker.total_completed_jobs ?? 0
      ),
      service_radius_km: Number(
        worker.service_radius_km ?? 0
      ),
      current_location: worker.current_location,
    }))

    setWorkers(formatted)
    setLoading(false)
  }

  async function updateStatus(
    workerId: string,
    status: string
  ) {
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
        value =>
          value?.toLowerCase().includes(normalizedSearch)
      )

    return matchesStatus && matchesSearch
  })

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Workers</h1>
          <p style={styles.subtitle}>
            Manage profiles, access and worker operations
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
  <button
    onClick={loadWorkers}
    style={styles.refresh}
  >
    Refresh
  </button>

  <button
    onClick={() => setShowAddWorker(true)}
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
          onChange={event => setSearch(event.target.value)}
          placeholder="Search name, email or worker ID"
          style={styles.search}
        />

        <select
          aria-label="Filter workers by status"
          value={statusFilter}
          onChange={event => setStatusFilter(event.target.value)}
          style={styles.filter}
        >
          {statuses.map(option => (
            <option key={option} value={option}>
              {option === 'all' ? 'All statuses' : option}
            </option>
          ))}
        </select>

        <span style={styles.resultCount}>
          {filteredWorkers.length} of {workers.length} workers
        </span>
      </div>

      {error && (
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
                      {worker.full_name ||
                        'Unnamed Worker'}
                    </Link>

                    <div style={styles.email}>
                      {worker.email || 'No email'}
                    </div>
                  </td>

                  <td style={styles.td}>
                    <span
                      style={{
                        ...styles.status,
                        ...statusStyle(
                          worker.worker_status
                        ),
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
                          updateWorker(
                            worker.id,
                            { is_verified: false }
                          )
                        }
                      >
                        Verified
                      </button>
                    ) : (
                      <button
                        onClick={() =>
                          toggleVerification(
                            worker.id,
                            true
                          )
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
                      onChange={(e) =>
                        updateStatus(
                          worker.id,
                          e.target.value
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

  workerLink: {
    color: '#0f766e',
    fontWeight: 700,
  },

  verifiedButton: {
    border: 0,
    background: 'transparent',
    color: '#166534',
    padding: 0,
    fontWeight: 600,
  },

  refresh: {
    padding: '10px 18px',
    borderRadius: 8,
    border: '1px solid #d1d5db',
    background: '#fff',
    cursor: 'pointer',
  },

  error: {
    padding: 16,
    marginBottom: 20,
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

  verified: {
    color: '#166534',
    fontWeight: 600,
  },
}