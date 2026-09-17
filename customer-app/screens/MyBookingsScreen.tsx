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
import {
  NativeStackScreenProps,
} from '@react-navigation/native-stack'
import {
  useCallback,
  useEffect,
  useState,
} from 'react'

import { COLORS } from '../constants/theme'
import { RootStackParamList } from '../types'
import {
  CustomerBooking,
  getCustomerBookings,
} from '../services/booking'
import CustomerBottomNav from '../components/CustomerBottomNav'
import { supabase } from '../lib/supabase'

type Props = NativeStackScreenProps<
  RootStackParamList,
  'MyBookings'
>

type Filter =
  | 'all'
  | 'active'
  | 'completed'
  | 'cancelled'

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

    case 'paid':
      return 'Payment Verified'

    case 'searching_worker':
      return 'Finding Worker'

    case 'assigned':
      return 'Worker Assigned'

    case 'on_the_way':
      return 'Worker On The Way'

    case 'arrived':
      return 'Worker Arrived'

    case 'in_progress':
      return 'Work In Progress'

    case 'completed':
      return 'Completed'

    case 'cancelled':
      return 'Cancelled'

    case 'expired':
      return 'Expired'

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

function isCancelled(status: string) {
  return [
    'cancelled',
    'expired',
    'payment_failed',
  ].includes(status)
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

function formatDuration(
  value: unknown,
  unit: unknown
) {
  const numericValue =
    Number(value)

  if (
    !Number.isFinite(
      numericValue
    )
  ) {
    return '—'
  }

  const normalizedUnit =
    String(unit ?? 'hour')
      .trim()
      .toLowerCase()

  const unitLabel =
    normalizedUnit === 'hour' ||
    normalizedUnit === 'hours'
      ? numericValue === 1
        ? 'hour'
        : 'hours'
      : numericValue === 1
        ? normalizedUnit
        : `${normalizedUnit}s`

  return `${numericValue} ${unitLabel}`
}

function formatAmount(
  value: unknown
) {
  const amount =
    Number(value)

  if (
    !Number.isFinite(amount)
  ) {
    return '₹0.00'
  }

  return `₹${amount.toFixed(2)}`
}

function BookingCard({
  booking,
  onPress,
}: {
  booking: CustomerBooking
  onPress: () => void
}) {
  const active =
    isActive(
      booking.status
    )

  const cancelled =
    isCancelled(
      booking.status
    )

  const statusStyle =
    active
      ? styles.activeBadge
      : booking.status ===
          'completed'
        ? styles.completedBadge
        : cancelled
          ? styles.cancelledBadge
          : styles.neutralBadge

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      style={styles.card}
      onPress={onPress}
    >
      <View
        style={
          styles.cardTop
        }
      >
        <View
          style={
            styles.serviceBlock
          }
        >
          <Text
            style={
              styles.serviceName
            }
            numberOfLines={2}
          >
            {booking.service?.name ??
              'Temporary Staff'}
          </Text>

          <Text
            style={
              styles.bookingId
            }
          >
            #
            {booking.id
              .slice(0, 8)
              .toUpperCase()}
          </Text>
        </View>

        <View
          style={[
            styles.statusBadge,
            statusStyle,
          ]}
        >
          <Text
            style={
              styles.statusText
            }
          >
            {statusLabel(
              booking.status
            )}
          </Text>
        </View>
      </View>

      <View
        style={styles.divider}
      />

      <View
        style={styles.infoRow}
      >
        <Text
          style={
            styles.infoIcon
          }
        >
          📅
        </Text>

        <View
          style={
            styles.infoContent
          }
        >
          <Text
            style={
              styles.infoLabel
            }
          >
            Start Date & Time
          </Text>

          <Text
            style={
              styles.infoValue
            }
          >
            {formatDate(
              booking.scheduled_start
            )}
            {' · '}
            {formatTime(
              booking.scheduled_start
            )}
          </Text>
        </View>
      </View>

      <View
        style={styles.infoRow}
      >
        <Text
          style={
            styles.infoIcon
          }
        >
          ⏱️
        </Text>

        <View
          style={
            styles.infoContent
          }
        >
          <Text
            style={
              styles.infoLabel
            }
          >
            Working Duration
          </Text>

          <Text
            style={
              styles.infoValue
            }
          >
            {formatDuration(
              booking.duration_value,
              booking.duration_unit
            )}
          </Text>
        </View>
      </View>

      {booking.worker && (
        <View
          style={styles.infoRow}
        >
          <Text
            style={
              styles.infoIcon
            }
          >
            👤
          </Text>

          <View
            style={
              styles.infoContent
            }
          >
            <Text
              style={
                styles.infoLabel
              }
            >
              Worker
            </Text>

            <Text
              style={
                styles.infoValue
              }
              numberOfLines={1}
            >
              {booking.worker
                .full_name ??
                'Worker assigned'}
            </Text>
          </View>
        </View>
      )}

      <View
        style={
          styles.cardBottom
        }
      >
        <View>
          <Text
            style={
              styles.totalLabel
            }
          >
            Total
          </Text>

          <Text
            style={
              styles.paymentState
            }
          >
            {booking.status ===
            'pending_payment'
              ? 'Payment pending'
              : booking.status ===
                  'payment_failed'
                ? 'Payment failed'
                : 'Backend verified amount'}
          </Text>
        </View>

        <Text
          style={styles.total}
        >
          {formatAmount(
            booking.total_amount
          )}
        </Text>
      </View>
    </TouchableOpacity>
  )
}

