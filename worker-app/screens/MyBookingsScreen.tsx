import { useCallback, useEffect, useState } from 'react'

import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'

import { supabase } from '../lib/supabase'

type Booking = {
  id: string
  status: string
  duration_value: number | string | null
  duration_unit: string | null
  total_amount: number | string | null
  scheduled_start: string | null
  created_at: string
}

type MyBookingsScreenProps = {
  onBack: () => void
}

export default function MyBookingsScreen({
  onBack,
}: MyBookingsScreenProps) {
  const [bookings, setBookings] =
    useState<Booking[]>([])

  const [loading, setLoading] =
    useState(true)

  const [refreshing, setRefreshing] =
    useState(false)

  const [updatingId, setUpdatingId] =
    useState<string | null>(null)

  const loadBookings = useCallback(
    async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          throw new Error(
            'Worker is not authenticated.'
          )
        }

        const { data, error } =
          await supabase
            .from('bookings')
            .select(
              `
                id,
                status,
                duration_value,
                duration_unit,
                total_amount,
                scheduled_start,
                created_at
              `
            )
            .eq('worker_id', user.id)
            .order('created_at', {
              ascending: false,
            })

        if (error) {
          throw error
        }

        setBookings(data ?? [])
      } catch (error: any) {
        console.error(
          '[TempStaff Worker] Failed to load bookings:',
          error
        )

       Alert.alert(
  status === 'accepted'
    ? 'Booking accepted'
    : status === 'on_the_way'
    ? 'You are on the way'
    : 'Booking declined',
  status === 'accepted'
    ? 'The booking has been accepted successfully.'
    : status === 'on_the_way'
    ? 'The customer has been notified that you are on the way.'
    : 'The booking has been declined.'
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

  const refresh = () => {
    setRefreshing(true)
    loadBookings()
  }

  const updateBookingStatus = async (
    bookingId: string,
    status:
  | 'accepted'
  | 'declined'
  | 'on_the_way'
  ) => {
    try {
      setUpdatingId(bookingId)

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        throw new Error(
          'Worker is not authenticated.'
        )
      }

      const { data, error } =
        await supabase
          .from('bookings')
          .update({
            status,
          })
          .eq('id', bookingId)
          .eq('worker_id', user.id)
          .select(
            `
              id,
              status,
              duration_value,
              duration_unit,
              total_amount,
              scheduled_start,
              created_at
            `
          )
          .maybeSingle()

      if (error) {
        throw error
      }

      if (!data) {
        throw new Error(
          'Booking was not updated. Please check your booking permissions.'
        )
      }

      setBookings(current =>
        current.map(booking =>
          booking.id === bookingId
            ? {
                ...booking,
                status: data.status,
              }
            : booking
        )
      )

      Alert.alert(
        status === 'accepted'
          ? 'Booking accepted'
          : 'Booking declined',
        status === 'accepted'
          ? 'The booking has been accepted successfully.'
          : 'The booking has been declined.'
      )
    } catch (error: any) {
      console.error(
        '[TempStaff Worker] Failed to update booking:',
        error
      )

      Alert.alert(
        'Unable to update booking',
        error?.message ||
          'Please try again.'
      )
    } finally {
      setUpdatingId(null)
    }
  }

  const confirmAccept = (
    bookingId: string
  ) => {
    Alert.alert(
      'Accept booking',
      'Are you sure you want to accept this booking?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Accept',
          onPress: () =>
            updateBookingStatus(
              bookingId,
              'accepted'
            ),
        },
      ]
    )
  }

  const confirmDecline = (
    bookingId: string
  ) => {
    Alert.alert(
      'Decline booking',
      'Are you sure you want to decline this booking?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: () =>
            updateBookingStatus(
              bookingId,
              'declined'
            ),
        },
      ]
    )
  }

  const formatAmount = (
    amount: number | string | null
  ) => {
    return `₹${Number(
      amount || 0
    ).toLocaleString('en-IN', {
      maximumFractionDigits: 2,
    })}`
  }

  const formatDate = (
    date: string | null
  ) => {
    if (!date) {
      return 'Date not available'
    }

    return new Date(date).toLocaleString(
      'en-IN',
      {
        dateStyle: 'medium',
        timeStyle: 'short',
      }
    )
  }

  const formatStatus = (
    status: string
  ) => {
    return status
      .replace(/_/g, ' ')
      .replace(/\b\w/g, letter =>
        letter.toUpperCase()
      )
  }

  const isPending = (
    status: string
  ) => {
    return (
      status === 'pending' ||
      status === 'assigned'
    )
  }

  return (
    <SafeAreaView
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={
          styles.page
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
          />
        }
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
        >
          <Text style={styles.backText}>
            ← Back
          </Text>
        </TouchableOpacity>

        <Text style={styles.title}>
          My Bookings
        </Text>

        <Text style={styles.subtitle}>
          View and manage your assigned
          bookings.
        </Text>

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator
              size="large"
            />

            <Text
              style={styles.loadingText}
            >
              Loading bookings...
            </Text>
          </View>
        ) : bookings.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text
              style={styles.emptyIcon}
            >
              📋
            </Text>

            <Text
              style={styles.emptyTitle}
            >
              No bookings yet
            </Text>

            <Text
              style={styles.emptyText}
            >
              New bookings assigned to you
              will appear here.
            </Text>
          </View>
        ) : (
          bookings.map(booking => {
            const pending =
              isPending(
                booking.status
              )

            const updating =
              updatingId === booking.id

            return (
              <View
                key={booking.id}
                style={
                  styles.bookingCard
                }
              >
                <View
                  style={
                    styles.headerRow
                  }
                >
                  <View
                    style={
                      styles.headerLeft
                    }
                  >
                    <Text
                      style={
                        styles.jobTitle
                      }
                    >
                      Service Booking
                    </Text>

                    <Text
                      style={
                        styles.bookingId
                      }
                    >
                      #
                      {booking.id.slice(
                        0,
                        8
                      )}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.statusBadge,
                      getStatusStyle(
                        booking.status
                      ),
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        getStatusTextStyle(
                          booking.status
                        ),
                      ]}
                    >
                      {formatStatus(
                        booking.status
                      )}
                    </Text>
                  </View>
                </View>

                <View
                  style={styles.divider}
                />

                <View
                  style={styles.detailRow}
                >
                  <Text
                    style={styles.label}
                  >
                    Scheduled
                  </Text>

                  <Text
                    style={styles.value}
                  >
                    {formatDate(
                      booking.scheduled_start
                    )}
                  </Text>
                </View>

                <View
                  style={styles.detailRow}
                >
                  <Text
                    style={styles.label}
                  >
                    Duration
                  </Text>

                  <Text
                    style={styles.value}
                  >
                    {booking.duration_value ??
                      '-'}{' '}
                    {booking.duration_unit ??
                      ''}
                  </Text>
                </View>

                <View
                  style={styles.detailRow}
                >
                  <Text
                    style={styles.label}
                  >
                    Amount
                  </Text>

                  <Text
                    style={styles.amount}
                  >
                    {formatAmount(
                      booking.total_amount
                    )}
                  </Text>
                </View>

                <Text
                  style={styles.created}
                >
                  Booked on{' '}
                  {formatDate(
                    booking.created_at
                  )}
                </Text>

                {pending && (
                  <View
                    style={
                      styles.actionRow
                    }
                  >
                    <TouchableOpacity
                      style={
                        styles.declineButton
                      }
                      onPress={() =>
                        confirmDecline(
                          booking.id
                        )
                      }
                      disabled={
                        updating
                      }
                    >
                      <Text
                        style={
                          styles.declineText
                        }
                      >
                        Decline
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={
                        styles.acceptButton
                      }
                      onPress={() =>
                        confirmAccept(
                          booking.id
                        )
                      }
                      disabled={
                        updating
                      }
                    >
                      {updating ? (
                        <ActivityIndicator
                          color="white"
                        />
                      ) : (
                        <Text
                          style={
                            styles.acceptText
                          }
                        >
                          Accept Booking
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )
          })
        )}
        {booking.status === 'accepted' && (
  <TouchableOpacity
    style={styles.acceptButton}
    onPress={() =>
      updateBookingStatus(
        booking.id,
        'on_the_way'
      )
    }
    disabled={updating}
  >
    {updating ? (
      <ActivityIndicator color="white" />
    ) : (
      <Text style={styles.acceptText}>
        On the Way
      </Text>
    )}
  </TouchableOpacity>
)}
      </ScrollView>
    </SafeAreaView>
  )
}

