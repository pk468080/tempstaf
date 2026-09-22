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

import EmptyState from '../../components/ui/EmptyState'

import ErrorState from '../../components/ui/ErrorState'

import StatusBadge from '../../components/ui/StatusBadge'

import {
  UI,
} from '../../constants/ui'

import {
  useWorkerNotifications,
} from '../../hooks/useWorkerNotifications'

import {
  getNotificationTypeLabel,
  getRelativeNotificationTime,
} from '../../lib/notificationUtils'

type NotificationsScreenProps = {
  onBack?: () => void
  onBookingPress?: (
    bookingId: string,
  ) => void
}

export default function NotificationsScreen({
  onBack,
  onBookingPress,
}: NotificationsScreenProps) {
  const {
    notifications,
    unreadCount,
    loading,
    updating,
    error,
    refresh,
  } = useWorkerNotifications()

  function handleRefresh() {
    void refresh()
  }

  if (
    loading &&
    notifications.length === 0
  ) {
    return (
      <ScreenContainer>
        <View
          style={styles.loadingContainer}
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
            Loading notifications
          </Text>

          <Text
            style={
              styles.loadingText
            }
          >
            Fetching your latest worker notifications...
          </Text>
        </View>
      </ScreenContainer>
    )
  }

  if (
    error &&
    notifications.length === 0
  ) {
    return (
      <ScreenContainer>
        <ErrorState
          title="Notifications unavailable"
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
            refreshing={
              loading ||
              updating
            }
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
              WORKER NOTIFICATIONS
            </Text>

            <Text
              style={styles.title}
            >
              Notifications
            </Text>

            <Text
              style={
                styles.subtitle
              }
            >
              Stay up to date with booking offers, job updates,
              reminders and account activity.
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
              Notification update notice
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
          style={
            styles.summaryCard
          }
        >
          <View
            style={
              styles.summaryCopy
            }
          >
            <Text
              style={
                styles.summaryTitle
              }
            >
              Notification center
            </Text>

            <Text
              style={
                styles.summaryText
              }
            >
              {notifications.length === 0
                ? 'No notifications have been received yet.'
                : `${notifications.length} notification${
                    notifications.length === 1
                      ? ''
                      : 's'
                  } loaded`}
            </Text>
          </View>

          <StatusBadge
            label={`${unreadCount} unread`}
            variant={
              unreadCount > 0
                ? 'warning'
                : 'default'
            }
          />
        </View>

        {notifications.length === 0 ? (
          <View
            style={
              styles.emptyWrapper
            }
          >
            <EmptyState
              title="No notifications yet"
              message="New booking offers and worker account updates will appear here."
              actionLabel="Refresh"
              onAction={
                handleRefresh
              }
            />
          </View>
        ) : (
          <View
            style={
              styles.list
            }
          >
            {notifications.map(
              notification => {
                const typeLabel =
                  getNotificationTypeLabel(
                    notification.notificationType,
                  )

                const canOpenBooking =
                  Boolean(
                    notification.bookingId &&
                      onBookingPress,
                  )

                return (
                  <View
                    key={
                      notification.id
                    }
                    style={[
                      styles.notificationCard,
                      !notification.isRead &&
                        styles.notificationCardUnread,
                    ]}
                  >
                    <View
                      style={
                        styles.notificationHeader
                      }
                    >
                      <View
                        style={
                          styles.typeBadge
                        }
                      >
                        <Text
                          style={
                            styles.typeText
                          }
                        >
                          {typeLabel}
                        </Text>
                      </View>

                      <Text
                        style={
                          styles.timeText
                        }
                      >
                        {getRelativeNotificationTime(
                          notification.createdAt,
                        )}
                      </Text>
                    </View>

                    <View
                      style={
                        styles.titleRow
                      }
                    >
                      <Text
                        style={
                          styles.notificationTitle
                        }
                      >
                        {notification.title}
                      </Text>

                      {!notification.isRead ? (
                        <View
                          style={
                            styles.unreadDot
                          }
                        />
                      ) : null}
                    </View>

                    <Text
                      style={
                        styles.notificationMessage
                      }
                    >
                      {notification.message}
                    </Text>

                    {canOpenBooking ? (
                      <View
                        style={
                          styles.bookingAction
                        }
                      >
                        <AppButton
                          title="Open booking"
                          variant="secondary"
                          onPress={() => {
                            if (
                              notification.bookingId &&
                              onBookingPress
                            ) {
                              onBookingPress(
                                notification.bookingId,
                              )
                            }
                          }}
                        />
                      </View>
                    ) : null}
                  </View>
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
          Notifications are loaded from your TempStaff worker account.
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

  summaryCard: {
    flexDirection:
      'row',
    alignItems:
      'center',
    justifyContent:
      'space-between',
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

  summaryCopy: {
    flex: 1,
    paddingRight:
      UI.spacing.md,
  },

  summaryTitle: {
    fontSize:
      UI.typography.bodyLarge,
    fontWeight: '800',
    color:
      UI.colors.text,
  },

  summaryText: {
    marginTop:
      UI.spacing.xs,
    fontSize:
      UI.typography.small,
    color:
      UI.colors.textSecondary,
  },

  list: {
    marginTop:
      UI.spacing.lg,
  },

  notificationCard: {
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

  notificationCardUnread: {
    borderColor:
      UI.colors.secondary,
    backgroundColor:
      '#F8FFFE',
  },

  notificationHeader: {
    flexDirection:
      'row',
    alignItems:
      'center',
    justifyContent:
      'space-between',
  },

  typeBadge: {
    paddingHorizontal:
      UI.spacing.sm,
    paddingVertical:
      UI.spacing.xs,
    borderRadius:
      UI.radius.pill,
    backgroundColor:
      UI.colors.infoBackground,
  },

  typeText: {
    fontSize:
      UI.typography.caption,
    fontWeight: '800',
    color:
      UI.colors.info,
  },

  timeText: {
    marginLeft:
      UI.spacing.sm,
    fontSize:
      UI.typography.caption,
    color:
      UI.colors.textMuted,
  },

  titleRow: {
    flexDirection:
      'row',
    alignItems:
      'flex-start',
    marginTop:
      UI.spacing.md,
  },

  notificationTitle: {
    flex: 1,
    fontSize:
      UI.typography.bodyLarge,
    lineHeight: 21,
    fontWeight: '800',
    color:
      UI.colors.text,
  },

  unreadDot: {
    width: 8,
    height: 8,
    marginTop: 5,
    marginLeft:
      UI.spacing.sm,
    borderRadius:
      UI.radius.pill,
    backgroundColor:
      UI.colors.secondary,
  },

  notificationMessage: {
    marginTop:
      UI.spacing.sm,
    fontSize:
      UI.typography.body,
    lineHeight: 21,
    color:
      UI.colors.textSecondary,
  },

  bookingAction: {
    marginTop:
      UI.spacing.md,
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