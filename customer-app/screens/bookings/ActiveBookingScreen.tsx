import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'

import { ScreenContainer } from '../../components/layout/ScreenContainer'
import {
  getCustomerBooking,
  getLatestWorkerLocation,
  requestBookingOtp,
  type CustomerBooking,
  type WorkerLocation,
} from '../../services/booking/bookingTracking.service'
import { supabase } from '../../lib/supabase'

type ActiveBookingScreenProps = { bookingId: string }

function elapsedSince(startedAt: string, completedAt: string | null) {
  const end = completedAt ? Date.parse(completedAt) : Date.now()
  const seconds = Math.max(0, Math.floor((end - Date.parse(startedAt)) / 1000))
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainder = seconds % 60
  return [hours, minutes, remainder].map(value => String(value).padStart(2, '0')).join(':')
}

export default function ActiveBookingScreen({ bookingId }: ActiveBookingScreenProps) {
  const [booking, setBooking] = useState<CustomerBooking | null>(null)
  const [location, setLocation] = useState<WorkerLocation | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [otp, setOtp] = useState<string | null>(null)
  const [timer, setTimer] = useState('00:00:00')

  async function refresh() {
    try {
      const nextBooking = await getCustomerBooking(bookingId)
      setBooking(nextBooking)
      if (nextBooking.worker_id) {
        setLocation(await getLatestWorkerLocation(bookingId))
      }
      setError(null)
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Unable to load booking.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
    const interval = setInterval(() => void refresh(), 15000)
    const channel = supabase
      .channel(`customer-booking-${bookingId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'bookings',
        filter: `id=eq.${bookingId}`,
      }, () => void refresh())
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'worker_locations',
        filter: `booking_id=eq.${bookingId}`,
      }, payload => setLocation(payload.new as WorkerLocation))
      .subscribe()

    return () => {
      clearInterval(interval)
      void supabase.removeChannel(channel)
    }
  }, [bookingId])

  useEffect(() => {
    if (!booking?.started_at) {
      setTimer('00:00:00')
      return
    }
    const update = () => setTimer(elapsedSince(booking.started_at!, booking.completed_at))
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [booking?.started_at, booking?.completed_at])

  async function showOtp(type: 'start' | 'end') {
    try {
      const result = await requestBookingOtp(bookingId, type)
      setOtp(result.otp ?? 'OTP sent to your registered contact.')
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Unable to generate OTP.')
    }
  }

  if (loading) {
    return <ScreenContainer><ActivityIndicator /></ScreenContainer>
  }

  return (
    <ScreenContainer>
      <View style={styles.container}>
        <Text style={styles.title}>Active booking</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {booking ? <>
          <Text style={styles.status}>{booking.status.replace('_', ' ')}</Text>
          <Row label="Booking ID" value={booking.id} />
          <Row label="Scheduled start" value={booking.scheduled_start ?? 'Not set'} />
          <Row label="Scheduled end" value={booking.scheduled_end ?? 'Not set'} />
          <Row label="Amount" value={booking.total_amount === null ? '—' : String(booking.total_amount)} />
          {booking.worker_id ? <Text style={styles.worker}>Worker assigned</Text> : <Text style={styles.worker}>Searching for a worker...</Text>}
          {location ? <Text style={styles.location}>Worker location: {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}{`\n`}Updated {new Date(location.recorded_at).toLocaleTimeString()}</Text> : null}
          {booking.status === 'in_progress' && booking.started_at ? <Text style={styles.timer}>{timer}</Text> : null}
          {(booking.status === 'arrived' || booking.status === 'assigned') ? <Pressable style={styles.button} onPress={() => void showOtp('start')}><Text style={styles.buttonText}>Show start OTP</Text></Pressable> : null}
          {booking.status === 'in_progress' ? <Pressable style={styles.button} onPress={() => void showOtp('end')}><Text style={styles.buttonText}>Show end OTP</Text></Pressable> : null}
          {otp ? <Text style={styles.otp}>{otp}</Text> : null}
        </> : null}
      </View>
    </ScreenContainer>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return <View style={styles.row}><Text style={styles.label}>{label}</Text><Text style={styles.value}>{value}</Text></View>
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  title: { fontSize: 28, fontWeight: '700', color: '#111827', marginBottom: 16 },
  status: { color: '#047857', fontWeight: '700', textTransform: 'capitalize', marginBottom: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  label: { color: '#6B7280' },
  value: { maxWidth: '65%', color: '#111827', fontWeight: '600', textAlign: 'right' },
  worker: { marginTop: 16, fontSize: 17, fontWeight: '700', color: '#111827' },
  location: { marginTop: 12, color: '#374151', lineHeight: 20 },
  timer: { marginTop: 20, fontSize: 36, fontWeight: '800', color: '#111827' },
  button: { marginTop: 16, padding: 14, borderRadius: 10, backgroundColor: '#111827', alignItems: 'center' },
  buttonText: { color: '#FFFFFF', fontWeight: '700' },
  otp: { marginTop: 16, fontSize: 24, fontWeight: '800', textAlign: 'center', color: '#111827' },
  error: { color: '#B91C1C', marginBottom: 12 },
})