function getStatusStyle(
  status: string
) {
  switch (status) {
    case 'accepted':
      return styles.acceptedBadge

    case 'declined':
      return styles.declinedBadge

    case 'completed':
      return styles.completedBadge

    case 'cancelled':
      return styles.cancelledBadge
    case 'on_the_way':
      return styles.onTheWayBadge  

    default:
      return styles.pendingBadge
  }
}

function getStatusTextStyle(
  status: string
) {
  switch (status) {
    case 'accepted':
      return styles.acceptedStatusText

    case 'declined':
      return styles.declinedStatusText

    case 'completed':
      return styles.completedStatusText

    case 'cancelled':
      return styles.cancelledStatusText
    case 'on_the_way':
      return styles.onTheWayStatusText


    default:
      return styles.pendingStatusText
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },

  page: {
    padding: 22,
    paddingBottom: 50,
  },

  backButton: {
    marginBottom: 18,
  },

  backText: {
    color: '#0f766e',
    fontSize: 16,
    fontWeight: '700',
  },

  title: {
    color: '#0b1f3a',
    fontSize: 31,
    fontWeight: '800',
    marginBottom: 7,
  },

  subtitle: {
    color: '#6b7280',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 22,
  },

  loading: {
    paddingVertical: 60,
    alignItems: 'center',
  },

  loadingText: {
    marginTop: 12,
    color: '#6b7280',
  },

  emptyCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },

  emptyIcon: {
    fontSize: 36,
    marginBottom: 12,
  },

  onTheWayBadge: {
  backgroundColor: '#fff7ed',
},

