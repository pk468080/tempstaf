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

import * as Location from 'expo-location'

import {
  NativeStackScreenProps,
} from '@react-navigation/native-stack'

import {
  COLORS,
} from '../constants/theme'

import {
  RootStackParamList,
} from '../types'

import {
  getCurrentLocation,
} from '../services/location'

type Props =
  NativeStackScreenProps<
    RootStackParamList,
    'CustomerLocation'
  >

type LocationState = {
  latitude: number | null
  longitude: number | null
  label: string | null
  detail: string | null
}

export default function CustomerLocationScreen({
  navigation,
}: Props) {
  const [
    location,
    setLocation,
  ] = useState<LocationState>({
    latitude: null,
    longitude: null,
    label: null,
    detail: null,
  })

  const [
    loading,
    setLoading,
  ] = useState(true)

  const [
    manualMode,
    setManualMode,
  ] = useState(false)

  const [
    manualText,
    setManualText,
  ] = useState('')

  const [
    manualLoading,
    setManualLoading,
  ] = useState(false)

  const [
    error,
    setError,
  ] = useState<string | null>(null)

  useEffect(() => {
    loadCurrentLocation()
  }, [])

  const loadCurrentLocation = async () => {
    try {
      setLoading(true)
      setError(null)
      setManualMode(false)

      const result =
        await getCurrentLocation()

      await applyLocation(
        result.latitude,
        result.longitude
      )
    } catch (locationError: any) {
      console.warn(
        '[TempStaff] Customer onboarding location failed:',
        locationError
      )

      setError(
        getLocationErrorMessage(
          locationError
        )
      )
    } finally {
      setLoading(false)
    }
  }

  const applyLocation = async (
    latitude: number,
    longitude: number
  ) => {
    let label =
      `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`

    let detail =
      'Current location'

    try {
      const addresses =
        await Location.reverseGeocodeAsync({
          latitude,
          longitude,
        })

      const address =
        addresses[0]

      if (address) {
        const locality =
          address.city ||
          address.district ||
          address.subregion ||
          address.region

        const region =
          address.region

        const country =
          address.country

        if (locality) {
          label = locality
        }

        const parts = [
          locality &&
          region &&
          locality !== region
            ? region
            : null,
          country,
        ].filter(Boolean)

        if (parts.length > 0) {
          detail =
            parts.join(', ')
        }
      }
    } catch (
      geocodeError
    ) {
      console.warn(
        '[TempStaff] Customer location reverse geocode failed:',
        geocodeError
      )
    }

    setLocation({
      latitude,
      longitude,
      label,
      detail,
    })
  }

  const handleManualLocation =
    async () => {
      const value =
        manualText.trim()

      if (!value) {
        Alert.alert(
          'Enter your location',
          'Please enter your city, area or locality.'
        )

        return
      }

      try {
        setManualLoading(true)

        const results =
          await Location.geocodeAsync(
            value
          )

        if (
          !results ||
          results.length === 0
        ) {
          Alert.alert(
            'Location not found',
            'We could not find that location. Try entering a city, area or locality.'
          )

          return
        }

        const result =
          results[0]

        await applyLocation(
          result.latitude,
          result.longitude
        )

        setManualMode(false)
        setError(null)
      } catch (manualError) {
        console.error(
          '[TempStaff] Manual onboarding location failed:',
          manualError
        )

        Alert.alert(
          'Location error',
          'We could not determine that location. Please check the spelling and try again.'
        )
      } finally {
        setManualLoading(false)
      }
    }

  const continueToHome = () => {
    if (
      location.latitude === null ||
      location.longitude === null
    ) {
      Alert.alert(
        'Location required',
        'Please allow location access or select your location manually.'
      )

      return
    }

    navigation.reset({
      index: 0,
      routes: [
        {
          name: 'Home',
          params: {
            latitude:
              location.latitude,
            longitude:
              location.longitude,
            label:
              location.label ||
              'Selected location',
            detail:
              location.detail ||
              'Selected location',
          },
        },
      ],
    })
  }

  const getLocationErrorMessage =
    (locationError: any) => {
      const message =
        locationError?.message ||
        ''

      if (
        message ===
        'LOCATION_PERMISSION_DENIED'
      ) {
        return 'Location permission is required. You can select your location manually.'
      }

      if (
        message ===
        'LOCATION_SERVICES_DISABLED'
      ) {
        return 'Location services are disabled. Please enable them or select your location manually.'
      }

      if (
        message ===
        'LOCATION_TIMEOUT'
      ) {
        return 'We could not detect your location in time. You can try again or select it manually.'
      }

      return 'We could not detect your current location. You can try again or select it manually.'
    }

  return (
    <SafeAreaView
      style={styles.container}
    >
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }
      >
        <ScrollView
          contentContainerStyle={
            styles.content
          }
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={
            false
          }
        >
          <View style={styles.progress}>
            <View
              style={[
                styles.progressStep,
                styles.progressActive,
              ]}
            />

            <View
              style={[
                styles.progressStep,
                styles.progressActive,
              ]}
            />

            <View
              style={styles.progressStep}
            />
          </View>

          <Text style={styles.progressText}>
            STEP 2 OF 3 · LOCATION
          </Text>

          <View
            style={styles.header}
          >
            <View
              style={styles.iconBox}
            >
              <Text
                style={styles.icon}
              >
                📍
              </Text>
            </View>

            <Text
              style={styles.title}
            >
              Where are you?
            </Text>

            <Text
              style={styles.subtitle}
            >
              We use your location to show
              staff and services available
              in your area.
            </Text>
          </View>

          {loading ? (
            <View
              style={styles.loadingCard}
            >
              <ActivityIndicator
                size="large"
                color={COLORS.teal}
              />

              <Text
                style={styles.loadingTitle}
              >
                Finding your location
              </Text>

              <Text
                style={styles.loadingText}
              >
                Please allow location access
                when your device asks.
              </Text>
            </View>
          ) : error &&
            location.latitude === null ? (
            <View
              style={styles.errorCard}
            >
              <Text
                style={styles.errorTitle}
              >
                Location unavailable
              </Text>

              <Text
                style={styles.errorText}
              >
                {error}
              </Text>

              <TouchableOpacity
                style={
                  styles.primaryButton
                }
                onPress={
                  loadCurrentLocation
                }
                activeOpacity={0.85}
              >
                <Text
                  style={
                    styles.primaryButtonText
                  }
                >
                  Try again
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={
                  styles.secondaryButton
                }
                onPress={() =>
                  setManualMode(true)
                }
                activeOpacity={0.85}
              >
                <Text
                  style={
                    styles.secondaryButtonText
                  }
                >
                  Select location manually
                </Text>
              </TouchableOpacity>
            </View>
          ) : manualMode ? (
            <View
              style={styles.manualCard}
            >
              <Text
                style={styles.cardTitle}
              >
                Select your location
              </Text>

              <Text
                style={styles.cardSubtitle}
              >
                Enter your city, area or
                locality.
              </Text>

              <TextInput
                value={manualText}
                onChangeText={
                  setManualText
                }
                placeholder="e.g. Dwarka, Delhi"
                placeholderTextColor="#9CA3AF"
                style={styles.input}
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType="search"
                onSubmitEditing={
                  handleManualLocation
                }
                editable={
                  !manualLoading
                }
              />

              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  manualLoading &&
                    styles.disabledButton,
                ]}
                onPress={
                  handleManualLocation
                }
                disabled={
                  manualLoading
                }
                activeOpacity={0.85}
              >
                {manualLoading ? (
                  <ActivityIndicator
                    size="small"
                    color={
                      COLORS.white
                    }
                  />
                ) : (
                  <Text
                    style={
                      styles.primaryButtonText
                    }
                  >
                    Use this location
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={
                  styles.secondaryButton
                }
                onPress={() => {
                  setManualMode(false)

                  if (
                    location.latitude ===
                    null
                  ) {
                    loadCurrentLocation()
                  }
                }}
                disabled={
                  manualLoading
                }
                activeOpacity={0.85}
              >
                <Text
                  style={
                    styles.secondaryButtonText
                  }
                >
                  Use automatic location
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View
              style={styles.locationCard}
            >
              <View
                style={
                  styles.locationIconBox
                }
              >
                <Text
                  style={
                    styles.locationIcon
                  }
                >
                  📍
                </Text>
              </View>

              <Text
                style={
                  styles.locationCaption
                }
              >
                YOUR LOCATION
              </Text>

              <Text
                style={
                  styles.locationValue
                }
              >
                {location.label}
              </Text>

              <Text
                style={
                  styles.locationDetail
                }
              >
                {location.detail}
              </Text>

              <View
                style={
                  styles.successBox
                }
              >
                <Text
                  style={
                    styles.successIcon
                  }
                >
                  ✓
                </Text>

                <Text
                  style={
                    styles.successText
                  }
                >
                  Location detected successfully.
                </Text>
              </View>

              <TouchableOpacity
                style={
                  styles.changeButton
                }
                onPress={() =>
                  setManualMode(true)
                }
                activeOpacity={0.85}
              >
                <Text
                  style={
                    styles.changeButtonText
                  }
                >
                  Change location
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {!loading &&
            location.latitude !==
              null &&
            !manualMode && (
              <TouchableOpacity
                style={[
                  styles.continueButton,
                  error &&
                    styles.continueButtonWithWarning,
                ]}
                onPress={
                  continueToHome
                }
                activeOpacity={0.85}
              >
                <Text
                  style={
                    styles.continueButtonText
                  }
                >
                  Continue
                </Text>
              </TouchableOpacity>
            )}

          <Text
            style={styles.footerNote}
          >
            You can change your location
            later when making a booking.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor:
        COLORS.light,
    },

    keyboard: {
      flex: 1,
    },

    content: {
      flexGrow: 1,
      paddingHorizontal: 28,
      paddingTop: 28,
      paddingBottom: 36,
    },

    progress: {
      width: 150,
      alignSelf: 'center',
      flexDirection: 'row',
      justifyContent:
        'space-between',
      marginTop: 5,
    },

    progressStep: {
      width: 44,
      height: 4,
      borderRadius: 2,
      backgroundColor:
        '#DDE2E8',
    },

    progressActive: {
      backgroundColor:
        COLORS.teal,
    },

    progressText: {
      textAlign: 'center',
      marginTop: 8,
      fontSize: 10,
      lineHeight: 15,
      fontWeight: '700',
      letterSpacing: 0.5,
      color: COLORS.gray,
    },

    header: {
      alignItems: 'center',
      marginTop: 34,
      marginBottom: 28,
    },

    iconBox: {
      width: 68,
      height: 68,
      borderRadius: 34,
      backgroundColor:
        '#FFF1E8',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 17,
    },

    icon: {
      fontSize: 30,
    },

    title: {
      color: COLORS.navy,
      fontSize: 29,
      lineHeight: 36,
      fontWeight: '800',
      textAlign: 'center',
    },

    subtitle: {
      marginTop: 9,
      maxWidth: 340,
      color: COLORS.gray,
      fontSize: 14,
      lineHeight: 21,
      textAlign: 'center',
    },

    loadingCard: {
      backgroundColor:
        COLORS.white,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      borderRadius: 20,
      padding: 28,
      alignItems: 'center',
    },

    loadingTitle: {
      marginTop: 18,
      color: COLORS.navy,
      fontSize: 17,
      fontWeight: '800',
    },

    loadingText: {
      marginTop: 7,
      color: COLORS.gray,
      fontSize: 12,
      lineHeight: 18,
      textAlign: 'center',
    },

    errorCard: {
      backgroundColor:
        COLORS.white,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      borderRadius: 20,
      padding: 20,
    },

    errorTitle: {
      color: COLORS.navy,
      fontSize: 18,
      fontWeight: '800',
    },

    errorText: {
      marginTop: 8,
      color: COLORS.gray,
      fontSize: 13,
      lineHeight: 20,
    },

    manualCard: {
      backgroundColor:
        COLORS.white,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      borderRadius: 20,
      padding: 20,
    },

    cardTitle: {
      color: COLORS.navy,
      fontSize: 19,
      fontWeight: '800',
    },

    cardSubtitle: {
      marginTop: 6,
      color: COLORS.gray,
      fontSize: 13,
      lineHeight: 19,
    },

    input: {
      height: 54,
      marginTop: 18,
      paddingHorizontal: 15,
      borderWidth: 1,
      borderColor:
        '#D5DCE3',
      borderRadius: 13,
      backgroundColor:
        '#FAFBFC',
      color: COLORS.navy,
      fontSize: 15,
    },

    locationCard: {
      backgroundColor:
        COLORS.white,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      borderRadius: 20,
      padding: 22,
      alignItems: 'center',
    },

    locationIconBox: {
      width: 58,
      height: 58,
      borderRadius: 18,
      backgroundColor:
        '#FFF1E8',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 15,
    },

    locationIcon: {
      fontSize: 27,
    },

    locationCaption: {
      color: COLORS.gray,
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 1,
    },

    locationValue: {
      marginTop: 6,
      color: COLORS.navy,
      fontSize: 24,
      lineHeight: 30,
      fontWeight: '800',
      textAlign: 'center',
    },

    locationDetail: {
      marginTop: 3,
      color: COLORS.gray,
      fontSize: 13,
      lineHeight: 19,
      textAlign: 'center',
    },

    successBox: {
      width: '100%',
      marginTop: 20,
      padding: 12,
      borderRadius: 12,
      backgroundColor:
        '#E8F6F6',
      flexDirection: 'row',
      alignItems: 'center',
    },

    successIcon: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor:
        COLORS.teal,
      color: COLORS.white,
      textAlign: 'center',
      lineHeight: 24,
      fontWeight: '900',
      marginRight: 9,
    },

    successText: {
      flex: 1,
      color: COLORS.navy,
      fontSize: 12,
      fontWeight: '600',
    },

    changeButton: {
      marginTop: 16,
      paddingVertical: 8,
    },

    changeButtonText: {
      color: COLORS.teal,
      fontSize: 13,
      fontWeight: '800',
    },

    primaryButton: {
      minHeight: 52,
      marginTop: 20,
      borderRadius: 26,
      backgroundColor:
        COLORS.orange,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 20,
    },

    primaryButtonText: {
      color: COLORS.white,
      fontSize: 15,
      fontWeight: '800',
    },

    secondaryButton: {
      minHeight: 48,
      marginTop: 10,
      borderRadius: 24,
      borderWidth: 1,
      borderColor:
        COLORS.teal,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 18,
    },

    secondaryButtonText: {
      color: COLORS.teal,
      fontSize: 13,
      fontWeight: '800',
      textAlign: 'center',
    },

    disabledButton: {
      opacity: 0.7,
    },

    continueButton: {
      minHeight: 54,
      marginTop: 20,
      borderRadius: 27,
      backgroundColor:
        COLORS.orange,
      alignItems: 'center',
      justifyContent: 'center',
    },

    continueButtonWithWarning: {
      opacity: 0.95,
    },

    continueButtonText: {
      color: COLORS.white,
      fontSize: 16,
      fontWeight: '800',
    },

    footerNote: {
      marginTop: 17,
      color: COLORS.gray,
      fontSize: 11,
      lineHeight: 17,
      textAlign: 'center',
      paddingHorizontal: 15,
    },
  })