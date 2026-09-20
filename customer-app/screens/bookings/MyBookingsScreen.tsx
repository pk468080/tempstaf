import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'

import { ScreenContainer } from '../../components/layout/ScreenContainer'
import { getCustomerBookings, type CustomerBooking } from '../../services/booking/bookingTracking.service'

type MyBookingsScreenProps = {
  onBookingPress: (bookingId: string) => void
}

const ACTIVE_STATUSES = new Set(['searching_worker', 'assigned', 'on_the_way', 'arrived', 'in_progress'])
const UPCOMING_STATUSES = new Set(['pending_payment', 'paid'])
const CANCELLED_STATUSES = new Set(['cancelled', 'expired', 'payment_failed'])

export default function MyBookingsScreen({ onBookingPress }: MyBookingsScreenProps) {
  const [bookings, setBookings] = useState<CustomerBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadBookings = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)

    try {
      setBookings(await getCustomerBookings())
      setError(null)
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Unable to load your bookings.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void loadBookings()
  }, [loadBookings])

  const groups = [
    { title: 'Upcoming', items: bookings.filter(booking => UPCOMING_STATUSES.has(booking.status)) },
    { title: 'Active', items: bookings.filter(booking => ACTIVE_STATUSES.has(booking.status)) },
    { title: 'Completed', items: bookings.filter(booking => booking.status === 'completed') },
    { title: 'Cancelled', items: bookings.filter(booking => CANCELLED_STATUSES.has(booking.status)) },
  ]

  if (loading) {
    return <ScreenContainer><View style={styles.center}><ActivityIndicator size="large" /></View></ScreenContainer>
  }

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadBookings(true)} />}
      >
        <Text style={styles.title}>My bookings</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {groups.map(group => (
          <View key={group.title} style={styles.group}>
            <Text style={styles.groupTitle}>{group.title}</Text>
            {group.items.length === 0 ? (
              <Text style={styles.empty}>No {group.title.toLowerCase()} bookings.</Text>
            ) : group.items.map(booking => (
              <Pressable key={booking.id} style={styles.booking} onPress={() => onBookingPress(booking.id)}>
                <View style={styles.bookingHeader}>
                  <Text style={styles.service}>{booking.service_name ?? 'Service booking'}</Text>
                  <Text style={styles.status}>{booking.status.replaceAll('_', ' ')}</Text>
                </View>
                <Text style={styles.schedule}>{booking.scheduled_start ?? 'Schedule pending'}</Text>
                <Text style={styles.bookingId}>Booking ID: {booking.id}</Text>
              </Pressable>
            ))}
          </View>
        ))}
      </ScrollView>
    </ScreenContainer>
  )
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '700', color: '#111827', marginBottom: 24 },
  group: { marginBottom: 24 },
  groupTitle: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 10 },
  empty: { color: '#6B7280', paddingVertical: 12 },
  booking: { padding: 16, marginBottom: 10, borderRadius: 16, backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB' },
  bookingHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  service: { flex: 1, fontSize: 16, fontWeight: '700', color: '#111827' },
  status: { color: '#4F46E5', fontWeight: '600', textTransform: 'capitalize' },
  schedule: { marginTop: 8, color: '#374151' },
  bookingId: { marginTop: 6, fontSize: 12, color: '#6B7280' },
  error: { color: '#B91C1C', marginBottom: 12 },
})