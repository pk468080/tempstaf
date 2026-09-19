import { useEffect, useRef, useState } from 'react'
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
import HomePromotionSlider from '../../components/home/HomePromotionSlider'
import { ScreenContainer } from '../../components/layout/ScreenContainer'
import { getHomeServices } from '../../services/services/services.service'
import {
  getAvailableServiceIds,
} from '../../services/availability/availability.service'
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
  onServicePress?: (
    service: HomeService,
  ) => void
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

  const [locationLoading, setLocationLoading] =
    useState(false)

  const [error, setError] =
    useState('')

  const [locationError, setLocationError] =
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

  const [locationSearching, setLocationSearching] =
    useState(false)

  /*
   * Prevent multiple automatic GPS requests while
   * the returning-customer location is being resolved.
   */
  const automaticLocationRequestStarted =
    useRef(false)

  async function loadServices(
    currentLocation: HomeLocation | null,
  ) {
    setError('')
    setAreaUnavailable(false)
    setPricingUnavailable(false)

    const pricedServices =
      await getHomeServices()

    if (!currentLocation) {
      setServices([])
      return
    }

    if (pricedServices.length === 0) {
      setServices([])
      setPricingUnavailable(true)
      return
    }

    const availableServiceIds =
      await getAvailableServiceIds(
        currentLocation.latitude,
        currentLocation.longitude,
      )

    const availableServices =
      pricedServices.filter(service =>
        availableServiceIds.has(
          service.id,
        ),
      )

    setServices(availableServices)

    setAreaUnavailable(
      availableServices.length === 0,
    )
  }

  async function loadAddress(
    currentLocation: HomeLocation | null,
  ) {
    if (!currentLocation) {
      setAddress('Current location')
      return
    }

    if (currentLocation.address) {
      setAddress(
        currentLocation.address,
      )
      return
    }

    try {
      const results =
        await Location.reverseGeocodeAsync({
          latitude:
            currentLocation.latitude,
          longitude:
            currentLocation.longitude,
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

  async function loadHome(
    currentLocation: HomeLocation | null,
  ) {
    setLoading(true)

    try {
      await Promise.all([
        loadServices(currentLocation),
        loadAddress(currentLocation),
      ])
    } catch (err) {
      console.error(
        'Home loading error:',
        err,
      )

      setServices([])
      setAreaUnavailable(false)
      setPricingUnavailable(false)

      setError(
        'Unable to load services. Please try again.',
      )
    } finally {
      setLoading(false)
    }
  }

  async function refreshHome() {
    setRefreshing(true)

    try {
      await Promise.all([
        loadServices(location),
        loadAddress(location),
      ])
    } catch (err) {
      console.error(
        'Home refresh error:',
        err,
      )

      setError(
        'Unable to refresh services. Please try again.',
      )
    } finally {
      setRefreshing(false)
    }
  }

  async function fetchCurrentLocation(
    automatic = false,
  ) {
    if (locationLoading) {
      return
    }

    setLocationError('')

    if (automatic) {
      setLocationLoading(true)
    } else {
      setLocationSearching(true)
    }

    try {
      const permission =
        await Location.requestForegroundPermissionsAsync()

      if (
        permission.status !==
        'granted'
      ) {
        throw new Error(
          'Location permission is required to use services in your area.',
        )
      }

      const currentLocation =
        await Location.getCurrentPositionAsync(
          {
            accuracy:
              Location.Accuracy.Balanced,
          },
        )

      const {
        latitude,
        longitude,
      } = currentLocation.coords

      let selectedAddress =
        'Current location'

      try {
        const formatted =
          await reverseGeocode(
            latitude,
            longitude,
          )

        if (formatted) {
          selectedAddress = formatted
        }
      } catch (reverseError) {
        console.error(
          'Current location reverse geocoding error:',
          reverseError,
        )
      }

      setAddress(selectedAddress)

      onLocationChange(
        latitude,
        longitude,
        selectedAddress,
      )

      setLocationQuery('')
      setLocationError('')

      if (!automatic) {
        setLocationPickerVisible(
          false,
        )
      }
    } catch (err) {
      console.error(
        automatic
          ? 'Automatic location error:'
          : 'Current location error:',
        err,
      )

      const message =
        err instanceof Error
          ? err.message
          : 'Unable to fetch your current location. Please try again.'

      setLocationError(message)
    } finally {
      if (automatic) {
        setLocationLoading(false)
      } else {
        setLocationSearching(false)
      }
    }
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
      const results =
        await Location.geocodeAsync(
          query,
        )

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

      setAddress(
        selectedAddress,
      )

      onLocationChange(
        first.latitude,
        first.longitude,
        selectedAddress,
      )

      setLocationQuery('')
      setLocationError('')
      setLocationPickerVisible(
        false,
      )
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

  /*
   * Returning customers skip the Location screen.
   *
   * If Home receives no location, obtain the current
   * GPS position automatically. New customers already
   * have a location from the onboarding flow, so they
   * do not trigger this request again.
   */
  useEffect(() => {
    if (
      location ||
      automaticLocationRequestStarted.current
    ) {
      return
    }

    automaticLocationRequestStarted.current =
      true

    void fetchCurrentLocation(true)
  }, [location])

  /*
   * Reload services whenever the customer's location
   * changes.
   */
  useEffect(() => {
    void loadHome(location)
  }, [
    location?.latitude,
    location?.longitude,
    location?.address,
  ])

  const showAreaUnavailable =
    !error &&
    !pricingUnavailable &&
    areaUnavailable

  const showPricingUnavailable =
    !error &&
    pricingUnavailable

  if (
    loading ||
    locationLoading
  ) {
    return (
      <ScreenContainer>
        <View style={styles.loading}>
          <ActivityIndicator
            size="large"
          />

          <Text
            style={
              styles.loadingText
            }
          >
            {locationLoading
              ? 'Finding your location...'
              : 'Loading services...'}
          </Text>

          {locationError ? (
            <View
              style={
                styles.loadingErrorContainer
              }
            >
              <Text
                style={
                  styles.loadingError
                }
              >
                {locationError}
              </Text>

              <TouchableOpacity
                style={
                  styles.retryLocationButton
                }
                onPress={() => {
                  automaticLocationRequestStarted.current =
                    false

                  void fetchCurrentLocation(
                    true,
                  )
                }}
              >
                <Text
                  style={
                    styles.retryLocationButtonText
                  }
                >
                  Try again
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      </ScreenContainer>
    )
  }

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={
          styles.content
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={
              refreshHome
            }
          />
        }
        showsVerticalScrollIndicator={
          false
        }
      >
        <TouchableOpacity
          style={
            styles.locationSection
          }
          activeOpacity={0.7}
          onPress={() =>
            setLocationPickerVisible(
              true,
            )
          }
        >
          <Text
            style={
              styles.locationLabel
            }
          >
            Current location
          </Text>

          <Text
            style={styles.location}
            numberOfLines={2}
          >
            {address}
          </Text>

          <Text
            style={
              styles.changeLocation
            }
          >
            Change location
          </Text>
        </TouchableOpacity>
         <HomePromotionSlider />

        {locationError ? (
          <View
            style={
              styles.locationWarning
            }
          >
            <Text
              style={
                styles.locationWarningText
              }
            >
              {locationError}
            </Text>

            <TouchableOpacity
              onPress={() => {
                automaticLocationRequestStarted.current =
                  false

                void fetchCurrentLocation(
                  true,
                )
              }}
            >
              <Text
                style={
                  styles.locationRetryText
                }
              >
                Retry
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View
          style={styles.banner}
        >
          <Text
            style={
              styles.bannerTitle
            }
          >
            {showPricingUnavailable
              ? 'Services are not currently available'
              : showAreaUnavailable
                ? 'No services available in this area'
                : 'Services available in your area'}
          </Text>

          <Text
            style={
              styles.bannerText
            }
          >
            {showPricingUnavailable
              ? 'Customer hourly prices are not currently configured.'
              : showAreaUnavailable
                ? 'There is currently no active service area for this location.'
                : 'Choose a service to start your booking.'}
          </Text>
        </View>

        <View
          style={
            styles.sectionHeader
          }
        >
          <View>
            <Text
              style={
                styles.sectionTitle
              }
            >
              Services
            </Text>

            <Text
              style={
                styles.sectionSubtitle
              }
            >
              Customer hourly pricing
            </Text>
          </View>
        </View>

        {error ? (
          <View
            style={
              styles.errorBox
            }
          >
            <Text
              style={
                styles.errorText
              }
            >
              {error}
            </Text>
          </View>
        ) : showAreaUnavailable ? (
          <View
            style={styles.empty}
          >
            <Text
              style={
                styles.emptyTitle
              }
            >
              No services in this area
            </Text>

            <Text
              style={
                styles.emptyText
              }
            >
              Services will appear here
              when an active service
              area is configured.
            </Text>
          </View>
        ) : showPricingUnavailable ? (
          <View
            style={styles.empty}
          >
            <Text
              style={
                styles.emptyTitle
              }
            >
              No hourly services priced
            </Text>

            <Text
              style={
                styles.emptyText
              }
            >
              Hourly services will appear
              here when customer pricing
              is configured.
            </Text>
          </View>
        ) : services.length === 0 ? (
          <View
            style={styles.empty}
          >
            <Text
              style={
                styles.emptyTitle
              }
            >
              No services available
            </Text>

            <Text
              style={
                styles.emptyText
              }
            >
              There are currently no
              services available at this
              location.
            </Text>
          </View>
        ) : (
          <FlatList
            data={services}
            scrollEnabled={false}
            keyExtractor={item =>
              item.id
            }
            renderItem={({
              item,
            }) => (
              <ServiceCard
                service={item}
                onPress={() =>
                  onServicePress?.(
                    item,
                  )
                }
              />
            )}
          />
        )}
      </ScrollView>

      <Modal
        visible={
          locationPickerVisible
        }
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() =>
          setLocationPickerVisible(
            false,
          )
        }
      >
        <ScreenContainer>
          <View
            style={
              styles.modalContainer
            }
          >
            <View
              style={
                styles.modalHeader
              }
            >
              <Text
                style={
                  styles.modalTitle
                }
              >
                Change location
              </Text>

              <TouchableOpacity
                onPress={() =>
                  setLocationPickerVisible(
                    false,
                  )
                }
              >
                <Text
                  style={
                    styles.closeButton
                  }
                >
                  Close
                </Text>
              </TouchableOpacity>
            </View>

            <Text
              style={
                styles.modalDescription
              }
            >
              Search for the address or
              area where you want to
              receive the service.
            </Text>

            <TextInput
              value={locationQuery}
              onChangeText={value => {
                setLocationQuery(
                  value,
                )
                setLocationError('')
              }}
              placeholder="Enter address or area"
              placeholderTextColor="#9CA3AF"
              style={
                styles.locationInput
              }
              autoCorrect={false}
              returnKeyType="search"
              onSubmitEditing={() =>
                void handleSearchLocation()
              }
            />

            {locationError ? (
              <Text
                style={
                  styles.locationError
                }
              >
                {locationError}
              </Text>
            ) : null}

            <TouchableOpacity
              style={[
                styles.primaryButton,
                locationSearching &&
                  styles.disabledButton,
              ]}
              disabled={
                locationSearching
              }
              onPress={() =>
                void handleSearchLocation()
              }
            >
              {locationSearching ? (
                <ActivityIndicator
                  color="#FFFFFF"
                />
              ) : (
                <Text
                  style={
                    styles.primaryButtonText
                  }
                >
                  Search location
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={
                styles.currentLocationButton
              }
              disabled={
                locationSearching
              }
              onPress={() =>
                void fetchCurrentLocation(
                  false,
                )
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
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.8}
      onPress={onPress}
    >
      <View
        style={
          styles.cardContent
        }
      >
        <Text
          style={
            styles.serviceName
          }
        >
          {service.name}
        </Text>

        {service.description ? (
          <Text
            style={
              styles.description
            }
            numberOfLines={2}
          >
            {service.description}
          </Text>
        ) : null}

        <Text
          style={styles.price}
        >
          {service.hourlyPrice ===
          null
            ? 'Pricing unavailable'
            : `${service.currency ?? ''} ${service.hourlyPrice}/hour`}
        </Text>
      </View>

      <Text
        style={styles.book}
      >
        Book
      </Text>
    </TouchableOpacity>
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
    paddingBottom: 100,
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

  locationWarning: {
    marginBottom: 18,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
  },

  locationWarningText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#B91C1C',
  },

  locationRetryText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '700',
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
    padding: 24,
  },

  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },

  loadingErrorContainer: {
    alignItems: 'center',
    marginTop: 20,
  },

  loadingError: {
    fontSize: 14,
    lineHeight: 20,
    color: '#B91C1C',
    textAlign: 'center',
  },

  retryLocationButton: {
    marginTop: 12,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#007AFF',
  },

  retryLocationButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
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
    textAlign: 'center',
  },

  emptyText: {
    marginTop: 6,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 21,
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