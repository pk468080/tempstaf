import {
  ActivityIndicator,
  RefreshControl,
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
  getCustomerBookings,
} from '../services/customerBookings'

type Props = NativeStackScreenProps<
  RootStackParamList,
  'MyBookings'
>

type Filter = 'all' | 'active' | 'completed' | 'cancelled'

const ACTIVE_STATUSES = [
  'pending_payment',
  'paid',
  'searching_worker',
  'assigned',
  'on_the_way',
  'arrived',
  'in_progress',
]

function statusLabel(status: string) {
  switch (status) {
    case 'pending_payment':
      return 'Payment Pending'
    case 'payment_failed':
      return 'Payment Failed'
    case 'searching_worker':
      return 'Finding Worker'
    case 'on_the_way':
      return 'Worker On The Way'
    case 'in_progress':
      return 'Work In Progress'
    default:
      return status
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (letter) =>
          letter.toUpperCase()
        )
  }
}

function isActive(status: string) {
  return ACTIVE_STATUSES.includes(status)
}

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleDateString(
      'en-IN',
      {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }
    )
  } catch {
    return value
  }
}

function formatTime(value: string) {
  try {
    return new Date(value).toLocaleTimeString(
      'en-IN',
      {
        hour: 'numeric',
        minute: '2-digit',
      }
    )
  } catch {
    return value
  }
}

function BookingCard({
  booking,
  onPress,
}: {
  booking: CustomerBooking
  onPress: () => void
}) {
  const active = isActive(booking.status)

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      style={styles.card}
      onPress={onPress}
    >
      <View style={styles.cardTop}>
        <View style={styles.serviceBlock}>
          <Text style={styles.serviceName}>
            {booking.service?.name ??
              'Temporary Staff'}
          </Text>

          <Text style={styles.bookingId}>
            #{booking.id.slice(0, 8).toUpperCase()}
          </Text>
        </View>

        <View
          style={[
            styles.statusBadge,
            active
              ? styles.activeBadge
              : booking.status === 'completed'
                ? styles.completedBadge
                : styles.cancelledBadge,
          ]}
        >
          <Text style={styles.statusText}>
            {statusLabel(booking.status)}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.infoRow}>
        <Text style={styles.infoIcon}>📅</Text>

        <View>
          <Text style={styles.infoLabel}>Date & Time</Text>

          <Text style={styles.infoValue}>
            {formatDate(booking.scheduled_start)}
            {' · '}
            {formatTime(booking.scheduled_start)}
          </Text>
        </View>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.infoIcon}>⏱️</Text>

        <View>
          <Text style={styles.infoLabel}>Duration</Text>

          <Text style={styles.infoValue}>
            {booking.duration_value}{' '}
            {booking.duration_unit}
            {booking.duration_value !== 1
              ? 's'
              : ''}
          </Text>
        </View>
      </View>

      {booking.worker && (
        <View style={styles.infoRow}>
          <Text style={styles.infoIcon}>👤</Text>

          <View>
            <Text style={styles.infoLabel}>Worker</Text>

            <Text style={styles.infoValue}>
              {booking.worker.full_name ??
                'Worker assigned'}
            </Text>
          </View>
        </View>
      )}

      <View style={styles.cardBottom}>
        <Text style={styles.totalLabel}>
          Total
        </Text>

        <Text style={styles.total}>
          ₹{Number(booking.total_amount).toFixed(2)}
        </Text>
      </View>
    </TouchableOpacity>
  )
}

