import {
  useState,
} from 'react'

import {
  Alert,
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

import {
  UI,
} from '../../constants/ui'

import {
  signOutWorker,
} from '../../services/auth/workerAuth.service'

type SettingsScreenProps = {
  onBack?: () => void
  onEditProfile?: () => void
  onSchedule?: () => void
  onNotifications?: () => void
  onSupport?: () => void
  onSignedOut?: () => void
}

const APP_VERSION = '1.0.0'

export default function SettingsScreen({
  onBack,
  onEditProfile,
  onSchedule,
  onNotifications,
  onSupport,
  onSignedOut,
}: SettingsScreenProps) {
  const [
    signingOut,
    setSigningOut,
  ] = useState(false)

  function handleSignOut() {
    if (signingOut) {
      return
    }

    Alert.alert(
      'Sign out',
      'Are you sure you want to sign out of the TempStaff worker app?',
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
    if (signingOut) {
      return
    }

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

  function showUnavailable(
    title: string,
  ) {
    Alert.alert(
      title,
      'This setting is not configured in the current worker app build.',
    )
  }

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={
          styles.content
        }
        showsVerticalScrollIndicator={
          false
        }
      >
        <View
          style={styles.header}
        >
          <View
            style={styles.headerCopy}
          >
            <Text
              style={styles.eyebrow}
            >
              WORKER SETTINGS
            </Text>

            <Text
              style={styles.title}
            >
              Settings
            </Text>

            <Text
              style={styles.subtitle}
            >
              Manage your worker account shortcuts and app-level actions.
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
                onPress={onBack}
                disabled={
                  signingOut
                }
              />
            </View>
          ) : null}
        </View>

        <View
          style={styles.section}
        >
          <Text
            style={styles.sectionTitle}
          >
            Account
          </Text>

          {onEditProfile ? (
            <View
              style={
                styles.actionButton
              }
            >
              <AppButton
                title="Edit profile"
                onPress={
                  onEditProfile
                }
                disabled={
                  signingOut
                }
              />
            </View>
          ) : null}

          <View
            style={
              styles.actionButton
            }
          >
            <AppButton
              title="Sign out"
              variant="secondary"
              onPress={
                handleSignOut
              }
              disabled={
                signingOut
              }
            />
          </View>
        </View>

        <View
          style={styles.section}
        >
          <Text
            style={styles.sectionTitle}
          >
            Worker operations
          </Text>

          {onSchedule ? (
            <View
              style={
                styles.actionButton
              }
            >
              <AppButton
                title="Availability and schedule"
                variant="secondary"
                onPress={
                  onSchedule
                }
                disabled={
                  signingOut
                }
              />
            </View>
          ) : null}

          {onNotifications ? (
            <View
              style={
                styles.actionButton
              }
            >
              <AppButton
                title="Notifications"
                variant="secondary"
                onPress={
                  onNotifications
                }
                disabled={
                  signingOut
                }
              />
            </View>
          ) : null}

          {onSupport ? (
            <View
              style={
                styles.actionButton
              }
            >
              <AppButton
                title="Support"
                variant="secondary"
                onPress={
                  onSupport
                }
                disabled={
                  signingOut
                }
              />
            </View>
          ) : null}
        </View>

        <View
          style={styles.section}
        >
          <Text
            style={styles.sectionTitle}
          >
            Notifications
          </Text>

          <Text
            style={styles.sectionText}
          >
            Notification delivery is managed by the worker notification service.
            Push-token registration and notification preferences are handled
            separately from these account shortcuts.
          </Text>

          <View
            style={
              styles.actionButton
            }
          >
            <AppButton
              title="Notification preferences"
              variant="secondary"
              onPress={() => {
                showUnavailable(
                  'Notification preferences',
                )
              }}
              disabled={
                signingOut
              }
            />
          </View>
        </View>

        <View
          style={styles.infoCard}
        >
          <Text
            style={styles.infoTitle}
          >
            TempStaff Worker
          </Text>

          <View
            style={styles.infoRow}
          >
            <Text
              style={styles.infoLabel}
            >
              App version
            </Text>

            <Text
              style={styles.infoValue}
            >
              {APP_VERSION}
            </Text>
          </View>

          <View
            style={styles.infoDivider}
          />

          <View
            style={styles.infoRow}
          >
            <Text
              style={styles.infoLabel}
            >
              Environment
            </Text>

            <Text
              style={styles.infoValue}
            >
              Worker app
            </Text>
          </View>
        </View>

        {signingOut ? (
          <View
            style={styles.signingOutBox}
          >
            <Text
              style={
                styles.signingOutText
              }
            >
              Signing out...
            </Text>
          </View>
        ) : null}

        <Text
          style={styles.footerText}
        >
          Account, schedule, notification and support data remain associated
          with your authenticated TempStaff worker account.
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

  section: {
    marginTop:
      UI.spacing.lg,
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

  sectionTitle: {
    fontSize:
      UI.typography.bodyLarge,
    fontWeight: '800',
    color:
      UI.colors.text,
  },

  sectionText: {
    marginTop:
      UI.spacing.sm,
    fontSize:
      UI.typography.small,
    lineHeight: 18,
    color:
      UI.colors.textSecondary,
  },

  actionButton: {
    marginTop:
      UI.spacing.md,
  },

  infoCard: {
    marginTop:
      UI.spacing.lg,
    padding:
      UI.spacing.lg,
    borderRadius:
      UI.radius.lg,
    backgroundColor:
      UI.colors.background,
    borderWidth: 1,
    borderColor:
      UI.colors.border,
  },

  infoTitle: {
    fontSize:
      UI.typography.bodyLarge,
    fontWeight: '800',
    color:
      UI.colors.text,
  },

  infoRow: {
    flexDirection:
      'row',
    alignItems:
      'center',
    justifyContent:
      'space-between',
    paddingVertical:
      UI.spacing.md,
  },

  infoLabel: {
    fontSize:
      UI.typography.small,
    color:
      UI.colors.textSecondary,
  },

  infoValue: {
    fontSize:
      UI.typography.small,
    fontWeight: '700',
    color:
      UI.colors.text,
  },

  infoDivider: {
    height: 1,
    backgroundColor:
      UI.colors.border,
  },

  signingOutBox: {
    marginTop:
      UI.spacing.lg,
    padding:
      UI.spacing.md,
    borderRadius:
      UI.radius.md,
    backgroundColor:
      UI.colors.infoBackground,
    borderWidth: 1,
    borderColor:
      UI.colors.info,
  },

  signingOutText: {
    fontSize:
      UI.typography.small,
    fontWeight: '700',
    color:
      UI.colors.info,
    textAlign: 'center',
  },

  footerText: {
    marginTop:
      UI.spacing.lg,
    fontSize:
      UI.typography.caption,
    lineHeight: 17,
    color:
      UI.colors.textMuted,
    textAlign: 'center',
  },
})