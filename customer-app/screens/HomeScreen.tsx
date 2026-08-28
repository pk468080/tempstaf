import {
  useCallback,
  useEffect,
  useState,
} from 'react'

import {
  ActivityIndicator,
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'

import * as Location from 'expo-location'

import {
  NativeStackScreenProps,
} from '@react-navigation/native-stack'

import {
  COLORS,
  LOGO,
} from '../constants/theme'

import {
  RootStackParamList,
} from '../types'

import {
  useBooking,
} from '../context/BookingContext'

import CustomerBottomNav from '../components/CustomerBottomNav'

import {
  checkServiceAvailability,
} from '../services/availability'

type Props =
  NativeStackScreenProps<
    RootStackParamList,
    'Home'
  >

type LocationState = {
  loading: boolean
  label: string | null
  detail: string | null
  error: string | null
  latitude: number | null
  longitude: number | null
}

type AvailabilityState = {
  loading: boolean
  available: boolean
  availableWorkers: number
  error: string | null
}

const iconForService = (
  service: string
): string => {
  const normalized =
    service.trim().toLowerCase()

  if (
    normalized.includes(
      'housekeeping'
    )
  ) {
    return '🧹'
  }

  if (
    normalized.includes(
      'pantry'
    )
  ) {
    return '🍽️'
  }

  if (
    normalized.includes(
      'office'
    )
  ) {
    return '💼'
  }

  if (
    normalized.includes(
      'helper'
    )
  ) {
    return '👷'
  }

  return '👤'
}

export default function HomeScreen({
  navigation,
  route,
}: Props) {
  const {
    resetBooking,
    setSelectedService,
    services,
    catalogueLoading,
    catalogueError,
    refreshCatalogue,
  } = useBooking()

  const [
    locationState,
    setLocationState,
  ] =
    useState<LocationState>({
      loading: true,
      label: null,
      detail: null,
      error: null,
      latitude: null,
      longitude: null,
    })

  const [
    availability,
    setAvailability,
  ] =
    useState<
      Record<
        string,
        AvailabilityState
      >
    >({})

  const [
    checkingAvailability,
    setCheckingAvailability,
  ] =
    useState(false)

  /*
   * --------------------------------------------------
   * LOCATION
   * --------------------------------------------------
   */

  const loadLocation =
    useCallback(
      async () => {
        setLocationState({
          loading: true,
          label: null,
          detail: null,
          error: null,
          latitude: null,
          longitude: null,
        })

        setAvailability({})

        try {
          const permission =
            await Location.requestForegroundPermissionsAsync()

          if (
            permission.status !==
            'granted'
          ) {
            setLocationState({
              loading: false,
              label: null,
              detail: null,
              error:
                'Location permission is required to show nearby services.',
              latitude: null,
              longitude: null,
            })

            return
          }

          const current =
            await Location.getCurrentPositionAsync(
              {
                accuracy:
                  Location.Accuracy.Balanced,
              }
            )

          const {
            latitude,
            longitude,
          } = current.coords

          let label =
            `${latitude.toFixed(
              5
            )}, ${longitude.toFixed(
              5
            )}`

          let detail =
            'Current location'

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

              label =
                locality ||
                region ||
                country ||
                label

              const parts = [
                locality &&
                region &&
                locality !==
                  region
                  ? region
                  : null,
                country,
              ].filter(Boolean)

              detail =
                parts.length > 0
                  ? parts.join(
                      ', '
                    )
                  : 'Current location'
            }
          } catch (
            geocodeError
          ) {
            console.warn(
              '[TempStaff] Reverse geocoding failed:',
              geocodeError
            )
          }

          setLocationState({
            loading: false,
            label,
            detail,
            error: null,
            latitude,
            longitude,
          })
        } catch (error) {
          console.error(
            '[TempStaff] Location error:',
            error
          )

          setLocationState({
            loading: false,
            label: null,
            detail: null,
            error:
              'Unable to detect your location. Please try again.',
            latitude: null,
            longitude: null,
          })
        }
      },
      []
    )

  useEffect(() => {
  const manualLocation =
    route.params

  if (
    manualLocation &&
    typeof manualLocation.latitude ===
      'number' &&
    typeof manualLocation.longitude ===
      'number'
  ) {
    setLocationState({
      loading: false,
      label:
        manualLocation.label,
      detail:
        manualLocation.detail,
      error: null,
      latitude:
        manualLocation.latitude,
      longitude:
        manualLocation.longitude,
    })

    setAvailability({})

    return
  }

  loadLocation()
}, [
  route.params,
  loadLocation,
])

  /*
   * --------------------------------------------------
   * SERVICE AVAILABILITY
   * --------------------------------------------------
   *
   * Once GPS coordinates are available, check every
   * service against the Supabase availability RPC.
   */

  const loadServiceAvailability =
    useCallback(
      async (
        latitude: number,
        longitude: number
      ) => {
        if (
          services.length === 0
        ) {
          return
        }

        setCheckingAvailability(
          true
        )

        const initialState:
          Record<
            string,
            AvailabilityState
          > = {}

        services.forEach(
          (service) => {
            initialState[
              service.id
            ] = {
              loading: true,
              available: false,
              availableWorkers: 0,
              error: null,
            }
          }
        )

        setAvailability(
          initialState
        )

        try {
          const results =
            await Promise.all(
              services.map(
                async (service) => {
                  try {
                    const result =
                      await checkServiceAvailability(
                        service.id,
                        latitude,
                        longitude
                      )

                    return {
                      serviceId:
                        service.id,
                      state: {
                        loading: false,
                        available:
                          result.available &&
                          result.available_workers >
                            0,
                        availableWorkers:
                          result.available_workers,
                        error: null,
                      },
                    }
                  } catch (
                    error
                  ) {
                    console.error(
                      `[TempStaff] Availability failed for ${service.name}:`,
                      error
                    )

                    return {
                      serviceId:
                        service.id,
                      state: {
                        loading: false,
                        available: false,
                        availableWorkers: 0,
                        error:
                          'Availability could not be checked.',
                      },
                    }
                  }
                }
              )
            )

          const nextState:
            Record<
              string,
              AvailabilityState
            > = {}

          results.forEach(
            (item) => {
              nextState[
                item.serviceId
              ] = item.state
            }
          )

          setAvailability(
            nextState
          )
        } finally {
          setCheckingAvailability(
            false
          )
        }
      },
      [services]
    )

  useEffect(() => {
    if (
      locationState.latitude ===
        null ||
      locationState.longitude ===
        null
    ) {
      return
    }

    loadServiceAvailability(
      locationState.latitude,
      locationState.longitude
    )
  }, [
    locationState.latitude,
    locationState.longitude,
    loadServiceAvailability,
  ])

  /*
   * --------------------------------------------------
   * SERVICE ACTIONS
   * --------------------------------------------------
   */

  const handleServicePress =
    (
      serviceId: string,
      serviceName: string
    ) => {
      const state =
        availability[
          serviceId
        ]

      if (
        !state ||
        state.loading
      ) {
        return
      }

      if (
        !state.available
      ) {
        Alert.alert(
          'Not available in your area',
          `${serviceName} is not currently available at your location. We can notify you when staff become available.`,
          [
            {
              text: 'OK',
            },
            {
              text: 'Notify me',
              onPress: () => {
                /*
                 * Notification subscription will be
                 * connected to Supabase in the next step.
                 *
                 * For now this confirms the customer's
                 * intent without creating a fake booking.
                 */
                Alert.alert(
                  'Request saved',
                  `We'll notify you when ${serviceName} becomes available in your area.`
                )
              },
            },
          ]
        )

        return
      }

      resetBooking()

      setSelectedService(
        serviceName
      )

      navigation.navigate(
        'Services'
      )
    }

  /*
   * --------------------------------------------------
   * RENDER
   * --------------------------------------------------
   */

  return (
    <SafeAreaView
      style={styles.container}
    >
      <View
        style={styles.screen}
      >
        <ScrollView
          contentContainerStyle={
            styles.content
          }
          showsVerticalScrollIndicator={
            false
          }
        >
          {/* TOP */}

          <View
            style={styles.top}
          >
            <Image
              source={LOGO}
              style={styles.logo}
              resizeMode="contain"
            />

            <View
              style={styles.greeting}
            >
              <Text
                style={styles.small}
              >
                Hello
              </Text>

              <Text
                style={styles.name}
              >
                Need staff today?
              </Text>
            </View>

            <TouchableOpacity
              style={
                styles.settingsButton
              }
              onPress={() =>
                navigation.navigate(
                  'Profile'
                )
              }
              activeOpacity={0.85}
            >
              <Text
                style={
                  styles.settingsIcon
                }
              >
                ◉
              </Text>
            </TouchableOpacity>
          </View>

          {/* LOCATION */}

          <View
            style={
              styles.locationCard
            }
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

            <View
              style={
                styles.locationTextWrap
              }
            >
              <Text
                style={
                  styles.locationCaption
                }
              >
                Your location
              </Text>

              {locationState.loading ? (
                <View
                  style={
                    styles.locationLoadingRow
                  }
                >
                  <ActivityIndicator
                    size="small"
                    color={
                      COLORS.orange
                    }
                  />

                  <Text
                    style={
                      styles.locationValue
                    }
                  >
                    Detecting location...
                  </Text>
                </View>
              ) : locationState.error ? (
                <>
                  <Text
                    style={
                      styles.locationError
                    }
                  >
                    {locationState.error}
                  </Text>

                  <View
  style={styles.locationActions}
>
  <TouchableOpacity
    onPress={
      loadLocation
    }
    activeOpacity={0.8}
  >
    <Text
      style={
        styles.locationRetry
      }
    >
      Try again
    </Text>
  </TouchableOpacity>

  <TouchableOpacity
    onPress={() =>
      navigation.navigate(
        'ManualLocation'
      )
    }
    activeOpacity={0.8}
  >
    <Text
      style={
        styles.manualLocationLink
      }
    >
      Select location manually
    </Text>
  </TouchableOpacity>
</View>
                </>
              ) : (
                <>
                  <Text
                    style={
                      styles.locationValue
                    }
                    numberOfLines={1}
                  >
                    {locationState.label}
                  </Text>

                  <Text
                    style={
                      styles.locationDetail
                    }
                    numberOfLines={1}
                  >
                    {locationState.detail}
                  </Text>
                </>
              )}
            </View>
          </View>

          {/* HERO */}

          <View
            style={styles.hero}
          >
            <Text
              style={
                styles.heroTitle
              }
            >
              Reliable staff, when
              you need them.
            </Text>

            <Text
              style={styles.heroText}
            >
              Book temporary staff
              for home or office
              work.
            </Text>

            <TouchableOpacity
              style={
                styles.heroButton
              }
              onPress={() => {
                if (
                  locationState.loading
                ) {
                  Alert.alert(
                    'Detecting location',
                    'Please wait while we check your service area.'
                  )

                  return
                }

                if (
                  locationState.error
                ) {
                  Alert.alert(
                    'Location required',
                    'Please enable location or try again before finding staff.'
                  )

                  return
                }

                resetBooking()

                navigation.navigate(
                  'Services'
                )
              }}
              activeOpacity={0.85}
            >
              <Text
                style={
                  styles.buttonText
                }
              >
                Find Staff
              </Text>
            </TouchableOpacity>
          </View>

          {/* BOOKINGS */}

          <TouchableOpacity
            style={
              styles.bookingsButton
            }
            onPress={() =>
              navigation.navigate(
                'MyBookings'
              )
            }
            activeOpacity={0.85}
          >
            <View>
              <Text
                style={
                  styles.bookingsTitle
                }
              >
                My Bookings
              </Text>

              <Text
                style={
                  styles.bookingsSubtitle
                }
              >
                View your current
                and past bookings
              </Text>
            </View>

            <Text
              style={styles.arrow}
            >
              →
            </Text>
          </TouchableOpacity>

          {/* SERVICES */}

          <View
            style={
              styles.sectionHeader
            }
          >
            <Text
              style={styles.section}
            >
              Popular services
            </Text>

            {checkingAvailability &&
            !catalogueLoading ? (
              <ActivityIndicator
                size="small"
                color={
                  COLORS.orange
                }
              />
            ) : null}
          </View>

          {catalogueLoading ? (
            <View
              style={
                styles.loadingBox
              }
            >
              <ActivityIndicator
                size="small"
                color={
                  COLORS.orange
                }
              />

              <Text
                style={
                  styles.loadingText
                }
              >
                Loading services...
              </Text>
            </View>
          ) : catalogueError ? (
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
                {catalogueError}
              </Text>

              <View
  style={
    styles.locationChoiceRow
  }
>
  <TouchableOpacity
    style={
      styles.retryButton
    }
    onPress={
      loadLocation
    }
    activeOpacity={0.85}
  >
    <Text
      style={
        styles.retryText
      }
    >
      Try Again
    </Text>
  </TouchableOpacity>

  <TouchableOpacity
    style={
      styles.manualLocationButton
    }
    onPress={() =>
      navigation.navigate(
        'ManualLocation'
      )
    }
    activeOpacity={0.85}
  >
    <Text
      style={
        styles.manualLocationButtonText
      }
    >
      Select manually
    </Text>
  </TouchableOpacity>
</View>
            </View>
          ) : services.length ===
            0 ? (
            <View
              style={
                styles.emptyBox
              }
            >
              <Text
                style={
                  styles.emptyText
                }
              >
                No services are
                currently available.
              </Text>
            </View>
          ) : locationState.error ? (
            <View
              style={
                styles.unavailableAreaBox
              }
            >
              <Text
                style={
                  styles.unavailableAreaTitle
                }
              >
                Location unavailable
              </Text>

              <Text
                style={
                  styles.unavailableAreaText
                }
              >
                Enable your location
                to check which
                services are
                available in your
                area.
              </Text>

              <TouchableOpacity
                style={
                  styles.retryButton
                }
                onPress={
                  loadLocation
                }
                activeOpacity={0.85}
              >
                <Text
                  style={
                    styles.retryText
                  }
                >
                  Try Again
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View
              style={styles.grid}
            >
              {services.map(
                (service) => {
                  const state =
                    availability[
                      service.id
                    ]

                  const loading =
                    !state ||
                    state.loading

                  const available =
                    state?.available ===
                    true

                  return (
                    <TouchableOpacity
                      key={
                        service.id
                      }
                      style={[
                        styles.card,
                        !loading &&
                        !available
                          ? styles.cardUnavailable
                          : null,
                      ]}
                      onPress={() =>
                        handleServicePress(
                          service.id,
                          service.name
                        )
                      }
                      activeOpacity={
                        loading
                          ? 1
                          : 0.85
                      }
                      disabled={
                        loading
                      }
                    >
                      <Text
                        style={
                          styles.icon
                        }
                      >
                        {iconForService(
                          service.name
                        )}
                      </Text>

                      <Text
                        style={
                          styles.cardText
                        }
                        numberOfLines={
                          2
                        }
                      >
                        {
                          service.name
                        }
                      </Text>

                      {service.description ? (
                        <Text
                          style={
                            styles.cardDescription
                          }
                          numberOfLines={
                            2
                          }
                        >
                          {
                            service.description
                          }
                        </Text>
                      ) : null}

                      {/* AVAILABILITY */}

                      <View
                        style={
                          styles.availabilityRow
                        }
                      >
                        {loading ? (
                          <>
                            <ActivityIndicator
                              size="small"
                              color={
                                COLORS.orange
                              }
                            />

                            <Text
                              style={
                                styles.checkingText
                              }
                            >
                              Checking...
                            </Text>
                          </>
                        ) : available ? (
                          <>
                            <View
                              style={
                                styles.availableDot
                              }
                            />

                            <Text
                              style={
                                styles.availableText
                              }
                            >
                              Available
                            </Text>
                          </>
                        ) : (
                          <>
                            <View
                              style={
                                styles.unavailableDot
                              }
                            />

                            <Text
                              style={
                                styles.unavailableText
                              }
                            >
                              Not available
                            </Text>
                          </>
                        )}
                      </View>

                      {!loading &&
                      !available ? (
                        <Text
                          style={
                            styles.notifyText
                          }
                        >
                          Tap to notify me
                        </Text>
                      ) : null}

                      {!loading &&
                      available &&
                      state.availableWorkers >
                        0 ? (
                        <Text
                          style={
                            styles.workerText
                          }
                        >
                          {
                            state.availableWorkers
                          }{' '}
                          staff available
                        </Text>
                      ) : null}
                    </TouchableOpacity>
                  )
                }
              )}
            </View>
          )}
        </ScrollView>

        <CustomerBottomNav
          navigation={
            navigation
          }
          active="Home"
        />
      </View>
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

    screen: {
      flex: 1,
    },

    content: {
      padding: 22,
      paddingBottom: 28,
    },

    top: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },

    logo: {
      width: 64,
      height: 64,
      marginRight: 14,
    },

    greeting: {
      flex: 1,
    },

    small: {
      color: COLORS.gray,
      fontSize: 13,
    },

    name: {
      color: COLORS.navy,
      fontSize: 22,
      fontWeight: '800',
    },

    settingsButton: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor:
        '#E7E7E7',
      alignItems: 'center',
      justifyContent: 'center',
    },

    settingsIcon: {
      fontSize: 21,
      color: COLORS.navy,
      fontWeight: '800',
    },

    locationCard: {
      backgroundColor:
        'white',
      borderWidth: 1,
      borderColor:
        COLORS.border,
      borderRadius: 18,
      padding: 14,
      marginBottom: 18,
      flexDirection: 'row',
      alignItems: 'center',
    },

    locationIconBox: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor:
        '#FFF1E8',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },

    locationIcon: {
      fontSize: 20,
    },

    locationTextWrap: {
      flex: 1,
    },

    locationCaption: {
      color: COLORS.gray,
      fontSize: 11,
      marginBottom: 2,
    },

    locationLoadingRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },

    locationValue: {
      color: COLORS.navy,
      fontSize: 15,
      fontWeight: '800',
      marginLeft: 7,
    },

    locationDetail: {
      color: COLORS.gray,
      fontSize: 11,
      marginTop: 2,
    },

    locationError: {
      color: COLORS.gray,
      fontSize: 12,
      lineHeight: 17,
    },

    locationRetry: {
      color: COLORS.orange,
      fontSize: 12,
      fontWeight: '800',
      marginTop: 4,
    },

    hero: {
      backgroundColor:
        COLORS.navy,
      borderRadius: 24,
      padding: 22,
      marginBottom: 18,
    },

    heroTitle: {
      color: 'white',
      fontSize: 25,
      lineHeight: 31,
      fontWeight: '800',
    },

    heroText: {
      color: '#D8E4EF',
      fontSize: 14,
      lineHeight: 21,
      marginTop: 8,
      marginBottom: 18,
    },

    heroButton: {
      backgroundColor:
        COLORS.orange,
      height: 50,
      borderRadius: 25,
      alignItems: 'center',
      justifyContent: 'center',
    },

    buttonText: {
      color: 'white',
      fontSize: 17,
      fontWeight: '800',
    },

    bookingsButton: {
      backgroundColor:
        'white',
      borderWidth: 1,
      borderColor:
        COLORS.border,
      borderRadius: 18,
      padding: 18,
      marginBottom: 28,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
    },

    bookingsTitle: {
      color: COLORS.navy,
      fontSize: 18,
      fontWeight: '800',
    },

    bookingsSubtitle: {
      color: COLORS.gray,
      fontSize: 13,
      marginTop: 4,
    },

    arrow: {
      color: COLORS.navy,
      fontSize: 25,
      fontWeight: '800',
    },

    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
      marginBottom: 14,
    },

    section: {
      color: COLORS.navy,
      fontSize: 20,
      fontWeight: '800',
    },

    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent:
        'space-between',
    },

    card: {
      width: '48%',
      backgroundColor:
        'white',
      borderWidth: 1,
      borderColor:
        COLORS.border,
      borderRadius: 18,
      padding: 16,
      marginBottom: 12,
    },

    cardUnavailable: {
      opacity: 0.78,
    },

    icon: {
      fontSize: 27,
      marginBottom: 7,
    },

    cardText: {
      color: COLORS.navy,
      fontSize: 14,
      fontWeight: '800',
    },

    cardDescription: {
      color: COLORS.gray,
      fontSize: 11,
      lineHeight: 15,
      marginTop: 5,
    },

    availabilityRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 12,
      minHeight: 18,
    },

    checkingText: {
      color: COLORS.gray,
      fontSize: 10,
      fontWeight: '700',
      marginLeft: 6,
    },

    availableDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor:
        COLORS.teal,
      marginRight: 6,
    },

    availableText: {
      color: COLORS.teal,
      fontSize: 10,
      fontWeight: '800',
    },

    unavailableDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor:
        COLORS.orange,
      marginRight: 6,
    },

    unavailableText: {
      color: COLORS.orange,
      fontSize: 10,
      fontWeight: '800',
    },

    notifyText: {
      color: COLORS.orange,
      fontSize: 10,
      fontWeight: '800',
      marginTop: 5,
    },

    workerText: {
      color: COLORS.gray,
      fontSize: 10,
      marginTop: 5,
    },

    loadingBox: {
      minHeight: 110,
      backgroundColor:
        'white',
      borderRadius: 16,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      alignItems: 'center',
      justifyContent: 'center',
    },

    loadingText: {
      color: COLORS.gray,
      fontSize: 13,
      marginTop: 9,
    },

    errorBox: {
      backgroundColor:
        'white',
      borderRadius: 16,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      padding: 18,
    },

    errorText: {
      color: COLORS.navy,
      fontSize: 13,
      lineHeight: 19,
      marginBottom: 12,
    },

    retryButton: {
      alignSelf: 'flex-start',
      backgroundColor:
        COLORS.orange,
      paddingHorizontal: 18,
      paddingVertical: 10,
      borderRadius: 20,
    },

    retryText: {
      color: 'white',
      fontSize: 13,
      fontWeight: '800',
    },

    emptyBox: {
      backgroundColor:
        'white',
      borderRadius: 16,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      padding: 18,
    },

    emptyText: {
      color: COLORS.gray,
      fontSize: 13,
      lineHeight: 19,
    },

    unavailableAreaBox: {
      backgroundColor:
        'white',
      borderRadius: 18,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      padding: 20,
      alignItems: 'center',
    },

    unavailableAreaTitle: {
      color: COLORS.navy,
      fontSize: 16,
      fontWeight: '800',
      textAlign: 'center',
    },

    unavailableAreaText: {
      color: COLORS.gray,
      fontSize: 12,
      lineHeight: 18,
      textAlign: 'center',
      marginTop: 7,
      marginBottom: 14,
      maxWidth: 300,
    },
    locationActions: {
  marginTop: 4,
},

manualLocationLink: {
  color: COLORS.teal,
  fontSize: 12,
  fontWeight: '800',
  marginTop: 9,
},

locationChoiceRow: {
  width: '100%',
  alignItems: 'center',
},

manualLocationButton: {
  marginTop: 9,
  paddingHorizontal: 18,
  paddingVertical: 9,
  borderRadius: 20,
  borderWidth: 1,
  borderColor: COLORS.teal,
},

manualLocationButtonText: {
  color: COLORS.teal,
  fontSize: 12,
  fontWeight: '800',
},
  })