onTheWayStatusText: {
  color: '#ea580c',
},

  emptyTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 7,
  },

  emptyText: {
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 21,
  },

  bookingCard: {
    backgroundColor: 'white',
    borderRadius: 18,
    padding: 19,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },

  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },

  headerLeft: {
    flex: 1,
  },

  jobTitle: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 5,
  },

  bookingId: {
    color: '#9ca3af',
    fontSize: 12,
  },

  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginLeft: 10,
  },

  pendingBadge: {
    backgroundColor: '#fff7ed',
  },

  acceptedBadge: {
    backgroundColor: '#e8f7f1',
  },

  declinedBadge: {
    backgroundColor: '#fef2f2',
  },

  completedBadge: {
    backgroundColor: '#eff6ff',
  },

  cancelledBadge: {
    backgroundColor: '#f3f4f6',
  },

  statusText: {
    fontSize: 11,
    fontWeight: '800',
  },

  pendingStatusText: {
    color: '#c2410c',
  },

  acceptedStatusText: {
    color: '#0f766e',
  },

  declinedStatusText: {
    color: '#dc2626',
  },

  completedStatusText: {
    color: '#2563eb',
  },

  cancelledStatusText: {
    color: '#6b7280',
  },

  divider: {
    height: 1,
    backgroundColor: '#eef0f2',
    marginVertical: 15,
  },

  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 11,
  },

  label: {
    color: '#6b7280',
    fontSize: 13,
  },

  value: {
    color: '#374151',
    fontSize: 13,
    fontWeight: '600',
    maxWidth: '65%',
    textAlign: 'right',
  },

  amount: {
    color: '#0f766e',
    fontSize: 15,
    fontWeight: '800',
  },

  created: {
    color: '#9ca3af',
    fontSize: 11,
    marginTop: 8,
  },

  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },

  declineButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#fecaca',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },

  declineText: {
    color: '#dc2626',
    fontSize: 14,
    fontWeight: '800',
  },

  acceptButton: {
    flex: 1.5,
    minHeight: 48,
    borderRadius: 13,
    backgroundColor: '#0f766e',
    alignItems: 'center',
    justifyContent: 'center',
  },

  acceptText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '800',
  },
})