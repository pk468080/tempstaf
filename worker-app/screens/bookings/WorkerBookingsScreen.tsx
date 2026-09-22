import {
  useMemo,
  useState,
} from 'react'

import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'

import {
  AppButton,
} from '../../components/ui/AppButton'

import {
  ScreenContainer,
} from '../../components/layout/ScreenContainer'

import EmptyState from '../../components/ui/EmptyState'

import ErrorState from '../../components/ui/ErrorState'

import StatusBadge from '../../components/ui/StatusBadge'

import {
  UI,
} from '../../constants/ui'

import {
  useWorkerBookings,
} from '../../hooks/useWorkerBookings'

import {
  formatBookingAmount,
  formatBookingDateTime,
  getBookingDurationHours,
  getBookingStatusLabel,
  getBookingTypeLabel,
  isActiveBookingStatus,
} from '../../lib/workerBookingUtils'

import type {
  BookingStatus,
  WorkerBooking,
} from '../../types/booking'

type WorkerBookingsScreenProps = {
  onBookingPress?: (
    bookingId: string,
  ) => void
  onBack?: () => void
}

type BookingFilter =
  | 'all'
  | 'active'
  | 'upcoming'
  | 'completed'
  | 'cancelled'

const FILTERS: Array<{
  key: BookingFilter
  label: string
}> = [
  {
    key: 'all',
    label: 'All',
  },
  {
    key: 'active',
    label: 'Active',
  },
  {
    key: 'upcoming',
    label: 'Upcoming',
  },
  {
    key: 'completed',
    label: 'Completed',
  },
  {
    key: 'cancelled',
    label: 'Cancelled',
  },
]

function getStatusVariant(
  status: BookingStatus,
):
  | 'default'
  | 'success'
  | 'warning'
  | 'error'
  | 'info' {
  switch (status) {
    case 'assigned':
    case 'paid':
      return 'info'

    case 'on_the_way':
    case 'arrived':
    case 'in_progress':
      return 'warning'

    case 'completed':
      return 'success'

    case 'cancelled':
    case 'expired':
    case 'payment_failed':
      return 'error'

    default:
      return 'default'
  }
}

function isUpcomingBooking(
  booking: WorkerBooking,
): boolean {
  if (
    booking.status ===
      'completed' ||
    booking.status ===
      'cancelled' ||
    booking.status ===
      'expired' ||
    booking.status ===
      'payment_failed'
  ) {
    return false
  }

  if (
    isActiveBookingStatus(
      booking.status,
    )
  ) {
    return true
  }

  const timestamp = new Date(
    booking.scheduledStart,
  ).getTime()

  return (
    Number.isFinite(
      timestamp,
    ) &&
    timestamp >=
      Date.now()
  )
}

function matchesFilter(
  booking: WorkerBooking,
  filter: BookingFilter,
): boolean {
  switch (filter) {
    case 'active':
      return isActiveBookingStatus(
        booking.status,
      )

    case 'upcoming':
      return isUpcomingBooking(
        booking,
      )

    case 'completed':
      return (
        booking.status ===
        'completed'
      )

    case 'cancelled':
      return (
        booking.status ===
          'cancelled' ||
        booking.status ===
          'expired'
      )

    case 'all':
    default:
      return true
  }
}

function sortBookings(
  bookings: WorkerBooking[],
): WorkerBooking[] {
  return [
    ...bookings,
  ].sort(
    (a, b) => {
      return (
        new Date(
          a.scheduledStart,
        ).getTime() -
        new Date(
          b.scheduledStart,
        ).getTime()
      )
    },
  )
}

