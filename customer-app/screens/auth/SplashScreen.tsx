import { useEffect } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { UI } from '../../constants/ui'
import {
  CustomerAuthState,
  getCustomerAuthState,
} from '../../services/auth/auth.service'

type SplashScreenProps = {
  onFinished: (authState: CustomerAuthState) => void
}

export default function SplashScreen({
  onFinished,
}: SplashScreenProps) {
  useEffect(() => {
    let mounted = true

    async function initialize() {
      let authState: CustomerAuthState = {
        authenticated: false,
        needsRegistration: true,
      }

      try {
        authState = await getCustomerAuthState()
      } catch (error) {
        console.error(
          'Unable to restore customer session:',
          error,
        )
      }

      const timer = setTimeout(() => {
        if (mounted) {
          onFinished(authState)
        }
      }, UI.splashDuration)

      return () => clearTimeout(timer)
    }

    let cleanup: (() => void) | undefined

    initialize().then(result => {
      cleanup = result
    })

    return () => {
      mounted = false
      cleanup?.()
    }
  }, [onFinished])

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>TempStaff</Text>
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