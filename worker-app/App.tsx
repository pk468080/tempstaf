import {
  useState,
} from 'react'

import {
  StyleSheet,
  Text,
  View,
} from 'react-native'

import SplashScreen from './screens/auth/SplashScreen'
import LoginScreen from './screens/auth/LoginScreen'
import WorkerRegistrationScreen from './screens/auth/WorkerRegistrationScreen'
import WorkerOnboardingScreen from './screens/onboarding/WorkerOnboardingScreen'

import type {
  WorkerAuthState,
} from './services/auth/workerAuth.service'

type AppScreen =
  | 'splash'
  | 'login'
  | 'registration'
  | 'onboarding'
  | 'home'

export default function App() {
  const [screen, setScreen] =
    useState<AppScreen>('splash')

  const [
    authenticatedEmail,
    setAuthenticatedEmail,
  ] = useState('')

  function handleSplashFinished(
    authState: WorkerAuthState,
  ) {
    setAuthenticatedEmail(authState.email)

    if (!authState.authenticated) {
      setScreen('login')
      return
    }

    if (authState.needsRegistration) {
      setScreen('onboarding')
      return
    }

    setScreen('home')
  }

  function handleAuthenticated() {
    setScreen('onboarding')
  }

  function handleRegistered() {
    setScreen('onboarding')
  }

  function handleOnboardingCompleted() {
    setScreen('home')
  }

  if (screen === 'splash') {
    return (
      <SplashScreen
        onFinished={
          handleSplashFinished
        }
      />
    )
  }

  if (screen === 'login') {
    return (
      <LoginScreen
        onAuthenticated={
          handleAuthenticated
        }
        onRegister={() => {
          setScreen('registration')
        }}
      />
    )
  }

  if (screen === 'registration') {
    return (
      <WorkerRegistrationScreen
        onRegistered={
          handleRegistered
        }
        onEmailConfirmationRequired={
          email => {
            setAuthenticatedEmail(email)
            setScreen('login')
          }
        }
        onBackToLogin={() => {
          setScreen('login')
        }}
      />
    )
  }

  if (screen === 'onboarding') {
    return (
      <WorkerOnboardingScreen
        onCompleted={
          handleOnboardingCompleted
        }
      />
    )
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        TempStaff Worker
      </Text>

      <Text style={styles.subtitle}>
        Worker dashboard
      </Text>

      {authenticatedEmail ? (
        <Text style={styles.email}>
          {authenticatedEmail}
        </Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#F6F8FA',
  },

  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0B1F33',
  },

  subtitle: {
    marginTop: 8,
    fontSize: 16,
    color: '#475569',
  },

  email: {
    marginTop: 12,
    fontSize: 14,
    color: '#0F766E',
  },
})