export default function WorkerBookingsScreen({
  onBookingPress,
  onBack,
}: WorkerBookingsScreenProps) {
  const {
    bookings,
    loading,
    error,
    refresh,
  } = useWorkerBookings()

  const [
    filter,
    setFilter,
  ] = useState<BookingFilter>(
    'all',
  )

  const filteredBookings =
    useMemo(
      () => {
        const filtered =
          bookings.filter(
            booking =>
              matchesFilter(
                booking,
                filter,
              ),
          )

        return sortBookings(
          filtered,
        )
      },
      [
        bookings,
        filter,
      ],
    )

  const counts =
    useMemo(
      () => ({
        all: bookings.length,

        active:
          bookings.filter(
            booking =>
              matchesFilter(
                booking,
                'active',
              ),
          ).length,

        upcoming:
          bookings.filter(
            booking =>
              matchesFilter(
                booking,
                'upcoming',
              ),
          ).length,

        completed:
          bookings.filter(
            booking =>
              matchesFilter(
                booking,
                'completed',
              ),
          ).length,

        cancelled:
          bookings.filter(
            booking =>
              matchesFilter(
                booking,
                'cancelled',
              ),
          ).length,
      }),
      [bookings],
    )

  function handleRefresh() {
    void refresh()
  }

  if (
    loading &&
    bookings.length === 0
  ) {
    return (
      <ScreenContainer>
        <View
          style={
            styles.loadingContainer
          }
        >
          <ActivityIndicator
            size="large"
            color={
              UI.colors.secondary
            }
          />

          <Text
            style={
              styles.loadingTitle
            }
          >
            Loading your bookings
          </Text>

          <Text
            style={
              styles.loadingText
            }
          >
            Fetching assigned, upcoming and completed jobs...
          </Text>
        </View>
      </ScreenContainer>
    )
  }

  if (
    error &&
    bookings.length === 0
  ) {
    return (
      <ScreenContainer>
        <ErrorState
          title="Bookings unavailable"
          message={error}
          onAction={
            handleRefresh
          }
        />
      </ScreenContainer>
    )
  }

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={
          styles.content
        }
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={
              handleRefresh
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
          <View
            style={
              styles.headerCopy
            }
          >
            <Text
              style={
                styles.eyebrow
              }
            >
              WORKER BOOKINGS
            </Text>

            <Text
              style={styles.title}
            >
              My bookings
            </Text>

            <Text
              style={
                styles.subtitle
              }
            >
              Review your assigned work, upcoming jobs and completed services.
            </Text>
          </View>

          {onBack ? (
            <View
              style={
                styles.headerButton
              }
            >
              <AppButton
                title="Back"
                variant="secondary"
                onPress={
                  onBack
                }
              />
            </View>
          ) : null}
        </View>

        {error ? (
          <View
            style={
              styles.warningBox
            }
          >
            <Text
              style={
                styles.warningTitle
              }
            >
              Booking update notice
            </Text>

            <Text
              style={
                styles.warningText
              }
            >
              {error}
            </Text>
          </View>
        ) : null}

        <View
          style={styles.filterCard}
        >
          <Text
            style={
              styles.filterTitle
            }
          >
            Booking views
          </Text>

          <View
            style={
              styles.filterRow
            }
          >
            {FILTERS.map(
              item => {
                const selected =
                  filter ===
                  item.key

                return (
                  <View
                    key={
                      item.key
                    }
                    style={
                      styles.filterButton
                    }
                  >
                    <Pressable
                      onPress={() => {
                        setFilter(
                          item.key,
                        )
                      }}
                      style={({
                        pressed,
                      }) => [
                        styles.filterPressable,
                        selected &&
                          styles.filterSelected,
                        pressed &&
                          styles.filterPressed,
                      ]}
                    >
                      <Text
                        style={[
                          styles.filterLabel,
                          selected &&
                            styles.filterLabelSelected,
                        ]}
                      >
                        {item.label}
                      </Text>

                      <Text
                        style={[
                          styles.filterCount,
                          selected &&
                            styles.filterCountSelected,
                        ]}
                      >
                        {
                          counts[
                            item.key
                          ]
                        }
                      </Text>
                    </Pressable>
                  </View>
                )
              },
            )}
          </View>
        </View>

        {filteredBookings.length ===
        0 ? (
          <View
            style={
              styles.emptyWrapper
            }
          >
            <EmptyState
              title={
                filter ===
                'all'
                  ? 'No bookings yet'
                  : `No ${filter} bookings`
              }
              message={
                filter ===
                'active'
                  ? 'Active worker assignments will appear here.'
                  : filter ===
                      'upcoming'
                    ? 'Upcoming assigned jobs will appear here.'
                    : filter ===
                        'completed'
                      ? 'Completed services will appear here.'
                      : filter ===
                          'cancelled'
                        ? 'Cancelled or expired bookings will appear here.'
                        : 'Bookings assigned to your worker account will appear here.'
              }
              actionLabel="Refresh"
              onAction={
                handleRefresh
              }
            />
          </View>
        ) : (
          <View
            style={styles.list}
          >
            {filteredBookings.map(
              booking => {
                const durationHours =
                  getBookingDurationHours(
                    booking,
                  )

                return (
                  <Pressable
                    key={
                      booking.id
                    }
                    disabled={
                      !onBookingPress
                    }
                    onPress={() => {
                      onBookingPress?.(
                        booking.id,
                      )
                    }}
                    style={({
                      pressed,
                    }) => [
                      styles.bookingCard,
                      pressed &&
                        onBookingPress &&
                        styles.bookingPressed,
                    ]}
                  >
                    <View
                      style={
                        styles.bookingHeader
                      }
                    >
                      <View
                        style={
                          styles.bookingCopy
                        }
                      >
                        <Text
                          style={
                            styles.bookingId
                          }
                        >
                          {booking.id}
                        </Text>

                        <Text
                          style={
                            styles.bookingDate
                          }
                        >
                          {formatBookingDateTime(
                            booking.scheduledStart,
                          )}
                        </Text>
                      </View>

                      <StatusBadge
                        label={getBookingStatusLabel(
                          booking.status,
                        )}
                        variant={getStatusVariant(
                          booking.status,
                        )}
                      />
                    </View>

                    <View
                      style={
                        styles.metaRow
                      }
                    >
                      <View
                        style={
                          styles.metaItem
                        }
                      >
                        <Text
                          style={
                            styles.metaLabel
                          }
                        >
                          Type
                        </Text>

                        <Text
                          style={
                            styles.metaValue
                          }
                        >
                          {getBookingTypeLabel(
                            booking.bookingType,
                          )}
                        </Text>
                      </View>

                      <View
                        style={
                          styles.metaItem
                        }
                      >
                        <Text
                          style={
                            styles.metaLabel
                          }
                        >
                          Duration
                        </Text>

                        <Text
                          style={
                            styles.metaValue
                          }
                        >
                          {booking.durationValue}{' '}
                          {
                            booking.durationUnit
                          }
                          {durationHours !==
                          null
                            ? ` · ${durationHours}h`
                            : ''}
                        </Text>
                      </View>
                    </View>

                    <View
                      style={
                        styles.amountRow
                      }
                    >
                      <View
                        style={
                          styles.amountCopy
                        }
                      >
                        <Text
                          style={
                            styles.amountLabel
                          }
                        >
                          Booking amount
                        </Text>

                        <Text
                          style={
                            styles.amountValue
                          }
                        >
                          {formatBookingAmount(
                            booking.totalAmount,
                            booking.currency,
                          )}
                        </Text>
                      </View>

                      {onBookingPress ? (
                        <Text
                          style={
                            styles.openText
                          }
                        >
                          View details
                        </Text>
                      ) : null}
                    </View>

                    {booking.notes ? (
                      <View
                        style={
                          styles.notesBox
                        }
                      >
                        <Text
                          style={
                            styles.notesLabel
                          }
                        >
                          Notes
                        </Text>

                        <Text
                          style={
                            styles.notesText
                          }
                        >
                          {booking.notes}
                        </Text>
                      </View>
                    ) : null}
                  </Pressable>
                )
              },
            )}
          </View>
        )}

        <Text
          style={
            styles.footerText
          }
        >
          Booking information is loaded from your authenticated TempStaff worker account.
        </Text>
      </ScrollView>
    </ScreenContainer>
  )
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal:
      UI.spacing.xl,
    paddingTop:
      UI.spacing.xl,
    paddingBottom:
      UI.spacing.xxxl,
  },

  header: {
    flexDirection:
      'row',
    alignItems:
      'flex-start',
    marginBottom:
      UI.spacing.lg,
  },

  headerCopy: {
    flex: 1,
    paddingRight:
      UI.spacing.md,
  },

  headerButton: {
    width: 76,
  },

  eyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.1,
    color:
      UI.colors.secondary,
  },

  title: {
    marginTop:
      UI.spacing.sm,
    fontSize:
      UI.typography.title,
    lineHeight: 30,
    fontWeight: '800',
    color:
      UI.colors.text,
  },

  subtitle: {
    marginTop:
      UI.spacing.sm,
    fontSize:
      UI.typography.body,
    lineHeight: 21,
    color:
      UI.colors.textSecondary,
  },

  warningBox: {
    marginBottom:
      UI.spacing.lg,
    padding:
      UI.spacing.md,
    borderRadius:
      UI.radius.md,
    backgroundColor:
      UI.colors.warningBackground,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },

  warningTitle: {
    fontSize:
      UI.typography.small,
    fontWeight: '800',
    color:
      UI.colors.warning,
  },

  warningText: {
    marginTop:
      UI.spacing.xs,
    fontSize:
      UI.typography.small,
    lineHeight: 18,
    color:
      UI.colors.textSecondary,
  },

  filterCard: {
    padding:
      UI.spacing.md,
    borderRadius:
      UI.radius.lg,
    backgroundColor:
      UI.colors.surface,
    borderWidth: 1,
    borderColor:
      UI.colors.border,
  },

  filterTitle: {
    fontSize:
      UI.typography.small,
    fontWeight: '800',
    color:
      UI.colors.text,
  },

  filterRow: {
    flexDirection:
      'row',
    marginTop:
      UI.spacing.sm,
    marginLeft:
      -UI.spacing.xs,
  },

  filterButton: {
    flex: 1,
    marginLeft:
      UI.spacing.xs,
  },

  filterPressable: {
    minHeight: 64,
    alignItems:
      'center',
    justifyContent:
      'center',
    paddingHorizontal:
      UI.spacing.xs,
    borderRadius:
      UI.radius.md,
    backgroundColor:
      UI.colors.background,
    borderWidth: 1,
    borderColor:
      UI.colors.border,
  },

  filterSelected: {
    backgroundColor:
      UI.colors.primary,
    borderColor:
      UI.colors.primary,
  },

  filterPressed: {
    opacity: 0.78,
  },

  filterLabel: {
    fontSize:
      UI.typography.caption,
    fontWeight: '700',
    color:
      UI.colors.textSecondary,
  },

  filterLabelSelected: {
    color:
      UI.colors.surface,
  },

  filterCount: {
    marginTop:
      UI.spacing.xs,
    fontSize:
      UI.typography.bodyLarge,
    fontWeight: '800',
    color:
      UI.colors.text,
  },

  filterCountSelected: {
    color:
      UI.colors.surface,
  },

  list: {
    marginTop:
      UI.spacing.lg,
  },

  bookingCard: {
    marginBottom:
      UI.spacing.md,
    padding:
      UI.spacing.lg,
    borderRadius:
      UI.radius.lg,
    backgroundColor:
      UI.colors.surface,
    borderWidth: 1,
    borderColor:
      UI.colors.border,
  },

  bookingPressed: {
    opacity: 0.82,
  },

  bookingHeader: {
    flexDirection:
      'row',
    alignItems:
      'flex-start',
  },

  bookingCopy: {
    flex: 1,
    paddingRight:
      UI.spacing.md,
  },

  bookingId: {
    fontSize:
      UI.typography.caption,
    fontWeight: '700',
    color:
      UI.colors.textMuted,
  },

  bookingDate: {
    marginTop:
      UI.spacing.xs,
    fontSize:
      UI.typography.bodyLarge,
    lineHeight: 21,
    fontWeight: '800',
    color:
      UI.colors.text,
  },

  metaRow: {
    flexDirection:
      'row',
    marginTop:
      UI.spacing.lg,
    paddingTop:
      UI.spacing.md,
    borderTopWidth: 1,
    borderTopColor:
      UI.colors.border,
  },

  metaItem: {
    flex: 1,
    paddingRight:
      UI.spacing.md,
  },

  metaLabel: {
    fontSize:
      UI.typography.caption,
    color:
      UI.colors.textMuted,
  },

  metaValue: {
    marginTop: 2,
    fontSize:
      UI.typography.small,
    fontWeight: '700',
    color:
      UI.colors.text,
  },

  amountRow: {
    flexDirection:
      'row',
    alignItems:
      'center',
    justifyContent:
      'space-between',
    marginTop:
      UI.spacing.md,
    paddingTop:
      UI.spacing.md,
    borderTopWidth: 1,
    borderTopColor:
      UI.colors.border,
  },

  amountCopy: {
    flex: 1,
  },

  amountLabel: {
    fontSize:
      UI.typography.caption,
    color:
      UI.colors.textMuted,
  },

  amountValue: {
    marginTop: 2,
    fontSize:
      UI.typography.bodyLarge,
    fontWeight: '800',
    color:
      UI.colors.text,
  },

  openText: {
    marginLeft:
      UI.spacing.md,
    fontSize:
      UI.typography.small,
    fontWeight: '800',
    color:
      UI.colors.secondary,
  },

  notesBox: {
    marginTop:
      UI.spacing.md,
    padding:
      UI.spacing.md,
    borderRadius:
      UI.radius.md,
    backgroundColor:
      UI.colors.background,
  },

  notesLabel: {
    fontSize:
      UI.typography.caption,
    fontWeight: '700',
    color:
      UI.colors.textMuted,
  },

  notesText: {
    marginTop:
      UI.spacing.xs,
    fontSize:
      UI.typography.small,
    lineHeight: 18,
    color:
      UI.colors.textSecondary,
  },

  emptyWrapper: {
    minHeight: 360,
    marginTop:
      UI.spacing.lg,
  },

  footerText: {
    marginTop:
      UI.spacing.lg,
    fontSize:
      UI.typography.caption,
    lineHeight: 16,
    color:
      UI.colors.textMuted,
    textAlign: 'center',
  },

  loadingContainer: {
    flex: 1,
    alignItems:
      'center',
    justifyContent:
      'center',
    paddingHorizontal:
      UI.spacing.xxl,
  },

  loadingTitle: {
    marginTop:
      UI.spacing.lg,
    fontSize:
      UI.typography.subtitle,
    fontWeight: '800',
    color:
      UI.colors.text,
    textAlign: 'center',
  },

  loadingText: {
    marginTop:
      UI.spacing.sm,
    fontSize:
      UI.typography.body,
    lineHeight: 20,
    color:
      UI.colors.textSecondary,
    textAlign: 'center',
  },
})