import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'

import {
  ActivityIndicator,
  Alert,
  RefreshControl,
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
  getWorkerEarnings,
  WorkerEarning,
} from '../services/workerEarnings'

import { supabase } from '../lib/supabase'
import EarningsScreen from './EarningsScreen'
const VERIFY_OTP_FUNCTION = 'verify-booking-otp'

type Booking = {
  id: string
  customer_id: string
  worker_id: string | null
  service_id: string
  address_id: string
  status: string
  duration_value: number
  duration_unit: string
  scheduled_start: string
  scheduled_end: string
  total_amount: number
  created_at: string
}

type OtpValues = {
  start: string
  end: string
}

export default function WorkerDashboard({
  onOpenEarnings,
}: {
  onOpenEarnings: () => void
}) {
  const [bookings, setBookings] = useState<Booking[]>([])

  const [earnings, setEarnings] = useState<
    WorkerEarning[]
  >([])

  const [earningsLoading, setEarningsLoading] =
    useState(true)

  const [loading, setLoading] = useState(true)

  const [refreshing, setRefreshing] =
    useState(false)

  const [otpValues, setOtpValues] = useState<
    Record<string, OtpValues>
  >({})

  const [verifyingOtp, setVerifyingOtp] = useState<
    Record<string, 'start' | 'end' | null>
  >({})

  const [location, setLocation] =
    useState<Location.LocationObject | null>(null)

  const locationSubscription =
    useRef<Location.LocationSubscription | null>(
      null
    )

  /*
   * ---------------------------------------------------------
   * LOAD BOOKINGS
   * ---------------------------------------------------------
   */

  const loadBookings = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        throw new Error(
          'Worker is not authenticated.'
        )
      }

      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('worker_id', user.id)
        .in('status', [
          'paid',
          'assigned',
          'on_the_way',
          'arrived',
          'in_progress',
        ])
        .order('created_at', {
          ascending: false,
        })

      if (error) {
        throw error
      }

      setBookings(data ?? [])
    } catch (error: any) {
      console.error(
        '[TempStaff Worker] Failed to load bookings:',
        error
      )

      Alert.alert(
        'Unable to load jobs',
        error?.message ||
          'Please try again.'
      )
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  /*
   * ---------------------------------------------------------
   * LOAD EARNINGS
   * ---------------------------------------------------------
   */

  const loadEarnings = useCallback(async () => {
    try {
      setEarningsLoading(true)

      const data = await getWorkerEarnings()

      setEarnings(data)
    } catch (error: any) {
      console.error(
        '[TempStaff Worker] Failed to load earnings:',
        error
      )

      /*
       * Do not block the whole dashboard if
       * earnings fail to load.
       */
    } finally {
      setEarningsLoading(false)
    }
  }, [])

  /*
   * ---------------------------------------------------------
   * LOAD EVERYTHING
   * ---------------------------------------------------------
   */

  const loadDashboard = useCallback(async () => {
    await Promise.all([
      loadBookings(),
      loadEarnings(),
    ])
  }, [
    loadBookings,
    loadEarnings,
  ])

  /*
   * ---------------------------------------------------------
   * INITIAL LOAD
   * ---------------------------------------------------------
   */

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  /*
   * ---------------------------------------------------------
   * CLEANUP LOCATION
   * ---------------------------------------------------------
   */

  useEffect(() => {
    return () => {
      locationSubscription.current?.remove()
      locationSubscription.current = null
    }
  }, [])

  /*
   * ---------------------------------------------------------
   * OTP HELPERS
   * ---------------------------------------------------------
   */

  const getOtpValue = (
    bookingId: string,
    type: 'start' | 'end'
  ) => {
    return (
      otpValues[bookingId]?.[type] ?? ''
    )
  }

  const setOtpValue = (
    bookingId: string,
    type: 'start' | 'end',
    value: string
  ) => {
    const cleanedValue = value
      .replace(/[^0-9]/g, '')
      .slice(0, 6)

    setOtpValues(current => ({
      ...current,

      [bookingId]: {
        start:
          current[bookingId]?.start ?? '',

        end:
          current[bookingId]?.end ?? '',

        [type]: cleanedValue,
      },
    }))
  }

  const clearOtpValue = (
    bookingId: string,
    type: 'start' | 'end'
  ) => {
    setOtpValues(current => ({
      ...current,

      [bookingId]: {
        start:
          current[bookingId]?.start ?? '',

        end:
          current[bookingId]?.end ?? '',

        [type]: '',
      },
    }))
  }

  /*
   * ---------------------------------------------------------
   * READ REAL EDGE FUNCTION ERROR
   * ---------------------------------------------------------
   */

  const getFunctionErrorMessage =
    async (
      error: any
    ): Promise<string> => {
      console.error(
        '[TempStaff Worker] Edge Function raw error:',
        error
      )

      let message =
        error?.message ||
        'OTP verification failed.'

      try {
        const context =
          error?.context

        if (context) {
          const responseText =
            await context.text()

          console.error(
            '[TempStaff Worker] Edge Function response:',
            responseText
          )

          if (responseText) {
            try {
              const responseJson =
                JSON.parse(responseText)

              if (
                responseJson?.error
              ) {
                message = String(
                  responseJson.error
                )
              } else if (
                responseJson?.message
              ) {
                message = String(
                  responseJson.message
                )
              }

              if (
                responseJson?.details
              ) {
                message +=
                  `\n\nDetails: ${String(
                    responseJson.details
                  )}`
              }

              if (
                responseJson?.code
              ) {
                message +=
                  `\nCode: ${String(
                    responseJson.code
                  )}`
              }
            } catch {
              message =
                responseText
            }
          }
        }
      } catch (readError) {
        console.error(
          '[TempStaff Worker] Could not read Edge Function response:',
          readError
        )
      }

      return message
    }

  /*
   * ---------------------------------------------------------
   * SAVE WORKER LOCATION
   * ---------------------------------------------------------
   */

  const saveLocation = async (
    bookingId: string,
    newLocation: Location.LocationObject
  ) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        return
      }

      const { error } =
        await supabase
          .from('worker_locations')
          .insert({
            worker_id: user.id,
            booking_id: bookingId,
            latitude:
              newLocation.coords.latitude,
            longitude:
              newLocation.coords.longitude,
          })

      if (error) {
        console.error(
          '[TempStaff Worker] Failed to save location:',
          error
        )
      }
    } catch (error) {
      console.error(
        '[TempStaff Worker] Location save error:',
        error
      )
    }
  }

  /*
   * ---------------------------------------------------------
   * STOP LOCATION TRACKING
   * ---------------------------------------------------------
   */

  const stopLocationTracking =
    () => {
      locationSubscription.current?.remove()
      locationSubscription.current =
        null
    }

  /*
   * ---------------------------------------------------------
   * START LOCATION TRACKING
   * ---------------------------------------------------------
   */

  const startLocationTracking =
    async (
      bookingId: string
    ) => {
      try {
        stopLocationTracking()

        const {
          status,
        } =
          await Location.requestForegroundPermissionsAsync()

        if (status !== 'granted') {
          Alert.alert(
            'Location permission required',
            'Please allow location access so customers can track you.'
          )

          return
        }

        const currentLocation =
          await Location.getCurrentPositionAsync(
            {
              accuracy:
                Location.Accuracy.High,
            }
          )

        setLocation(
          currentLocation
        )

        await saveLocation(
          bookingId,
          currentLocation
        )

        locationSubscription.current =
          await Location.watchPositionAsync(
            {
              accuracy:
                Location.Accuracy.High,

              timeInterval: 5000,

              distanceInterval: 10,
            },

            async newLocation => {
              setLocation(
                newLocation
              )

              await saveLocation(
                bookingId,
                newLocation
              )
            }
          )
      } catch (error) {
        console.error(
          '[TempStaff Worker] Failed to start location tracking:',
          error
        )
      }
    }

  /*
   * ---------------------------------------------------------
   * UPDATE WORKER BOOKING STATUS
   * ---------------------------------------------------------
   */

  const updateStatus = async (
    bookingId: string,
    status:
      | 'assigned'
      | 'on_the_way'
      | 'arrived'
      | 'in_progress'
      | 'completed'
      | 'cancelled'
  ) => {
    try {
      const {
        data,
        error,
      } =
        await supabase.rpc(
          'update_worker_booking_status',
          {
            p_booking_id:
              bookingId,

            p_status:
              status,
          }
        )

      if (error) {
        throw error
      }

      if (!data) {
        throw new Error(
          'Booking status was not updated.'
        )
      }

      /*
       * Start tracking when worker
       * starts travelling.
       */

      if (
        status ===
        'on_the_way'
      ) {
        await startLocationTracking(
          bookingId
        )
      }

      /*
       * Stop tracking when job
       * is completed/cancelled.
       */

      if (
        status ===
          'completed' ||
        status ===
          'cancelled'
      ) {
        stopLocationTracking()
        setLocation(null)
      }

      await loadDashboard()
    } catch (error: any) {
      console.error(
        '[TempStaff Worker] Status update failed:',
        error
      )

      Alert.alert(
        'Update failed',
        error?.message ||
          'Unable to update job status.'
      )
    }
  }

  /*
   * ---------------------------------------------------------
   * START OTP
   * ---------------------------------------------------------
   */

  const verifyStartOtp =
    async (
      bookingId: string
    ) => {
      const otp =
        getOtpValue(
          bookingId,
          'start'
        )

      if (
        !otp ||
        otp.length !== 6
      ) {
        Alert.alert(
          'Invalid OTP',
          'Please enter the 6-digit Start OTP.'
        )

        return
      }

      setVerifyingOtp(
        current => ({
          ...current,
          [bookingId]:
            'start',
        })
      )

      try {
        const {
          data,
          error,
        } =
          await supabase.functions.invoke(
            VERIFY_OTP_FUNCTION,
            {
              body: {
                bookingId,
                otp,
                otpType:
                  'start',
              },
            }
          )

        if (error) {
          const message =
            await getFunctionErrorMessage(
              error
            )

          throw new Error(
            message
          )
        }

        if (
          !data?.success
        ) {
          throw new Error(
            data?.error ||
              'OTP verification failed.'
          )
        }

        clearOtpValue(
          bookingId,
          'start'
        )

        await loadDashboard()

        Alert.alert(
          'Job started',
          'Start OTP verified successfully.'
        )
      } catch (error: any) {
        console.error(
          '[TempStaff Worker] Start OTP verification failed:',
          error
        )

        Alert.alert(
          'Invalid OTP',
          error?.message ||
            'Unable to verify Start OTP.'
        )
      } finally {
        setVerifyingOtp(
          current => ({
            ...current,
            [bookingId]:
              null,
          })
        )
      }
    }

  /*
   * ---------------------------------------------------------
   * END OTP
   * ---------------------------------------------------------
   */

  const verifyEndOtp =
    async (
      bookingId: string
    ) => {
      const otp =
        getOtpValue(
          bookingId,
          'end'
        )

      if (
        !otp ||
        otp.length !== 6
      ) {
        Alert.alert(
          'Invalid OTP',
          'Please enter the 6-digit End OTP.'
        )

        return
      }

      setVerifyingOtp(
        current => ({
          ...current,
          [bookingId]:
            'end',
        })
      )

      try {
        const {
          data,
          error,
        } =
          await supabase.functions.invoke(
            VERIFY_OTP_FUNCTION,
            {
              body: {
                bookingId,
                otp,
                otpType:
                  'end',
              },
            }
          )

        if (error) {
          const message =
            await getFunctionErrorMessage(
              error
            )

          throw new Error(
            message
          )
        }

        if (
          !data?.success
        ) {
          throw new Error(
            data?.error ||
              'OTP verification failed.'
          )
        }

        clearOtpValue(
          bookingId,
          'end'
        )

        /*
         * The Edge Function completes
         * the booking.
         *
         * Reload earnings so the newly
         * created worker earning appears
         * immediately.
         */

        stopLocationTracking()

        setLocation(null)

        await loadDashboard()

        Alert.alert(
          'Job completed',
          'End OTP verified successfully.'
        )
      } catch (error: any) {
        console.error(
          '[TempStaff Worker] End OTP verification failed:',
          error
        )

        Alert.alert(
          'Invalid OTP',
          error?.message ||
            'Unable to verify End OTP.'
        )
      } finally {
        setVerifyingOtp(
          current => ({
            ...current,
            [bookingId]:
              null,
          })
        )
      }
    }

  /*
   * ---------------------------------------------------------
   * REFRESH
   * ---------------------------------------------------------
   */

  const refresh =
    async () => {
      setRefreshing(true)

      try {
        await loadDashboard()
      } finally {
        setRefreshing(false)
      }
    }

  /*
   * ---------------------------------------------------------
   * LOGOUT
   * ---------------------------------------------------------
   */

  const logout =
    async () => {
      stopLocationTracking()

      await supabase.auth.signOut()
    }

  /*
   * ---------------------------------------------------------
   * EARNINGS CALCULATIONS
   * ---------------------------------------------------------
   */

  const totalEarnings =
    earnings.reduce(
      (
        total,
        earning
      ) =>
        total +
        Number(
          earning.net_amount
        ),

      0
    )

  const totalGross =
    earnings.reduce(
      (
        total,
        earning
      ) =>
        total +
        Number(
          earning.gross_amount
        ),

      0
    )

  /*
   * ---------------------------------------------------------
   * RENDER
   * ---------------------------------------------------------
   */

  return (
    <SafeAreaView
      style={
        styles.container
      }
    >

      <ScrollView
        contentContainerStyle={
          styles.page
        }

        refreshControl={
          <RefreshControl
            refreshing={
              refreshing
            }
            onRefresh={
              refresh
            }
          />
        }
      >

        {/* ------------------------------------------------- */}
        {/* HEADER */}
        {/* ------------------------------------------------- */}

        <View
          style={
            styles.header
          }
        >
          <View>
            <Text
              style={
                styles.eyebrow
              }
            >
              TEMPSTAFF WORKER
            </Text>

            <Text
              style={
                styles.title
              }
            >
              Worker Dashboard
            </Text>

            <Text
              style={
                styles.subtitle
              }
            >
              Manage your jobs and earnings
            </Text>
          </View>

          <TouchableOpacity
            style={
              styles.logout
            }
            onPress={
              logout
            }
          >
            <Text
              style={
                styles.logoutText
              }
            >
              Logout
            </Text>
          </TouchableOpacity>
        </View>

        {/* ------------------------------------------------- */}
        {/* EARNINGS SUMMARY */}
        {/* ------------------------------------------------- */}

        <View
          style={
            styles.earningsCard
          }
        >
          <View
            style={
              styles.earningsHeader
            }
          >
            <View>
              <Text
                style={
                  styles.earningsEyebrow
                }
              >
                YOUR EARNINGS
              </Text>

              <Text
                style={
                  styles.earningsTitle
                }
              >
                Total Earned
              </Text>
            </View>

            <View
              style={
                styles.earningsIcon
              }
            >
              <Text
                style={
                  styles.earningsIconText
                }
              >
                ₹
              </Text>
            </View>
          </View>

          {earningsLoading ? (
            <View
              style={
                styles.earningsLoading
              }
            >
              <ActivityIndicator />

              <Text
                style={
                  styles.earningsLoadingText
                }
              >
                Loading earnings...
              </Text>
            </View>
          ) : (
            <>
              <Text
                style={
                  styles.totalEarnings
                }
              >
                ₹
                {totalEarnings.toLocaleString(
                  'en-IN',
                  {
                    maximumFractionDigits: 2,
                  }
                )}
              </Text>

              <View
                style={
                  styles.earningsStats
                }
              >
                <View
                  style={
                    styles.earningStat
                  }
                >
                  <Text
                    style={
                      styles.statValue
                    }
                  >
                    {earnings.length}
                  </Text>

                  <Text
                    style={
                      styles.statLabel
                    }
                  >
                    Completed jobs
                  </Text>
                </View>

                <View
                  style={
                    styles.statDivider
                  }
                />

                <View
                  style={
                    styles.earningStat
                  }
                >
                  <Text
                    style={
                      styles.statValue
                    }
                  >
                    ₹
                    {totalGross.toLocaleString(
                      'en-IN',
                      {
                        maximumFractionDigits: 2,
                      }
                    )}
                  </Text>

                  <Text
                    style={
                      styles.statLabel
                    }
                  >
                    Gross earnings
                  </Text>
                </View>
              </View>
            </>
          )}
        </View>

        {/* ------------------------------------------------- */}
        {/* RECENT EARNINGS */}
        {/* ------------------------------------------------- */}

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
              Recent Earnings
            </Text>

            <Text
              style={
                styles.sectionSubtitle
              }
            >
              Money earned from completed jobs
            </Text>
          </View>
        </View>

        {earningsLoading ? (
          <View
            style={
              styles.loadingSmall
            }
          >
            <ActivityIndicator />

            <Text
              style={
                styles.loadingText
              }
            >
              Loading earnings...
            </Text>
          </View>
        ) : earnings.length === 0 ? (
          <View
            style={
              styles.emptyEarnings
            }
          >
            <Text
              style={
                styles.emptyEarningsTitle
              }
            >
              No earnings yet
            </Text>

            <Text
              style={
                styles.emptyEarningsText
              }
            >
              Complete your first job and
              your earnings will appear here.
            </Text>
          </View>
        ) : (
          <View>
            {earnings
              .slice(0, 5)
              .map(
                earning => (
                  <View
                    key={
                      earning.id
                    }
                    style={
                      styles.earningRow
                    }
                  >
                    <View
                      style={
                        styles.earningLeft
                      }
                    >
                      <View
                        style={
                          styles.earningCircle
                        }
                      >
                        <Text
                          style={
                            styles.earningCircleText
                          }
                        >
                          ₹
                        </Text>
                      </View>

                      <View
                        style={
                          styles.earningInfo
                        }
                      >
                        <Text
                          style={
                            styles.earningJob
                          }
                        >
                          Completed Job
                        </Text>

                        <Text
                          style={
                            styles.earningBooking
                          }
                        >
                          #
                          {earning.booking_id.slice(
                            0,
                            8
                          )}
                        </Text>

                        <Text
                          style={
                            styles.earningDate
                          }
                        >
                          {new Date(
                            earning.created_at
                          ).toLocaleDateString(
                            'en-IN'
                          )}
                        </Text>
                      </View>
                    </View>

                    <View
                      style={
                        styles.earningAmountContainer
                      }
                    >
                      <Text
                        style={
                          styles.earningAmount
                        }
                      >
                        +₹
                        {Number(
                          earning.net_amount
                        ).toLocaleString(
                          'en-IN',
                          {
                            maximumFractionDigits:
                              2,
                          }
                        )}
                      </Text>

                      <Text
                        style={
                          styles.earningNet
                        }
                      >
                        Net earning
                      </Text>
                    </View>
                  </View>
                )
              )}
          </View>
        )}

        {/* ------------------------------------------------- */}
        {/* ACTIVE JOBS */}
        {/* ------------------------------------------------- */}

        <View
          style={
            styles.sectionHeaderJobs
          }
        >
          <View>
            <Text
              style={
                styles.sectionTitle
              }
            >
              My Jobs
            </Text>

            <Text
              style={
                styles.sectionSubtitle
              }
            >
              Your current jobs
            </Text>
          </View>
        </View>

        {loading ? (
          <View
            style={
              styles.loading
            }
          >
            <ActivityIndicator
              size="large"
            />

            <Text
              style={
                styles.loadingText
              }
            >
              Loading jobs...
            </Text>
          </View>
        ) : bookings.length === 0 ? (
          <View
            style={
              styles.empty
            }
          >
            <Text
              style={
                styles.emptyTitle
              }
            >
              No active jobs
            </Text>

            <Text
              style={
                styles.emptyText
              }
            >
              Paid jobs assigned to you
              will appear here.
            </Text>
          </View>
        ) : (
          bookings.map(
            booking => {
              const startOtp =
                getOtpValue(
                  booking.id,
                  'start'
                )

              const endOtp =
                getOtpValue(
                  booking.id,
                  'end'
                )

              const verifying =
                verifyingOtp[
                  booking.id
                ]

              return (
                <View
                  key={
                    booking.id
                  }
                  style={
                    styles.card
                  }
                >
                  {/* CARD HEADER */}

                  <View
                    style={
                      styles.cardHeader
                    }
                  >
                    <View>
                      <Text
                        style={
                          styles.service
                        }
                      >
                        Service booking
                      </Text>

                      <Text
                        style={
                          styles.bookingId
                        }
                      >
                        #
                        {booking.id.slice(
                          0,
                          8
                        )}
                      </Text>
                    </View>

                    <View
                      style={
                        styles.status
                      }
                    >
                      <Text
                        style={
                          styles.statusText
                        }
                      >
                        {booking.status.replace(
                          '_',
                          ' '
                        )}
                      </Text>
                    </View>
                  </View>

                  {/* DURATION */}

                  <View
                    style={
                      styles.row
                    }
                  >
                    <Text
                      style={
                        styles.label
                      }
                    >
                      Duration
                    </Text>

                    <Text
                      style={
                        styles.value
                      }
                    >
                      {
                        booking.duration_value
                      }{' '}
                      {
                        booking.duration_unit
                      }
                    </Text>
                  </View>

                  {/* AMOUNT */}

                  <View
                    style={
                      styles.row
                    }
                  >
                    <Text
                      style={
                        styles.label
                      }
                    >
                      Amount
                    </Text>

                    <Text
                      style={
                        styles.value
                      }
                    >
                      ₹
                      {Number(
                        booking.total_amount
                      ).toLocaleString(
                        'en-IN'
                      )}
                    </Text>
                  </View>

                  {/* SCHEDULE */}

                  <View
                    style={
                      styles.row
                    }
                  >
                    <Text
                      style={
                        styles.label
                      }
                    >
                      Scheduled
                    </Text>

                    <Text
                      style={
                        styles.value
                      }
                    >
                      {new Date(
                        booking.scheduled_start
                      ).toLocaleString()}
                    </Text>
                  </View>

                  {/* LOCATION */}

                  {booking.status ===
                    'on_the_way' &&
                    location && (
                      <View
                        style={
                          styles.locationBadge
                        }
                      >
                        <View
                          style={
                            styles.locationDot
                          }
                        />

                        <Text
                          style={
                            styles.locationText
                          }
                        >
                          Location sharing active
                        </Text>
                      </View>
                    )}

                  {/* PAID */}

                  {booking.status ===
                    'paid' && (
                    <TouchableOpacity
                      style={
                        styles.primaryButton
                      }
                      onPress={() =>
                        updateStatus(
                          booking.id,
                          'assigned'
                        )
                      }
                    >
                      <Text
                        style={
                          styles.primaryText
                        }
                      >
                        Accept Job
                      </Text>
                    </TouchableOpacity>
                  )}

                  {/* ASSIGNED */}

                  {booking.status ===
                    'assigned' && (
                    <TouchableOpacity
                      style={
                        styles.primaryButton
                      }
                      onPress={() =>
                        updateStatus(
                          booking.id,
                          'on_the_way'
                        )
                      }
                    >
                      <Text
                        style={
                          styles.primaryText
                        }
                      >
                        Start Journey
                      </Text>
                    </TouchableOpacity>
                  )}

                  {/* ON THE WAY */}

                  {booking.status ===
                    'on_the_way' && (
                    <TouchableOpacity
                      style={
                        styles.primaryButton
                      }
                      onPress={() =>
                        updateStatus(
                          booking.id,
                          'arrived'
                        )
                      }
                    >
                      <Text
                        style={
                          styles.primaryText
                        }
                      >
                        I've Arrived
                      </Text>
                    </TouchableOpacity>
                  )}

                  {/* ARRIVED / START OTP */}

                  {booking.status ===
                    'arrived' && (
                    <View
                      style={
                        styles.otpSection
                      }
                    >
                      <Text
                        style={
                          styles.otpTitle
                        }
                      >
                        Start Job
                      </Text>

                      <Text
                        style={
                          styles.otpDescription
                        }
                      >
                        Ask the customer for
                        the 6-digit Start OTP.
                      </Text>

                      <TextInput
                        style={
                          styles.otpInput
                        }
                        placeholder="Enter Start OTP"
                        placeholderTextColor="#9CA3AF"
                        keyboardType="number-pad"
                        maxLength={6}
                        value={
                          startOtp
                        }
                        onChangeText={value =>
                          setOtpValue(
                            booking.id,
                            'start',
                            value
                          )
                        }
                      />

                      <TouchableOpacity
                        style={[
                          styles.primaryButton,
                          startOtp.length !==
                            6 ||
                          verifying ===
                            'start'
                            ? styles.disabledButton
                            : null,
                        ]}
                        onPress={() =>
                          verifyStartOtp(
                            booking.id
                          )
                        }
                        disabled={
                          startOtp.length !==
                            6 ||
                          verifying ===
                            'start'
                        }
                      >
                        {verifying ===
                        'start' ? (
                          <ActivityIndicator
                            color="white"
                          />
                        ) : (
                          <Text
                            style={
                              styles.primaryText
                            }
                          >
                            Verify & Start Job
                          </Text>
                        )}
                      </TouchableOpacity>

                      <Text
                        style={
                          styles.devOtp
                        }
                      >
                        Development OTP: 123456
                      </Text>
                    </View>
                  )}

                  {/* IN PROGRESS / END OTP */}

                  {booking.status ===
                    'in_progress' && (
                    <View
                      style={
                        styles.otpSection
                      }
                    >
                      <Text
                        style={
                          styles.otpTitle
                        }
                      >
                        End Job
                      </Text>

                      <Text
                        style={
                          styles.otpDescription
                        }
                      >
                        Ask the customer for
                        the 6-digit End OTP.
                      </Text>

                      <TextInput
                        style={
                          styles.otpInput
                        }
                        placeholder="Enter End OTP"
                        placeholderTextColor="#9CA3AF"
                        keyboardType="number-pad"
                        maxLength={6}
                        value={
                          endOtp
                        }
                        onChangeText={value =>
                          setOtpValue(
                            booking.id,
                            'end',
                            value
                          )
                        }
                      />

                      <TouchableOpacity
                        style={[
                          styles.primaryButton,
                          endOtp.length !==
                            6 ||
                          verifying ===
                            'end'
                            ? styles.disabledButton
                            : null,
                        ]}
                        onPress={() =>
                          verifyEndOtp(
                            booking.id
                          )
                        }
                        disabled={
                          endOtp.length !==
                            6 ||
                          verifying ===
                            'end'
                        }
                      >
                        {verifying ===
                        'end' ? (
                          <ActivityIndicator
                            color="white"
                          />
                        ) : (
                          <Text
                            style={
                              styles.primaryText
                            }
                          >
                            Verify & Complete Job
                          </Text>
                        )}
                      </TouchableOpacity>

                      <Text
                        style={
                          styles.devOtp
                        }
                      >
                        Development OTP: 123456
                      </Text>
                    </View>
                  )}
                </View>
              )
            }
          )
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

/*
 * =========================================================
 * STYLES
 * =========================================================
 */

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor:
        '#F6F8FA',
    },

    page: {
      padding: 22,
      paddingBottom: 55,
    },

    header: {
      flexDirection:
        'row',
      alignItems:
        'flex-start',
      justifyContent:
        'space-between',
      marginBottom: 22,
    },

    eyebrow: {
      color:
        '#F28C28',
      fontSize: 11,
      fontWeight:
        '900',
      letterSpacing: 1.5,
    },

    title: {
      color:
        '#0B1F33',
      fontSize: 30,
      fontWeight:
        '800',
      marginTop: 5,
      maxWidth: 280,
    },

    subtitle: {
      color:
        '#667085',
      fontSize: 14,
      marginTop: 5,
    },

    logout: {
      borderWidth: 1,
      borderColor:
        '#D9DEE5',
      backgroundColor:
        'white',
      borderRadius: 12,
      paddingHorizontal: 13,
      paddingVertical: 9,
      marginLeft: 10,
    },

    logoutText: {
      color:
        '#0B1F33',
      fontSize: 13,
      fontWeight:
        '700',
    },

    /*
     * EARNINGS
     */

    earningsCard: {
      backgroundColor:
        '#0B1F33',
      borderRadius: 22,
      padding: 21,
      marginBottom: 25,
    },

    earningsHeader: {
      flexDirection:
        'row',
      justifyContent:
        'space-between',
      alignItems:
        'center',
    },

    earningsEyebrow: {
      color:
        '#F28C28',
      fontSize: 10,
      fontWeight:
        '900',
      letterSpacing: 1.4,
    },

    earningsTitle: {
      color:
        'white',
      fontSize: 18,
      fontWeight:
        '800',
      marginTop: 4,
    },

    earningsIcon: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor:
        '#17324A',
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    earningsIconText: {
      color:
        '#F28C28',
      fontSize: 24,
      fontWeight:
        '900',
    },

    totalEarnings: {
      color:
        'white',
      fontSize: 36,
      fontWeight:
        '900',
      marginTop: 20,
      marginBottom: 18,
    },

    earningsStats: {
      flexDirection:
        'row',
      alignItems:
        'center',
      borderTopWidth: 1,
      borderTopColor:
        '#294258',
      paddingTop: 16,
    },

    earningStat: {
      flex: 1,
    },

    statValue: {
      color:
        'white',
      fontSize: 16,
      fontWeight:
        '800',
    },

    statLabel: {
      color:
        '#9EADBA',
      fontSize: 11,
      marginTop: 3,
    },

    statDivider: {
      width: 1,
      height: 35,
      backgroundColor:
        '#294258',
      marginHorizontal: 15,
    },

    earningsLoading: {
      paddingVertical: 25,
      alignItems:
        'center',
    },

    earningsLoadingText: {
      color:
        '#AAB7C3',
      marginTop: 8,
      fontSize: 12,
    },

    /*
     * SECTIONS
     */

    sectionHeader: {
      marginBottom: 12,
    },

    sectionHeaderJobs: {
      marginTop: 28,
      marginBottom: 12,
    },

    sectionTitle: {
      color:
        '#0B1F33',
      fontSize: 21,
      fontWeight:
        '800',
    },

    sectionSubtitle: {
      color:
        '#667085',
      fontSize: 13,
      marginTop: 4,
    },

    /*
     * EARNING LIST
     */

    earningRow: {
      backgroundColor:
        'white',
      borderRadius: 18,
      padding: 15,
      marginBottom: 10,
      borderWidth: 1,
      borderColor:
        '#E3E7EB',
      flexDirection:
        'row',
      alignItems:
        'center',
      justifyContent:
        'space-between',
    },

    earningLeft: {
      flexDirection:
        'row',
      alignItems:
        'center',
      flex: 1,
    },

    earningCircle: {
      width: 43,
      height: 43,
      borderRadius: 14,
      backgroundColor:
        '#FFF1DF',
      alignItems:
        'center',
      justifyContent:
        'center',
      marginRight: 12,
    },

    earningCircleText: {
      color:
        '#F28C28',
      fontSize: 19,
      fontWeight:
        '900',
    },

    earningInfo: {
      flex: 1,
    },

    earningJob: {
      color:
        '#0B1F33',
      fontSize: 14,
      fontWeight:
        '800',
    },

    earningBooking: {
      color:
        '#667085',
      fontSize: 11,
      marginTop: 2,
    },

    earningDate: {
      color:
        '#9CA3AF',
      fontSize: 10,
      marginTop: 3,
    },

    earningAmountContainer: {
      alignItems:
        'flex-end',
      marginLeft: 10,
    },

    earningAmount: {
      color:
        '#16803A',
      fontSize: 15,
      fontWeight:
        '900',
    },

    earningNet: {
      color:
        '#9CA3AF',
      fontSize: 9,
      marginTop: 3,
    },

    emptyEarnings: {
      backgroundColor:
        'white',
      borderRadius: 18,
      padding: 20,
      alignItems:
        'center',
      borderWidth: 1,
      borderColor:
        '#E3E7EB',
    },

    emptyEarningsTitle: {
      color:
        '#0B1F33',
      fontSize: 16,
      fontWeight:
        '800',
    },

    emptyEarningsText: {
      color:
        '#667085',
      fontSize: 12,
      textAlign:
        'center',
      lineHeight: 18,
      marginTop: 6,
    },

    /*
     * JOBS
     */

    loading: {
      alignItems:
        'center',
      paddingTop: 60,
    },

    loadingSmall: {
      backgroundColor:
        'white',
      borderRadius: 18,
      padding: 20,
      alignItems:
        'center',
    },

    loadingText: {
      color:
        '#667085',
      marginTop: 10,
    },

    empty: {
      backgroundColor:
        'white',
      borderRadius: 18,
      padding: 25,
      alignItems:
        'center',
    },

    emptyTitle: {
      color:
        '#0B1F33',
      fontSize: 19,
      fontWeight:
        '800',
    },

    emptyText: {
      color:
        '#667085',
      textAlign:
        'center',
      marginTop: 8,
      lineHeight: 20,
    },

    card: {
      backgroundColor:
        'white',
      borderRadius: 20,
      padding: 18,
      borderWidth: 1,
      borderColor:
        '#D9DEE5',
      marginBottom: 16,
    },

    cardHeader: {
      flexDirection:
        'row',
      alignItems:
        'flex-start',
      justifyContent:
        'space-between',
      marginBottom: 18,
    },

    service: {
      color:
        '#0B1F33',
      fontSize: 17,
      fontWeight:
        '800',
    },

    bookingId: {
      color:
        '#667085',
      fontSize: 12,
      marginTop: 4,
    },

    status: {
      backgroundColor:
        '#FFF1DF',
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 7,
    },

    statusText: {
      color:
        '#B85F00',
      fontSize: 11,
      fontWeight:
        '800',
      textTransform:
        'capitalize',
    },

    row: {
      flexDirection:
        'row',
      justifyContent:
        'space-between',
      gap: 15,
      marginBottom: 12,
    },

    label: {
      color:
        '#667085',
      fontSize: 13,
    },

    value: {
      flex: 1,
      color:
        '#0B1F33',
      fontSize: 13,
      fontWeight:
        '700',
      textAlign:
        'right',
    },

    /*
     * LOCATION
     */

    locationBadge: {
      flexDirection:
        'row',
      alignItems:
        'center',
      backgroundColor:
        '#ECFDF3',
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 8,
      marginBottom: 10,
    },

    locationDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor:
        '#16A34A',
      marginRight: 7,
    },

    locationText: {
      color:
        '#15803D',
      fontSize: 11,
      fontWeight:
        '700',
    },

    /*
     * BUTTONS
     */

    primaryButton: {
      height: 52,
      borderRadius: 14,
      backgroundColor:
        '#F28C28',
      alignItems:
        'center',
      justifyContent:
        'center',
      marginTop: 8,
    },

    disabledButton: {
      opacity: 0.5,
    },

    primaryText: {
      color:
        'white',
      fontSize: 15,
      fontWeight:
        '800',
    },

    /*
     * OTP
     */

    otpSection: {
      marginTop: 8,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor:
        '#E5E7EB',
    },

    otpTitle: {
      color:
        '#0B1F33',
      fontSize: 17,
      fontWeight:
        '800',
      marginBottom: 5,
    },

    otpDescription: {
      color:
        '#667085',
      fontSize: 13,
      lineHeight: 19,
      marginBottom: 12,
    },

    otpInput: {
      height: 54,
      backgroundColor:
        '#F9FAFB',
      borderWidth: 1,
      borderColor:
        '#D9DEE5',
      borderRadius: 14,
      paddingHorizontal: 16,
      fontSize: 20,
      letterSpacing: 5,
      textAlign:
        'center',
      color:
        '#0B1F33',
      marginBottom: 10,
    },

    devOtp: {
      color:
        '#B85F00',
      fontSize: 12,
      fontWeight:
        '700',
      textAlign:
        'center',
      marginTop: 10,
    },

earningsButton: {
  marginHorizontal: 22,
  marginTop: 10,
  marginBottom: 4,
  backgroundColor: '#0b1f3a',
  borderRadius: 14,
  paddingVertical: 13,
  alignItems: 'center',
},

earningsButtonText: {
  color: 'white',
  fontSize: 14,
  fontWeight: '800',
},
  })
