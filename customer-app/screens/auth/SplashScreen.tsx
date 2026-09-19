import { useEffect, useRef } from 'react'
import {
  StyleSheet,
  Text,
  View,
} from 'react-native'

import { UI } from '../../constants/ui'
import {
  CustomerAuthState,
  getCustomerAuthState,
} from '../../services/auth/auth.service'

type SplashScreenProps = {
  onFinished: (
    authState: CustomerAuthState,
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
  }, [onFinished])

  useEffect(() => {
    let mounted = true

    async function initialize() {
      const fallbackAuthState: CustomerAuthState =
        {
          authenticated: false,
          needsRegistration: true,
          phone: '',
        }

      /*
       * Start the authentication check immediately.
       * The splash timer runs independently so the
       * splash duration is always at least the
       * configured 2 seconds.
       */
      const authStatePromise =
        getCustomerAuthState().catch(
          error => {
            console.error(
              'Unable to restore customer session:',
              error,
            )

            return fallbackAuthState
          },
        )

      const minimumSplashPromise =
        new Promise<void>(resolve => {
          setTimeout(
            resolve,
            UI.splashDuration,
          )
        })

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
        On-demand workforce
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },

  logo: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111827',
  },

  subtitle: {
    marginTop: 8,
    fontSize: 15,
    color: '#6B7280',
  },
})