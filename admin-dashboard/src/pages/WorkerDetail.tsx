import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
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

type Availability = {
  id?: string
  available_from: string
  available_until: string
  is_available: boolean
}

type Location = {
  latitude: number
  longitude: number
  created_at: string
}

type Job = {
  id: string
  status: string
  service_id: string
  scheduled_start: string | null
  total_amount: number | null
  created_at: string
}

export default function WorkerDetail() {
  const { workerId } = useParams()
  const [worker, setWorker] = useState<Worker | null>(null)
  const [services, setServices] = useState<string[]>([])
  const [availability, setAvailability] = useState<Availability[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [serviceNames, setServiceNames] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function loadWorker() {
    if (!workerId) return
    setLoading(true)
    setError('')

    const [workerResult, profileResult, serviceLinks, availabilityResult, locationResult, jobsResult] = await Promise.all([
      supabase.from('worker_profiles').select('id, worker_status, is_verified, rating, total_completed_jobs, service_radius_km, current_location').eq('id', workerId).maybeSingle(),
      supabase.from('profiles').select('full_name, email').eq('id', workerId).maybeSingle(),
      supabase.from('worker_services').select('service_id').eq('worker_id', workerId),
      supabase.from('worker_availability').select('available_from, available_until, is_available').eq('worker_id', workerId).order('available_from'),
      supabase.from('worker_locations').select('latitude, longitude, created_at').eq('worker_id', workerId).order('created_at', { ascending: false }).limit(10),
      supabase.from('bookings').select('id, status, service_id, scheduled_start, total_amount, created_at').eq('worker_id', workerId).order('created_at', { ascending: false }).limit(25),
    ])

    const firstError = [workerResult, profileResult, serviceLinks, availabilityResult, locationResult, jobsResult].find(result => result.error)?.error
    if (firstError) {
      setError(firstError.message)
      setLoading(false)
      return
    }

    if (!workerResult.data) {
      setError('Worker not found.')
      setLoading(false)
      return
    }

    const workerData = workerResult.data
    setWorker({
      id: workerData.id,
      full_name: profileResult.data?.full_name ?? null,
      email: profileResult.data?.email ?? null,
      worker_status: workerData.worker_status,
      is_verified: Boolean(workerData.is_verified),
      rating: Number(workerData.rating ?? 0),
      total_completed_jobs: Number(workerData.total_completed_jobs ?? 0),
      service_radius_km: Number(workerData.service_radius_km ?? 0),
      current_location: workerData.current_location,
    })
    setAvailability((availabilityResult.data ?? []) as Availability[])
    setLocations((locationResult.data ?? []) as Location[])
    setJobs((jobsResult.data ?? []) as Job[])

    const serviceIds = (serviceLinks.data ?? []).map(row => row.service_id)
    setServices(serviceIds)
    if (serviceIds.length) {
      const servicesResult = await supabase.from('services').select('id, name').in('id', serviceIds)
      if (!servicesResult.error) {
        setServiceNames(Object.fromEntries((servicesResult.data ?? []).map(service => [service.id, service.name])))
      }
    }

    setLoading(false)
  }

  async function updateWorker(values: Record<string, unknown>) {
    if (!workerId) return
    const { error: updateError } = await supabase.from('worker_profiles').update(values).eq('id', workerId)
    if (updateError) {
      setError(updateError.message)
      return
    }
    await loadWorker()
  }

  useEffect(() => {
    loadWorker()
  }, [workerId])

  if (loading) return <div style={styles.page}><p>Loading worker...</p></div>
  if (!worker) return <div style={styles.page}><p style={styles.error}>{error || 'Worker not found.'}</p><Link to="/workers">Back to workers</Link></div>

  const location = getLocation(worker.current_location)
  const latestLocation = locations[0]

  return (
    <div style={styles.page}>
      <Link to="/workers" style={styles.back}>← Back to workers</Link>
      <div style={styles.header}>
        <div><h1 style={styles.title}>{worker.full_name || 'Unnamed worker'}</h1><p style={styles.subtitle}>{worker.email || 'No email'} · {worker.id}</p></div>
        <div style={styles.actions}>
          <button style={styles.button} onClick={() => updateWorker({ is_verified: !worker.is_verified })}>{worker.is_verified ? 'Revoke verification' : 'Verify worker'}</button>
          <button style={worker.worker_status === 'suspended' ? styles.button : styles.dangerButton} onClick={() => updateWorker({ worker_status: worker.worker_status === 'suspended' ? 'offline' : 'suspended' })}>{worker.worker_status === 'suspended' ? 'Unsuspend' : 'Suspend worker'}</button>
        </div>
      </div>
      {error && <div style={styles.error}>{error}</div>}

      <div style={styles.summaryGrid}>
        <Summary label="Status" value={worker.worker_status} />
        <Summary label="Verification" value={worker.is_verified ? 'Verified' : 'Pending'} />
        <Summary label="Rating" value={`★ ${worker.rating.toFixed(1)}`} />
        <Summary label="Completed jobs" value={String(worker.total_completed_jobs)} />
        <Summary label="Service radius" value={`${worker.service_radius_km} km`} />
      </div>

      <div style={styles.grid}>
        <Panel title="Services">
          {services.length ? <ul style={styles.list}>{services.map(id => <li key={id}>{serviceNames[id] || id}</li>)}</ul> : <Empty text="No services assigned." />}
        </Panel>
        <Panel title="Current location">
          {location || latestLocation ? <div><strong>{location ? `${location.latitude}, ${location.longitude}` : `${latestLocation.latitude}, ${latestLocation.longitude}`}</strong><p style={styles.muted}>{location ? 'Profile location' : `Last reported ${formatDate(latestLocation.created_at)}`}</p></div> : <Empty text="Location has not been shared." />}
        </Panel>
        <Panel title="Availability">
          {availability.length ? <div>{availability.map((slot, index) => <div key={slot.id || index} style={styles.row}><span>{slot.available_from} - {slot.available_until}</span><span style={{ ...styles.badge, ...(slot.is_available ? styles.good : styles.neutral) }}>{slot.is_available ? 'Available' : 'Unavailable'}</span></div>)}</div> : <Empty text="No availability schedule found." />}
        </Panel>
        <Panel title="Recent location reports">
          {locations.length ? <div>{locations.slice(0, 5).map(locationItem => <div key={locationItem.created_at} style={styles.row}><span>{locationItem.latitude}, {locationItem.longitude}</span><span style={styles.muted}>{formatDate(locationItem.created_at)}</span></div>)}</div> : <Empty text="No location history found." />}
        </Panel>
      </div>

      <Panel title="Job history">
        {jobs.length ? <div style={styles.jobTable}><div style={styles.jobHeader}><span>Booking</span><span>Service</span><span>Status</span><span>Date</span><span>Amount</span></div>{jobs.map(job => <div key={job.id} style={styles.jobRow}><span>{job.id.slice(0, 8)}...</span><span>{serviceNames[job.service_id] || job.service_id}</span><span style={{ ...styles.badge, ...statusStyle(job.status) }}>{job.status}</span><span>{formatDate(job.scheduled_start || job.created_at)}</span><span>{job.total_amount == null ? '-' : `₹${Number(job.total_amount).toFixed(2)}`}</span></div>)}</div> : <Empty text="No jobs found for this worker." />}
      </Panel>
    </div>
  )
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div style={styles.summary}><span style={styles.muted}>{label}</span><strong>{value}</strong></div>
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <section style={styles.panel}><h2 style={styles.panelTitle}>{title}</h2>{children}</section>
}

function Empty({ text }: { text: string }) { return <p style={styles.muted}>{text}</p> }
function formatDate(value: string) { return new Date(value).toLocaleString() }
function getLocation(value: unknown): { latitude: number; longitude: number } | null {
  if (!value || typeof value !== 'object') return null
  const candidate = value as Record<string, unknown>
  const latitude = Number(candidate.latitude ?? candidate.lat)
  const longitude = Number(candidate.longitude ?? candidate.lng ?? candidate.lon)
  return Number.isFinite(latitude) && Number.isFinite(longitude) ? { latitude, longitude } : null
}
function statusStyle(status: string): React.CSSProperties { return status === 'completed' ? styles.good : status === 'cancelled' ? styles.bad : styles.neutral }

const styles: Record<string, React.CSSProperties> = {
  page: { padding: 32 }, back: { color: '#0f766e', fontWeight: 700 }, header: { display: 'flex', justifyContent: 'space-between', gap: 20, alignItems: 'flex-start', margin: '20px 0 24px' }, title: { margin: 0, fontSize: 32 }, subtitle: { marginTop: 6, color: '#64748b', fontSize: 13 }, actions: { display: 'flex', gap: 10, flexWrap: 'wrap' }, button: { padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: 7, background: '#fff', fontWeight: 700 }, dangerButton: { padding: '10px 14px', border: '1px solid #fecaca', borderRadius: 7, background: '#fff1f2', color: '#be123c', fontWeight: 700 }, error: { padding: 14, marginBottom: 20, background: '#fee2e2', color: '#991b1b', borderRadius: 8 }, summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 12, marginBottom: 20 }, summary: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 18, display: 'grid', gap: 8 }, grid: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 18, marginBottom: 18 }, panel: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 20, marginBottom: 18 }, panelTitle: { margin: '0 0 16px', fontSize: 17 }, list: { margin: 0, paddingLeft: 20, lineHeight: 1.9 }, row: { display: 'flex', justifyContent: 'space-between', gap: 16, padding: '10px 0', borderBottom: '1px solid #f1f5f9' }, muted: { color: '#64748b', fontSize: 13 }, badge: { display: 'inline-block', padding: '4px 8px', borderRadius: 999, fontSize: 12, fontWeight: 700 }, good: { background: '#dcfce7', color: '#166534' }, bad: { background: '#fee2e2', color: '#991b1b' }, neutral: { background: '#e2e8f0', color: '#334155' }, jobTable: { overflowX: 'auto' }, jobHeader: { display: 'grid', gridTemplateColumns: '1fr 1.5fr 1fr 1.4fr 1fr', gap: 14, padding: '10px 0', color: '#64748b', fontSize: 12, fontWeight: 700 }, jobRow: { display: 'grid', gridTemplateColumns: '1fr 1.5fr 1fr 1.4fr 1fr', gap: 14, alignItems: 'center', padding: '13px 0', borderTop: '1px solid #f1f5f9', fontSize: 13 },
}