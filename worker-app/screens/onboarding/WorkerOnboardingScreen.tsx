import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'

import { AppButton } from '../../components/ui/AppButton'
import { ScreenContainer } from '../../components/layout/ScreenContainer'
import { UI } from '../../constants/ui'

import {
  getCurrentWorkerApplicationWithProfile,
  submitWorkerApplication,
} from '../../services/onboarding/workerApplication.service'

import {
  getWorkerConsentStatus,
} from '../../services/onboarding/workerConsent.service'

type WorkerOnboardingScreenProps = {
  onCompleted: () => void
}

type OnboardingStep = 1 | 2 | 3 | 4 | 5

const TOTAL_STEPS = 5

const STEP_TITLES: Record<
  OnboardingStep,
  string
> = {
  1: 'Personal information',
  2: 'Services',
  3: 'Documents',
  4: 'Availability',
  5: 'Consent and submission',
}

const STEP_DESCRIPTIONS: Record<
  OnboardingStep,
  string
> = {
  1: 'Add your personal details, address and service location.',
  2: 'Choose the services you are available to provide.',
  3: 'Upload the required worker verification documents.',
  4: 'Set your weekly working availability and schedule.',
  5: 'Review the worker terms, give consent and submit your application.',
}

export default function WorkerOnboardingScreen({
  onCompleted,
}: WorkerOnboardingScreenProps) {
  const [step, setStep] =
    useState<OnboardingStep>(1)

  const [loading, setLoading] =
    useState(true)

  const [submitting, setSubmitting] =
    useState(false)

  const [errorMessage, setErrorMessage] =
    useState('')

  useEffect(() => {
    let mounted = true

    async function initialize() {
      setLoading(true)
      setErrorMessage('')

      try {
        const [
          application,
          consentStatus,
        ] = await Promise.all([
          getCurrentWorkerApplicationWithProfile(),
          getWorkerConsentStatus(),
        ])

        if (!mounted) {
          return
        }

        if (consentStatus.hasConsent) {
          setStep(5)
          return
        }

        const savedStep =
          application?.onboardingProfile
            ?.onboardingStep

        if (
          typeof savedStep === 'number' &&
          Number.isInteger(savedStep) &&
          savedStep >= 1 &&
          savedStep <= TOTAL_STEPS
        ) {
          setStep(
            savedStep as OnboardingStep,
          )
        }
      } catch (error) {
        console.error(
          'Unable to initialize worker onboarding:',
          error,
        )

        if (!mounted) {
          return
        }

        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'Unable to load worker onboarding.',
        )
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    void initialize()

    return () => {
      mounted = false
    }
  }, [])

  function goToStep(
    nextStep: OnboardingStep,
  ) {
    setErrorMessage('')
    setStep(nextStep)
  }

  async function handleSubmit() {
    if (submitting) {
      return
    }

    setErrorMessage('')
    setSubmitting(true)

    try {
      await submitWorkerApplication()
      onCompleted()
    } catch (error) {
      console.error(
        'Unable to submit worker application:',
        error,
      )

      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to submit your worker application.',
      )
    } finally {
      setSubmitting(false)
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
            Preparing your onboarding
          </Text>

          <Text style={styles.loadingText}>
            Loading your saved worker details...
          </Text>
        </View>
      </ScreenContainer>
    )
  }

  return (
    <ScreenContainer>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>
            TEMPSTAFF WORKER ONBOARDING
          </Text>

          <Text style={styles.title}>
            Complete your worker profile
          </Text>

          <Text style={styles.subtitle}>
            Complete each step before submitting
            your worker application.
          </Text>
        </View>

        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>
              Step {step} of {TOTAL_STEPS}
            </Text>

            <Text style={styles.progressPercent}>
              {Math.round(
                (step / TOTAL_STEPS) * 100,
              )}%
            </Text>
          </View>

          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${(step / TOTAL_STEPS) * 100}%`,
                },
              ]}
            />
          </View>
        </View>

        {errorMessage ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorTitle}>
              Something went wrong
            </Text>

            <Text style={styles.errorText}>
              {errorMessage}
            </Text>
          </View>
        ) : null}

        <View style={styles.stepCard}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>
              {step}
            </Text>
          </View>

          <Text style={styles.stepTitle}>
            {STEP_TITLES[step]}
          </Text>

          <Text style={styles.stepDescription}>
            {STEP_DESCRIPTIONS[step]}
          </Text>

          <View style={styles.checklist}>
            {Object.entries(STEP_TITLES).map(
              ([value, title]) => {
                const itemStep =
                  Number(value) as OnboardingStep

                const completed =
                  itemStep < step

                const current =
                  itemStep === step

                return (
                  <Pressable
                    key={value}
                    disabled
                    style={[
                      styles.checklistItem,
                      current &&
                        styles.checklistItemCurrent,
                    ]}
                  >
                    <View
                      style={[
                        styles.checkCircle,
                        completed &&
                          styles.checkCircleCompleted,
                        current &&
                          styles.checkCircleCurrent,
                      ]}
                    >
                      <Text
                        style={[
                          styles.checkCircleText,
                          completed &&
                            styles.checkCircleTextCompleted,
                          current &&
                            styles.checkCircleTextCurrent,
                        ]}
                      >
                        {completed
                          ? '✓'
                          : value}
                      </Text>
                    </View>

                    <Text
                      style={[
                        styles.checklistText,
                        completed &&
                          styles.checklistTextCompleted,
                        current &&
                          styles.checklistTextCurrent,
                      ]}
                    >
                      {title}
                    </Text>
                  </Pressable>
                )
              },
            )}
          </View>

          <View style={styles.actions}>
            {step > 1 ? (
              <View style={styles.actionButton}>
                <AppButton
                  title="Back"
                  variant="secondary"
                  onPress={() => {
                    goToStep(
                      (step - 1) as OnboardingStep,
                    )
                  }}
                  disabled={submitting}
                />
              </View>
            ) : null}

            <View
              style={[
                styles.actionButton,
                step === 1 &&
                  styles.actionButtonFull,
              ]}
            >
              <AppButton
                title={
                  step === TOTAL_STEPS
                    ? submitting
                      ? 'Submitting...'
                      : 'Submit application'
                    : 'Continue'
                }
                onPress={() => {
                  if (step === TOTAL_STEPS) {
                    void handleSubmit()
                    return
                  }

                  goToStep(
                    (step + 1) as OnboardingStep,
                  )
                }}
                disabled={submitting}
              />
            </View>
          </View>

          {submitting ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator
                size="small"
                color={UI.colors.secondary}
              />

              <Text style={styles.loadingActionText}>
                Submitting your application...
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </ScreenContainer>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: UI.spacing.xl,
    paddingTop: UI.spacing.xl,
    paddingBottom: UI.spacing.lg,
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
    lineHeight: 20,
    color: UI.colors.textSecondary,
  },

  progressCard: {
    padding: UI.spacing.md,
    borderRadius: UI.radius.md,
    backgroundColor: UI.colors.surface,
    borderWidth: 1,
    borderColor: UI.colors.border,
  },

  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  progressLabel: {
    fontSize: UI.typography.small,
    fontWeight: '700',
    color: UI.colors.text,
  },

  progressPercent: {
    fontSize: UI.typography.small,
    fontWeight: '700',
    color: UI.colors.secondary,
  },

  progressTrack: {
    height: 6,
    marginTop: UI.spacing.sm,
    borderRadius: UI.radius.pill,
    overflow: 'hidden',
    backgroundColor: UI.colors.border,
  },

  progressFill: {
    height: '100%',
    borderRadius: UI.radius.pill,
    backgroundColor: UI.colors.secondary,
  },

  errorBox: {
    marginTop: UI.spacing.md,
    padding: UI.spacing.md,
    borderRadius: UI.radius.md,
    backgroundColor: UI.colors.errorBackground,
    borderWidth: 1,
    borderColor: '#FECACA',
  },

  errorTitle: {
    fontSize: UI.typography.small,
    fontWeight: '800',
    color: UI.colors.error,
  },

  errorText: {
    marginTop: UI.spacing.xs,
    fontSize: UI.typography.small,
    lineHeight: 18,
    color: UI.colors.error,
  },

  stepCard: {
    flex: 1,
    marginTop: UI.spacing.lg,
    padding: UI.spacing.xl,
    borderRadius: UI.radius.xl,
    backgroundColor: UI.colors.surface,
    borderWidth: 1,
    borderColor: UI.colors.border,
  },

  stepNumber: {
    width: 44,
    height: 44,
    borderRadius: UI.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: UI.colors.primary,
  },

  stepNumberText: {
    fontSize: UI.typography.subtitle,
    fontWeight: '800',
    color: UI.colors.surface,
  },

  stepTitle: {
    marginTop: UI.spacing.lg,
    fontSize: UI.typography.subtitle,
    fontWeight: '800',
    color: UI.colors.text,
  },

  stepDescription: {
    marginTop: UI.spacing.sm,
    fontSize: UI.typography.body,
    lineHeight: 21,
    color: UI.colors.textSecondary,
  },

  checklist: {
    marginTop: UI.spacing.xl,
  },

  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: UI.spacing.sm,
  },

  checklistItemCurrent: {
    opacity: 1,
  },

  checkCircle: {
    width: 30,
    height: 30,
    borderRadius: UI.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: UI.colors.background,
    borderWidth: 1,
    borderColor: UI.colors.border,
  },

  checkCircleCompleted: {
    backgroundColor: UI.colors.successBackground,
    borderColor: UI.colors.success,
  },

  checkCircleCurrent: {
    backgroundColor: UI.colors.infoBackground,
    borderColor: UI.colors.info,
  },

  checkCircleText: {
    fontSize: UI.typography.small,
    fontWeight: '700',
    color: UI.colors.textMuted,
  },

  checkCircleTextCompleted: {
    color: UI.colors.success,
  },

  checkCircleTextCurrent: {
    color: UI.colors.info,
  },

  checklistText: {
    marginLeft: UI.spacing.md,
    fontSize: UI.typography.body,
    color: UI.colors.textMuted,
  },

  checklistTextCompleted: {
    color: UI.colors.success,
  },

  checklistTextCurrent: {
    fontWeight: '700',
    color: UI.colors.text,
  },

  actions: {
    flexDirection: 'row',
    marginTop: UI.spacing.xxl,
  },

  actionButton: {
    flex: 1,
    marginLeft: UI.spacing.sm,
  },

  actionButtonFull: {
    marginLeft: 0,
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

  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: UI.spacing.md,
  },

  loadingActionText: {
    marginLeft: UI.spacing.sm,
    fontSize: UI.typography.small,
    color: UI.colors.textSecondary,
  },
})