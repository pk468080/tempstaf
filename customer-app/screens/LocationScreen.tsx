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
import MapView, {
  Marker,
  MapPressEvent,
  Region,
} from 'react-native-maps'
import * as Location from 'expo-location'
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

const DEFAULT_LOCATION = {
  latitude: 28.6139,
  longitude: 77.209,
}

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

  const [reverseGeocoding, setReverseGeocoding] =
    useState(false)

  const [saving, setSaving] = useState(false)

  const [focusedField, setFocusedField] =
    useState<FieldName | null>(null)

  const [mapReady, setMapReady] = useState(false)

  const mapRegion: Region = useMemo(() => {
    return {
      latitude:
        latitude ?? DEFAULT_LOCATION.latitude,
      longitude:
        longitude ?? DEFAULT_LOCATION.longitude,
      latitudeDelta: 0.015,
      longitudeDelta: 0.015,
    }
  }, [latitude, longitude])

  useEffect(() => {
    loadCurrentLocation()
  }, [])

  const setMapLocation = async (
    nextLatitude: number,
    nextLongitude: number,
    shouldReverseGeocode = true
  ) => {
    setLatitude(nextLatitude)
    setLongitude(nextLongitude)

    setCoordinates(
      `${nextLatitude},${nextLongitude}`
    )

    if (!shouldReverseGeocode) {
      return
    }

    try {
      setReverseGeocoding(true)

      const results =
        await Location.reverseGeocodeAsync({
          latitude: nextLatitude,
          longitude: nextLongitude,
        })

      const place = results[0]

      if (!place) {
        return
      }

      const resolvedHouse =
        place.name ||
        place.streetNumber ||
        ''

      const resolvedStreet =
        place.street || ''

      const resolvedArea =
  place.district ||
  place.subregion ||
  ''
        ''

      const resolvedCity =
        place.city ||
        place.subregion ||
        place.region ||
        ''

      const resolvedPincode =
        place.postalCode || ''

      /*
       * Only fill fields returned by the
       * geocoder. Do not overwrite a field
       * unnecessarily.
       */
      if (resolvedHouse && !houseNumber.trim()) {
        setHouseNumber(resolvedHouse)
      }

      if (resolvedStreet) {
        setStreet(resolvedStreet)
      }

      if (resolvedArea) {
        setArea(resolvedArea)
      }

      if (resolvedCity) {
        setCity(resolvedCity)
      }

      if (resolvedPincode) {
        setPincode(
          resolvedPincode.replace(/\D/g, '').slice(0, 6)
        )
      }
    } catch (error) {
      console.warn(
        '[TempStaff] Reverse geocoding failed:',
        error
      )
    } finally {
      setReverseGeocoding(false)
    }
  }

  const loadCurrentLocation = async () => {
    try {
      setGettingLocation(true)

      const result =
        await getCurrentLocation()

      await setMapLocation(
        result.latitude,
        result.longitude,
        true
      )
    } catch (error) {
      console.warn(
        '[TempStaff] Could not fetch current location:',
        error
      )

      /*
       * Development fallback.
       * This allows the Android emulator to
       * continue testing around Delhi.
       */
      if (__DEV__) {
        await setMapLocation(
          DEFAULT_LOCATION.latitude,
          DEFAULT_LOCATION.longitude,
          true
        )
      }
    } finally {
      setGettingLocation(false)
    }
  }

  const useMyLocation = async () => {
    try {
      setGettingLocation(true)

      const result =
        await getCurrentLocation()

      await setMapLocation(
        result.latitude,
        result.longitude,
        true
      )

      Alert.alert(
        'Location updated',
        'Your current location has been selected.'
      )
    } catch (error) {
      Alert.alert(
        'Location unavailable',
        'We could not get your current location. You can select a location directly on the map.'
      )
    } finally {
      setGettingLocation(false)
    }
  }

  const handleMapPress = async (
    event: MapPressEvent
  ) => {
    const {
      latitude: nextLatitude,
      longitude: nextLongitude,
    } = event.nativeEvent.coordinate

    await setMapLocation(
      nextLatitude,
      nextLongitude,
      true
    )
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
      latitude !== null &&
      longitude !== null &&
      !saving
    )
  }, [
    houseNumber,
    street,
    area,
    city,
    pincode,
    latitude,
    longitude,
    saving,
  ])

  const saveAddress = async () => {
    if (!canContinue) {
      Alert.alert(
        'Complete your address',
        'Select a location on the map and complete your house/office number, street, area, city and PIN code.'
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

      const { data, error } =
        await supabase
          .from('addresses')
          .insert({
            user_id: user.id,
            label: 'Service Address',
            address_line: fullAddress,
            latitude,
            longitude,
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
      autoCapitalize?:
        | 'none'
        | 'sentences'
        | 'words'
    }
  ) => {
    const isFocused =
      focusedField === field

    return (
      <View style={styles.field}>
        <Text style={styles.label}>
          {label}
        </Text>

        <TextInput
          style={[
            styles.input,
            isFocused &&
              styles.inputFocused,
          ]}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          value={value}
          onChangeText={onChangeText}
          editable={!saving}
          keyboardType={
            options?.keyboardType ||
            'default'
          }
          maxLength={options?.maxLength}
          autoCapitalize={
            options?.autoCapitalize ||
            'sentences'
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
          contentContainerStyle={
            styles.page
          }
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={
            false
          }
        >
          <Header
            onBack={() =>
              navigation.goBack()
            }
          />

          <View
            style={
              styles.progressContainer
            }
          >
            <View
              style={styles.progressTrack}
            >
              <View
                style={styles.progressFill}
              />
            </View>

            <Text
              style={styles.progressText}
            >
              STEP 3 OF 4 · LOCATION
            </Text>
          </View>

          <View style={styles.heading}>
            <Text style={styles.title}>
              Where do you need the staff?
            </Text>

            <Text style={styles.subtitle}>
              Pin the exact service location
              on the map. We will use it for
              area availability and worker
              matching.
            </Text>
          </View>

          <View style={styles.mapHeader}>
            <View>
              <Text
                style={
                  styles.sectionTitle
                }
              >
                Select service location
              </Text>

              <Text
                style={
                  styles.sectionSubtitle
                }
              >
                Tap anywhere on the map to move
                the pin.
              </Text>
            </View>

            <View
              style={styles.mapBadge}
            >
              <Text
                style={styles.mapBadgeText}
              >
                PIN MAP
              </Text>
            </View>
          </View>

          <View style={styles.mapContainer}>
            <MapView
              style={styles.map}
              region={mapRegion}
              onPress={handleMapPress}
              onMapReady={() =>
                setMapReady(true)
              }
              showsUserLocation
              showsMyLocationButton={false}
              loadingEnabled
              moveOnMarkerPress={false}
            >
              {latitude !== null &&
                longitude !== null && (
                  <Marker
                    coordinate={{
                      latitude,
                      longitude,
                    }}
                    draggable
                    title="Service location"
                    description={
                      reverseGeocoding
                        ? 'Finding address...'
                        : 'Drag or tap the map to change'
                    }
                    onDragEnd={event => {
                      const coordinate =
                        event.nativeEvent
                          .coordinate

                      setMapLocation(
                        coordinate.latitude,
                        coordinate.longitude,
                        true
                      )
                    }}
                  />
                )}
            </MapView>

            {!mapReady && (
              <View
                style={
                  styles.mapLoading
                }
              >
                <ActivityIndicator
                  size="small"
                  color={COLORS.teal}
                />

                <Text
                  style={
                    styles.mapLoadingText
                  }
                >
                  Loading map...
                </Text>
              </View>
            )}

            {reverseGeocoding && (
              <View
                style={
                  styles.geocodeBadge
                }
              >
                <ActivityIndicator
                  size="small"
                  color={COLORS.teal}
                />

                <Text
                  style={
                    styles.geocodeText
                  }
                >
                  Finding address...
                </Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={[
              styles.locationCard,
              gettingLocation &&
                styles.locationCardLoading,
            ]}
            onPress={useMyLocation}
            disabled={
              gettingLocation ||
              saving
            }
            activeOpacity={0.86}
          >
            <View
              style={styles.locationIcon}
            >
              {gettingLocation ? (
                <ActivityIndicator
                  size="small"
                  color={COLORS.teal}
                />
              ) : (
                <Text
                  style={
                    styles.locationEmoji
                  }
                >
                  📍
                </Text>
              )}
            </View>

            <View
              style={
                styles.locationContent
              }
            >
              <Text
                style={
                  styles.locationTitle
                }
              >
                {gettingLocation
                  ? 'Getting your location'
                  : 'Use my current location'}
              </Text>

              <Text
                style={
                  styles.locationSubtitle
                }
              >
                {gettingLocation
                  ? 'Please wait a moment...'
                  : 'Move the map to your current position'}
              </Text>
            </View>

            <Text
              style={
                styles.locationArrow
              }
            >
              →
            </Text>
          </TouchableOpacity>

          <View style={styles.orRow}>
            <View
              style={styles.orLine}
            />

            <Text
              style={styles.orText}
            >
              ADDRESS DETAILS
            </Text>

            <View
              style={styles.orLine}
            />
          </View>

          <View
            style={styles.addressHeader}
          >
            <View>
              <Text
                style={
                  styles.sectionTitle
                }
              >
                Service address
              </Text>

              <Text
                style={
                  styles.sectionSubtitle
                }
              >
                Confirm the address generated
                from the pin.
              </Text>
            </View>

            <View
              style={
                styles.requiredBadge
              }
            >
              <Text
                style={
                  styles.requiredText
                }
              >
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
            'e.g. Sector 12 Road'
          )}

          {renderInput(
            'area',
            'Area / Locality',
            area,
            setArea,
            'e.g. Dwarka Sector 12'
          )}

          <View style={styles.row}>
            <View
              style={styles.cityField}
            >
              {renderInput(
                'city',
                'City',
                city,
                setCity,
                'e.g. Delhi'
              )}
            </View>

            <View
              style={styles.pinField}
            >
              {renderInput(
                'pincode',
                'PIN code',
                pincode,
                value =>
                  setPincode(
                    value
                      .replace(
                        /\D/g,
                        ''
                      )
                      .slice(0, 6)
                  ),
                '110075',
                {
                  keyboardType:
                    'number-pad',
                  maxLength: 6,
                  autoCapitalize:
                    'none',
                }
              )}
            </View>
          </View>

          <View
            style={styles.coordinateCard}
          >
            <View
              style={
                styles.coordinateIcon
              }
            >
              <Text
                style={
                  styles.coordinateIconText
                }
              >
                ✓
              </Text>
            </View>

            <View
              style={
                styles.coordinateContent
              }
            >
              <Text
                style={
                  styles.coordinateTitle
                }
              >
                Exact pin selected
              </Text>

              <Text
                style={
                  styles.coordinateText
                }
              >
                {latitude !== null &&
                longitude !== null
                  ? `${latitude.toFixed(
                      6
                    )}, ${longitude.toFixed(
                      6
                    )}`
                  : 'Select a point on the map'}
              </Text>
            </View>
          </View>

          <View
            style={styles.statusCard}
          >
            <View
              style={[
                styles.statusIcon,
                latitude !== null &&
                longitude !== null
                  ? styles.statusIconReady
                  : styles.statusIconManual,
              ]}
            >
              <Text
                style={
                  styles.statusIconText
                }
              >
                {latitude !== null &&
                longitude !== null
                  ? '✓'
                  : '•'}
              </Text>
            </View>

            <View
              style={
                styles.statusContent
              }
            >
              <Text
                style={
                  styles.statusTitle
                }
              >
                {latitude !== null &&
                longitude !== null
                  ? 'Location ready'
                  : 'Select a map location'}
              </Text>

              <Text
                style={styles.statusText}
              >
                {latitude !== null &&
                longitude !== null
                  ? 'This exact location will be stored with your booking.'
                  : 'Tap the map to select your service location.'}
              </Text>
            </View>
          </View>

          <View
            style={styles.privacyRow}
          >
            <Text
              style={styles.lockIcon}
            >
              🔒
            </Text>

            <Text
              style={styles.privacyText}
            >
              Your service address is used
              for this booking and worker
              assignment.
            </Text>
          </View>

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

            {!canContinue &&
            !saving ? (
              <Text
                style={
                  styles.bottomHint
                }
              >
                Select a map location and
                complete all address fields.
              </Text>
            ) : (
              <Text
                style={
                  styles.bottomHint
                }
              >
                Next: choose your payment
                method.
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
    marginBottom: 18,
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

  mapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },

  mapBadge: {
    backgroundColor: '#E8F6F6',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
  },

  mapBadgeText: {
    color: COLORS.teal,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.6,
  },

  sectionTitle: {
    color: COLORS.navy,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '800',
  },

  sectionSubtitle: {
    color: COLORS.gray,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },

  mapContainer: {
    height: 285,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 14,
    backgroundColor: '#E5E7EB',
    borderWidth: 1,
    borderColor: '#D8E0E5',
  },

  map: {
    flex: 1,
  },

  mapLoading: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.72)',
  },

  mapLoadingText: {
    color: COLORS.navy,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 8,
  },

  geocodeBadge: {
    position: 'absolute',
    left: 12,
    top: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },

  geocodeText: {
    color: COLORS.navy,
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 6,
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
    marginVertical: 20,
  },

  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#DDE3E9',
  },

  orText: {
    color: COLORS.gray,
    fontSize: 8.5,
    fontWeight: '900',
    letterSpacing: 0.7,
    marginHorizontal: 10,
  },

  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  requiredBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 7,
  },

  requiredText: {
    color: COLORS.gray,
    fontSize: 7.5,
    fontWeight: '900',
    letterSpacing: 0.6,
  },

  field: {
    marginBottom: 13,
  },

  label: {
    color: COLORS.navy,
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 6,
  },

  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: '#D7DEE4',
    borderRadius: 13,
    backgroundColor: COLORS.white,
    paddingHorizontal: 14,
    color: COLORS.navy,
    fontSize: 14,
  },

  inputFocused: {
    borderColor: COLORS.teal,
  },

  row: {
    flexDirection: 'row',
    gap: 10,
  },

  cityField: {
    flex: 1,
  },

  pinField: {
    width: 125,
  },

  coordinateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#D1FAE5',
    borderRadius: 15,
    padding: 12,
    marginTop: 3,
    marginBottom: 12,
  },

  coordinateIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  coordinateIconText: {
    color: '#15803D',
    fontSize: 17,
    fontWeight: '900',
  },

  coordinateContent: {
    flex: 1,
  },

  coordinateTitle: {
    color: COLORS.navy,
    fontSize: 12,
    fontWeight: '800',
  },

  coordinateText: {
    color: COLORS.gray,
    fontSize: 10,
    marginTop: 3,
  },

  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#E0E6EA',
    borderRadius: 15,
    padding: 12,
    marginTop: 2,
  },

  statusIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  statusIconReady: {
    backgroundColor: '#DCFCE7',
  },

  statusIconManual: {
    backgroundColor: '#F3F4F6',
  },

  statusIconText: {
    color: '#15803D',
    fontSize: 16,
    fontWeight: '900',
  },

  statusContent: {
    flex: 1,
  },

  statusTitle: {
    color: COLORS.navy,
    fontSize: 12,
    fontWeight: '800',
  },

  statusText: {
    color: COLORS.gray,
    fontSize: 10,
    lineHeight: 15,
    marginTop: 3,
  },

  privacyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 16,
    paddingHorizontal: 3,
  },

  lockIcon: {
    fontSize: 13,
    marginRight: 7,
  },

  privacyText: {
    flex: 1,
    color: COLORS.gray,
    fontSize: 10,
    lineHeight: 15,
  },

  bottom: {
    marginTop: 22,
  },

  bottomHint: {
    textAlign: 'center',
    color: COLORS.gray,
    fontSize: 10,
    lineHeight: 15,
    marginTop: 9,
  },
})