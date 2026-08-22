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

import { supabase } from '../lib/supabase'

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

export default function WorkerDashboard() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const [otpValues, setOtpValues] = useState<
    Record<string, OtpValues>
  >({})

  const [verifyingOtp, setVerifyingOtp] = useState<
    Record<string, 'start' | 'end' | null>
  >({})

  const [location, setLocation] =
    useState<Location.LocationObject | null>(null)

  const locationSubscription =
    useRef<Location.LocationSubscription | null>(null)

  /*
   * ---------------------------------------------------------
   * CLEANUP
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
    return otpValues[bookingId]?.[type] ?? ''
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
   *
   * Supabase functions.invoke() can return a generic
   * FunctionsHttpError when the Edge Function returns 400/500.
   *
   * This helper attempts to read the actual JSON response
   * from the Edge Function so we can see the real reason.
   */

  const getFunctionErrorMessage = async (
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
      const context = error?.context

      if (context) {
        /*
         * Response.body can only normally be consumed once.
         * Read it as text and then parse JSON ourselves.
         */

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
              message =
                String(
                  responseJson.error
                )
            } else if (
              responseJson?.message
            ) {
              message =
                String(
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
            /*
             * Response was not JSON.
             * Use the raw response text.
             */
            message = responseText
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

      const { error } = await supabase
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
   * START LOCATION TRACKING
   * ---------------------------------------------------------
   */

  const startLocationTracking = async (
    bookingId: string
  ) => {
    try {
      locationSubscription.current?.remove()
      locationSubscription.current = null

      const { status } =
        await Location.requestForegroundPermissionsAsync()

      if (status !== 'granted') {
        Alert.alert(
          'Location permission required',
          'Please allow location access so customers can track you.'
        )

        return
      }

      const currentLocation =
        await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        })

      setLocation(currentLocation)

      await saveLocation(
        bookingId,
        currentLocation
      )

      locationSubscription.current =
        await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 5000,
            distanceInterval: 10,
          },
          async newLocation => {
            setLocation(newLocation)

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

      Alert.alert(
        'Location error',
        'Unable to start location tracking.'
      )
    }
  }

  /*
   * ---------------------------------------------------------
   * STOP LOCATION TRACKING
   * ---------------------------------------------------------
   */

  const stopLocationTracking = () => {
    locationSubscription.current?.remove()
    locationSubscription.current = null
    setLocation(null)
  }

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

      const { data, error } =
        await supabase
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
   * Load bookings when screen opens.
   */

  useEffect(() => {
    loadBookings()
  }, [loadBookings])

  /*
   * ---------------------------------------------------------
   * REFRESH
   * ---------------------------------------------------------
   */

  const refresh = async () => {
    setRefreshing(true)
    await loadBookings()
  }

  /*
   * ---------------------------------------------------------
   * LOGOUT
   * ---------------------------------------------------------
   */

  const logout = async () => {
    stopLocationTracking()

    await supabase.auth.signOut()
  }

  /*
   * ---------------------------------------------------------
   * UPDATE BOOKING STATUS
   * ---------------------------------------------------------
   */

  const updateStatus = async (
    bookingId: string,
    status:
      | 'assigned'
      | 'on_the_way'
      | 'arrived'
  ) => {
    try {
      const { error } =
        await supabase.rpc(
          'update_worker_booking_status',
          {
            p_booking_id: bookingId,
            p_status: status,
          }
        )

      if (error) {
        throw error
      }

      await loadBookings()
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
   * VERIFY START OTP
   * ---------------------------------------------------------
   */

  const verifyStartOtp = async (
    bookingId: string
  ) => {
    const otp = getOtpValue(
      bookingId,
      'start'
    )

    if (!otp || otp.length !== 6) {
      Alert.alert(
        'Invalid OTP',
        'Please enter the 6-digit Start OTP.'
      )

      return
    }

    setVerifyingOtp(current => ({
      ...current,
      [bookingId]: 'start',
    }))

    try {
      console.log(
        '[TempStaff Worker] Verifying Start OTP:',
        {
          bookingId,
          otpType: 'start',
          otpLength: otp.length,
        }
      )

      const {
        data,
        error,
      } = await supabase.functions.invoke(
        VERIFY_OTP_FUNCTION,
        {
          body: {
            bookingId,
            otp,
            otpType: 'start',
          },
        }
      )

      /*
       * IMPORTANT:
       *
       * If the Edge Function returns 400,
       * read the actual response body.
       */

      if (error) {
        const realMessage =
          await getFunctionErrorMessage(
            error
          )

        throw new Error(
          realMessage
        )
      }

      console.log(
        '[TempStaff Worker] Start OTP response:',
        data
      )

      if (!data?.success) {
        throw new Error(
          data?.error ||
            'OTP verification failed.'
        )
      }

      clearOtpValue(
        bookingId,
        'start'
      )

      /*
       * Start worker location tracking
       * only after OTP verification succeeds.
       */

      await startLocationTracking(
        bookingId
      )

      await loadBookings()

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
        'Start OTP failed',
        error?.message ||
          'Unable to verify Start OTP.'
      )
    } finally {
      setVerifyingOtp(current => ({
        ...current,
        [bookingId]: null,
      }))
    }
  }

  /*
   * ---------------------------------------------------------
   * VERIFY END OTP
   * ---------------------------------------------------------
   */

  const verifyEndOtp = async (
    bookingId: string
  ) => {
    const otp = getOtpValue(
      bookingId,
      'end'
    )

    if (!otp || otp.length !== 6) {
      Alert.alert(
        'Invalid OTP',
        'Please enter the 6-digit End OTP.'
      )

      return
    }

    setVerifyingOtp(current => ({
      ...current,
      [bookingId]: 'end',
    }))

    try {
      console.log(
        '[TempStaff Worker] Verifying End OTP:',
        {
          bookingId,
          otpType: 'end',
          otpLength: otp.length,
        }
      )

      const {
        data,
        error,
      } = await supabase.functions.invoke(
        VERIFY_OTP_FUNCTION,
        {
          body: {
            bookingId,
            otp,
            otpType: 'end',
          },
        }
      )

      /*
       * IMPORTANT:
       *
       * Read the actual Edge Function response
       * when Supabase returns an HTTP error.
       */

      if (error) {
        const realMessage =
          await getFunctionErrorMessage(
            error
          )

        throw new Error(
          realMessage
        )
      }

      console.log(
        '[TempStaff Worker] End OTP response:',
        data
      )

      if (!data?.success) {
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
       * Stop location tracking after successful
       * End OTP verification.
       */

      stopLocationTracking()

      await loadBookings()

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
        'End OTP failed',
        error?.message ||
          'Unable to verify End OTP.'
      )
    } finally {
      setVerifyingOtp(current => ({
        ...current,
        [bookingId]: null,
      }))
    }
  }

  /*
   * ---------------------------------------------------------
   * FORMAT DATE
   * ---------------------------------------------------------
   */

  const formatDate = (
    value: string
  ) => {
    try {
      return new Date(
        value
      ).toLocaleString()
    } catch {
      return value
    }
  }

  /*
   * ---------------------------------------------------------
   * STATUS LABEL
   * ---------------------------------------------------------
   */

  const getStatusLabel = (
    status: string
  ) => {
    switch (status) {
      case 'pending_payment':
        return 'Pending Payment'

      case 'paid':
        return 'Paid'

      case 'assigned':
        return 'Assigned'

      case 'on_the_way':
        return 'On The Way'

      case 'arrived':
        return 'Arrived'

      case 'in_progress':
        return 'In Progress'

      case 'completed':
        return 'Completed'

      default:
        return status
    }
  }

  /*
   * ---------------------------------------------------------
   * RENDER BOOKING
   * ---------------------------------------------------------
   */

  const renderBooking = (
    booking: Booking
  ) => {
    const startOtp = getOtpValue(
      booking.id,
      'start'
    )

    const endOtp = getOtpValue(
      booking.id,
      'end'
    )

    const currentVerification =
      verifyingOtp[booking.id] ?? null

    const isVerifyingStart =
      currentVerification === 'start'

    const isVerifyingEnd =
      currentVerification === 'end'

    return (
      <View
        key={booking.id}
        style={styles.bookingCard}
      >
        <View style={styles.headerRow}>
          <Text style={styles.bookingTitle}>
            Job
          </Text>

          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>
              {getStatusLabel(
                booking.status
              )}
            </Text>
          </View>
        </View>

        <Text style={styles.bookingId}>
          Booking ID
        </Text>

        <Text
          style={styles.bookingIdValue}
          numberOfLines={1}
        >
          {booking.id}
        </Text>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>
            Date
          </Text>

          <Text style={styles.infoValue}>
            {formatDate(
              booking.scheduled_start
            )}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>
            Duration
          </Text>

          <Text style={styles.infoValue}>
            {booking.duration_value}{' '}
            {booking.duration_unit}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>
            Amount
          </Text>

          <Text style={styles.infoValue}>
            ₹
            {Number(
              booking.total_amount
            ).toLocaleString('en-IN')}
          </Text>
        </View>

        {booking.status === 'paid' && (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() =>
              updateStatus(
                booking.id,
                'assigned'
              )
            }
          >
            <Text
              style={
                styles.primaryButtonText
              }
            >
              Accept Job
            </Text>
          </TouchableOpacity>
        )}

        {booking.status === 'assigned' && (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() =>
              updateStatus(
                booking.id,
                'on_the_way'
              )
            }
          >
            <Text
              style={
                styles.primaryButtonText
              }
            >
              Start Travel
            </Text>
          </TouchableOpacity>
        )}

        {booking.status === 'on_the_way' && (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() =>
              updateStatus(
                booking.id,
                'arrived'
              )
            }
          >
            <Text
              style={
                styles.primaryButtonText
              }
            >
              I Have Arrived
            </Text>
          </TouchableOpacity>
        )}

        {booking.status === 'arrived' && (
          <View style={styles.otpSection}>
            <Text style={styles.otpTitle}>
              Start Job
            </Text>

            <Text
              style={
                styles.otpDescription
              }
            >
              Ask the customer for the
              6-digit Start OTP.
            </Text>

            <TextInput
              style={styles.otpInput}
              value={startOtp}
              onChangeText={value =>
                setOtpValue(
                  booking.id,
                  'start',
                  value
                )
              }
              placeholder="Enter Start OTP"
              placeholderTextColor="#999"
              keyboardType="number-pad"
              maxLength={6}
              editable={!isVerifyingStart}
            />

            <TouchableOpacity
              style={[
                styles.primaryButton,
                isVerifyingStart &&
                  styles.disabledButton,
              ]}
              disabled={isVerifyingStart}
              onPress={() =>
                verifyStartOtp(
                  booking.id
                )
              }
            >
              {isVerifyingStart ? (
                <ActivityIndicator
                  color="#fff"
                />
              ) : (
                <Text
                  style={
                    styles.primaryButtonText
                  }
                >
                  Verify Start OTP
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {booking.status ===
          'in_progress' && (
          <View style={styles.otpSection}>
            <Text style={styles.otpTitle}>
              Complete Job
            </Text>

            <Text
              style={
                styles.otpDescription
              }
            >
              Ask the customer for the
              6-digit End OTP.
            </Text>

            <TextInput
              style={styles.otpInput}
              value={endOtp}
              onChangeText={value =>
                setOtpValue(
                  booking.id,
                  'end',
                  value
                )
              }
              placeholder="Enter End OTP"
              placeholderTextColor="#999"
              keyboardType="number-pad"
              maxLength={6}
              editable={!isVerifyingEnd}
            />

            <TouchableOpacity
              style={[
                styles.primaryButton,
                isVerifyingEnd &&
                  styles.disabledButton,
              ]}
              disabled={isVerifyingEnd}
              onPress={() =>
                verifyEndOtp(
                  booking.id
                )
              }
            >
              {isVerifyingEnd ? (
                <ActivityIndicator
                  color="#fff"
                />
              ) : (
                <Text
                  style={
                    styles.primaryButtonText
                  }
                >
                  Verify End OTP
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    )
  }

  /*
   * ---------------------------------------------------------
   * LOADING SCREEN
   * ---------------------------------------------------------
   */

  if (loading) {
    return (
      <SafeAreaView
        style={styles.safeArea}
      >
        <View style={styles.center}>
          <ActivityIndicator
            size="large"
          />

          <Text
            style={styles.loadingText}
          >
            Loading jobs...
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  /*
   * ---------------------------------------------------------
   * DASHBOARD
   * ---------------------------------------------------------
   */

  return (
    <SafeAreaView
      style={styles.safeArea}
    >
      <ScrollView
        contentContainerStyle={
          styles.container
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
          />
        }
      >
        <View style={styles.topRow}>
          <View>
            <Text style={styles.title}>
              Worker Dashboard
            </Text>

            <Text
              style={styles.subtitle}
            >
              Your current jobs
            </Text>
          </View>

          <TouchableOpacity
            style={styles.logoutButton}
            onPress={logout}
          >
            <Text
              style={styles.logoutText}
            >
              Logout
            </Text>
          </TouchableOpacity>
        </View>

        {location && (
          <View
            style={styles.locationCard}
          >
            <Text
              style={styles.locationTitle}
            >
              Location Tracking Active
            </Text>

            <Text
              style={styles.locationText}
            >
              {location.coords.latitude.toFixed(
                6
              )}
              ,{' '}
              {location.coords.longitude.toFixed(
                6
              )}
            </Text>
          </View>
        )}

        {bookings.length === 0 ? (
          <View
            style={styles.emptyCard}
          >
            <Text
              style={styles.emptyTitle}
            >
              No active jobs
            </Text>

            <Text
              style={styles.emptyText}
            >
              Pull down to refresh.
            </Text>
          </View>
        ) : (
          bookings.map(renderBooking)
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

/*
 * ---------------------------------------------------------
 * STYLES
 * ---------------------------------------------------------
 */

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },

  container: {
    padding: 16,
    paddingBottom: 40,
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },

  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },

  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#222',
  },

  subtitle: {
    marginTop: 4,
    fontSize: 14,
    color: '#777',
  },

  logoutButton: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },

  logoutText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },

  bookingCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },

  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },

  bookingTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#222',
  },

  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#eee',
  },

  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },

  bookingId: {
    fontSize: 12,
    color: '#888',
    marginBottom: 3,
  },

  bookingIdValue: {
    fontSize: 12,
    color: '#555',
    marginBottom: 16,
  },

  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },

  infoLabel: {
    fontSize: 14,
    color: '#777',
  },

  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#222',
    maxWidth: '65%',
    textAlign: 'right',
  },

  primaryButton: {
    marginTop: 14,
    minHeight: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111',
  },

  primaryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },

  disabledButton: {
    opacity: 0.6,
  },

  otpSection: {
    marginTop: 18,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },

  otpTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#222',
    marginBottom: 6,
  },

  otpDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: '#666',
    marginBottom: 12,
  },

  otpInput: {
    height: 52,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    fontSize: 20,
    letterSpacing: 5,
    textAlign: 'center',
    color: '#222',
  },

  locationCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },

  locationTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 5,
  },

  locationText: {
    fontSize: 13,
    color: '#666',
  },

  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 30,
    alignItems: 'center',
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },

  emptyText: {
    fontSize: 14,
    color: '#777',
  },
})