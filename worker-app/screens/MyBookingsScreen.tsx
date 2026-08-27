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

type WorkerBookingAction =
  | 'accept'
  | 'decline'
  | 'on_the_way'

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
          'Unable to load bookings',
          error?.message ||
            'Please try again.'
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

  /**
   * Worker actions are sent through a Supabase
   * RPC instead of directly changing booking.status.
   *
   * This keeps the real state transition inside
   * the database where authorization and race
   * protection can be enforced.
   */
  const performBookingAction = async (
    bookingId: string,
    action: WorkerBookingAction
  ) => {
    if (updatingId === bookingId) {
      return
    }

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
        await supabase.rpc(
          'worker_booking_action',
          {
            p_booking_id: bookingId,
            p_action: action,
          }
        )

      if (error) {
        throw error
      }

      if (!data?.success) {
        throw new Error(
          data?.error ||
            'Booking action was rejected.'
        )
      }

      const updatedStatus =
        data.status

      setBookings(current =>
        current.map(booking =>
          booking.id === bookingId
            ? {
                ...booking,
                status:
                  updatedStatus ??
                  booking.status,
              }
            : booking
        )
      )

      if (action === 'accept') {
        Alert.alert(
          'Booking accepted',
          'The booking has been accepted successfully.'
        )
      } else if (
        action === 'decline'
      ) {
        Alert.alert(
          'Booking declined',
          'The booking has been declined.'
        )
      } else {
        Alert.alert(
          'You are on the way',
          'The customer has been notified.'
        )
      }
    } catch (error: any) {
      console.error(
        '[TempStaff Worker] Booking action failed:',
        error
      )

      Alert.alert(
        'Unable to update booking',
        error?.message ||
          'The booking may have changed. Refresh and try again.'
      )

      await loadBookings()
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
            performBookingAction(
              bookingId,
              'accept'
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
            performBookingAction(
              bookingId,
              'decline'
            ),
        },
      ]
    )
  }

  const confirmOnTheWay = (
    bookingId: string
  ) => {
    Alert.alert(
      'Start travelling',
      'Mark this booking as On the Way?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'On the Way',
          onPress: () =>
            performBookingAction(
              bookingId,
              'on_the_way'
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

    const parsed =
      new Date(date)

    if (
      Number.isNaN(
        parsed.getTime()
      )
    ) {
      return 'Date not available'
    }

    return parsed.toLocaleString(
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
      .replace(
        /\b\w/g,
        letter =>
          letter.toUpperCase()
      )
  }

  const isAwaitingWorkerAction = (
    status: string
  ) => {
    return (
      status === 'assigned' ||
      status === 'pending'
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

        <Text
          style={styles.subtitle}
        >
          View and manage your assigned
          bookings.
        </Text>

        {loading ? (
          <View
            style={styles.loading}
          >
            <ActivityIndicator
              size="large"
            />

            <Text
              style={
                styles.loadingText
              }
            >
              Loading bookings...
            </Text>
          </View>
        ) : bookings.length === 0 ? (
          <View
            style={styles.emptyCard}
          >
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
              New bookings assigned to
              you will appear here.
            </Text>
          </View>
        ) : (
          bookings.map(booking => {
            const pending =
              isAwaitingWorkerAction(
                booking.status
              )

            const updating =
              updatingId ===
              booking.id

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
                  style={
                    styles.detailRow
                  }
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
                  style={
                    styles.detailRow
                  }
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
                  style={
                    styles.detailRow
                  }
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

                {booking.status ===
                  'accepted' && (
                  <TouchableOpacity
                    style={
                      styles.acceptButton
                    }
                    onPress={() =>
                      confirmOnTheWay(
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
                        On the Way
                      </Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            )
          })
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
    color: '#64748b',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 22,
  },

  loading: {
    alignItems: 'center',
    paddingVertical: 60,
  },

  loadingText: {
    color: '#64748b',
    marginTop: 12,
    fontSize: 15,
  },

  emptyCard: {
    backgroundColor: 'white',
    borderRadius: 18,
    padding: 30,
    alignItems: 'center',
    marginTop: 12,
  },

  emptyIcon: {
    fontSize: 42,
    marginBottom: 14,
  },

  emptyTitle: {
    color: '#0b1f3a',
    fontSize: 19,
    fontWeight: '800',
    marginBottom: 8,
  },

  emptyText: {
    color: '#64748b',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },

  bookingCard: {
    backgroundColor: 'white',
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 2,
  },

  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },

  headerLeft: {
    flex: 1,
    paddingRight: 10,
  },

  jobTitle: {
    color: '#0b1f3a',
    fontSize: 18,
    fontWeight: '800',
  },

  bookingId: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 4,
  },

  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  statusText: {
    fontSize: 11,
    fontWeight: '800',
  },

  pendingBadge: {
    backgroundColor: '#fef3c7',
  },

  pendingStatusText: {
    color: '#92400e',
  },

  acceptedBadge: {
    backgroundColor: '#dcfce7',
  },

  acceptedStatusText: {
    color: '#166534',
  },

  declinedBadge: {
    backgroundColor: '#fee2e2',
  },

  declinedStatusText: {
    color: '#991b1b',
  },

  completedBadge: {
    backgroundColor: '#dbeafe',
  },

  completedStatusText: {
    color: '#1e40af',
  },

  cancelledBadge: {
    backgroundColor: '#e2e8f0',
  },

  cancelledStatusText: {
    color: '#475569',
  },

  onTheWayBadge: {
    backgroundColor: '#ede9fe',
  },

  onTheWayStatusText: {
    color: '#6d28d9',
  },

  divider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 15,
  },

  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 9,
  },

  label: {
    color: '#64748b',
    fontSize: 13,
  },

  value: {
    color: '#334155',
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
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 5,
    marginBottom: 15,
  },

  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },

  declineButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },

  declineText: {
    color: '#b91c1c',
    fontSize: 14,
    fontWeight: '800',
  },

  acceptButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: '#0f766e',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    marginTop: 4,
  },

  acceptText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '800',
  },
})