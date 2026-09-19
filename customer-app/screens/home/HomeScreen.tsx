import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import * as Location from 'expo-location'

import { ScreenContainer } from '../../components/layout/ScreenContainer'
import { getHomeServices } from '../../services/services/services.service'
import { getAvailableServiceIds } from '../../services/availability/availability.service'
import type { HomeService } from '../../types/service'

type HomeLocation = {
  latitude: number
  longitude: number
  address: string
}

type HomeScreenProps = {
  location: HomeLocation | null
  onLocationChange: (
    latitude: number,
    longitude: number,
    address: string,
  ) => void
  onServicePress?: (service: HomeService) => void
}

export default function HomeScreen({
  location,
  onLocationChange,
  onServicePress,
}: HomeScreenProps) {
  const [services, setServices] =
    useState<HomeService[]>([])

  const [address, setAddress] =
    useState('Current location')

  const [loading, setLoading] =
    useState(true)

  const [refreshing, setRefreshing] =
    useState(false)

  const [error, setError] =
    useState('')

  const [areaUnavailable, setAreaUnavailable] =
    useState(false)
    const [pricingUnavailable, setPricingUnavailable] =
  useState(false)

  const [
    locationPickerVisible,
    setLocationPickerVisible,
  ] = useState(false)

  const [locationQuery, setLocationQuery] =
    useState('')

  const [
    locationSearching,
    setLocationSearching,
  ] = useState(false)

  const [locationError, setLocationError] =
    useState('')

  async function loadServices() {
  try {
    setError('')
    setAreaUnavailable(false)
    setPricingUnavailable(false)

    const pricedServices =
      await getHomeServices()

    if (!location) {
      setServices([])
      return
    }

    // Backend has active services/variants,
    // but no current customer-visible hourly prices.
    if (pricedServices.length === 0) {
      setServices([])
      setPricingUnavailable(true)
      return
    }

    const availableServiceIds =
      await getAvailableServiceIds(
        location.latitude,
        location.longitude,
      )

    const availableServices =
      pricedServices.filter((service) =>
        availableServiceIds.has(service.id),
      )

    setServices(availableServices)

    setAreaUnavailable(
      availableServices.length === 0,
    )
  } catch (err) {
    console.error(
      'Home services error:',
      err,
    )

    setServices([])
    setAreaUnavailable(false)
    setPricingUnavailable(false)

    setError(
      'Unable to load services. Please try again.',
    )
  }
}

  async function loadAddress() {
    if (!location) {
      return
    }

    if (location.address) {
      setAddress(location.address)
      return
    }

    try {
      const results =
        await Location.reverseGeocodeAsync({
          latitude: location.latitude,
          longitude: location.longitude,
        })

      const first = results[0]

      if (!first) {
        return
      }

      const formatted =
        formatAddress(first)

      if (formatted) {
        setAddress(formatted)
      }
    } catch (err) {
      console.error(
        'Reverse geocoding error:',
        err,
      )
    }
  }

  async function loadHome() {
    setLoading(true)

    await Promise.all([
      loadServices(),
      loadAddress(),
    ])

    setLoading(false)
  }

  async function refreshHome() {
    setRefreshing(true)

    await Promise.all([
      loadServices(),
      loadAddress(),
    ])

    setRefreshing(false)
  }

  async function handleSearchLocation() {
    const query =
      locationQuery.trim()

    if (query.length < 3) {
      setLocationError(
        'Enter a more specific location.',
      )
      return
    }

    setLocationError('')
    setLocationSearching(true)

    try {
      const permission =
        await Location.requestForegroundPermissionsAsync()

      if (permission.status !== 'granted') {
        setLocationError(
          'Location permission is required to search for a location on this device.',
        )
        return
      }

      const results =
        await Location.geocodeAsync(query)

      const first = results[0]

      if (!first) {
        setLocationError(
          'Location not found. Try a more specific address or area.',
        )
        return
      }

      const formatted =
        await reverseGeocode(
          first.latitude,
          first.longitude,
        )

      const selectedAddress =
        formatted || query

      setAddress(selectedAddress)

      onLocationChange(
        first.latitude,
        first.longitude,
        selectedAddress,
      )

      setLocationQuery('')
      setLocationError('')
      setLocationPickerVisible(false)
    } catch (err) {
      console.error(
        'Manual location search error:',
        err,
      )

      setLocationError(
        'Unable to find that location. Please try again.',
      )
    } finally {
      setLocationSearching(false)
    }
  }

  async function handleUseCurrentLocation() {
    setLocationError('')
    setLocationSearching(true)

    try {
      const permission =
        await Location.requestForegroundPermissionsAsync()

      if (permission.status !== 'granted') {
        setLocationError(
          'Location permission is required to use your current location.',
        )
        return
      }

      const currentLocation =
        await Location.getCurrentPositionAsync({
          accuracy:
            Location.Accuracy.Balanced,
        })

      const {
        latitude,
        longitude,
      } = currentLocation.coords

      const formatted =
        await reverseGeocode(
          latitude,
          longitude,
        )

      const selectedAddress =
        formatted || 'Current location'

      setAddress(selectedAddress)

      onLocationChange(
        latitude,
        longitude,
        selectedAddress,
      )

      setLocationQuery('')
      setLocationError('')
      setLocationPickerVisible(false)
    } catch (err) {
      console.error(
        'Current location error:',
        err,
      )

      setLocationError(
        'Unable to fetch your current location. Please try again.',
      )
    } finally {
      setLocationSearching(false)
    }
  }

  useEffect(() => {
    void loadHome()
  }, [
    location?.latitude,
    location?.longitude,
    location?.address,
  ])

  if (loading) {
    return (
      <ScreenContainer>
        <View style={styles.loading}>
          <ActivityIndicator size="large" />

          <Text style={styles.loadingText}>
            Loading services...
          </Text>
        </View>
      </ScreenContainer>
    )
  }

 const showAreaUnavailable =
  !error &&
  !pricingUnavailable &&
  areaUnavailable
  const showPricingUnavailable =
  !error && pricingUnavailable

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refreshHome}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          style={styles.locationSection}
          activeOpacity={0.7}
          onPress={() =>
            setLocationPickerVisible(true)
          }
        >
          <Text style={styles.locationLabel}>
            Selected location
          </Text>

          <Text
            style={styles.location}
            numberOfLines={2}
          >
            {address}
          </Text>

          <Text style={styles.changeLocation}>
            Change location
          </Text>
        </TouchableOpacity>

       <View style={styles.banner}>
  <Text style={styles.bannerTitle}>
    {showPricingUnavailable
      ? 'Services are not currently available'
      : showAreaUnavailable
        ? 'Services will be available soon in your area'
        : 'Services available in your area'}
  </Text>

  <Text style={styles.bannerText}>
    {showPricingUnavailable
      ? 'There are currently no active hourly prices configured for customer bookings.'
      : showAreaUnavailable
        ? 'We do not currently have an active service area for this location.'
        : 'Choose a service to continue with your booking.'}
  </Text>
