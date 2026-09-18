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
  serviceAreaCovered: boolean
  instantAvailable: boolean
  availableWorkers: number
  error: string | null
}

export default function HomeScreen({
  navigation,
  route,
}: Props) {
  const {
    resetBooking,
    setSelectedService,
    setSelectedVariantId,
    services,
    hourlyVariants,
    catalogueLoading,
    catalogueError,
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
                  ? parts.join(', ')
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
          console.warn(
            '[TempStaff] Location unavailable:',
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
   */

  const loadServiceAvailability =
    useCallback(
      async (
        latitude: number,
        longitude: number
      ) => {
        if (services.length === 0) {
          return
        }

        setCheckingAvailability(true)

        const initialState:
          Record<
            string,
            AvailabilityState
          > = {}

        services.forEach(service => {
          initialState[service.id] = {
            loading: true,
            serviceAreaCovered: false,
            instantAvailable: false,
            availableWorkers: 0,
            error: null,
          }
        })

        setAvailability(
          initialState
        )

        try {
          const results =
            await Promise.all(
              services.map(
                async service => {
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
                        serviceAreaCovered:
                          result.service_area_covered,
                        instantAvailable:
                          result.service_area_covered &&
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
                        serviceAreaCovered:
                          false,
                        instantAvailable:
                          false,
                        availableWorkers:
                          0,
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
            item => {
              nextState[
                item.serviceId
              ] =
                item.state
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
   * SERVICE SELECTION
   * --------------------------------------------------
   *
   * Home is responsible only for:
   *
   * 1. Showing services
   * 2. Checking service-area availability
   * 3. Selecting the service
   * 4. Opening Booking
   *
   * Booking type is handled entirely by BookingScreen.
   */

  const handleServicePress = (
    serviceId: string,
    serviceName: string
  ) => {
    const state =
      availability[serviceId]

    if (!state || state.loading) {
      return
    }

    if (!state.serviceAreaCovered) {
      Alert.alert(
        'Service unavailable',
        `${serviceName} is not available at your selected location.`,
        [
          {
            text: 'OK',
          },
        ]
      )

      return
    }

    /*
     * Start a fresh booking.
     */
    resetBooking()

    /*
     * Store selected service.
     */
    setSelectedService(
      serviceName
    )

    /*
     * Clear any stale variant.
     * BookingScreen will select the correct
     * variant for this service.
     */
    setSelectedVariantId('')

    /*
     * Everything after service selection
     * happens inside BookingScreen.
     */
    navigation.navigate(
      'Booking'
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
        {/* HEADER */}

        <View
          style={styles.header}
        >
          {/* HEADER */}

          <View
            style={styles.header}
          >
            <View
              style={
                styles.brandArea
              }
            >
              <Image
                source={LOGO}
                style={styles.logo}
                resizeMode="contain"
              />

              <View
                style={
                  styles.greeting
                }
              >
                <Text
                  style={
                    styles.eyebrow
                  }
                >
                  TEMPSTAFF
                </Text>

                <Text
                  style={styles.title}
                >
                  Book staff with
                  confidence.
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={
                styles.profileButton
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
                  styles.profileIcon
                }
              >
                ◉
              </Text>
            </TouchableOpacity>
          </View>

          {/* LOCATION */}

          <TouchableOpacity
            style={
              styles.locationCard
            }
            onPress={() =>
              navigation.navigate(
                'ManualLocation'
              )
            }
            activeOpacity={0.9}
          >
            <View
              style={
                styles.locationBadge
              }
            >
              <Text
                style={
                  styles.locationBadgeText
                }
              >
                ●
              </Text>
            </View>

            <View
              style={
                styles.locationContent
              }
            >
              <Text
                style={
                  styles.locationLabel
                }
              >
                SERVICE LOCATION
              </Text>

              {locationState.loading ? (
                <View
                  style={
                    styles.locationLoading
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
                    {
                      locationState.error
                    }
                  </Text>

                  <View
                    style={
                      styles.locationActionRow
                    }
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

                    <Text
                      style={
                        styles.locationDivider
                      }
                    >
                      •
                    </Text>

                    <Text
                      style={
                        styles.locationManual
                      }
                    >
                      Select manually
                    </Text>
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
                    {
                      locationState.label
                    }
                  </Text>

                  <Text
                    style={
                      styles.locationDetail
                    }
                    numberOfLines={1}
                  >
                    {
                      locationState.detail
                    }
                  </Text>
                </>
              )}
            </View>

            {!locationState.loading &&
            !locationState.error ? (
              <Text
                style={
                  styles.locationArrow
                }
              >
                ›
              </Text>
            ) : null}
          </TouchableOpacity>

          {/* MY BOOKINGS */}

          <TouchableOpacity
            style={
              styles.bookingsCard
            }
            onPress={() =>
              navigation.navigate(
                'MyBookings'
              )
            }
            activeOpacity={0.88}
          >
            <View
              style={
                styles.bookingsIcon
              }
            >
              <Text
                style={
                  styles.bookingsIconText
                }
              >
                ▣
              </Text>
            </View>

            <View
              style={
                styles.bookingsContent
              }
            >
              <Text
                style={
                  styles.bookingsTitle
                }
              >
                My Bookings
              </Text>

              <Text
                style={
                  styles.bookingsDescription
                }
              >
                View and manage your
                bookings.
              </Text>
            </View>

            <Text
              style={
                styles.bookingsArrow
              }
            >
              →
            </Text>
          </TouchableOpacity>

          {/* SERVICES */}

          <View
            style={
              styles.servicesSection
            }
          >
            <View
              style={
                styles.sectionHeading
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
                    styles.sectionHint
                  }
                >
                  Choose a service to
                  start your booking
                </Text>
              </View>

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
                  styles.stateCard
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
                    styles.stateText
                  }
                >
                  Loading services...
                </Text>
              </View>
            ) : catalogueError ? (
              <View
                style={
                  styles.stateCard
                }
              >
                <Text
                  style={
                    styles.stateTitle
                  }
                >
                  Services unavailable
                </Text>

                <Text
                  style={
                    styles.stateText
                  }
                >
                  {
                    catalogueError
                  }
                </Text>
              </View>
            ) : services.length ===
              0 ? (
              <View
                style={
                  styles.stateCard
                }
              >
                <Text
                  style={
                    styles.stateTitle
                  }
                >
                  No services available
                </Text>

                <Text
                  style={
                    styles.stateText
                  }
                >
                  There are currently
                  no active services
                  to display.
                </Text>
              </View>
            ) : locationState.error ? (
              <View
                style={
                  styles.stateCard
                }
              >
                <Text
                  style={
                    styles.stateTitle
                  }
                >
                  Location unavailable
                </Text>

                <Text
                  style={
                    styles.stateText
                  }
                >
                  Enable location to
                  check service
                  availability.
                </Text>

                <TouchableOpacity
                  style={
                    styles.stateButton
                  }
                  onPress={
                    loadLocation
                  }
                  activeOpacity={0.85}
                >
                  <Text
                    style={
                      styles.stateButtonText
                    }
                  >
                    Try again
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={
                    styles.manualButton
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
                      styles.manualButtonText
                    }
                  >
                    Select location
                    manually
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View
                style={
                  styles.serviceList
                }
              >
                {services.map(
                  service => {
                    const state =
                      availability[
                        service.id
                      ]

                    const loading =
                      !state ||
                      state.loading

                    const available =
                      state?.serviceAreaCovered ===
                      true

                    return (
                      <TouchableOpacity
                        key={
                          service.id
                        }
                        style={[
                          styles.serviceCard,
                          !loading &&
                          !available
                            ? styles.serviceCardUnavailable
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
                            : 0.88
                        }
                        disabled={
                          loading
                        }
                      >
                        <View
                          style={
                            styles.serviceTop
                          }
                        >
                          <View
                            style={
                              styles.serviceInitial
                            }
                          >
                            <Text
                              style={
                                styles.serviceInitialText
                              }
                            >
                              {service.name
                                .trim()
                                .charAt(
                                  0
                                )
                                .toUpperCase()}
                            </Text>
                          </View>

                          <View
                            style={[
                              styles.availabilityBadge,
                              available
                                ? styles.availabilityBadgeAvailable
                                : styles.availabilityBadgeUnavailable,
                            ]}
                          >
                            {loading ? (
                              <ActivityIndicator
                                size="small"
                                color={
                                  COLORS.orange
                                }
                              />
                            ) : (
                              <View
                                style={[
                                  styles.statusDot,
                                  available
                                    ? styles.statusDotAvailable
                                    : styles.statusDotUnavailable,
                                ]}
                              />
                            )}

                            <Text
                              style={[
                                styles.availabilityText,
                                available
                                  ? styles.availabilityTextAvailable
                                  : styles.availabilityTextUnavailable,
                              ]}
                            >
                              {loading
                                ? 'Checking'
                                : available
                                  ? 'Available'
                                  : 'Unavailable'}
                            </Text>
                          </View>
                        </View>

                        <Text
                          style={
                            styles.serviceName
                          }
                          numberOfLines={2}
                        >
                          {
                            service.name
                          }
                        </Text>

                        {service.description ? (
                          <Text
                            style={
                              styles.serviceDescription
                            }
                            numberOfLines={2}
                          >
                            {
                              service.description
                            }
                          </Text>
                        ) : null}

                        <View
                          style={
                            styles.serviceFooter
                          }
                        >
                          {loading ? (
                            <Text
                              style={
                                styles.serviceMeta
                              }
                            >
                              Checking nearby
                              staff
                            </Text>
                          ) : available ? (
                            <Text
                              style={
                                styles.serviceMeta
                              }
                            >
                              {
                                state.availableWorkers
                              }{' '}
                              staff available
                            </Text>
                          ) : (
                            <Text
                              style={
                                styles.serviceMetaUnavailable
                              }
                            >
                              Not currently
                              available here
                            </Text>
                          )}

                          {!loading &&
                          available ? (
                            <Text
                              style={
                                styles.serviceArrow
                              }
                            >
                              →
                            </Text>
                          ) : null}
                        </View>
                      </TouchableOpacity>
                    )
                  }
                )}
              </View>
            )}
          </View>
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
      paddingHorizontal: 18,
      paddingTop: 16,
      paddingBottom: 28,
    },

    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
      marginBottom: 18,
    },

    brandArea: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
    },

    logo: {
      width: 52,
      height: 52,
      marginRight: 11,
    },

    greeting: {
      flex: 1,
    },

    eyebrow: {
      color: COLORS.teal,
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 1.3,
    },

    title: {
      color: COLORS.navy,
      fontSize: 21,
      lineHeight: 26,
      fontWeight: '900',
      letterSpacing: -0.5,
      marginTop: 2,
    },

    profileButton: {
      width: 46,
      height: 46,
      borderRadius: 16,
      backgroundColor:
        COLORS.white,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor:
        COLORS.shadow,
      shadowOffset: {
        width: 0,
        height: 7,
      },
      shadowOpacity: 0.07,
      shadowRadius: 12,
      elevation: 3,
    },

    profileIcon: {
      color: COLORS.navy,
      fontSize: 19,
      fontWeight: '900',
    },

    locationCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor:
        COLORS.white,
      borderRadius: 20,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      padding: 14,
      marginBottom: 18,
      shadowColor:
        COLORS.shadow,
      shadowOffset: {
        width: 0,
        height: 8,
      },
      shadowOpacity: 0.045,
      shadowRadius: 16,
      elevation: 2,
    },

    locationBadge: {
      width: 42,
      height: 42,
      borderRadius: 14,
      backgroundColor:
        COLORS.tealSoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },

    locationBadgeText: {
      color: COLORS.teal,
      fontSize: 13,
    },

    locationContent: {
      flex: 1,
      minWidth: 0,
    },

    locationLabel: {
      color: COLORS.gray,
      fontSize: 9,
      fontWeight: '900',
      letterSpacing: 1,
      marginBottom: 3,
    },

    locationLoading: {
      flexDirection: 'row',
      alignItems: 'center',
    },

    locationValue: {
      color: COLORS.navy,
      fontSize: 14,
      fontWeight: '800',
      marginLeft: 7,
    },

    locationDetail: {
      color: COLORS.gray,
      fontSize: 11,
      marginTop: 2,
    },

    locationError: {
      color: COLORS.navy,
      fontSize: 12,
      lineHeight: 17,
    },

    locationActionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 5,
    },

    locationRetry: {
      color: COLORS.orange,
      fontSize: 11,
      fontWeight: '900',
    },

    locationDivider: {
      color: COLORS.border,
      fontSize: 11,
      marginHorizontal: 7,
    },

    locationManual: {
      color: COLORS.teal,
      fontSize: 11,
      fontWeight: '900',
    },

    locationArrow: {
      color: COLORS.navy,
      fontSize: 27,
      fontWeight: '400',
      marginLeft: 8,
    },

    bookingsCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor:
        COLORS.white,
      borderRadius: 21,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      padding: 15,
      marginBottom: 26,
      shadowColor:
        COLORS.shadow,
      shadowOffset: {
        width: 0,
        height: 7,
      },
      shadowOpacity: 0.035,
      shadowRadius: 12,
      elevation: 2,
    },

    bookingsIcon: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor:
        COLORS.tealSoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },

    bookingsIconText: {
      color: COLORS.teal,
      fontSize: 18,
      fontWeight: '900',
    },

    bookingsContent: {
      flex: 1,
    },

    bookingsTitle: {
      color: COLORS.navy,
      fontSize: 15,
      fontWeight: '900',
    },

    bookingsDescription: {
      color: COLORS.gray,
      fontSize: 11,
      lineHeight: 16,
      marginTop: 2,
    },

    bookingsArrow: {
      color: COLORS.navy,
      fontSize: 22,
      fontWeight: '900',
      marginLeft: 8,
    },

    servicesSection: {
      marginBottom: 8,
    },

    sectionHeading: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
      marginBottom: 12,
    },

    sectionTitle: {
      color: COLORS.navy,
      fontSize: 20,
      lineHeight: 24,
      fontWeight: '900',
      letterSpacing: -0.4,
    },

    sectionHint: {
      color: COLORS.gray,
      fontSize: 11,
      lineHeight: 16,
      marginTop: 2,
    },

    serviceList: {
      gap: 10,
    },

    serviceCard: {
      backgroundColor:
        COLORS.white,
      borderRadius: 21,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      padding: 16,
      shadowColor:
        COLORS.shadow,
      shadowOffset: {
        width: 0,
        height: 7,
      },
      shadowOpacity: 0.035,
      shadowRadius: 12,
      elevation: 2,
    },

    serviceCardUnavailable: {
      opacity: 0.72,
    },

    serviceTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
      marginBottom: 13,
    },

    serviceInitial: {
      width: 42,
      height: 42,
      borderRadius: 14,
      backgroundColor:
        COLORS.navy,
      alignItems: 'center',
      justifyContent: 'center',
    },

    serviceInitialText: {
      color: '#FFFFFF',
      fontSize: 17,
      fontWeight: '900',
    },

    availabilityBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 5,
    },

    availabilityBadgeAvailable: {
      backgroundColor:
        COLORS.tealSoft,
    },

    availabilityBadgeUnavailable: {
      backgroundColor:
        COLORS.orangeSoft,
    },

    statusDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      marginRight: 5,
    },

    statusDotAvailable: {
      backgroundColor:
        COLORS.teal,
    },

    statusDotUnavailable: {
      backgroundColor:
        COLORS.orange,
    },

    availabilityText: {
      fontSize: 8,
      fontWeight: '900',
      letterSpacing: 0.3,
    },

    availabilityTextAvailable: {
      color: COLORS.teal,
    },

    availabilityTextUnavailable: {
      color: COLORS.orange,
    },

    serviceName: {
      color: COLORS.navy,
      fontSize: 16,
      lineHeight: 20,
      fontWeight: '900',
    },

    serviceDescription: {
      color: COLORS.gray,
      fontSize: 11,
      lineHeight: 16,
      marginTop: 4,
    },

    serviceFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
      marginTop: 13,
      paddingTop: 11,
      borderTopWidth: 1,
      borderTopColor:
        COLORS.border,
    },

    serviceMeta: {
      color: COLORS.gray,
      fontSize: 10,
      fontWeight: '700',
    },

    serviceMetaUnavailable: {
      color: COLORS.orange,
      fontSize: 10,
      fontWeight: '700',
    },

    serviceArrow: {
      color: COLORS.navy,
      fontSize: 17,
      fontWeight: '900',
    },

    stateCard: {
      backgroundColor:
        COLORS.white,
      borderRadius: 21,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      padding: 20,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 130,
    },

    stateTitle: {
      color: COLORS.navy,
      fontSize: 14,
      fontWeight: '900',
      textAlign: 'center',
    },

    stateText: {
      color: COLORS.gray,
      fontSize: 12,
      lineHeight: 18,
      textAlign: 'center',
      marginTop: 6,
    },

    stateButton: {
      backgroundColor:
        COLORS.orange,
      borderRadius: 13,
      paddingHorizontal: 17,
      paddingVertical: 10,
      marginTop: 14,
    },

    stateButtonText: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: '900',
    },

    manualButton: {
      borderRadius: 13,
      borderWidth: 1,
      borderColor:
        COLORS.teal,
      backgroundColor:
        COLORS.tealSoft,
      paddingHorizontal: 14,
      paddingVertical: 9,
      marginTop: 9,
    },

    manualButtonText: {
      color: COLORS.teal,
      fontSize: 11,
      fontWeight: '900',
    },
  })