import {
  useState,
} from 'react'

import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'

import {
  AppButton,
} from '../../components/ui/AppButton'

import StatusBadge from '../../components/ui/StatusBadge'

import ErrorState from '../../components/ui/ErrorState'

import {
  ScreenContainer,
} from '../../components/layout/ScreenContainer'

import {
  UI,
} from '../../constants/ui'

import {
  useWorkerProfile,
} from '../../hooks/useWorkerProfile'

import {
  signOutWorker,
} from '../../services/auth/workerAuth.service'

type ProfileScreenProps = {
  onEditProfile?: () => void
  onSettings?: () => void
  onSignedOut?: () => void
}

function formatWorkerStatus(
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

function getWorkerStatusVariant(
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

    case 'offline':
    default:
      return 'default'
  }
}

function formatDate(
  value: string,
): string {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleDateString(
    'en-IN',
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    },
  )
}

export default function ProfileScreen({
  onEditProfile,
  onSettings,
  onSignedOut,
}: ProfileScreenProps) {
  const {
    worker,
    loading,
    error,
    refresh,
  } = useWorkerProfile()

  const [signingOut, setSigningOut] =
    useState(false)

  async function handleSignOut() {
    if (signingOut) {
      return
    }

    Alert.alert(
      'Sign out',
      'Are you sure you want to sign out of the worker app?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign out',
          style: 'destructive',
          onPress: () => {
            void performSignOut()
          },
        },
      ],
    )
  }

  async function performSignOut() {
    setSigningOut(true)

    try {
      await signOutWorker()
      onSignedOut?.()
    } catch (cause) {
      Alert.alert(
        'Unable to sign out',
        cause instanceof Error
          ? cause.message
          : 'Please try again.',
      )
    } finally {
      setSigningOut(false)
    }
  }

  if (loading) {
    return (
      <ScreenContainer>
        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size="large"
            color={UI.colors.secondary}
          />

          <Text style={styles.loadingTitle}>
            Loading your profile
          </Text>

          <Text style={styles.loadingText}>
            Fetching your latest worker profile details...
          </Text>
        </View>
      </ScreenContainer>
    )
  }

  if (error && !worker) {
    return (
      <ScreenContainer>
        <ErrorState
          title="Profile unavailable"
          message={error}
          onAction={() => {
            void refresh()
          }}
        />
      </ScreenContainer>
    )
  }

  if (!worker) {
    return (
      <ScreenContainer>
        <ErrorState
          title="Worker profile not found"
          message="We could not find a worker profile for the signed-in account."
          onAction={() => {
            void refresh()
          }}
        />
      </ScreenContainer>
    )
  }

  const displayName =
    worker.fullName?.trim() ||
    'TempStaff Worker'

  const statusLabel =
    formatWorkerStatus(
      worker.workerStatus,
    )

  const statusVariant =
    getWorkerStatusVariant(
      worker.workerStatus,
    )

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={
          styles.content
        }
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.eyebrow}>
            WORKER PROFILE
          </Text>

          <Text style={styles.title}>
            Your profile
          </Text>

          <Text style={styles.subtitle}>
            Review your worker account details and
            current operating status.
          </Text>
        </View>

        {error ? (
          <View style={styles.warningBox}>
            <Text style={styles.warningTitle}>
              Profile update notice
            </Text>

            <Text style={styles.warningText}>
              {error}
            </Text>
          </View>
        ) : null}

        <View style={styles.identityCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {displayName
                .slice(0, 1)
                .toUpperCase()}
            </Text>
          </View>

          <View style={styles.identityCopy}>
            <Text style={styles.name}>
              {displayName}
            </Text>

            {worker.email ? (
              <Text style={styles.email}>
                {worker.email}
              </Text>
            ) : null}

            <View style={styles.badgeRow}>
              <StatusBadge
                label={statusLabel}
                variant={
                  statusVariant
                }
              />

              {worker.isVerified ? (
                <View style={styles.badgeSpacer}>
                  <StatusBadge
                    label="Verified"
                    variant="success"
                  />
                </View>
              ) : (
                <View style={styles.badgeSpacer}>
                  <StatusBadge
                    label="Verification pending"
                    variant="warning"
                  />
                </View>
              )}
            </View>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>
            Account information
          </Text>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>
              Full name
            </Text>

            <Text style={styles.detailValue}>
              {displayName}
            </Text>
          </View>

          <View style={styles.detailDivider} />

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>
              Email
            </Text>

            <Text style={styles.detailValue}>
              {worker.email || 'Not available'}
            </Text>
          </View>

          <View style={styles.detailDivider} />

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>
              Mobile number
            </Text>

            <Text style={styles.detailValue}>
              {worker.phone || 'Not available'}
            </Text>
          </View>

          <View style={styles.detailDivider} />

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>
              Account created
            </Text>

            <Text style={styles.detailValue}>
              {formatDate(worker.createdAt)}
            </Text>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>
            Worker performance
          </Text>

          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                {worker.rating.toFixed(1)}
              </Text>

              <Text style={styles.statLabel}>
                Rating
              </Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                {worker.totalCompletedJobs}
              </Text>

              <Text style={styles.statLabel}>
                Completed jobs
              </Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                {worker.serviceRadiusKm.toFixed(1)}
              </Text>

              <Text style={styles.statLabel}>
                Service radius (km)
              </Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                {worker.isFeatured
                  ? 'Yes'
                  : 'No'}
              </Text>

              <Text style={styles.statLabel}>
                Featured worker
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>
            Current location
          </Text>

          {worker.currentLocation ? (
            <>
              <View style={styles.locationRow}>
                <View style={styles.locationDot} />

                <View style={styles.locationCopy}>
                  <Text style={styles.locationTitle}>
                    Location available
                  </Text>

                  <Text
                    style={
                      styles.locationCoordinates
                    }
                  >
                    {worker.currentLocation.latitude.toFixed(
                      6,
                    )}
                    {' , '}
                    {worker.currentLocation.longitude.toFixed(
                      6,
                    )}
                  </Text>
                </View>
              </View>

              <Text style={styles.locationRecorded}>
                Last recorded:{" "}
                {formatDate(
                  worker.currentLocation
                    .recordedAt,
                )}
              </Text>
            </>
          ) : (
            <Text style={styles.emptyLocation}>
              No current worker location is available.
            </Text>
          )}
        </View>

        <View style={styles.actionsCard}>
          {onEditProfile ? (
            <View style={styles.actionButton}>
              <AppButton
                title="Edit profile"
                onPress={onEditProfile}
                disabled={signingOut}
              />
            </View>
          ) : null}

          {onSettings ? (
            <View style={styles.actionButton}>
              <AppButton
                title="Settings"
                variant="secondary"
                onPress={onSettings}
                disabled={signingOut}
              />
            </View>
          ) : null}

          <View style={styles.actionButton}>
            <AppButton
              title={
                signingOut
                  ? 'Signing out...'
                  : 'Sign out'
              }
              variant="secondary"
              onPress={() => {
                void handleSignOut()
              }}
              disabled={signingOut}
            />
          </View>
        </View>

        <Text style={styles.footerText}>
          Worker profile information is loaded from your
          TempStaff account.
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
    marginBottom: UI.spacing.lg,
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

  identityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: UI.spacing.lg,
    borderRadius: UI.radius.xl,
    backgroundColor: UI.colors.primary,
  },

  avatar: {
    width: 64,
    height: 64,
    borderRadius: UI.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: UI.colors.surface,
  },

  avatarText: {
    fontSize: UI.typography.title,
    fontWeight: '800',
    color: UI.colors.primary,
  },

  identityCopy: {
    flex: 1,
    marginLeft: UI.spacing.lg,
  },

  name: {
    fontSize: UI.typography.subtitle,
    lineHeight: 24,
    fontWeight: '800',
    color: UI.colors.surface,
  },

  email: {
    marginTop: UI.spacing.xs,
    fontSize: UI.typography.small,
    color: '#D7E4EF',
  },

  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: UI.spacing.sm,
    flexWrap: 'wrap',
  },

  badgeSpacer: {
    marginLeft: UI.spacing.sm,
  },

  sectionCard: {
    marginTop: UI.spacing.lg,
    padding: UI.spacing.lg,
    borderRadius: UI.radius.lg,
    backgroundColor: UI.colors.surface,
    borderWidth: 1,
    borderColor: UI.colors.border,
  },

  sectionTitle: {
    fontSize: UI.typography.bodyLarge,
    fontWeight: '800',
    color: UI.colors.text,
  },

  detailRow: {
    paddingVertical: UI.spacing.md,
  },

  detailLabel: {
    fontSize: UI.typography.small,
    fontWeight: '600',
    color: UI.colors.textMuted,
  },

  detailValue: {
    marginTop: UI.spacing.xs,
    fontSize: UI.typography.bodyLarge,
    color: UI.colors.text,
  },

  detailDivider: {
    height: 1,
    backgroundColor: UI.colors.border,
  },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: UI.spacing.md,
    marginLeft: -UI.spacing.sm,
  },

  statCard: {
    width: '50%',
    paddingLeft: UI.spacing.sm,
    marginBottom: UI.spacing.sm,
  },

  statValue: {
    padding: UI.spacing.md,
    paddingBottom: UI.spacing.xs,
    borderTopLeftRadius: UI.radius.md,
    borderTopRightRadius: UI.radius.md,
    backgroundColor: UI.colors.background,
    fontSize: UI.typography.subtitle,
    fontWeight: '800',
    color: UI.colors.text,
  },

  statLabel: {
    paddingHorizontal: UI.spacing.md,
    paddingBottom: UI.spacing.md,
    borderBottomLeftRadius: UI.radius.md,
    borderBottomRightRadius: UI.radius.md,
    backgroundColor: UI.colors.background,
    fontSize: UI.typography.caption,
    color: UI.colors.textSecondary,
  },

  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: UI.spacing.md,
  },

  locationDot: {
    width: 12,
    height: 12,
    borderRadius: UI.radius.pill,
    backgroundColor: UI.colors.success,
  },

  locationCopy: {
    flex: 1,
    marginLeft: UI.spacing.md,
  },

  locationTitle: {
    fontSize: UI.typography.small,
    fontWeight: '800',
    color: UI.colors.success,
  },

  locationCoordinates: {
    marginTop: 2,
    fontSize: UI.typography.caption,
    color: UI.colors.textSecondary,
  },

  locationRecorded: {
    marginTop: UI.spacing.md,
    fontSize: UI.typography.caption,
    color: UI.colors.textMuted,
  },

  emptyLocation: {
    marginTop: UI.spacing.md,
    fontSize: UI.typography.body,
    lineHeight: 20,
    color: UI.colors.textSecondary,
  },

  actionsCard: {
    marginTop: UI.spacing.lg,
  },

  actionButton: {
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
    lineHeight: 16,
    color: UI.colors.textMuted,
    textAlign: 'center',
  },
})