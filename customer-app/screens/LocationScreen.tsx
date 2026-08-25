import { useEffect, useState } from 'react'
import {
  Alert,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'

import { COLORS } from '../constants/theme'
import { RootStackParamList } from '../types'
import { getCurrentLocation } from '../services/location'

type Props = NativeStackScreenProps<
  RootStackParamList,
  'Location'
>

export default function LocationScreen({
  navigation,
}: Props) {
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    requestLocation()
  }, [])

  const requestLocation = async () => {
    try {
      setLoading(true)

      const result = await getCurrentLocation()

      console.log(
        '[TempStaff] Customer location:',
        result
      )

      // Location successfully allowed.
      // For now, continue to Home.
      navigation.reset({
        index: 0,
        routes: [{ name: 'Home' }],
      })
    } catch (error) {
      console.error(
        '[TempStaff] Location permission failed:',
        error
      )

      Alert.alert(
        'Location permission needed',
        'TempStaff needs your location to show services and workers available near you.',
        [
          {
            text: 'Try Again',
            onPress: requestLocation,
          },
        ]
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.icon}>
          <Text style={styles.pin}>📍</Text>
        </View>

        <Text style={styles.title}>
          Allow your location
        </Text>

        <Text style={styles.subtitle}>
          TempStaff uses your location to show nearby
          services and workers available in your area.
        </Text>

        {loading && (
          <Text style={styles.loading}>
            Requesting location permission...
          </Text>
        )}

        <Text style={styles.note}>
          Your location is used only to provide
          location-based services.
        </Text>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.light,
  },

  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },

  icon: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#FFF1DF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },

  pin: {
    fontSize: 42,
  },

  title: {
    color: COLORS.navy,
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 12,
  },

  subtitle: {
    color: COLORS.gray,
    fontSize: 15,
    lineHeight: 23,
    textAlign: 'center',
    maxWidth: 330,
  },

  loading: {
    color: COLORS.teal,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 28,
  },

  note: {
    position: 'absolute',
    bottom: 35,
    left: 30,
    right: 30,
    color: COLORS.gray,
    fontSize: 11,
    lineHeight: 17,
    textAlign: 'center',
  },
})