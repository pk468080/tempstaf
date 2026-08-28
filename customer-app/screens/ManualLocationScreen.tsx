import {
  useState,
} from 'react'

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

type Props =
  NativeStackScreenProps<
    RootStackParamList,
    'ManualLocation'
  >

export default function ManualLocationScreen({
  navigation,
}: Props) {
  const [
    locationText,
    setLocationText,
  ] = useState('')

  const [
    loading,
    setLoading,
  ] = useState(false)

  const handleUseLocation =
    async () => {
      const value =
        locationText.trim()

      if (!value) {
        Alert.alert(
          'Enter your location',
          'Please enter your city or area.'
        )

        return
      }

      setLoading(true)

      try {
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
            'We could not find that location. Please enter a city, area or locality and try again.'
          )

          return
        }

        const result =
          results[0]

        const latitude =
          result.latitude

        const longitude =
          result.longitude

        let label = value
        let detail =
          'Manually selected location'

        try {
          const addresses =
            await Location.reverseGeocodeAsync(
              {
                latitude,
                longitude,
              }
            )

          const address =
            addresses[0]

          if (address) {
            const locality =
              address.city ||
              address.district ||
              address.subregion

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

            if (
              parts.length > 0
            ) {
              detail =
                parts.join(', ')
            }
          }
        } catch (
          reverseError
        ) {
          console.warn(
            '[TempStaff] Manual reverse geocoding failed:',
            reverseError
          )
        }

        navigation.navigate(
          'Home',
          {
            latitude,
            longitude,
            label,
            detail,
          }
        )
      } catch (error) {
        console.error(
          '[TempStaff] Manual location error:',
          error
        )

        Alert.alert(
          'Location error',
          'We could not determine that location. Please check the spelling and try again.'
        )
      } finally {
        setLoading(false)
      }
    }

  return (
    <SafeAreaView
      style={styles.container}
    >
      <KeyboardAvoidingView
        style={styles.flex}
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
          <TouchableOpacity
            style={styles.backButton}
            onPress={() =>
              navigation.goBack()
            }
            activeOpacity={0.8}
          >
            <Text
              style={styles.backText}
            >
              ‹
            </Text>

            <Text
              style={styles.backLabel}
            >
              Back
            </Text>
          </TouchableOpacity>

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
              Select your location
            </Text>

            <Text
              style={styles.subtitle}
            >
              We couldn't detect your
              location automatically. Enter
              your city, area or locality
              manually to find services
              available nearby.
            </Text>
          </View>

          <View
            style={styles.card}
          >
            <Text
              style={styles.label}
            >
              City or area
            </Text>

            <TextInput
              value={locationText}
              onChangeText={
                setLocationText
              }
              placeholder={
                'e.g. Connaught Place, Delhi'
              }
              placeholderTextColor={
                '#9AA5B1'
              }
              style={styles.input}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="search"
              onSubmitEditing={
                handleUseLocation
              }
            />

            <Text
              style={styles.helper}
            >
              You can enter an area,
              locality, city or PIN code.
            </Text>

            <TouchableOpacity
              style={[
                styles.primaryButton,
                loading
                  ? styles.buttonDisabled
                  : null,
              ]}
              onPress={
                handleUseLocation
              }
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <>
                  <ActivityIndicator
                    size="small"
                    color={
                      COLORS.white
                    }
                  />

                  <Text
                    style={
                      styles.buttonText
                    }
                  >
                    Finding location...
                  </Text>
                </>
              ) : (
                <Text
                  style={
                    styles.buttonText
                  }
                >
                  Use this location
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <View
            style={styles.infoCard}
          >
            <View
              style={styles.infoIcon}
            >
              <Text
                style={
                  styles.infoIconText
                }
              >
                i
              </Text>
            </View>

            <View
              style={styles.infoContent}
            >
              <Text
                style={styles.infoTitle}
              >
                Why we need your location
              </Text>

              <Text
                style={styles.infoText}
              >
                TempStaff uses your area to
                check whether suitable staff
                are currently available for
                your requested service.
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.gpsButton}
            onPress={() =>
              navigation.goBack()
            }
            activeOpacity={0.85}
          >
            <Text
              style={styles.gpsButtonText}
            >
              Try automatic location again
            </Text>
          </TouchableOpacity>
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

    flex: {
      flex: 1,
    },

    content: {
      padding: 22,
      paddingBottom: 45,
    },

    backButton: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      marginBottom: 28,
    },

    backText: {
      color: COLORS.navy,
      fontSize: 32,
      lineHeight: 32,
      fontWeight: '400',
      marginRight: 7,
    },

    backLabel: {
      color: COLORS.navy,
      fontSize: 14,
      fontWeight: '700',
    },

    header: {
      alignItems: 'center',
      marginBottom: 26,
    },

    iconBox: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor:
        '#FFF1E8',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 17,
    },

    icon: {
      fontSize: 28,
    },

    title: {
      color: COLORS.navy,
      fontSize: 27,
      lineHeight: 34,
      fontWeight: '800',
      textAlign: 'center',
    },

    subtitle: {
      color: COLORS.gray,
      fontSize: 13,
      lineHeight: 20,
      textAlign: 'center',
      marginTop: 8,
      maxWidth: 340,
    },

    card: {
      backgroundColor:
        COLORS.white,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      borderRadius: 20,
      padding: 18,
    },

    label: {
      color: COLORS.navy,
      fontSize: 14,
      fontWeight: '800',
      marginBottom: 9,
    },

    input: {
      width: '100%',
      height: 52,
      borderWidth: 1,
      borderColor:
        '#D5DCE3',
      borderRadius: 13,
      paddingHorizontal: 14,
      color: COLORS.navy,
      fontSize: 14,
      backgroundColor:
        '#FAFBFC',
    },

    helper: {
      color: COLORS.gray,
      fontSize: 11,
      lineHeight: 16,
      marginTop: 7,
    },

    primaryButton: {
      minHeight: 50,
      borderRadius: 25,
      backgroundColor:
        COLORS.orange,
      marginTop: 18,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      paddingHorizontal: 20,
    },

    buttonDisabled: {
      opacity: 0.7,
    },

    buttonText: {
      color: COLORS.white,
      fontSize: 15,
      fontWeight: '800',
      marginLeft: 8,
    },

    infoCard: {
      backgroundColor:
        '#E8F6F6',
      borderRadius: 17,
      padding: 15,
      marginTop: 15,
      flexDirection: 'row',
      alignItems: 'flex-start',
    },

    infoIcon: {
      width: 30,
      height: 30,
      borderRadius: 10,
      backgroundColor:
        COLORS.teal,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },

    infoIconText: {
      color: COLORS.white,
      fontSize: 15,
      fontWeight: '900',
    },

    infoContent: {
      flex: 1,
    },

    infoTitle: {
      color: COLORS.navy,
      fontSize: 13,
      fontWeight: '800',
      lineHeight: 18,
    },

    infoText: {
      color: COLORS.gray,
      fontSize: 11,
      lineHeight: 17,
      marginTop: 3,
    },

    gpsButton: {
      alignItems: 'center',
      marginTop: 22,
      paddingVertical: 10,
    },

    gpsButtonText: {
      color: COLORS.teal,
      fontSize: 13,
      fontWeight: '800',
    },
  })