</View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Services
          </Text>

          <Text style={styles.sectionSubtitle}>
            1-hour pricing
          </Text>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>
              {error}
            </Text>
          </View>
        ) : showAreaUnavailable ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>
              No services in this area
            </Text>

            <Text style={styles.emptyText}>
              Services will become available here
              when an active service area is
              configured.
            </Text>
          </View>
        ) : services.length === 0 ? (
  <View style={styles.empty}>
    <Text style={styles.emptyTitle}>
      {showPricingUnavailable
        ? 'No hourly services priced'
        : 'No services available'}
    </Text>

    <Text style={styles.emptyText}>
      {showPricingUnavailable
        ? 'Hourly services will appear here when customer pricing is configured.'
        : 'There are currently no services available at this location.'}
    </Text>
  </View>
) : (
          <FlatList
            data={services}
            scrollEnabled={false}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <ServiceCard
                service={item}
                onPress={() =>
                  onServicePress?.(item)
                }
              />
            )}
          />
        )}
      </ScrollView>

      <Modal
        visible={locationPickerVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() =>
          setLocationPickerVisible(false)
        }
      >
        <ScreenContainer>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Change location
              </Text>

              <TouchableOpacity
                onPress={() =>
                  setLocationPickerVisible(false)
                }
              >
                <Text style={styles.closeButton}>
                  Close
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDescription}>
              Search for the address or area where
              you want to receive the service.
            </Text>

            <TextInput
              value={locationQuery}
              onChangeText={(value) => {
                setLocationQuery(value)
                setLocationError('')
              }}
              placeholder="Enter address or area"
              placeholderTextColor="#9CA3AF"
              style={styles.locationInput}
              autoCorrect={false}
              returnKeyType="search"
              onSubmitEditing={() =>
                void handleSearchLocation()
              }
            />

            {locationError ? (
              <Text style={styles.locationError}>
                {locationError}
              </Text>
            ) : null}

            <TouchableOpacity
              style={[
                styles.primaryButton,
                locationSearching &&
                  styles.disabledButton,
              ]}
              disabled={locationSearching}
              onPress={() =>
                void handleSearchLocation()
              }
            >
              {locationSearching ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  Search location
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.currentLocationButton}
              disabled={locationSearching}
              onPress={() =>
                void handleUseCurrentLocation()
              }
            >
              <Text
                style={
                  styles.currentLocationButtonText
                }
              >
                Use current location
              </Text>
            </TouchableOpacity>
          </View>
        </ScreenContainer>
      </Modal>
    </ScreenContainer>
  )
}

