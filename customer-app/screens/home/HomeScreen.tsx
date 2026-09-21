import { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Image,
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
import type { HomeService } from '../../types/service'

const tempStaffLogo = require('../../assets/branding/tempstuff-logo.png')
const heroBannerImage = require('../../assets/home/hero-banner.png')
const heroWorkerImage = require('../../assets/home/hero-worker.png')

const serviceImages: Record<string, number> = {
  helper: require('../../assets/services/helper.png'),
  'housekeeping boy': require('../../assets/services/housekeeping-boy.png'),
  'office boy': require('../../assets/services/office-boy.png'),
  'pantry boy': require('../../assets/services/pantry-boy.png'),
}

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

  const [
    locationPickerVisible,
    setLocationPickerVisible,
  ] = useState(false)

  const [locationQuery, setLocationQuery] =
    useState('')

  const [locationSearching, setLocationSearching] =
    useState(false)

  const automaticLocationRequestStarted =
    useRef(false)

  async function loadServices() {
    setError('')

    const nextServices =
      await getHomeServices()

    setServices(nextServices)
  }

  async function loadAddress(
    currentLocation: HomeLocation | null,
  ) {
    if (!currentLocation) {
      setAddress('Current location')
      return
    }

    if (currentLocation.address.trim()) {
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
    setError('')

    try {
      /*
       * Services are independent of the customer's
       * selected location.
       *
       * Location becomes authoritative during the
       * booking availability check.
       */
      await Promise.all([
        loadServices(),
        loadAddress(currentLocation),
      ])
    } catch (err) {
      console.error(
        'Home loading error:',
        err,
      )

      setServices([])

      setError(
        'Unable to load services. Please try again.',
      )
    } finally {
      setLoading(false)
    }
  }

  async function refreshHome() {
    setRefreshing(true)
    setError('')

    try {
      await Promise.all([
        loadServices(),
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
    if (
      locationLoading ||
      locationSearching
    ) {
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
        await Location.getCurrentPositionAsync({
          accuracy:
            Location.Accuracy.Balanced,
        })

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

      setAddress(
        selectedAddress,
      )

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

  useEffect(() => {
    void loadHome(location)
  }, [
    location?.latitude,
    location?.longitude,
    location?.address,
  ])

  if (
    loading ||
    locationLoading
  ) {
    return (
      <ScreenContainer>
        <View style={styles.loading}>
          <ActivityIndicator
            size="large"
            color="#00A7A7"
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
            tintColor="#00A7A7"
          />
        }
        showsVerticalScrollIndicator={
          false
        }
      >
        <View style={styles.topHeader}>
          <Image
            source={tempStaffLogo}
            style={styles.logo}
            resizeMode="contain"
          />

          <TouchableOpacity
            style={
              styles.locationPill
            }
            activeOpacity={0.8}
            onPress={() =>
              setLocationPickerVisible(
                true,
              )
            }
          >
            <View
              style={
                styles.locationIcon
              }
            >
              <Text
                style={
                  styles.locationIconText
                }
              >
                ●
              </Text>
            </View>

            <View
              style={
                styles.locationTextWrap
              }
            >
              <Text
                style={
                  styles.locationLabel
                }
              >
                SERVICE LOCATION
              </Text>

              <Text
                style={styles.location}
                numberOfLines={1}
              >
                {address}
              </Text>
            </View>

            <Text
              style={
                styles.locationChevron
              }
            >
              ›
            </Text>
          </TouchableOpacity>
        </View>

        <View
          style={
            styles.heroCard
          }
        >
          <Image
            source={heroBannerImage}
            style={
              styles.heroBackground
            }
            resizeMode="cover"
          />

          <View
            style={
              styles.heroOverlay
            }
          />

          <View
            style={
              styles.heroCopy
            }
          >
            <Text
              style={
                styles.heroEyebrow
              }
            >
              TEMPSTAFF
            </Text>

            <Text
              style={
                styles.heroTitle
              }
            >
              Staff when you need them.
            </Text>

            <Text
              style={
                styles.heroSubtitle
              }
            >
              Reliable hourly support for
              offices and businesses.
            </Text>

            <View
              style={
                styles.heroBadge
              }
            >
              <Text
                style={
                  styles.heroBadgeText
                }
              >
                HOURLY STAFFING
              </Text>
            </View>
          </View>

          <Image
            source={heroWorkerImage}
            style={
              styles.heroWorker
            }
            resizeMode="contain"
          />
        </View>

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
          style={
            styles.sectionHeader
          }
        >
          <View
            style={
              styles.sectionHeadingWrap
            }
          >
            <Text
              style={
                styles.sectionTitle
              }
            >
              All staffing services
            </Text>

            <Text
              style={
                styles.sectionSubtitle
              }
            >
              Hourly staff for your office
              & business
            </Text>
          </View>

          <View
            style={
              styles.sectionAccent
            }
          />
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

            <TouchableOpacity
              style={
                styles.errorRetryButton
              }
              onPress={() =>
                void refreshHome()
              }
            >
              <Text
                style={
                  styles.errorRetryText
                }
              >
                Try again
              </Text>
            </TouchableOpacity>
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
              No hourly services available
            </Text>

            <Text
              style={
                styles.emptyText
              }
            >
              There are currently no
              customer-priced hourly
              services configured.
            </Text>
          </View>
        ) : (
          <FlatList
            data={services}
            scrollEnabled={false}
            numColumns={2}
            columnWrapperStyle={
              styles.serviceRow
            }
            keyExtractor={item =>
              item.id
            }
            renderItem={({ item }) => (
              <ServiceCard
                service={item}
                onPress={() => {
                  if (!location) {
                    setLocationError(
                      'Select a service location before booking.',
                    )
                    return
                  }

                  onServicePress?.(
                    item,
                  )
                }}
              />
            )}
          />
        )}

        <View
          style={
            styles.bottomBanner
          }
        >
          <View
            style={
              styles.bottomBannerAccent
            }
          />

          <Text
            style={
              styles.bottomBannerTitle
            }
          >
            Flexible staffing for
            everyday business needs.
          </Text>

          <Text
            style={
              styles.bottomBannerText
            }
          >
            Choose your service, select
            your schedule, and continue
            through the existing booking
            flow.
          </Text>
        </View>
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
              <View>
                <Text
                  style={
                    styles.modalKicker
                  }
                >
                  TEMPSTAFF
                </Text>

                <Text
                  style={
                    styles.modalTitle
                  }
                >
                  Service location
                </Text>
              </View>

              <TouchableOpacity
                style={
                  styles.modalCloseButton
                }
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
              area where you want the
              service.
            </Text>

            <TextInput
              value={
                locationQuery
              }
              onChangeText={value => {
                setLocationQuery(
                  value,
                )
                setLocationError('')
              }}
              placeholder="Enter address or area"
              placeholderTextColor="#94A3B8"
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
  const image =
    serviceImages[
      service.name
        .trim()
        .toLowerCase()
    ]

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.86}
      onPress={onPress}
    >
      <View
        style={
          styles.cardImageWrap
        }
      >
        {image ? (
          <Image
            source={image}
            style={
              styles.cardImage
            }
            resizeMode="cover"
          />
        ) : (
          <View
            style={
              styles.cardImageFallback
            }
          >
            <Text
              style={
                styles.cardImageFallbackText
              }
            >
              TS
            </Text>
          </View>
        )}

        <View
          style={
            styles.cardPricePill
          }
        >
          <Text
            style={
              styles.cardPricePillText
            }
          >
            {service.hourlyPrice ===
            null
              ? 'Price unavailable'
              : `${service.currency ?? ''} ${service.hourlyPrice}/hr`}
          </Text>
        </View>
      </View>

      <View
        style={
          styles.cardContent
        }
      >
        <Text
          style={
            styles.serviceName
          }
          numberOfLines={1}
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

        <View
          style={
            styles.bookRow
          }
        >
          <Text
            style={
              styles.hourlyLabel
            }
          >
            Hourly service
          </Text>

          <Text
            style={styles.book}
          >
            Book ›
          </Text>
        </View>
      </View>
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
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 110,
  },

  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },

  logo: {
    width: 126,
    height: 44,
  },

  locationPill: {
    flex: 1,
    minHeight: 50,
    marginLeft: 12,
    paddingHorizontal: 11,
    borderRadius: 15,
    backgroundColor: '#F5F9FC',
    borderWidth: 1,
    borderColor: '#DDEAF2',
    flexDirection: 'row',
    alignItems: 'center',
  },

  locationIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E0F7F7',
    alignItems: 'center',
    justifyContent: 'center',
  },

  locationIconText: {
    fontSize: 11,
    color: '#00A7A7',
  },

  locationTextWrap: {
    flex: 1,
    marginLeft: 8,
  },

  locationLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: '#718096',
  },

  location: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '700',
    color: '#062F52',
  },

  locationChevron: {
    marginLeft: 5,
    fontSize: 23,
    lineHeight: 23,
    color: '#00A7A7',
  },

  heroCard: {
    height: 218,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#EAF7FA',
    position: 'relative',
    marginBottom: 28,
  },

  heroBackground: {
    ...StyleSheet.absoluteFillObject,
    width: undefined,
    height: undefined,
  },

  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(245, 251, 253, 0.82)',
  },

  heroCopy: {
    position: 'absolute',
    left: 18,
    top: 22,
    width: '53%',
    zIndex: 2,
  },

  heroEyebrow: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.4,
    color: '#00A7A7',
  },

  heroTitle: {
    marginTop: 7,
    fontSize: 25,
    lineHeight: 29,
    fontWeight: '900',
    color: '#062F52',
  },

  heroSubtitle: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
    color: '#466477',
  },

  heroBadge: {
    alignSelf: 'flex-start',
    marginTop: 12,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#FF9B32',
  },

  heroBadgeText: {
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.7,
    color: '#FFFFFF',
  },

  heroWorker: {
    position: 'absolute',
    right: -15,
    bottom: -22,
    width: '58%',
    height: '106%',
    zIndex: 1,
  },

  locationWarning: {
    marginTop: -12,
    marginBottom: 20,
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
  },

  locationWarningText: {
    fontSize: 13,
    lineHeight: 19,
    color: '#9A3412',
  },

  locationRetryText: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '800',
    color: '#007A7A',
  },

  sectionHeader: {
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },

  sectionHeadingWrap: {
    flex: 1,
  },

  sectionTitle: {
    fontSize: 23,
    lineHeight: 28,
    fontWeight: '900',
    color: '#062F52',
  },

  sectionSubtitle: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '500',
    color: '#6B7C8B',
  },

  sectionAccent: {
    width: 42,
    height: 5,
    marginBottom: 4,
    borderRadius: 4,
    backgroundColor: '#FF9B32',
  },

  serviceRow: {
    justifyContent: 'space-between',
  },

  card: {
    width: '48.3%',
    marginBottom: 16,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E4EDF2',
    overflow: 'hidden',
    shadowColor: '#062F52',
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 5,
    },
    elevation: 3,
  },

  cardImageWrap: {
    height: 132,
    backgroundColor: '#EAF5F7',
    position: 'relative',
    overflow: 'hidden',
  },

  cardImage: {
    width: '100%',
    height: '100%',
  },

  cardImageFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E0F7F7',
  },

  cardImageFallbackText: {
    fontSize: 26,
    fontWeight: '900',
    color: '#00A7A7',
  },

  cardPricePill: {
    position: 'absolute',
    left: 8,
    bottom: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(6, 47, 82, 0.92)',
  },

  cardPricePillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  cardContent: {
    padding: 11,
  },

  serviceName: {
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '900',
    color: '#062F52',
  },

  description: {
    minHeight: 34,
    marginTop: 5,
    fontSize: 10.5,
    lineHeight: 15,
    color: '#718096',
  },

  bookRow: {
    marginTop: 9,
    paddingTop: 9,
    borderTopWidth: 1,
    borderTopColor: '#EDF2F5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  hourlyLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#00A7A7',
  },

  book: {
    fontSize: 11,
    fontWeight: '900',
    color: '#062F52',
  },

  bottomBanner: {
    marginTop: 10,
    marginBottom: 12,
    padding: 18,
    borderRadius: 20,
    backgroundColor: '#062F52',
    overflow: 'hidden',
  },

  bottomBannerAccent: {
    position: 'absolute',
    right: -20,
    top: -28,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#00A7A7',
    opacity: 0.35,
  },

  bottomBannerTitle: {
    maxWidth: '82%',
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '900',
    color: '#FFFFFF',
  },

  bottomBannerText: {
    maxWidth: '88%',
    marginTop: 7,
    fontSize: 12,
    lineHeight: 18,
    color: '#C8E5E8',
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
    backgroundColor: '#062F52',
  },

  retryLocationButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  errorBox: {
    padding: 16,
    borderRadius: 14,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },

  errorText: {
    color: '#B91C1C',
    fontSize: 14,
    lineHeight: 20,
  },

  errorRetryButton: {
    marginTop: 12,
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#062F52',
  },

  errorRetryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },

  empty: {
    paddingVertical: 40,
    alignItems: 'center',
  },

  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#062F52',
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
    backgroundColor: '#FFFFFF',
  },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  modalKicker: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
    color: '#00A7A7',
  },

  modalTitle: {
    marginTop: 3,
    fontSize: 24,
    fontWeight: '900',
    color: '#062F52',
  },

  modalCloseButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F3F8FA',
  },

  closeButton: {
    fontSize: 14,
    fontWeight: '800',
    color: '#062F52',
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
    borderColor: '#C9D9E1',
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#062F52',
    backgroundColor: '#F9FCFD',
  },

  locationError: {
    marginTop: 10,
    fontSize: 14,
    color: '#DC2626',
  },

  primaryButton: {
    marginTop: 16,
    minHeight: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#062F52',
  },

  disabledButton: {
    opacity: 0.6,
  },

  primaryButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  currentLocationButton: {
    marginTop: 12,
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#B8D2D9',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7FBFC',
  },

  currentLocationButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#062F52',
  },
})
