import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from 'react-native'

import { ScreenContainer } from '../../components/layout/ScreenContainer'
import { OnboardingProgress } from '../../components/onboarding/OnboardingProgress'
import { UI } from '../../constants/ui'

import {
  getCurrentWorkerApplicationWithProfile,
  submitWorkerApplication,
} from '../../services/onboarding/workerApplication.service'

import {
  getWorkerConsentStatus,
} from '../../services/onboarding/workerConsent.service'

import PersonalInformationScreen from './PersonalInformationScreen'
import ServicesScreen from './ServicesScreen'
import DocumentsScreen from './DocumentsScreen'
import AvailabilityScreen from './AvailabilityScreen'
import ConsentScreen from './ConsentScreen'

type WorkerOnboardingScreenProps = {
  onCompleted: () => void
}

type OnboardingStep = 1 | 2 | 3 | 4 | 5

const TOTAL_STEPS = 5

export default function WorkerOnboardingScreen({
  onCompleted,
}: WorkerOnboardingScreenProps) {
  const [step, setStep] =
    useState<OnboardingStep>(1)

  const [loading, setLoading] =
    useState(true)

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
        } else if (
          application?.onboardingProfile
            ?.onboardingStep
        ) {
          const savedStep =
            application.onboardingProfile
              .onboardingStep

          setStep(
            Math.min(
              Math.max(savedStep, 1),
              TOTAL_STEPS,
            ) as OnboardingStep,
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

  function clearError() {
    setErrorMessage('')
  }

  function goToStep(
    nextStep: OnboardingStep,
  ) {
    clearError()
    setStep(nextStep)
  }

  async function handleCompleted() {
    clearError()
    setLoading(true)

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
      setLoading(false)
    }
  }

  function renderStep() {
    if (step === 1) {
      return (
        <PersonalInformationScreen
          onContinue={() => {
            goToStep(2)
          }}
        />
      )
    }

    if (step === 2) {
      return (
        <ServicesScreen
          onContinue={() => {
            goToStep(3)
          }}
          onBack={() => {
            goToStep(1)
          }}
        />
      )
    }

    if (step === 3) {
      return (
        <DocumentsScreen
          onContinue={() => {
            goToStep(4)
          }}
          onBack={() => {
            goToStep(2)
          }}
        />
      )
    }

    if (step === 4) {
      return (
        <AvailabilityScreen
          onContinue={() => {
            goToStep(5)
          }}
          onBack={() => {
            goToStep(3)
          }}
        />
      )
    }

    return (
      <ConsentScreen
        onCompleted={() => {
          void handleCompleted()
        }}
        onBack={() => {
          goToStep(4)
        }}
      />
    )
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
            Finish these steps before your
            application can be submitted.
          </Text>
        </View>

        <OnboardingProgress
          currentStep={step}
          totalSteps={TOTAL_STEPS}
        />

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

        <View style={styles.stepContainer}>
          {renderStep()}
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

  stepContainer: {
    flex: 1,
    marginTop: UI.spacing.lg,
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
})