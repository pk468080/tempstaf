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

const VERIFY_OTP_FUNCTION = 'verify-booking-otp'

type BookingStatus =
  | 'paid'
  | 'assigned'
  | 'on_the_way'
  | 'arrived'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'expired'
  | 'payment_failed'

type Booking = {
  id: string
  customer_id: string
  worker_id: string | null
  service_id: string
  address_id: string
  status: BookingStatus | string
  worker_accepted_at: string | null
  duration_value: number
  duration_unit: string
  scheduled_start: string
  scheduled_end: string
  total_amount: number | string
  created_at: string
}

type OtpValues = {
  start: string
  end: string
}

type WorkerBookingAction =
  | 'accept'
  | 'decline'
  | 'on_the_way'
  | 'arrived'
  | 'start'
  | 'complete'
  | 'cancel'

type WorkerDashboardProps = {
  onOpenEarnings: () => void
}

export default function WorkerDashboard({
  onOpenEarnings,
}: WorkerDashboardProps) {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [earnings, setEarnings] = useState<WorkerEarning[]>([])
  const [earningsLoading, setEarningsLoading] =
    useState(true)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] =
    useState(false)

  const [otpValues, setOtpValues] = useState<
    Record<string, OtpValues>
  >({})

  const [verifyingOtp, setVerifyingOtp] =
    useState<
      Record<
        string,
        'start' | 'end' | null
      >
    >({})

  const [updatingBooking, setUpdatingBooking] =
    useState<
      Record<
        string,
        WorkerBookingAction | null
      >
    >({})

  const [location, setLocation] =
    useState<Location.LocationObject | null>(
      null,
    )

  const locationSubscription =
    useRef<Location.LocationSubscription | null>(
      null,
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
          'Worker is not authenticated.',
        )
      }

      const { data, error } = await supabase
        .from('bookings')
        .select(
          `
            id,
            customer_id,
            worker_id,
            service_id,
            address_id,
            status,
            worker_accepted_at,
            duration_value,
            duration_unit,
            scheduled_start,
            scheduled_end,
            total_amount,
            created_at
          `,
        )
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

      setBookings(
        (data ?? []) as Booking[],
      )
    } catch (error: any) {
      console.error(
        '[TempStaff Worker] Failed to load bookings:',
        error,
      )

      Alert.alert(
        'Unable to load jobs',
        error?.message ||
          'Please try again.',
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
        error,
      )
    } finally {
      setEarningsLoading(false)
    }
  }, [])

  /*
   * ---------------------------------------------------------
   * LOAD DASHBOARD
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
   * LOCATION CLEANUP
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
    type: 'start' | 'end',
  ) => {
    return (
      otpValues[bookingId]?.[type] ?? ''
    )
  }

  const setOtpValue = (
    bookingId: string,
    type: 'start' | 'end',
    value: string,
  ) => {
    const cleanedValue = value
      .replace(/[^0-9]/g, '')
      .slice(0, 6)

    setOtpValues((current) => ({
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
    type: 'start' | 'end',
  ) => {
    setOtpValues((current) => ({
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
   * EDGE FUNCTION ERROR PARSER
   * ---------------------------------------------------------
   */

  const getFunctionErrorMessage =
    async (
      error: any,
    ): Promise<string> => {
      console.error(
        '[TempStaff Worker] Edge Function raw error:',
        error,
      )

      let message =
        error?.message ||
        'OTP verification failed.'

      try {
        const context = error?.context

        if (context) {
          const responseText =
            await context.text()

          console.error(
            '[TempStaff Worker] Edge Function response:',
            responseText,
          )

          if (responseText) {
            try {
              const responseJson =
                JSON.parse(responseText)

              if (responseJson?.error) {
                message = String(
                  responseJson.error,
                )
              } else if (
                responseJson?.message
              ) {
                message = String(
                  responseJson.message,
                )
              }

              if (responseJson?.details) {
                message +=
                  `\n\nDetails: ${String(
                    responseJson.details,
                  )}`
              }

              if (responseJson?.code) {
                message +=
                  `\nCode: ${String(
                    responseJson.code,
                  )}`
              }
            } catch {
              message = responseText
            }
          }
        }
      } catch (readError) {
        console.error(
          '[TempStaff Worker] Could not read Edge Function response:',
          readError,
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
    newLocation: Location.LocationObject,
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
          error,
        )
      }
    } catch (error) {
      console.error(
        '[TempStaff Worker] Location save error:',
        error,
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
  }

  /*
   * ---------------------------------------------------------
   * START LOCATION TRACKING
   * ---------------------------------------------------------
   */

  const startLocationTracking = async (
    bookingId: string,
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
          'Please allow location access so customers can track you.',
        )

        return
      }

      const currentLocation =
        await Location.getCurrentPositionAsync(
          {
            accuracy:
              Location.Accuracy.High,
          },
        )

      setLocation(currentLocation)

      await saveLocation(
        bookingId,
        currentLocation,
      )

      locationSubscription.current =
        await Location.watchPositionAsync(
          {
            accuracy:
              Location.Accuracy.High,
            timeInterval: 5000,
            distanceInterval: 10,
          },
          async (newLocation) => {
            setLocation(newLocation)

            await saveLocation(
              bookingId,
              newLocation,
            )
          },
        )
    } catch (error) {
      console.error(
        '[TempStaff Worker] Failed to start location tracking:',
        error,
      )
    }
  }

  /*
   * ---------------------------------------------------------
   * CENTRAL WORKER BOOKING ACTION
   *
   * IMPORTANT:
   * No direct booking.status updates happen here.
   * Every worker transition goes through:
   *
   * worker_booking_action()
   * ---------------------------------------------------------
   */

  const performBookingAction =
    async (
      bookingId: string,
      action: WorkerBookingAction,
    ) => {
      if (updatingBooking[bookingId]) {
        return
      }

      try {
        setUpdatingBooking((current) => ({
          ...current,
          [bookingId]: action,
        }))

        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          throw new Error(
            'Worker is not authenticated.',
          )
        }

        const { data, error } =
          await supabase.rpc(
            'worker_booking_action',
            {
              p_booking_id: bookingId,
              p_action: action,
            },
          )

        if (error) {
          throw error
        }

        if (!data?.success) {
          throw new Error(
            data?.error ||
              'Booking action was rejected.',
          )
        }

        /*
         * ACCEPT
         *
         * Accept does not move the booking
         * from assigned to another status.
         *
         * It records worker_accepted_at.
         */

        if (action === 'accept') {
          setBookings((current) =>
            current.map((booking) =>
              booking.id === bookingId
                ? {
                    ...booking,
                    worker_accepted_at:
                      data.worker_accepted_at ??
                      new Date().toISOString(),
                  }
                : booking,
            ),
          )

          Alert.alert(
            'Booking accepted',
            'You can now start travelling to the customer.',
          )

          return
        }

        /*
         * DECLINE
         */

        if (action === 'decline') {
          Alert.alert(
            'Booking declined',
            'The booking has been returned for worker assignment.',
          )

          await loadDashboard()

          return
        }

        /*
         * START LOCATION TRACKING
         * only after successful on_the_way.
         */

        if (action === 'on_the_way') {
          await startLocationTracking(
            bookingId,
          )
        }

        /*
         * STOP LOCATION TRACKING
         */

        if (
          action === 'complete' ||
          action === 'cancel'
        ) {
          stopLocationTracking()
          setLocation(null)
        }

        await loadDashboard()

        if (action === 'on_the_way') {
          Alert.alert(
            'You are on the way',
            'Your location is now being shared with the customer.',
          )
        }

        if (action === 'arrived') {
          Alert.alert(
            'Marked as arrived',
            'Ask the customer for the Start OTP.',
          )
        }

        if (action === 'cancel') {
          Alert.alert(
            'Booking cancelled',
            'The booking has been cancelled.',
          )
        }
      } catch (error: any) {
        console.error(
          '[TempStaff Worker] Booking action failed:',
          error,
        )

        Alert.alert(
          'Unable to update booking',
          error?.message ||
            'The booking may have changed. Refresh and try again.',
        )

        await loadBookings()
      } finally {
        setUpdatingBooking(
          (current) => ({
            ...current,
            [bookingId]: null,
          }),
        )
      }
    }

  /*
   * ---------------------------------------------------------
   * ACCEPT CONFIRMATION
   * ---------------------------------------------------------
   */

  const confirmAccept = (
    bookingId: string,
  ) => {
    Alert.alert(
      'Accept booking',
      'Are you sure you want to accept this booking?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Accept',
          onPress: () =>
            performBookingAction(
              bookingId,
              'accept',
            ),
        },
      ],
    )
  }

  /*
   * ---------------------------------------------------------
   * DECLINE CONFIRMATION
   * ---------------------------------------------------------
   */

  const confirmDecline = (
    bookingId: string,
  ) => {
    Alert.alert(
      'Decline booking',
      'Are you sure you want to decline this booking?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: () =>
            performBookingAction(
              bookingId,
              'decline',
            ),
        },
      ],
    )
  }

  /*
   * ---------------------------------------------------------
   * ON THE WAY CONFIRMATION
   * ---------------------------------------------------------
   */

  const confirmOnTheWay = (
    bookingId: string,
  ) => {
    Alert.alert(
      'Start travelling',
      'Mark this booking as On the Way?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'On the Way',
          onPress: () =>
            performBookingAction(
              bookingId,
              'on_the_way',
            ),
        },
      ],
    )
  }

  /*
   * ---------------------------------------------------------
   * START OTP
   * ---------------------------------------------------------
   */

  const verifyStartOtp = async (
    bookingId: string,
  ) => {
    const otp = getOtpValue(
      bookingId,
      'start',
    )

    if (!otp || otp.length !== 6) {
      Alert.alert(
        'Invalid OTP',
        'Please enter the 6-digit Start OTP.',
      )

      return
    }

    setVerifyingOtp((current) => ({
      ...current,
      [bookingId]: 'start',
    }))

    try {
      const { data, error } =
        await supabase.functions.invoke(
          VERIFY_OTP_FUNCTION,
          {
            body: {
              bookingId,
              otp,
              otpType: 'start',
            },
          },
        )

      if (error) {
        const message =
          await getFunctionErrorMessage(
            error,
          )

        throw new Error(message)
      }

      if (!data?.success) {
        throw new Error(
          data?.error ||
            'OTP verification failed.',
        )
      }

      clearOtpValue(
        bookingId,
        'start',
      )

      await loadDashboard()

      Alert.alert(
        'Job started',
        'Start OTP verified successfully.',
      )
    } catch (error: any) {
      console.error(
        '[TempStaff Worker] Start OTP verification failed:',
        error,
      )

      Alert.alert(
        'Invalid OTP',
        error?.message ||
          'Unable to verify Start OTP.',
      )
    } finally {
      setVerifyingOtp((current) => ({
        ...current,
        [bookingId]: null,
      }))
    }
  }

  /*
   * ---------------------------------------------------------
   * END OTP
   * ---------------------------------------------------------
   */

  const verifyEndOtp = async (
    bookingId: string,
  ) => {
    const otp = getOtpValue(
      bookingId,
      'end',
    )

    if (!otp || otp.length !== 6) {
      Alert.alert(
        'Invalid OTP',
        'Please enter the 6-digit End OTP.',
      )

      return
    }

    setVerifyingOtp((current) => ({
      ...current,
      [bookingId]: 'end',
    }))

    try {
      const { data, error } =
        await supabase.functions.invoke(
          VERIFY_OTP_FUNCTION,
          {
            body: {
              bookingId,
              otp,
              otpType: 'end',
            },
          },
        )

      if (error) {
        const message =
          await getFunctionErrorMessage(
            error,
          )

        throw new Error(message)
      }

      if (!data?.success) {
        throw new Error(
          data?.error ||
            'OTP verification failed.',
        )
      }

      clearOtpValue(
        bookingId,
        'end',
      )

      stopLocationTracking()
      setLocation(null)

      await loadDashboard()

      Alert.alert(
        'Job completed',
        'End OTP verified successfully.',
      )
    } catch (error: any) {
      console.error(
        '[TempStaff Worker] End OTP verification failed:',
        error,
      )

      Alert.alert(
        'Invalid OTP',
        error?.message ||
          'Unable to verify End OTP.',
      )
    } finally {
      setVerifyingOtp((current) => ({
        ...current,
        [bookingId]: null,
      }))
    }
  }

  /*
   * ---------------------------------------------------------
   * REFRESH
   * ---------------------------------------------------------
   */

  const refresh = async () => {
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

  const logout = async () => {
    stopLocationTracking()
    setLocation(null)

    const { error } =
      await supabase.auth.signOut()

    if (error) {
      Alert.alert(
        'Logout failed',
        error.message,
      )
    }
  }

  /*
   * ---------------------------------------------------------
   * EARNINGS
   * ---------------------------------------------------------
   */

  const totalEarnings =
    earnings.reduce(
      (total, earning) =>
        total +
        Number(earning.net_amount),
      0,
    )

  /*
   * ---------------------------------------------------------
   * FORMATTERS
   * ---------------------------------------------------------
   */

  const formatStatus = (
    status: string,
  ) => {
    return status
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (letter) =>
        letter.toUpperCase(),
      )
  }

  const formatAmount = (
    amount: number | string,
  ) => {
    return `₹${Number(
      amount || 0,
    ).toLocaleString('en-IN', {
      maximumFractionDigits: 2,
    })}`
  }

  const formatDate = (
    date: string | null | undefined,
  ) => {
    if (!date) {
      return 'Date not available'
    }

    const parsed = new Date(date)

    if (
      Number.isNaN(
        parsed.getTime(),
      )
    ) {
      return 'Date not available'
    }

    return parsed.toLocaleString(
      'en-IN',
      {
        dateStyle: 'medium',
        timeStyle: 'short',
      },
    )
  }

  /*
   * ---------------------------------------------------------
   * STATUS COLORS
   * ---------------------------------------------------------
   */

  const getStatusStyle = (
    status: string,
  ) => {
    switch (status) {
      case 'assigned':
        return styles.assignedBadge

      case 'on_the_way':
        return styles.onTheWayBadge

      case 'arrived':
        return styles.arrivedBadge

      case 'in_progress':
        return styles.inProgressBadge

      case 'completed':
        return styles.completedBadge

      case 'cancelled':
      case 'expired':
      case 'payment_failed':
        return styles.cancelledBadge

      default:
        return styles.pendingBadge
    }
  }

  /*
   * ---------------------------------------------------------
   * RENDER
   * ---------------------------------------------------------
   */

  return (
    <SafeAreaView
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={
          styles.page
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
          />
        }
      >
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>
              TEMPSTAFF WORKER
            </Text>

            <Text style={styles.title}>
              Worker Dashboard
            </Text>

            <Text style={styles.subtitle}>
              Manage your jobs and earnings
            </Text>
          </View>

          <TouchableOpacity
            style={styles.logout}
            onPress={logout}
          >
            <Text style={styles.logoutText}>
              Logout
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.earningsCard}
          onPress={onOpenEarnings}
          activeOpacity={0.85}
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
              <ActivityIndicator color="white" />

              <Text
                style={
                  styles.earningsLoadingText
                }
              >
                Loading earnings...
              </Text>
            </View>
          ) : (
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
                },
              )}
            </Text>
          )}

          <Text
            style={
              styles.earningsLink
            }
          >
            Tap to view earnings
          </Text>
        </TouchableOpacity>

        <View style={styles.sectionHeader}>
          <View>
            <Text
              style={
                styles.sectionEyebrow
              }
            >
              WORK
            </Text>

            <Text
              style={
                styles.sectionTitle
              }
            >
              Your Jobs
            </Text>
          </View>

          <Text
            style={
              styles.bookingCount
            }
          >
            {bookings.length}
          </Text>
        </View>

        {loading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator />

            <Text
              style={
                styles.loadingText
              }
            >
              Loading jobs...
            </Text>
          </View>
        ) : bookings.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text
              style={
                styles.emptyIcon
              }
            >
              📋
            </Text>

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
              New bookings assigned to you
              will appear here.
            </Text>
          </View>
        ) : (
          bookings.map((booking) => {
            const updating =
              updatingBooking[
                booking.id
              ]

            const startOtp =
              getOtpValue(
                booking.id,
                'start',
              )

            const endOtp =
              getOtpValue(
                booking.id,
                'end',
              )

            return (
              <View
                key={booking.id}
                style={
                  styles.bookingCard
                }
              >
                <View
                  style={
                    styles.cardHeader
                  }
                >
                  <View
                    style={
                      styles.cardHeaderLeft
                    }
                  >
                    <Text
                      style={
                        styles.service
                      }
                    >
                      Service Booking
                    </Text>

                    <Text
                      style={
                        styles.bookingId
                      }
                    >
                      #{booking.id.slice(
                        0,
                        8,
                      )}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.statusBadge,
                      getStatusStyle(
                        booking.status,
                      ),
                    ]}
                  >
                    <Text
                      style={
                        styles.statusText
                      }
                    >
                      {formatStatus(
                        booking.status,
                      )}
                    </Text>
                  </View>
                </View>

                {booking.status ===
                  'assigned' &&
                  !booking.worker_accepted_at && (
                    <View
                      style={
                        styles.offerNotice
                      }
                    >
                      <Text
                        style={
                          styles.offerTitle
                        }
                      >
                        New booking assigned
                      </Text>

                      <Text
                        style={
                          styles.offerText
                        }
                      >
                        Accept the booking
                        to confirm that
                        you will take this
                        job.
                      </Text>
                    </View>
                  )}

                {booking.status ===
                  'assigned' &&
                  booking.worker_accepted_at && (
                    <View
                      style={
                        styles.acceptedNotice
                      }
                    >
                      <Text
                        style={
                          styles.acceptedText
                        }
                      >
                        Booking accepted
                      </Text>
                    </View>
                  )}

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
                        Location sharing
                        active
                      </Text>
                    </View>
                  )}

                <View
                  style={styles.divider}
                />

                <View
                  style={styles.row}
                >
                  <Text
                    style={styles.label}
                  >
                    Scheduled
                  </Text>

                  <Text
                    style={styles.value}
                  >
                    {formatDate(
                      booking.scheduled_start,
                    )}
                  </Text>
                </View>

                <View
                  style={styles.row}
                >
                  <Text
                    style={styles.label}
                  >
                    Duration
                  </Text>

                  <Text
                    style={styles.value}
                  >
                    {booking.duration_value}{' '}
                    {booking.duration_unit}
                  </Text>
                </View>

                <View
                  style={styles.row}
                >
                  <Text
                    style={styles.label}
                  >
                    Amount
                  </Text>

                  <Text
                    style={styles.amount}
                  >
                    {formatAmount(
                      booking.total_amount,
                    )}
                  </Text>
                </View>

                <Text
                  style={styles.created}
                >
                  Booked on{' '}
                  {formatDate(
                    booking.created_at,
                  )}
                </Text>

                {booking.status ===
                  'assigned' &&
                  !booking.worker_accepted_at && (
                    <View
                      style={
                        styles.actionRow
                      }
                    >
                      <TouchableOpacity
                        style={
                          styles.declineButton
                        }
                        onPress={() =>
                          confirmDecline(
                            booking.id,
                          )
                        }
                        disabled={!!updating}
                      >
                        <Text
                          style={
                            styles.declineText
                          }
                        >
                          Decline
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={
                          styles.primaryButton
                        }
                        onPress={() =>
                          confirmAccept(
                            booking.id,
                          )
                        }
                        disabled={!!updating}
                      >
                        {updating ===
                        'accept' ? (
                          <ActivityIndicator
                            color="white"
                          />
                        ) : (
                          <Text
                            style={
                              styles.primaryText
                            }
                          >
                            Accept Booking
                          </Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}

                {booking.status ===
                  'assigned' &&
                  !!booking.worker_accepted_at && (
                    <TouchableOpacity
                      style={
                        styles.primaryButton
                      }
                      onPress={() =>
                        confirmOnTheWay(
                          booking.id,
                        )
                      }
                      disabled={!!updating}
                    >
                      {updating ===
                      'on_the_way' ? (
                        <ActivityIndicator
                          color="white"
                        />
                      ) : (
                        <Text
                          style={
                            styles.primaryText
                          }
                        >
                          On the Way
                        </Text>
                      )}
                    </TouchableOpacity>
                  )}

                {booking.status ===
                  'on_the_way' && (
                    <TouchableOpacity
                      style={
                        styles.primaryButton
                      }
                      onPress={() =>
                        performBookingAction(
                          booking.id,
                          'arrived',
                        )
                      }
                      disabled={!!updating}
                    >
                      {updating ===
                      'arrived' ? (
                        <ActivityIndicator
                          color="white"
                        />
                      ) : (
                        <Text
                          style={
                            styles.primaryText
                          }
                        >
                          Arrived
                        </Text>
                      )}
                    </TouchableOpacity>
                  )}

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
                        Ask the customer
                        for their
                        6-digit Start OTP.
                      </Text>

                      <TextInput
                        style={
                          styles.otpInput
                        }
                        placeholder="Enter Start OTP"
                        placeholderTextColor="#9CA3AF"
                        keyboardType="number-pad"
                        maxLength={6}
                        value={startOtp}
                        onChangeText={(
                          value,
                        ) =>
                          setOtpValue(
                            booking.id,
                            'start',
                            value,
                          )
                        }
                      />

                      <TouchableOpacity
                        style={[
                          styles.primaryButton,
                          startOtp.length !==
                            6 ||
                          verifyingOtp[
                            booking.id
                          ] ===
                            'start'
                            ? styles.disabledButton
                            : null,
                        ]}
                        onPress={() =>
                          verifyStartOtp(
                            booking.id,
                          )
                        }
                        disabled={
                          startOtp.length !==
                            6 ||
                          verifyingOtp[
                            booking.id
                          ] ===
                            'start'
                        }
                      >
                        {verifyingOtp[
                          booking.id
                        ] === 'start' ? (
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
                    </View>
                  )}

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
                        Complete Job
                      </Text>

                      <Text
                        style={
                          styles.otpDescription
                        }
                      >
                        Ask the customer
                        for their
                        6-digit End OTP.
                      </Text>

                      <TextInput
                        style={
                          styles.otpInput
                        }
                        placeholder="Enter End OTP"
                        placeholderTextColor="#9CA3AF"
                        keyboardType="number-pad"
                        maxLength={6}
                        value={endOtp}
                        onChangeText={(
                          value,
                        ) =>
                          setOtpValue(
                            booking.id,
                            'end',
                            value,
                          )
                        }
                      />

                      <TouchableOpacity
                        style={[
                          styles.primaryButton,
                          endOtp.length !==
                            6 ||
                          verifyingOtp[
                            booking.id
                          ] ===
                            'end'
                            ? styles.disabledButton
                            : null,
                        ]}
                        onPress={() =>
                          verifyEndOtp(
                            booking.id,
                          )
                        }
                        disabled={
                          endOtp.length !==
                            6 ||
                          verifyingOtp[
                            booking.id
                          ] ===
                            'end'
                        }
                      >
                        {verifyingOtp[
                          booking.id
                        ] === 'end' ? (
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
                    </View>
                  )}
              </View>
            )
          })
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F8FA',
  },

  page: {
    padding: 22,
    paddingBottom: 55,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 22,
  },

  headerText: {
    flex: 1,
    paddingRight: 12,
  },

  eyebrow: {
    color: '#F28C28',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
  },

  title: {
    color: '#0B1F33',
    fontSize: 30,
    fontWeight: '800',
    marginTop: 5,
  },

  subtitle: {
    color: '#667085',
    fontSize: 14,
    marginTop: 5,
  },

  logout: {
    borderWidth: 1,
    borderColor: '#D9DEE5',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },

  logoutText: {
    color: '#0B1F33',
    fontSize: 13,
    fontWeight: '700',
  },

  earningsCard: {
    backgroundColor: '#0B1F33',
    borderRadius: 22,
    padding: 21,
    marginBottom: 25,
  },

  earningsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  earningsEyebrow: {
    color: '#F28C28',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.4,
  },

  earningsTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 4,
  },

  earningsIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#17324A',
    alignItems: 'center',
    justifyContent: 'center',
  },

  earningsIconText: {
    color: '#F28C28',
    fontSize: 24,
    fontWeight: '900',
  },

  totalEarnings: {
    color: 'white',
    fontSize: 36,
    fontWeight: '900',
    marginTop: 20,
  },

  earningsLoading: {
    paddingVertical: 25,
    alignItems: 'center',
  },

  earningsLoadingText: {
    color: '#CBD5E1',
    marginTop: 10,
    fontSize: 13,
  },

  earningsLink: {
    color: '#CBD5E1',
    fontSize: 12,
    marginTop: 14,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },

  sectionEyebrow: {
    color: '#F28C28',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.4,
  },

  sectionTitle: {
    color: '#0B1F33',
    fontSize: 22,
    fontWeight: '800',
    marginTop: 3,
  },

  bookingCount: {
    backgroundColor: '#0B1F33',
    color: 'white',
    minWidth: 34,
    textAlign: 'center',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 13,
    fontWeight: '800',
  },

  loadingCard: {
    backgroundColor: 'white',
    borderRadius: 18,
    padding: 40,
    alignItems: 'center',
  },

  loadingText: {
    color: '#667085',
    marginTop: 12,
    fontSize: 14,
  },

  emptyCard: {
    backgroundColor: 'white',
    borderRadius: 18,
    padding: 30,
    alignItems: 'center',
  },

  emptyIcon: {
    fontSize: 40,
    marginBottom: 12,
  },

  emptyTitle: {
    color: '#0B1F33',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 7,
  },

  emptyText: {
    color: '#667085',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },

  bookingCard: {
    backgroundColor: 'white',
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 2,
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 18,
  },

  cardHeaderLeft: {
    flex: 1,
    paddingRight: 10,
  },

  service: {
    color: '#0B1F33',
    fontSize: 17,
    fontWeight: '800',
  },

  bookingId: {
    color: '#667085',
    fontSize: 12,
    marginTop: 4,
  },

  statusBadge: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },

  pendingBadge: {
    backgroundColor: '#FFF1DF',
  },

  assignedBadge: {
    backgroundColor: '#FFF1DF',
  },

  onTheWayBadge: {
    backgroundColor: '#EDE9FE',
  },

  arrivedBadge: {
    backgroundColor: '#DCFCE7',
  },

  inProgressBadge: {
    backgroundColor: '#FFEDD5',
  },

  completedBadge: {
    backgroundColor: '#DCFCE7',
  },

  cancelledBadge: {
    backgroundColor: '#E2E8F0',
  },

  statusText: {
    color: '#B85F00',
    fontSize: 11,
    fontWeight: '800',
  },

  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginBottom: 15,
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 15,
    marginBottom: 12,
  },

  label: {
    color: '#667085',
    fontSize: 13,
  },

  value: {
    flex: 1,
    color: '#0B1F33',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'right',
  },

  amount: {
    color: '#0F766E',
    fontSize: 14,
    fontWeight: '800',
  },

  created: {
    color: '#98A2B3',
    fontSize: 11,
    marginTop: 3,
    marginBottom: 15,
  },

  offerNotice: {
    backgroundColor: '#FFF7ED',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },

  offerTitle: {
    color: '#9A3412',
    fontSize: 13,
    fontWeight: '800',
  },

  offerText: {
    color: '#C2410C',
    fontSize: 12,
    marginTop: 4,
    lineHeight: 17,
  },

  acceptedNotice: {
    backgroundColor: '#ECFDF3',
    borderRadius: 12,
    padding: 10,
    marginBottom: 14,
  },

  acceptedText: {
    color: '#15803D',
    fontSize: 12,
    fontWeight: '800',
  },

  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF3',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 10,
  },

  locationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#16A34A',
    marginRight: 7,
  },

  locationText: {
    color: '#15803D',
    fontSize: 11,
    fontWeight: '700',
  },

  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },

  primaryButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: '#F28C28',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    paddingHorizontal: 12,
  },

  primaryText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },

  declineButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#FECACA',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    paddingHorizontal: 12,
  },

  declineText: {
    color: '#B91C1C',
    fontSize: 14,
    fontWeight: '800',
  },

  disabledButton: {
    opacity: 0.55,
  },

  otpSection: {
    marginTop: 14,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  otpTitle: {
    color: '#0B1F33',
    fontSize: 16,
    fontWeight: '800',
  },

  otpDescription: {
    color: '#667085',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 5,
    marginBottom: 12,
  },

  otpInput: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#D0D5DD',
    borderRadius: 12,
    minHeight: 50,
    paddingHorizontal: 14,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 4,
    color: '#0B1F33',
    textAlign: 'center',
  },
})