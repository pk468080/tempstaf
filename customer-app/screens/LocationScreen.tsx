import { useEffect, useMemo, useState } from 'react'
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

type FieldName =
  | 'house'
  | 'street'
  | 'area'
  | 'city'
  | 'pincode'

export default function LocationScreen({
  navigation,
}: Props) {
  const {
    setAddress,
    setAddressId,
    setCoordinates,
  } = useBooking()

  const [houseNumber, setHouseNumber] = useState('')
  const [street, setStreet] = useState('')
  const [area, setArea] = useState('')
  const [city, setCity] = useState('')
  const [pincode, setPincode] = useState('')

  const [latitude, setLatitude] =
    useState<number | null>(null)
  const [longitude, setLongitude] =
    useState<number | null>(null)

  const [gettingLocation, setGettingLocation] =
    useState(false)
  const [saving, setSaving] = useState(false)
  const [focusedField, setFocusedField] =
    useState<FieldName | null>(null)

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
    } catch (error) {
      console.warn(
        '[TempStaff] Could not fetch current location:',
        error
      )
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
        'Your current location is ready for this booking.'
      )
    } catch (error) {
      Alert.alert(
        'Location unavailable',
        'We could not get your current location. You can continue by entering the address manually.'
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

  const canContinue = useMemo(() => {
    return (
      houseNumber.trim().length >= 1 &&
      street.trim().length >= 2 &&
      area.trim().length >= 2 &&
      city.trim().length >= 2 &&
      /^\d{6}$/.test(pincode.trim()) &&
      !saving
    )
  }, [
    houseNumber,
    street,
    area,
    city,
    pincode,
    saving,
  ])

  const saveAddress = async () => {
    if (!canContinue) {
      Alert.alert(
        'Complete your address',
        'Please enter your house/office number, street, area, city and a valid 6-digit PIN code.'
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

      /*
       * Development fallback:
       * Android emulator GPS can time out.
       * Keep the existing Delhi development
       * coordinates until real location handling
       * is finalized.
       */
      const finalLatitude =
        latitude ?? (__DEV__ ? 28.6139 : null)

      const finalLongitude =
        longitude ?? (__DEV__ ? 77.209 : null)

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
        .select(
          'id, address_line, latitude, longitude'
        )
        .single()

      if (error) {
        throw error
      }

      setAddress(data.address_line)
      setAddressId(data.id)
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

  const renderInput = (
    field: FieldName,
    label: string,
    value: string,
    onChangeText: (value: string) => void,
    placeholder: string,
    options?: {
      keyboardType?: 'default' | 'number-pad'
      maxLength?: number
      autoCapitalize?: 'none' | 'sentences' | 'words'
    }
  ) => {
    const isFocused = focusedField === field

    return (
      <View style={styles.field}>
        <Text style={styles.label}>
          {label}
        </Text>

        <TextInput
          style={[
            styles.input,
            isFocused && styles.inputFocused,
          ]}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          value={value}
          onChangeText={onChangeText}
          editable={!saving}
          keyboardType={
            options?.keyboardType || 'default'
          }
          maxLength={options?.maxLength}
          autoCapitalize={
            options?.autoCapitalize || 'sentences'
          }
          onFocus={() =>
            setFocusedField(field)
          }
          onBlur={() =>
            setFocusedField(null)
          }
        />
      </View>
    )
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

          {/* Progress */}
          <View style={styles.progressContainer}>
            <View style={styles.progressTrack}>
              <View style={styles.progressFill} />
            </View>

            <Text style={styles.progressText}>
              STEP 3 OF 4 · LOCATION
            </Text>
          </View>

          {/* Heading */}
          <View style={styles.heading}>
            <Text style={styles.title}>
              Where do you need the staff?
            </Text>

            <Text style={styles.subtitle}>
              Add the exact service address so we can
              match your booking with an available
              worker.
            </Text>
          </View>

          {/* Current location */}
          <TouchableOpacity
            style={[
              styles.locationCard,
              gettingLocation &&
                styles.locationCardLoading,
            ]}
            onPress={useMyLocation}
            disabled={gettingLocation || saving}
            activeOpacity={0.86}
          >
            <View style={styles.locationIcon}>
              {gettingLocation ? (
                <ActivityIndicator
                  size="small"
                  color={COLORS.teal}
                />
              ) : (
                <Text style={styles.locationEmoji}>
                  📍
                </Text>
              )}
            </View>

            <View style={styles.locationContent}>
              <Text style={styles.locationTitle}>
                {gettingLocation
                  ? 'Getting your location'
                  : 'Use my current location'}
              </Text>

              <Text style={styles.locationSubtitle}>
                {gettingLocation
                  ? 'Please wait a moment...'
                  : 'Quickly set your service location'}
              </Text>
            </View>

            <Text style={styles.locationArrow}>
              →
            </Text>
          </TouchableOpacity>

          <View style={styles.orRow}>
            <View style={styles.orLine} />

            <Text style={styles.orText}>
              OR ENTER MANUALLY
            </Text>

            <View style={styles.orLine} />
          </View>

          {/* Address fields */}
          <View style={styles.addressHeader}>
            <View>
              <Text style={styles.sectionTitle}>
                Service address
              </Text>

              <Text style={styles.sectionSubtitle}>
                Where the worker should report
              </Text>
            </View>

            <View style={styles.requiredBadge}>
              <Text style={styles.requiredText}>
                REQUIRED
              </Text>
            </View>
          </View>

          {renderInput(
            'house',
            'House / Flat / Office number',
            houseNumber,
            setHouseNumber,
            'e.g. 24A'
          )}

          {renderInput(
            'street',
            'Street / Road',
            street,
            setStreet,
            'e.g. MG Road'
          )}

          {renderInput(
            'area',
            'Area / Locality',
            area,
            setArea,
            'e.g. Connaught Place'
          )}

          <View style={styles.row}>
            <View style={styles.cityField}>
              {renderInput(
                'city',
                'City',
                city,
                setCity,
                'e.g. Delhi'
              )}
            </View>

            <View style={styles.pinField}>
              {renderInput(
                'pincode',
                'PIN code',
                pincode,
                value =>
                  setPincode(
                    value.replace(/\D/g, '')
                  ),
                '110001',
                {
                  keyboardType: 'number-pad',
                  maxLength: 6,
                  autoCapitalize: 'none',
                }
              )}
            </View>
          </View>

          {/* Location status */}
          <View style={styles.statusCard}>
            <View
              style={[
                styles.statusIcon,
                latitude !== null &&
                longitude !== null
                  ? styles.statusIconReady
                  : styles.statusIconManual,
              ]}
            >
              <Text style={styles.statusIconText}>
                {latitude !== null &&
                longitude !== null
                  ? '✓'
                  : '•'}
              </Text>
            </View>

            <View style={styles.statusContent}>
              <Text style={styles.statusTitle}>
                {latitude !== null &&
                longitude !== null
                  ? 'Location coordinates ready'
                  : 'Address location will be used'}
              </Text>

              <Text style={styles.statusText}>
                {latitude !== null &&
                longitude !== null
                  ? 'Your location can be used for worker matching.'
                  : 'Your address will be saved with the booking.'}
              </Text>
            </View>
          </View>

          {/* Privacy note */}
          <View style={styles.privacyRow}>
            <Text style={styles.lockIcon}>
              🔒
            </Text>

            <Text style={styles.privacyText}>
              Your service address is used for this
              booking and worker assignment.
            </Text>
          </View>

          {/* Continue */}
          <View style={styles.bottom}>
            <PrimaryButton
              title={
                saving
                  ? 'Saving address...'
                  : 'Continue'
              }
              disabled={!canContinue}
              onPress={saveAddress}
            />

            {!canContinue && !saving ? (
              <Text style={styles.bottomHint}>
                Complete all address fields to continue.
              </Text>
            ) : (
              <Text style={styles.bottomHint}>
                Next: choose your payment method.
              </Text>
            )}
          </View>
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
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 45,
  },

  progressContainer: {
    marginTop: 5,
    marginBottom: 20,
  },

  progressTrack: {
    height: 4,
    width: '100%',
    backgroundColor: '#DDE3E9',
    borderRadius: 3,
    overflow: 'hidden',
  },

  progressFill: {
    width: '75%',
    height: '100%',
    backgroundColor: COLORS.teal,
    borderRadius: 3,
  },

  progressText: {
    color: COLORS.gray,
    fontSize: 9,
    lineHeight: 14,
    fontWeight: '800',
    letterSpacing: 0.7,
    marginTop: 7,
  },

  heading: {
    marginBottom: 20,
  },

  title: {
    color: COLORS.navy,
    fontSize: 28,
    lineHeight: 35,
    fontWeight: '800',
  },

  subtitle: {
    color: COLORS.gray,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 7,
  },

  locationCard: {
    backgroundColor: '#E8F6F6',
    borderWidth: 1,
    borderColor: '#CBEAEA',
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },

  locationCardLoading: {
    opacity: 0.75,
  },

  locationIcon: {
    width: 45,
    height: 45,
    borderRadius: 14,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },

  locationEmoji: {
    fontSize: 23,
  },

  locationContent: {
    flex: 1,
  },

  locationTitle: {
    color: COLORS.navy,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '800',
  },

  locationSubtitle: {
    color: COLORS.gray,
    fontSize: 10.5,
    lineHeight: 16,
    marginTop: 2,
  },

  locationArrow: {
    color: COLORS.teal,
    fontSize: 22,
    fontWeight: '800',
    marginLeft: 7,
  },

  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 21,
  },

  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },

  orText: {
    color: COLORS.gray,
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.7,
    marginHorizontal: 9,
  },

  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 17,
  },

  sectionTitle: {
    color: COLORS.navy,
    fontSize: 19,
    lineHeight: 25,
    fontWeight: '800',
  },

  sectionSubtitle: {
    color: COLORS.gray,
    fontSize: 10.5,
    lineHeight: 16,
    marginTop: 2,
  },

  requiredBadge: {
    backgroundColor: '#FFF3E5',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },

  requiredText: {
    color: COLORS.orange,
    fontSize: 7.5,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  field: {
    width: '100%',
  },

  label: {
    color: COLORS.navy,
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: '700',
    marginBottom: 7,
  },

  input: {
    width: '100%',
    height: 53,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 13,
    paddingHorizontal: 14,
    color: COLORS.navy,
    fontSize: 14.5,
    marginBottom: 15,
  },

  inputFocused: {
    borderColor: COLORS.teal,
    borderWidth: 1.5,
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  cityField: {
    width: '57%',
  },

  pinField: {
    width: '39%',
  },

  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 15,
    padding: 12,
    marginTop: 1,
  },

  statusIcon: {
    width: 31,
    height: 31,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  statusIconReady: {
    backgroundColor: '#E8F6F6',
  },

  statusIconManual: {
    backgroundColor: '#FFF3E5',
  },

  statusIconText: {
    color: COLORS.teal,
    fontSize: 14,
    fontWeight: '900',
  },

  statusContent: {
    flex: 1,
  },

  statusTitle: {
    color: COLORS.navy,
    fontSize: 11.5,
    lineHeight: 16,
    fontWeight: '800',
  },

  statusText: {
    color: COLORS.gray,
    fontSize: 9.5,
    lineHeight: 14,
    marginTop: 1,
  },

  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    marginTop: 14,
  },

  lockIcon: {
    fontSize: 12,
    marginRight: 6,
  },

  privacyText: {
    color: COLORS.gray,
    fontSize: 9.5,
    lineHeight: 15,
    textAlign: 'center',
    flex: 1,
  },

  bottom: {
    marginTop: 19,
  },

  bottomHint: {
    color: COLORS.gray,
    fontSize: 10,
    lineHeight: 15,
    textAlign: 'center',
    marginTop: 9,
    paddingHorizontal: 12,
  },
})