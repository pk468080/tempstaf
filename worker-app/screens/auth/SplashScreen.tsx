import {
  useEffect,
  useRef,
} from 'react'

import {
  StyleSheet,
  Text,
  View,
} from 'react-native'

import { UI } from '../../constants/ui'

import {
  getWorkerAuthState,
} from '../../services/auth/workerAuth.service'

import type {
  WorkerAuthState,
} from '../../services/auth/workerAuth.service'

type SplashScreenProps = {
  onFinished: (
    authState: WorkerAuthState,
  ) => void
}

export default function SplashScreen({
  onFinished,
}: SplashScreenProps) {
  const onFinishedRef =
    useRef(onFinished)

  useEffect(() => {
    onFinishedRef.current =
      onFinished
  }, [
    onFinished,
  ])

  useEffect(() => {
    let mounted = true

    async function initialize() {
      const fallbackAuthState: WorkerAuthState =
        {
          authenticated: false,
          needsRegistration: true,
          email: '',
        }

      const authStatePromise =
        getWorkerAuthState().catch(
          error => {
            console.error(
              'Unable to restore worker session:',
              error,
            )

            return fallbackAuthState
          },
        )

      const minimumSplashPromise =
        new Promise<void>(
          resolve => {
            setTimeout(
              resolve,
              UI.splashDuration,
            )
          },
        )

      const [
        authState,
      ] = await Promise.all([
        authStatePromise,
        minimumSplashPromise,
      ])

      if (!mounted) {
        return
      }

      onFinishedRef.current(
        authState,
      )
    }

    void initialize()

    return () => {
      mounted = false
    }
  }, [])

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>
        TempStaff
      </Text>

      <Text style={styles.subtitle}>
        Worker
      </Text>
    </View>
  )
}

const styles =
  StyleSheet.create({
    container: {
      flex: 1,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        UI.colors.background,
    },

    logo: {
      fontSize: 34,

      fontWeight:
        '800',

      letterSpacing:
        0.5,

      color:
        UI.colors.primary,
    },

    subtitle: {
      marginTop: 8,

      fontSize: 16,

      fontWeight:
        '600',

      color:
        UI.colors.textSecondary,
    },
  })