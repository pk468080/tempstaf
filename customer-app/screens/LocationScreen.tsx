import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'

import { COLORS } from '../constants/theme'
import { RootStackParamList } from '../types'
import { useBooking } from '../context/BookingContext'
import { getCurrentLocation } from '../services/location'
import { supabase } from '../lib/supabase'
import PrimaryButton from '../components/PrimaryButton'
import Header from '../components/Header'

type Props = NativeStackScreenProps<
  RootStackParamList,
  'Location'
>

export default function LocationScreen({
  navigation,
}: Props) {
  const {
    address,
    coordinates,
    setAddress,
    setCoordinates,
  } = useBooking()

  const [houseNumber, setHouseNumber] = useState('')
  const [street, setStreet] = useState('')
  const [area, setArea] = useState('')
  const [city, setCity] = useState('')
  const [pincode, setPincode] = useState('')

  const [latitude, setLatitude] = useState<number | null>(
    null
  )
  const [longitude, setLongitude] = useState<number | null>(
    null
  )

  const [gettingLocation, setGettingLocation] =
    useState(false)

  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadCurrentLocation()
  }, [])

  const loadCurrentLocation = async () => {
    try {
      setGettingLocation(true)

      const result = await getCurrentLocation()

      setLatitude(result.latitude)
      setLongitude(result.longitude)

      setCoordinates(
        `${result.latitude},${result.longitude}`
      )
    } catch (error: any) {
      console.warn(
        '[TempStaff] Could not fetch current location:',
        error
      )

      // Do not block the customer.
      // They can still enter their service address manually.
    } finally {
      setGettingLocation(false)
    }
  }

  const useMyLocation = async () => {
    try {
      setGettingLocation(true)

      const result = await getCurrentLocation()

      setLatitude(result.latitude)
      setLongitude(result.longitude)

      setCoordinates(
        `${result.latitude},${result.longitude}`
      )

      Alert.alert(
        'Location updated',
        'Your current location has been added.'
      )
    } catch (error: any) {
      Alert.alert(
        'Location unavailable',
        'We could not get your current location. You can still enter your address manually.'
      )
    } finally {
      setGettingLocation(false)
    }
  }

  const buildAddress = () => {
    return [
      houseNumber.trim(),
      street.trim(),
      area.trim(),
      city.trim(),
      pincode.trim(),
    ]
      .filter(Boolean)
      .join(', ')
  }

  const canContinue =
    houseNumber.trim().length >= 1 &&
    street.trim().length >= 2 &&
    area.trim().length >= 2 &&
    city.trim().length >= 2 &&
    pincode.trim().length === 6 &&
    /^\d{6}$/.test(pincode.trim()) &&
    !saving

  const saveAddress = async () => {
    if (!canContinue) {
      Alert.alert(
        'Complete your address',
        'Please enter your house number, street, area, city and a valid 6-digit PIN code.'
      )
      return
    }

    try {
      setSaving(true)

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError) {
        throw userError
      }

      if (!user) {
        throw new Error(
          'Customer is not authenticated.'
        )
      }

      const fullAddress = buildAddress()

      // Development fallback for Android emulator.
      // The emulator GPS is currently timing out, so use
      // the Delhi coordinates we configured with adb.
      const finalLatitude =
        latitude ?? (__DEV__ ? 28.6139 : null)

      const finalLongitude =
        longitude ?? (__DEV__ ? 77.2090 : null)

      if (
        finalLatitude === null ||
        finalLongitude === null
      ) {
        Alert.alert(
          'Location required',
          'Please allow location access or try again.'
        )
        return
      }

      const { data, error } = await supabase
        .from('addresses')
        .insert({
          user_id: user.id,
          label: 'Service Address',
          address_line: fullAddress,
          latitude: finalLatitude,
          longitude: finalLongitude,
        })
        .select('id, address_line, latitude, longitude')
        .single()

      if (error) {
        console.error(
          '[TempStaff] Failed to save service address:',
          error
        )

        throw error
      }

      setAddress(data.address_line)

      setCoordinates(
        `${data.latitude},${data.longitude}`
      )

      navigation.navigate('Payment')
    } catch (error: any) {
      console.error(
        '[TempStaff] Address save failed:',
        error
      )

      Alert.alert(
        'Unable to save address',
        error?.message ||
          'We could not save your service address. Please try again.'
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }
      >
        <ScrollView
          contentContainerStyle={styles.page}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Header
            onBack={() => navigation.goBack()}
          />

          <Text style={styles.title}>
            Where do you need the staff?
          </Text>

          <Text style={styles.subtitle}>
            Enter the address where the TempStaff worker
            will provide the service.
          </Text>

          <TouchableOpacity
            style={styles.locationButton}
            onPress={useMyLocation}
            disabled={gettingLocation || saving}
            activeOpacity={0.85}
          >
            {gettingLocation ? (
              <ActivityIndicator
                size="small"
                color={COLORS.teal}
              />
            ) : (
              <Text style={styles.locationIcon}>
                📍
              </Text>
            )}

            <View style={styles.locationContent}>
              <Text style={styles.locationTitle}>
                {gettingLocation
                  ? 'Getting your location...'
                  : 'Use my current location'}
              </Text>

              <Text style={styles.locationText}>
                We will use it to locate the service
                address.
              </Text>
            </View>
          </TouchableOpacity>

          <Text style={styles.section}>
            Service address
          </Text>

          <Text style={styles.label}>
            House / Flat / Office number
          </Text>

          <TextInput
            style={styles.input}
            placeholder="e.g. 24A"
            placeholderTextColor="#9CA3AF"
            value={houseNumber}
            onChangeText={setHouseNumber}
            editable={!saving}
          />

          <Text style={styles.label}>
            Street / Road
          </Text>

          <TextInput
            style={styles.input}
            placeholder="e.g. MG Road"
            placeholderTextColor="#9CA3AF"
            value={street}
            onChangeText={setStreet}
            autoCapitalize="words"
            editable={!saving}
          />

          <Text style={styles.label}>
            Area / Locality
          </Text>

          <TextInput
            style={styles.input}
            placeholder="e.g. Connaught Place"
            placeholderTextColor="#9CA3AF"
            value={area}
            onChangeText={setArea}
            autoCapitalize="words"
            editable={!saving}
          />

          <View style={styles.row}>
            <View style={styles.cityContainer}>
              <Text style={styles.label}>
                City
              </Text>

              <TextInput
                style={styles.input}
                placeholder="City"
                placeholderTextColor="#9CA3AF"
                value={city}
                onChangeText={setCity}
                autoCapitalize="words"
                editable={!saving}
              />
            </View>

            <View style={styles.pinContainer}>
              <Text style={styles.label}>
                PIN code
              </Text>

              <TextInput
                style={styles.input}
                placeholder="110001"
                placeholderTextColor="#9CA3AF"
                value={pincode}
                onChangeText={value =>
                  setPincode(
                    value.replace(/\D/g, '')
                  )
                }
                keyboardType="number-pad"
                maxLength={6}
                editable={!saving}
              />
            </View>
          </View>

          <View style={styles.locationStatus}>
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor:
                    latitude !== null &&
                    longitude !== null
                      ? COLORS.teal
                      : COLORS.orange,
                },
              ]}
            />

            <Text style={styles.statusText}>
              {latitude !== null &&
              longitude !== null
                ? 'Location ready'
                : 'Using address location'}
            </Text>
          </View>

          <Text style={styles.note}>
            Your address is used only for this service
            booking and location-based worker matching.
          </Text>

          <PrimaryButton
            title={
              saving
                ? 'Saving address...'
                : 'Continue'
            }
            disabled={!canContinue}
            onPress={saveAddress}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.light,
  },

  keyboard: {
    flex: 1,
  },

  page: {
    padding: 22,
    paddingBottom: 45,
  },

  title: {
    color: COLORS.navy,
    fontSize: 29,
    lineHeight: 35,
    fontWeight: '800',
    marginBottom: 8,
  },

  subtitle: {
    color: COLORS.gray,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 22,
  },

  locationButton: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 17,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 22,
  },

  locationIcon: {
    fontSize: 25,
    marginRight: 13,
  },

  locationContent: {
    flex: 1,
  },

  locationTitle: {
    color: COLORS.navy,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },

  locationText: {
    color: COLORS.gray,
    fontSize: 12,
    lineHeight: 17,
  },

  section: {
    color: COLORS.navy,
    fontSize: 19,
    fontWeight: '800',
    marginBottom: 15,
  },

  label: {
    color: COLORS.navy,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 7,
  },

  input: {
    height: 54,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 13,
    paddingHorizontal: 15,
    color: COLORS.navy,
    fontSize: 15,
    marginBottom: 16,
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  cityContainer: {
    width: '57%',
  },

  pinContainer: {
    width: '39%',
  },

  locationStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    marginBottom: 12,
  },

  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },

  statusText: {
    color: COLORS.gray,
    fontSize: 12,
    fontWeight: '600',
  },

  note: {
    color: COLORS.gray,
    fontSize: 11,
    lineHeight: 17,
    textAlign: 'center',
    marginBottom: 18,
  },
})