import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useCallback, useEffect, useState } from 'react'

import { COLORS } from '../constants/theme'
import { RootStackParamList } from '../types'
import {
  CustomerBooking,
  getCustomerBooking,
} from '../services/customerBookings'
import { useBooking } from '../context/BookingContext'

type Props = NativeStackScreenProps<
  RootStackParamList,
  'BookingDetails'
>

function statusLabel(status: string) {
  return status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
  })
}

function Row({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  )
}

export default function BookingDetailsScreen({
  navigation,
  route,
}: Props) {
  const { bookingId } = route.params

  const { setBookingId } = useBooking()

  const [booking, setBooking] =
    useState<CustomerBooking | null>(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadBooking = useCallback(async () => {
    try {
      setLoading(true)
      setError('')

      const data =
        await getCustomerBooking(bookingId)

      setBooking(data)
    } catch (err) {
      console.error(
        '[TempStaff] Booking details error:',
        err
      )

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load booking.'
      )
    } finally {
      setLoading(false)
    }
  }, [bookingId])

  useEffect(() => {
    loadBooking()
  }, [loadBooking])

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator
            size="large"
            color={COLORS.orange}
          />

          <Text style={styles.loadingText}>
            Loading booking...
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  if (error || !booking) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.errorIcon}>⚠️</Text>

          <Text style={styles.errorTitle}>
            Unable to load booking
          </Text>

          <Text style={styles.errorText}>
            {error || 'Booking not found.'}
          </Text>

          <TouchableOpacity
            style={styles.retryButton}
            onPress={loadBooking}
          >
            <Text style={styles.retryText}>
              Try Again
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  const canTrack = [
    'paid',
    'searching_worker',
    'assigned',
    'on_the_way',
    'arrived',
    'in_progress',
  ].includes(booking.status)

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>

          <View style={styles.headerText}>
            <Text style={styles.title}>
              Booking Details
            </Text>

            <Text style={styles.bookingId}>
              #{booking.id.slice(0, 8).toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.statusCard}>
          <Text style={styles.statusSmall}>
            CURRENT STATUS
          </Text>

          <Text style={styles.status}>
            {statusLabel(booking.status)}
          </Text>

          {booking.status === 'paid' && (
            <Text style={styles.statusDescription}>
              Your payment is complete. Worker
              assignment is in progress.
            </Text>
          )}

          {booking.status === 'assigned' && (
            <Text style={styles.statusDescription}>
              A worker has been assigned to your
              booking.
            </Text>
          )}

          {booking.status === 'on_the_way' && (
            <Text style={styles.statusDescription}>
              Your worker is on the way.
            </Text>
          )}

          {booking.status === 'arrived' && (
            <Text style={styles.statusDescription}>
              Your worker has arrived.
            </Text>
          )}

          {booking.status === 'in_progress' && (
            <Text style={styles.statusDescription}>
              Your work session is currently active.
            </Text>
          )}

          {booking.status === 'completed' && (
            <Text style={styles.statusDescription}>
              This booking has been completed.
            </Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Service
          </Text>

          <View style={styles.card}>
            <Text style={styles.serviceName}>
              {booking.service?.name ??
                'Temporary Staff'}
            </Text>

            {booking.service?.description && (
              <Text style={styles.description}>
                {booking.service.description}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Schedule
          </Text>

          <View style={styles.card}>
            <Row
              label="Date"
              value={formatDate(
                booking.scheduled_start
              )}
            />

            <Row
              label="Start"
              value={formatTime(
                booking.scheduled_start
              )}
            />

            <Row
              label="End"
              value={formatTime(
                booking.scheduled_end
              )}
            />

            <Row
              label="Duration"
              value={`${booking.duration_value} ${booking.duration_unit}${booking.duration_value !== 1 ? 's' : ''}`}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Location
          </Text>

          <View style={styles.card}>
            <Text style={styles.addressLabel}>
              {booking.address?.label ??
                'Booking location'}
            </Text>

            <Text style={styles.address}>
              {booking.address?.address_line ??
                'Location unavailable'}
            </Text>
          </View>
        </View>

        {booking.worker && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Assigned Worker
            </Text>

            <View style={styles.workerCard}>
              <View style={styles.workerAvatar}>
                <Text style={styles.workerAvatarText}>
                  {(booking.worker.full_name ??
                    'W')
                    .charAt(0)
                    .toUpperCase()}
                </Text>
              </View>

              <View style={styles.workerInfo}>
                <Text style={styles.workerName}>
                  {booking.worker.full_name ??
                    'Worker'}
                </Text>

                {booking.worker.phone && (
                  <Text style={styles.workerPhone}>
                    {booking.worker.phone}
                  </Text>
                )}
              </View>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Payment
          </Text>

          <View style={styles.card}>
            <Row
              label="Staff charges"
              value={`₹${Number(
                booking.base_amount
              ).toFixed(2)}`}
            />

            <Row
              label="Platform fee"
              value={`₹${Number(
                booking.platform_fee
              ).toFixed(2)}`}
            />

            <Row
              label="Tax"
              value={`₹${Number(
                booking.tax_amount
              ).toFixed(2)}`}
            />

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>
                Total
              </Text>

              <Text style={styles.total}>
                ₹
                {Number(
                  booking.total_amount
                ).toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        {booking.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Notes
            </Text>

            <View style={styles.card}>
              <Text style={styles.notes}>
                {booking.notes}
              </Text>
            </View>
          </View>
        )}

        {canTrack && (
          <TouchableOpacity
            style={styles.trackButton}
            onPress={() => {
              /*
               * Store the exact booking being viewed
               * in BookingContext before opening Tracking.
               */
              setBookingId(booking.id)

              /*
               * Push a completely new Tracking screen
               * with the exact booking ID.
               */
              navigation.push('Tracking', {
                bookingId: booking.id,
              })
            }}
          >
            <Text style={styles.trackButtonText}>
              Track Worker
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.refreshButton}
          onPress={loadBooking}
        >
          <Text style={styles.refreshText}>
            Refresh Booking Status
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.light,
  },

  content: {
    padding: 22,
    paddingBottom: 50,
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 25,
  },

  loadingText: {
    color: COLORS.gray,
    marginTop: 12,
  },

  errorIcon: {
    fontSize: 45,
    marginBottom: 15,
  },

  errorTitle: {
    color: COLORS.navy,
    fontSize: 20,
    fontWeight: '800',
  },

  errorText: {
    color: COLORS.gray,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },

  retryButton: {
    backgroundColor: COLORS.orange,
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 20,
  },

  retryText: {
    color: 'white',
    fontWeight: '800',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  backText: {
    color: COLORS.navy,
    fontSize: 34,
    lineHeight: 36,
    marginTop: -4,
  },

  headerText: {
    marginLeft: 12,
  },

  title: {
    color: COLORS.navy,
    fontSize: 25,
    fontWeight: '800',
  },

  bookingId: {
    color: COLORS.gray,
    fontSize: 11,
    marginTop: 3,
  },

  statusCard: {
    backgroundColor: COLORS.navy,
    borderRadius: 22,
    padding: 20,
    marginBottom: 25,
  },

  statusSmall: {
    color: '#B9C9D8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },

  status: {
    color: 'white',
    fontSize: 25,
    fontWeight: '800',
    marginTop: 5,
  },

  statusDescription: {
    color: '#D8E4EF',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
  },

  section: {
    marginBottom: 22,
  },

  sectionTitle: {
    color: COLORS.navy,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 10,
  },

  card: {
    backgroundColor: 'white',
    borderRadius: 18,
    padding: 17,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  serviceName: {
    color: COLORS.navy,
    fontSize: 20,
    fontWeight: '800',
  },

  description: {
    color: COLORS.gray,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 7,
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },

  rowLabel: {
    color: COLORS.gray,
    fontSize: 13,
  },

  rowValue: {
    color: COLORS.navy,
    fontSize: 13,
    fontWeight: '700',
    maxWidth: '60%',
    textAlign: 'right',
  },

  addressLabel: {
    color: COLORS.navy,
    fontSize: 14,
    fontWeight: '800',
  },

  address: {
    color: COLORS.gray,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 5,
  },

  workerCard: {
    backgroundColor: 'white',
    borderRadius: 18,
    padding: 17,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
  },

  workerAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },

  workerAvatarText: {
    color: 'white',
    fontSize: 20,
    fontWeight: '800',
  },

  workerInfo: {
    marginLeft: 13,
  },

  workerName: {
    color: COLORS.navy,
    fontSize: 16,
    fontWeight: '800',
  },

  workerPhone: {
    color: COLORS.gray,
    fontSize: 13,
    marginTop: 4,
  },

  totalRow: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginTop: 8,
    paddingTop: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  totalLabel: {
    color: COLORS.navy,
    fontSize: 16,
    fontWeight: '800',
  },

  total: {
    color: COLORS.navy,
    fontSize: 20,
    fontWeight: '800',
  },

  notes: {
    color: COLORS.gray,
    fontSize: 14,
    lineHeight: 21,
  },

  trackButton: {
    backgroundColor: COLORS.orange,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 5,
  },

  trackButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '800',
  },

  refreshButton: {
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: 'white',
  },

  refreshText: {
    color: COLORS.navy,
    fontSize: 14,
    fontWeight: '800',
  },
})