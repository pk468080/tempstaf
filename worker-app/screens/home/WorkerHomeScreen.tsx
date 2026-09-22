import {
  useCallback,
} from 'react'

import {
  ActivityIndicator,
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

import ErrorState from '../../components/ui/ErrorState'

import StatusBadge from '../../components/ui/StatusBadge'

import {
  UI,
} from '../../constants/ui'

import {
  useWorkerBookings,
} from '../../hooks/useWorkerBookings'

import {
  useWorkerEarnings,
} from '../../hooks/useWorkerEarnings'

import {
  useWorkerPresence,
} from '../../hooks/useWorkerPresence'

import {
  useWorkerProfile,
} from '../../hooks/useWorkerProfile'

type WorkerHomeScreenProps = {
  onBookings?: () => void
  onSchedule?: () => void
  onNotifications?: () => void
  onProfile?: () => void
}

function formatStatus(
  status: string,
): string {
  switch (status) {
    case 'available':
      return 'Available'

    case 'busy':
      return 'Busy'

    case 'suspended':
      return 'Suspended'

    case 'offline':
    default:
      return 'Offline'
  }
}

function getStatusVariant(
  status: string,
):
  | 'default'
  | 'success'
  | 'warning'
  | 'error'
  | 'info' {
  switch (status) {
    case 'available':
      return 'success'

    case 'busy':
      return 'warning'

    case 'suspended':
      return 'error'

    default:
      return 'default'
  }
}

function formatDateTime(
  value: string,
): string {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString(
    'en-IN',
    {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    },
  )
}

function formatAmount(
  amount: number,
  currency: string | null,
): string {
  const numericAmount =
    Number(amount)

  if (
    !Number.isFinite(
      numericAmount,
    )
  ) {
    return '0.00'
  }

  if (!currency) {
    return numericAmount.toFixed(2)
  }

  try {
    return new Intl.NumberFormat(
      'en-IN',
      {
        style: 'currency',
        currency,
        maximumFractionDigits: 2,
      },
    ).format(numericAmount)
  } catch {
    return `${currency} ${numericAmount.toFixed(2)}`
  }
}

function getBookingLabel(
  status: string,
): string {
  switch (status) {
    case 'assigned':
      return 'Assigned'

    case 'on_the_way':
      return 'On the way'

    case 'arrived':
      return 'Arrived'

    case 'in_progress':
      return 'In progress'

    case 'completed':
      return 'Completed'

    case 'cancelled':
      return 'Cancelled'

    case 'paid':
      return 'Paid'

    case 'searching_worker':
      return 'Searching'

    default:
      return status
        .replace(/_/g, ' ')
        .replace(
          /^./,
          value => value.toUpperCase(),
        )
  }
}

export default function WorkerHomeScreen({
  onBookings,
  onSchedule,
  onNotifications,
  onProfile,
}: WorkerHomeScreenProps) {
  const {
    worker,
    loading: profileLoading,
    error: profileError,
    refresh: refreshProfile,
  } = useWorkerProfile()

  const {
    activeBookings,
    upcomingBookings,
    loading: bookingsLoading,
    error: bookingsError,
    refresh: refreshBookings,
  } = useWorkerBookings()

  const {
    summary,
    loading: earningsLoading,
    error: earningsError,
    refresh: refreshEarnings,
  } = useWorkerEarnings()

  const {
    presence,
    loading: presenceLoading,
    updating: presenceUpdating,
    error: presenceError,
    isOnline,
    goOnline,
    goOffline,
    refresh: refreshPresence,
  } = useWorkerPresence()

  const loading =
    profileLoading ||
    bookingsLoading ||
    earningsLoading ||
    presenceLoading

  const error =
    profileError ||
    bookingsError ||
    earningsError ||
    presenceError

  const refreshAll =
    useCallback(
      async () => {
        await Promise.all([
          refreshProfile(),
          refreshBookings(),
          refreshEarnings(),
          refreshPresence(),
        ])
      },
      [
        refreshProfile,
        refreshBookings,
        refreshEarnings,
        refreshPresence,
      ],
    )

  async function handleTogglePresence() {
    try {
      if (isOnline) {
        await goOffline()
      } else {
        await goOnline()
      }
    } catch {
      // Presence hook exposes the error.
    }
  }

  if (
    loading &&
    !worker &&
    !presence &&
    activeBookings.length === 0 &&
    upcomingBookings.length === 0
  ) {
    return (
      <ScreenContainer>
        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size="large"
            color={UI.colors.secondary}
          />

          <Text style={styles.loadingTitle}>
            Loading your worker dashboard
          </Text>

          <Text style={styles.loadingText}>
            Fetching your profile, presence, bookings and
            earnings...
          </Text>
        </View>
      </ScreenContainer>
    )
  }

  if (
    error &&
    !worker &&
    !presence &&
    activeBookings.length === 0
  ) {
    return (
      <ScreenContainer>
        <ErrorState
          title="Dashboard unavailable"
          message={error}
          onAction={() => {
            void refreshAll()
          }}
        />
      </ScreenContainer>
    )
  }

  const displayName =
    worker?.fullName?.trim() ||
    'Worker'

  const workerStatus =
    presence?.status ??
    worker?.workerStatus ??
    'offline'

  const upcoming =
    upcomingBookings.length > 0
      ? upcomingBookings[0]
      : null

  const activeBooking =
    activeBookings.length > 0
      ? activeBookings[0]
      : null

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={
          styles.content
        }
        refreshControl={
          <RefreshControl
            refreshing={
              loading &&
              Boolean(worker)
            }
            onRefresh={() => {
              void refreshAll()
            }}
          />
        }
      >
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>
              TEMPSTAFF WORKER
            </Text>

            <Text style={styles.title}>
              Welcome, {displayName}
            </Text>

            <Text style={styles.subtitle}>
              Manage your work status and stay ready for
              your next assignment.
            </Text>
          </View>

          {onProfile ? (
            <View style={styles.headerButton}>
              <AppButton
                title="Profile"
                variant="secondary"
                onPress={onProfile}
                disabled={presenceUpdating}
              />
            </View>
          ) : null}
        </View>

        {error ? (
          <View style={styles.warningBox}>
            <Text style={styles.warningTitle}>
              Dashboard update notice
            </Text>

            <Text style={styles.warningText}>
              {error}
            </Text>
          </View>
        ) : null}

        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <View style={styles.statusCopy}>
              <Text style={styles.sectionLabel}>
                Current worker status
              </Text>

              <View style={styles.statusRow}>
                <StatusBadge
                  label={
                    formatStatus(
                      workerStatus,
                    )
                  }
                  variant={
                    getStatusVariant(
                      workerStatus,
                    )
                  }
                />

                {isOnline ? (
                  <Text style={styles.onlineText}>
                    Ready to receive work
                  </Text>
                ) : null}
              </View>
            </View>

            <View style={styles.statusIndicator}>
              <View
                style={[
                  styles.statusDot,
                  isOnline &&
                    styles.statusDotOnline,
                ]}
              />
            </View>
          </View>

          <Text style={styles.statusDescription}>
            {isOnline
              ? 'Your worker presence is active. Keep your location and availability accurate while working.'
              : 'You are currently offline and will not be shown as available for new work.'}
          </Text>

          <View style={styles.statusButton}>
            <AppButton
              title={
                presenceUpdating
                  ? 'Updating...'
                  : isOnline
                    ? 'Go offline'
                    : 'Go online'
              }
              variant={
                isOnline
                  ? 'secondary'
                  : 'primary'
              }
              onPress={() => {
                void handleTogglePresence()
              }}
              disabled={
                presenceUpdating
              }
            />
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {activeBookings.length}
            </Text>

            <Text style={styles.statLabel}>
              Active jobs
            </Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {upcomingBookings.length}
            </Text>

            <Text style={styles.statLabel}>
              Upcoming jobs
            </Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {worker?.totalCompletedJobs ??
                0}
            </Text>

            <Text style={styles.statLabel}>
              Completed
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>
              Earnings
            </Text>

            {onBookings ? (
              <Text style={styles.cardHint}>
                Updated from worker earnings
              </Text>
            ) : null}
          </View>

          {earningsLoading &&
          !summary ? (
            <View style={styles.inlineLoading}>
              <ActivityIndicator
                size="small"
                color={
                  UI.colors.secondary
                }
              />

              <Text style={styles.inlineLoadingText}>
                Loading earnings...
              </Text>
            </View>
          ) : (
            <View style={styles.earningsRow}>
              <View style={styles.earningItem}>
                <Text style={styles.earningValue}>
                  {formatAmount(
                    summary?.totalNetAmount ??
                      0,
                    null,
                  )}
                </Text>

                <Text style={styles.earningLabel}>
                  Net earnings
                </Text>
              </View>

              <View style={styles.earningDivider} />

              <View style={styles.earningItem}>
                <Text style={styles.earningValue}>
                  {summary?.earningCount ??
                    0}
                </Text>

                <Text style={styles.earningLabel}>
                  Earnings entries
                </Text>
              </View>
            </View>
          )}
        </View>

        {activeBooking ? (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>
                Active booking
              </Text>

              <StatusBadge
                label={
                  getBookingLabel(
                    activeBooking.status,
                  )
                }
                variant="info"
              />
            </View>

            <Text style={styles.bookingDate}>
              {formatDateTime(
                activeBooking.scheduledStart,
              )}
            </Text>

            <Text style={styles.bookingDuration}>
              {activeBooking.durationValue}{' '}
              {activeBooking.durationUnit}
            </Text>

            <View style={styles.bookingButton}>
              {onBookings ? (
                <AppButton
                  title="Open bookings"
                  variant="secondary"
                  onPress={onBookings}
                  disabled={
                    presenceUpdating
                  }
                />
              ) : null}
            </View>
          </View>
        ) : null}

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>
              Next scheduled job
            </Text>

            {upcoming ? (
              <StatusBadge
                label={
                  getBookingLabel(
                    upcoming.status,
                  )
                }
                variant="default"
              />
            ) : null}
          </View>

          {upcoming ? (
            <>
              <Text style={styles.bookingDate}>
                {formatDateTime(
                  upcoming.scheduledStart,
                )}
              </Text>

              <Text style={styles.bookingDuration}>
                {upcoming.durationValue}{' '}
                {upcoming.durationUnit}
              </Text>

              {upcoming.notes ? (
                <Text style={styles.bookingNotes}>
                  {upcoming.notes}
                </Text>
              ) : null}
            </>
          ) : (
            <Text style={styles.emptyText}>
              No upcoming scheduled jobs are currently
              available.
            </Text>
          )}

          <View style={styles.actionStack}>
            {onBookings ? (
              <AppButton
                title="View bookings"
                variant="secondary"
                onPress={onBookings}
              />
            ) : null}

            {onSchedule ? (
              <AppButton
                title="Manage schedule"
                variant="secondary"
                onPress={onSchedule}
              />
            ) : null}
          </View>
        </View>

        <View style={styles.quickActions}>
          <Text style={styles.cardTitle}>
            Quick actions
          </Text>

          <View style={styles.quickAction}>
            {onBookings ? (
              <AppButton
                title="My bookings"
                onPress={onBookings}
              />
            ) : null}
          </View>

          {onSchedule ? (
            <View style={styles.quickAction}>
              <AppButton
                title="Availability"
                variant="secondary"
                onPress={onSchedule}
              />
            </View>
          ) : null}

          {onNotifications ? (
            <View style={styles.quickAction}>
              <AppButton
                title="Notifications"
                variant="secondary"
                onPress={onNotifications}
              />
            </View>
          ) : null}
        </View>

        <Text style={styles.footerText}>
          TempStaff worker dashboard
        </Text>
      </ScrollView>
    </ScreenContainer>
  )
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: UI.spacing.xl,
    paddingTop: UI.spacing.xl,
    paddingBottom: UI.spacing.xxxl,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: UI.spacing.lg,
  },

  headerCopy: {
    flex: 1,
    paddingRight: UI.spacing.md,
  },

  headerButton: {
    width: 88,
  },

  eyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.1,
    color: UI.colors.secondary,
  },

  title: {
    marginTop: UI.spacing.sm,
    fontSize: UI.typography.title,
    lineHeight: 30,
    fontWeight: '800',
    color: UI.colors.text,
  },

  subtitle: {
    marginTop: UI.spacing.sm,
    fontSize: UI.typography.body,
    lineHeight: 21,
    color: UI.colors.textSecondary,
  },

  warningBox: {
    marginBottom: UI.spacing.lg,
    padding: UI.spacing.md,
    borderRadius: UI.radius.md,
    backgroundColor:
      UI.colors.warningBackground,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },

  warningTitle: {
    fontSize: UI.typography.small,
    fontWeight: '800',
    color: UI.colors.warning,
  },

  warningText: {
    marginTop: UI.spacing.xs,
    fontSize: UI.typography.small,
    lineHeight: 18,
    color: UI.colors.textSecondary,
  },

  statusCard: {
    padding: UI.spacing.lg,
    borderRadius: UI.radius.xl,
    backgroundColor: UI.colors.primary,
  },

  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  statusCopy: {
    flex: 1,
  },

  sectionLabel: {
    fontSize: UI.typography.small,
    fontWeight: '700',
    color: '#D7E4EF',
  },

  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: UI.spacing.sm,
    flexWrap: 'wrap',
  },

  onlineText: {
    marginLeft: UI.spacing.sm,
    fontSize: UI.typography.small,
    color: '#D7E4EF',
  },

  statusIndicator: {
    width: 36,
    height: 36,
    borderRadius: UI.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#173B55',
  },

  statusDot: {
    width: 12,
    height: 12,
    borderRadius: UI.radius.pill,
    backgroundColor: '#94A3B8',
  },

  statusDotOnline: {
    backgroundColor: UI.colors.success,
  },

  statusDescription: {
    marginTop: UI.spacing.md,
    fontSize: UI.typography.small,
    lineHeight: 18,
    color: '#D7E4EF',
  },

  statusButton: {
    marginTop: UI.spacing.lg,
  },

  statsRow: {
    flexDirection: 'row',
    marginTop: UI.spacing.lg,
    marginLeft: -UI.spacing.sm,
  },

  statCard: {
    flex: 1,
    marginLeft: UI.spacing.sm,
    padding: UI.spacing.md,
    borderRadius: UI.radius.md,
    backgroundColor: UI.colors.surface,
    borderWidth: 1,
    borderColor: UI.colors.border,
  },

  statValue: {
    fontSize: UI.typography.subtitle,
    fontWeight: '800',
    color: UI.colors.text,
  },

  statLabel: {
    marginTop: UI.spacing.xs,
    fontSize: UI.typography.caption,
    lineHeight: 16,
    color: UI.colors.textSecondary,
  },

  card: {
    marginTop: UI.spacing.lg,
    padding: UI.spacing.lg,
    borderRadius: UI.radius.lg,
    backgroundColor: UI.colors.surface,
    borderWidth: 1,
    borderColor: UI.colors.border,
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  cardTitle: {
    flex: 1,
    fontSize: UI.typography.bodyLarge,
    fontWeight: '800',
    color: UI.colors.text,
  },

  cardHint: {
    maxWidth: '50%',
    fontSize: UI.typography.caption,
    color: UI.colors.textMuted,
    textAlign: 'right',
  },

  inlineLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: UI.spacing.lg,
  },

  inlineLoadingText: {
    marginLeft: UI.spacing.sm,
    fontSize: UI.typography.small,
    color: UI.colors.textSecondary,
  },

  earningsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: UI.spacing.lg,
  },

  earningItem: {
    flex: 1,
  },

  earningValue: {
    fontSize: UI.typography.subtitle,
    fontWeight: '800',
    color: UI.colors.text,
  },

  earningLabel: {
    marginTop: UI.spacing.xs,
    fontSize: UI.typography.caption,
    color: UI.colors.textSecondary,
  },

  earningDivider: {
    width: 1,
    height: 40,
    marginHorizontal: UI.spacing.lg,
    backgroundColor: UI.colors.border,
  },

  bookingDate: {
    marginTop: UI.spacing.md,
    fontSize: UI.typography.bodyLarge,
    fontWeight: '700',
    color: UI.colors.text,
  },

  bookingDuration: {
    marginTop: UI.spacing.xs,
    fontSize: UI.typography.small,
    color: UI.colors.textSecondary,
  },

  bookingNotes: {
    marginTop: UI.spacing.md,
    fontSize: UI.typography.small,
    lineHeight: 18,
    color: UI.colors.textSecondary,
  },

  bookingButton: {
    marginTop: UI.spacing.lg,
  },

  emptyText: {
    marginTop: UI.spacing.md,
    fontSize: UI.typography.body,
    lineHeight: 20,
    color: UI.colors.textMuted,
  },

  actionStack: {
    marginTop: UI.spacing.lg,
  },

  quickActions: {
    marginTop: UI.spacing.lg,
    padding: UI.spacing.lg,
    borderRadius: UI.radius.lg,
    backgroundColor: UI.colors.background,
    borderWidth: 1,
    borderColor: UI.colors.border,
  },

  quickAction: {
    marginTop: UI.spacing.sm,
  },

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: UI.spacing.xxl,
  },

  loadingTitle: {
    marginTop: UI.spacing.lg,
    fontSize: UI.typography.subtitle,
    fontWeight: '800',
    color: UI.colors.text,
    textAlign: 'center',
  },

  loadingText: {
    marginTop: UI.spacing.sm,
    fontSize: UI.typography.body,
    lineHeight: 20,
    color: UI.colors.textSecondary,
    textAlign: 'center',
  },

  footerText: {
    marginTop: UI.spacing.lg,
    fontSize: UI.typography.caption,
    color: UI.colors.textMuted,
    textAlign: 'center',
  },
})