export default function MyBookingsScreen({
  navigation,
}: Props) {
  const [bookings, setBookings] =
    useState<CustomerBooking[]>(
      []
    )

  const [filter, setFilter] =
    useState<Filter>('all')

  const [loading, setLoading] =
    useState(true)

  const [refreshing, setRefreshing] =
    useState(false)

  const [error, setError] =
    useState('')

  const loadBookings =
    useCallback(
      async (
        showLoader = true
      ) => {
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
    let mounted = true

    let customerChannel:
      ReturnType<
        typeof supabase.channel
      > | null = null

    const setupRealtime =
      async () => {
        try {
          await loadBookings()

          const {
            data: {
              user,
            },
          } =
            await supabase.auth.getUser()

          if (
            !mounted ||
            !user
          ) {
            return
          }

          customerChannel =
            supabase
              .channel(
                `customer-bookings-${user.id}`
              )
              .on(
                'postgres_changes',
                {
                  event: '*',
                  schema: 'public',
                  table: 'bookings',
                  filter: `customer_id=eq.${user.id}`,
                },
                () => {
                  if (!mounted) {
                    return
                  }

                  void loadBookings(
                    false
                  )
                }
              )
              .subscribe()
        } catch (err) {
          console.error(
            '[TempStaff] Booking realtime setup error:',
            err
          )
        }
      }

    void setupRealtime()

    return () => {
      mounted = false

      if (
        customerChannel
      ) {
        void supabase.removeChannel(
          customerChannel
        )
      }
    }
  }, [loadBookings])

  const onRefresh =
    useCallback(() => {
      setRefreshing(true)
      void loadBookings(false)
    }, [loadBookings])

  const filteredBookings =
    bookings.filter(
      (booking) => {
        switch (filter) {
          case 'active':
            return isActive(
              booking.status
            )

          case 'completed':
            return (
              booking.status ===
              'completed'
            )

          case 'cancelled':
            return isCancelled(
              booking.status
            )

          case 'all':
          default:
            return true
        }
      }
    )

  return (
    <SafeAreaView
      style={
        styles.container
      }
    >
      <View
        style={styles.screen}
      >
        <ScrollView
          contentContainerStyle={
            styles.content
          }
          refreshControl={
            <RefreshControl
              refreshing={
                refreshing
              }
              onRefresh={
                onRefresh
              }
            />
          }
          showsVerticalScrollIndicator={
            false
          }
        >
          <View
            style={styles.header}
          >
            <View>
              <Text
                style={styles.title}
              >
                My Bookings
              </Text>

              <Text
                style={
                  styles.subtitle
                }
              >
                View and manage your
                staff bookings
              </Text>
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={
              false
            }
            contentContainerStyle={
              styles.filters
            }
          >
            {[
              ['all', 'All'],
              ['active', 'Active'],
              [
                'completed',
                'Completed',
              ],
              [
                'cancelled',
                'Cancelled',
              ],
            ].map(
              ([value, label]) => (
                <TouchableOpacity
                  key={value}
                  style={[
                    styles.filterButton,
                    filter ===
                      value &&
                      styles.filterButtonActive,
                  ]}
                  onPress={() =>
                    setFilter(
                      value as Filter
                    )
                  }
                  activeOpacity={
                    0.8
                  }
                >
                  <Text
                    style={[
                      styles.filterText,
                      filter ===
                        value &&
                        styles.filterTextActive,
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              )
            )}
          </ScrollView>

          {loading ? (
            <View
              style={
                styles.center
              }
            >
              <ActivityIndicator
                size="large"
                color={
                  COLORS.orange
                }
              />

              <Text
                style={
                  styles.loadingText
                }
              >
                Loading bookings...
              </Text>
            </View>
          ) : error ? (
            <View
              style={
                styles.empty
              }
            >
              <Text
                style={
                  styles.emptyIcon
                }
              >
                ⚠️
              </Text>

              <Text
                style={
                  styles.emptyTitle
                }
              >
                Couldn't load
                bookings
              </Text>

              <Text
                style={
                  styles.emptyText
                }
              >
                {error}
              </Text>

              <TouchableOpacity
                style={
                  styles.retryButton
                }
                onPress={() =>
                  void loadBookings()
                }
                activeOpacity={
                  0.8
                }
              >
                <Text
                  style={
                    styles.retryText
                  }
                >
                  Try Again
                </Text>
              </TouchableOpacity>
            </View>
          ) : filteredBookings.length ===
            0 ? (
            <View
              style={
                styles.empty
              }
            >
              <Text
                style={
                  styles.emptyIcon
                }
              >
                📋
              </Text>

              <Text
                style={
                  styles.emptyTitle
                }
              >
                No bookings found
              </Text>

              <Text
                style={
                  styles.emptyText
                }
              >
                {filter ===
                'all'
                  ? 'Your bookings will appear here.'
                  : `Your ${filter} bookings will appear here.`}
              </Text>
            </View>
          ) : (
            <View
              style={styles.list}
            >
              {filteredBookings.map(
                (booking) => (
                  <BookingCard
                    key={
                      booking.id
                    }
                    booking={
                      booking
                    }
                    onPress={() =>
                      navigation.navigate(
                        'BookingDetails',
                        {
                          bookingId:
                            booking.id,
                        }
                      )
                    }
                  />
                )
              )}
            </View>
          )}
        </ScrollView>

        <CustomerBottomNav
          navigation={
            navigation
          }
          active="Bookings"
        />
      </View>
    </SafeAreaView>
  )
}

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor:
        COLORS.light,
    },

    screen: {
      flex: 1,
    },

    content: {
      padding: 22,
      paddingBottom: 28,
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
      backgroundColor:
        'white',
      borderWidth: 1,
      borderColor:
        COLORS.border,
    },

    filterButtonActive: {
      backgroundColor:
        COLORS.navy,
      borderColor:
        COLORS.navy,
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
      backgroundColor:
        'white',
      borderRadius: 20,
      padding: 17,
      borderWidth: 1,
      borderColor:
        COLORS.border,
    },

    cardTop: {
      flexDirection:
        'row',
      justifyContent:
        'space-between',
      alignItems:
        'flex-start',
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
      maxWidth: 155,
    },

    activeBadge: {
      backgroundColor:
        '#E8F4FF',
    },

    completedBadge: {
      backgroundColor:
        '#EAF8EF',
    },

    cancelledBadge: {
      backgroundColor:
        '#FDECEC',
    },

    neutralBadge: {
      backgroundColor:
        '#F0F2F4',
    },

    statusText: {
      color: COLORS.navy,
      fontSize: 11,
      fontWeight: '800',
    },

    divider: {
      height: 1,
      backgroundColor:
        COLORS.border,
      marginVertical: 15,
    },

    infoRow: {
      flexDirection:
        'row',
      alignItems:
        'center',
      marginBottom: 13,
    },

    infoIcon: {
      width: 32,
      fontSize: 17,
    },

    infoContent: {
      flex: 1,
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
      borderTopColor:
        COLORS.border,
      marginTop: 3,
      paddingTop: 14,
      flexDirection:
        'row',
      justifyContent:
        'space-between',
      alignItems:
        'center',
    },

    totalLabel: {
      color: COLORS.gray,
      fontSize: 13,
      fontWeight: '600',
    },

    paymentState: {
      color: COLORS.gray,
      fontSize: 9,
      marginTop: 2,
    },

    total: {
      color: COLORS.navy,
      fontSize: 19,
      fontWeight: '800',
    },

    center: {
      alignItems:
        'center',
      justifyContent:
        'center',
      paddingVertical: 80,
    },

    loadingText: {
      color: COLORS.gray,
      marginTop: 12,
      fontSize: 14,
    },

    empty: {
      alignItems:
        'center',
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
      textAlign:
        'center',
      lineHeight: 21,
      marginTop: 8,
    },

    retryButton: {
      marginTop: 20,
      backgroundColor:
        COLORS.orange,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 22,
    },

    retryText: {
      color: 'white',
      fontWeight: '800',
    },
  })