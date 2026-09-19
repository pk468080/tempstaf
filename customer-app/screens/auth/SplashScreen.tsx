import { useEffect } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { UI } from '../../constants/ui'

type SplashScreenProps = {
  onFinished: () => void
}

export default function SplashScreen({
  onFinished,
}: SplashScreenProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onFinished()
    }, UI.splashDuration)

    return () => clearTimeout(timer)
  }, [onFinished])

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>TempStaff</Text>
      <Text style={styles.subtitle}>On-demand workforce</Text>
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