export default function MyBookingsScreen({
  navigation,
}: Props) {
  const [bookings, setBookings] = useState<
    CustomerBooking[]
  >([])

  const [filter, setFilter] =
    useState<Filter>('all')

  const [loading, setLoading] =
    useState(true)

  const [refreshing, setRefreshing] =
    useState(false)

  const [error, setError] =
    useState('')

  const loadBookings = useCallback(
    async (showLoader = true) => {
      try {
        if (showLoader) {
          setLoading(true)
        }

        setError('')

        const data =
          await getCustomerBookings()

        setBookings(data)
      } catch (err) {
        console.error(
          '[TempStaff] My bookings error:',
          err
        )

        setError(
          err instanceof Error
            ? err.message
            : 'Unable to load bookings.'
        )
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    []
  )

  useEffect(() => {
    loadBookings()
  }, [loadBookings])

  const onRefresh = () => {
    setRefreshing(true)
    loadBookings(false)
  }

  const filteredBookings =
    bookings.filter((booking) => {
      if (filter === 'all') {
        return true
      }

      if (filter === 'active') {
        return isActive(booking.status)
      }

      if (filter === 'completed') {
        return booking.status === 'completed'
      }

      if (filter === 'cancelled') {
        return [
          'cancelled',
          'expired',
          'payment_failed',
        ].includes(booking.status)
      }

      return true
    })

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>
              My Bookings
            </Text>

            <Text style={styles.subtitle}>
              View and manage your staff bookings
            </Text>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
        >
          {[
            ['all', 'All'],
            ['active', 'Active'],
            ['completed', 'Completed'],
            ['cancelled', 'Cancelled'],
          ].map(([value, label]) => (
            <TouchableOpacity
              key={value}
              style={[
                styles.filterButton,
                filter === value &&
                  styles.filterButtonActive,
              ]}
              onPress={() =>
                setFilter(value as Filter)
              }
            >
              <Text
                style={[
                  styles.filterText,
                  filter === value &&
                    styles.filterTextActive,
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator
              size="large"
              color={COLORS.orange}
            />

            <Text style={styles.loadingText}>
              Loading bookings...
            </Text>
          </View>
        ) : error ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>
              ⚠️
            </Text>

            <Text style={styles.emptyTitle}>
              Couldn't load bookings
            </Text>

            <Text style={styles.emptyText}>
              {error}
            </Text>

            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => loadBookings()}
            >
              <Text style={styles.retryText}>
                Try Again
              </Text>
            </TouchableOpacity>
          </View>
        ) : filteredBookings.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>
              📋
            </Text>

            <Text style={styles.emptyTitle}>
              No bookings found
            </Text>

            <Text style={styles.emptyText}>
              Your {filter === 'all'
                ? ''
                : filter + ' '}
              bookings will appear here.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {filteredBookings.map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                onPress={() =>
                  navigation.navigate(
                    'BookingDetails',
                    {
                      bookingId: booking.id,
                    }
                  )
                }
              />
            ))}
          </View>
        )}
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
    paddingBottom: 45,
  },

  header: {
    marginBottom: 20,
  },

  title: {
    color: COLORS.navy,
    fontSize: 28,
    fontWeight: '800',
  },

  subtitle: {
    color: COLORS.gray,
    fontSize: 14,
    marginTop: 5,
  },

  filters: {
    gap: 8,
    paddingBottom: 18,
  },

  filterButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 22,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  filterButtonActive: {
    backgroundColor: COLORS.navy,
    borderColor: COLORS.navy,
  },

  filterText: {
    color: COLORS.gray,
    fontSize: 14,
    fontWeight: '700',
  },

  filterTextActive: {
    color: 'white',
  },

  list: {
    gap: 14,
  },

  card: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 17,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },

  serviceBlock: {
    flex: 1,
    paddingRight: 10,
  },

  serviceName: {
    color: COLORS.navy,
    fontSize: 18,
    fontWeight: '800',
  },

  bookingId: {
    color: COLORS.gray,
    fontSize: 11,
    marginTop: 4,
    fontWeight: '600',
  },

  statusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 12,
    maxWidth: 145,
  },

  activeBadge: {
    backgroundColor: '#E8F4FF',
  },

  completedBadge: {
    backgroundColor: '#EAF8EF',
  },

  cancelledBadge: {
    backgroundColor: '#FDECEC',
  },

  statusText: {
    color: COLORS.navy,
    fontSize: 11,
    fontWeight: '800',
  },

  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 15,
  },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 13,
  },

  infoIcon: {
    width: 32,
    fontSize: 17,
  },

  infoLabel: {
    color: COLORS.gray,
    fontSize: 11,
    marginBottom: 2,
  },

  infoValue: {
    color: COLORS.navy,
    fontSize: 14,
    fontWeight: '700',
  },

  cardBottom: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginTop: 3,
    paddingTop: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  totalLabel: {
    color: COLORS.gray,
    fontSize: 13,
    fontWeight: '600',
  },

  total: {
    color: COLORS.navy,
    fontSize: 19,
    fontWeight: '800',
  },

  center: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },

  loadingText: {
    color: COLORS.gray,
    marginTop: 12,
    fontSize: 14,
  },

  empty: {
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 25,
  },

  emptyIcon: {
    fontSize: 45,
    marginBottom: 15,
  },

  emptyTitle: {
    color: COLORS.navy,
    fontSize: 20,
    fontWeight: '800',
  },

  emptyText: {
    color: COLORS.gray,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
    marginTop: 8,
  },

  retryButton: {
    marginTop: 20,
    backgroundColor: COLORS.orange,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 22,
  },

  retryText: {
    color: 'white',
    fontWeight: '800',
  },
})