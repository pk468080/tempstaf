import { useState } from 'react'
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import * as Location from 'expo-location'

import { AppButton } from '../../components/ui/AppButton'
import { ScreenContainer } from '../../components/layout/ScreenContainer'

type LocationFetchingScreenProps = {
  onLocationFetched: (
    latitude: number,
    longitude: number,
  ) => void
}

export default function LocationFetchingScreen({
  onLocationFetched,
}: LocationFetchingScreenProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleFetchLocation() {
    setError('')
    setLoading(true)

    try {
      const permission =
        await Location.requestForegroundPermissionsAsync()

      if (permission.status !== 'granted') {
        setError(
          'Location permission is required to continue.',
        )
        return
      }

      const location =
        await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        })

      const { latitude, longitude } =
        location.coords

      onLocationFetched(latitude, longitude)
    } catch (err) {
      console.error('Location error:', err)

      setError(
        'Unable to fetch your location. Please try again.',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <ScreenContainer>
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={styles.icon}>
            <Text style={styles.iconText}>⌖</Text>
          </View>

          <Text style={styles.title}>
            Get your location
          </Text>

          <Text style={styles.subtitle}>
            We use your current location to show
            services and workers available in your area.
          </Text>

          {loading ? (
            <ActivityIndicator
              size="large"
              style={styles.loader}
            />
          ) : null}

          {error ? (
            <Text style={styles.error}>{error}</Text>
          ) : null}
        </View>

        <AppButton
          title={
            loading
              ? 'Fetching location...'
              : 'Allow location'
          }
          disabled={loading}
          onPress={handleFetchLocation}
        />
      </View>
    </ScreenContainer>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    paddingTop: 60,
    paddingBottom: 32,
    justifyContent: 'space-between',
  },
  content: {
    alignItems: 'center',
  },
  icon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  iconText: {
    fontSize: 42,
    color: '#111827',
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 12,
    fontSize: 16,
    lineHeight: 24,
    color: '#6B7280',
    textAlign: 'center',
  },
  loader: {
    marginTop: 28,
  },
  error: {
    marginTop: 20,
    fontSize: 14,
    color: '#DC2626',
    textAlign: 'center',
  },
})