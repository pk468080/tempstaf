import {
  useEffect,
  useRef,
} from 'react'

import {
  Image,
  StyleSheet,
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

      /*
       * Restore the worker authentication state
       * immediately while the minimum splash timer
       * runs independently.
       */
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
      <Image
        source={require(
          '../../assets/splash/tempstaff-worker-splash.png',
        )}
        style={styles.splashImage}
        resizeMode="contain"
      />
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

    splashImage: {
      width:
        '100%',

      height:
        '100%',
    },
  })