function ServiceCard({
  service,
  onPress,
}: {
  service: HomeService
  onPress: () => void
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardContent}>
        <Text style={styles.serviceName}>
          {service.name}
        </Text>

        {service.description ? (
          <Text
            style={styles.description}
            numberOfLines={2}
          >
            {service.description}
          </Text>
        ) : null}

        <Text style={styles.price}>
  {service.hourlyPrice === null
    ? 'Pricing unavailable'
    : `${service.currency ?? ''} ${service.hourlyPrice}/hour`}
</Text>
      </View>

      <Text
        style={styles.book}
        onPress={onPress}
      >
        Book
      </Text>
    </View>
  )
}

async function reverseGeocode(
  latitude: number,
  longitude: number,
): Promise<string> {
  const results =
    await Location.reverseGeocodeAsync({
      latitude,
      longitude,
    })

  const first = results[0]

  if (!first) {
    return ''
  }

  return formatAddress(first)
}

function formatAddress(
  address: Location.LocationGeocodedAddress,
): string {
  const parts = [
    address.name,
    address.street,
    address.district,
    address.city,
    address.region,
    address.postalCode,
  ].filter(Boolean)

  return parts.join(', ')
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    paddingBottom: 32,
  },

  locationSection: {
    marginBottom: 18,
  },

  locationLabel: {
    fontSize: 13,
    color: '#6B7280',
  },

  location: {
    marginTop: 4,
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
  },

  changeLocation: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },

  banner: {
    minHeight: 130,
    borderRadius: 18,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    marginBottom: 28,
  },

  bannerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },

  bannerText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    color: '#6B7280',
  },

  sectionHeader: {
    marginBottom: 14,
  },

  sectionTitle: {
    fontSize: 23,
    fontWeight: '700',
    color: '#111827',
  },

  sectionSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: '#6B7280',
  },

  card: {
    minHeight: 145,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  cardContent: {
    flex: 1,
    paddingRight: 12,
  },

  serviceName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },

  description: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    color: '#6B7280',
  },

  price: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },

  book: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    padding: 8,
  },

  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },

  errorBox: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
  },

  errorText: {
    color: '#B91C1C',
    fontSize: 14,
  },

  empty: {
    paddingVertical: 40,
    alignItems: 'center',
  },

  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
  },

  emptyText: {
    marginTop: 6,
    color: '#6B7280',
    textAlign: 'center',
  },

  modalContainer: {
    flex: 1,
    padding: 24,
  },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },

  closeButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },

  modalDescription: {
    marginTop: 12,
    fontSize: 15,
    lineHeight: 22,
    color: '#6B7280',
  },

  locationInput: {
    marginTop: 24,
    height: 52,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#111827',
  },

  locationError: {
    marginTop: 10,
    fontSize: 14,
    color: '#DC2626',
  },

  primaryButton: {
    marginTop: 16,
    minHeight: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
  },

  disabledButton: {
    opacity: 0.6,
  },

  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  currentLocationButton: {
    marginTop: 12,
    minHeight: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },

  currentLocationButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
})