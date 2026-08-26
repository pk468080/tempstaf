import { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Linking,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'

import { COLORS } from '../constants/theme'
import { RootStackParamList } from '../types'
import { useBooking } from '../context/BookingContext'
import { supabase } from '../lib/supabase'
import { createBookingOtp } from '../services/booking'
import Header from '../components/Header'
import PrimaryButton from '../components/PrimaryButton'

type Props = NativeStackScreenProps<
  RootStackParamList,
  'Tracking'
>

type BookingStatus =
  | 'pending_payment'
  | 'paid'
  | 'searching_worker'
  | 'assigned'
  | 'on_the_way'
  | 'arrived'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'expired'
  | 'payment_failed'

type WorkerLocation = {
  latitude: number
  longitude: number
  recorded_at: string
}

const STATUS_TEXT: Record<
  BookingStatus,
  string
> = {
  pending_payment: 'Waiting for payment',
  paid: 'Payment received',
  searching_worker: 'Finding your worker',
  assigned: 'Worker assigned',
  on_the_way: 'Worker is on the way',
  arrived: 'Worker has arrived',
  in_progress: 'Shift in progress',
  completed: 'Shift completed',
  cancelled: 'Booking cancelled',
  expired: 'Booking expired',
  payment_failed: 'Payment failed',
}

const STATUS_DESCRIPTION: Record<
  BookingStatus,
  string
> = {
  pending_payment:
    'Complete payment to confirm your booking.',
  paid:
    'Your booking is confirmed. The worker will be notified.',
  searching_worker:
    'We are finding an available worker for you.',
  assigned:
    'Your worker has accepted the booking.',
  on_the_way:
    'Your worker is travelling to your location.',
  arrived:
    'Your worker has arrived. Give them the Start OTP.',
  in_progress:
    'Your worker is currently working.',
  completed:
    'Your shift has been completed successfully.',
  cancelled:
    'This booking has been cancelled.',
  expired:
    'This booking has expired.',
  payment_failed:
    'The payment for this booking was unsuccessful.',
}

export default function TrackingScreen({
  navigation,
  route,
}: Props) {
  const {
    bookingId: contextBookingId,
    selectedWorker,
    selectedService,
    resetBooking,
  } = useBooking()

  /*
   * The Track Worker button passes bookingId
   * through navigation. Use that first.
   *
   * Context bookingId remains as a fallback
   * for the existing booking flow.
   */
  const activeBookingId =
    route.params?.bookingId ||
    contextBookingId

  const [status, setStatus] =
    useState<BookingStatus | null>(null)

  const [workerId, setWorkerId] =
    useState<string | null>(null)

  const [workerName, setWorkerName] =
    useState<string | null>(
      selectedWorker?.name || null
    )

  const [loading, setLoading] =
    useState(true)

  const [locationLoading, setLocationLoading] =
    useState(false)

  const [workerLocation, setWorkerLocation] =
    useState<WorkerLocation | null>(null)

  const [startOtp, setStartOtp] =
    useState<string | null>(null)

  const [endOtp, setEndOtp] =
    useState<string | null>(null)

  const [otpLoading, setOtpLoading] =
    useState(false)

  const loadWorkerLocation = useCallback(
    async (bookingId: string) => {
      try {
        setLocationLoading(true)

        const { data, error } =
          await supabase
            .from('worker_locations')
            .select(
              `
                latitude,
                longitude,
                recorded_at
              `
            )
            .eq('booking_id', bookingId)
            .order('recorded_at', {
              ascending: false,
            })
            .limit(1)
            .maybeSingle()

        if (error) {
          throw error
        }

        setWorkerLocation(
          data
            ? {
                latitude: Number(data.latitude),
                longitude: Number(data.longitude),
                recorded_at: data.recorded_at,
              }
            : null
        )
      } catch (error: any) {
        console.error(
          '[TempStaff] Failed to load worker location:',
          error
        )
      } finally {
        setLocationLoading(false)
      }
    },
    []
  )

  const loadBooking = useCallback(
    async () => {
      if (!activeBookingId) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)

        const { data, error } =
          await supabase
            .from('bookings')
            .select(
              `
                status,
                worker_id
              `
            )
            .eq('id', activeBookingId)
            .single()

        if (error) {
          throw error
        }

        setStatus(
          data.status as BookingStatus
        )

        setWorkerId(
          data.worker_id || null
        )

        if (data.worker_id) {
          const {
            data: profile,
          } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', data.worker_id)
            .maybeSingle()

          if (profile?.full_name) {
            setWorkerName(
              profile.full_name
            )
          }
        }

        await loadWorkerLocation(
          activeBookingId
        )
      } catch (error: any) {
        console.error(
          '[TempStaff] Failed to load booking:',
          error
        )

        Alert.alert(
          'Unable to load booking',
          error?.message ||
            'Please try again.'
        )
      } finally {
        setLoading(false)
      }
    },
    [
      activeBookingId,
      loadWorkerLocation,
    ]
  )

  useEffect(() => {
    loadBooking()

    if (!activeBookingId) {
      return
    }

    const bookingChannel =
      supabase
        .channel(
          `booking-status-${activeBookingId}`
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'bookings',
            filter: `id=eq.${activeBookingId}`,
          },
          payload => {
            const newStatus =
              payload.new.status as BookingStatus

            setStatus(newStatus)

            if (payload.new.worker_id) {
              setWorkerId(
                payload.new.worker_id
              )
            }
          }
        )
        .subscribe()

    const locationChannel =
      supabase
        .channel(
          `worker-location-${activeBookingId}`
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'worker_locations',
            filter: `booking_id=eq.${activeBookingId}`,
          },
          payload => {
            const location =
              payload.new

            setWorkerLocation({
              latitude:
                Number(location.latitude),
              longitude:
                Number(location.longitude),
              recorded_at:
                location.recorded_at,
            })
          }
        )
        .subscribe()

    return () => {
      supabase.removeChannel(
        bookingChannel
      )

      supabase.removeChannel(
        locationChannel
      )
    }
  }, [
    activeBookingId,
    loadBooking,
  ])

  const generateStartOtp =
    async () => {
      if (!activeBookingId) {
        return
      }

      try {
        setOtpLoading(true)

        const result =
          await createBookingOtp(
            activeBookingId,
            'start'
          )

        setStartOtp(result.otp)
      } catch (error: any) {
        console.error(
          '[TempStaff] Failed to generate Start OTP:',
          error
        )

        Alert.alert(
          'Unable to generate OTP',
          error?.message ||
            'Please try again.'
        )
      } finally {
        setOtpLoading(false)
      }
    }

  const generateEndOtp =
    async () => {
      if (!activeBookingId) {
        return
      }

      try {
        setOtpLoading(true)

        const result =
          await createBookingOtp(
            activeBookingId,
            'end'
          )

        setEndOtp(result.otp)
      } catch (error: any) {
        console.error(
          '[TempStaff] Failed to generate End OTP:',
          error
        )

        Alert.alert(
          'Unable to generate End OTP',
          error?.message ||
            'Please try again.'
        )
      } finally {
        setOtpLoading(false)
      }
    }

  const openWorkerLocation =
    async () => {
      if (!workerLocation) {
        return
      }

      const url =
        `https://www.google.com/maps/search/?api=1&query=` +
        `${workerLocation.latitude},${workerLocation.longitude}`

      try {
        await Linking.openURL(url)
      } catch (error) {
        Alert.alert(
          'Unable to open maps',
          'Please try again.'
        )
      }
    }

  const finish = () => {
    resetBooking()

    navigation.reset({
      index: 0,
      routes: [{ name: 'Home' }],
    })
  }

  if (loading) {
    return (
      <SafeAreaView
        style={styles.container}
      >
        <View style={styles.loading}>
          <ActivityIndicator
            size="large"
          />

          <Text
            style={styles.loadingText}
          >
            Loading booking status...
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  if (!activeBookingId) {
    return (
      <SafeAreaView
        style={styles.container}
      >
        <View style={styles.loading}>
          <Text style={styles.section}>
            No active booking
          </Text>

          <PrimaryButton
            title="Go Home"
            onPress={() =>
              navigation.reset({
                index: 0,
                routes: [
                  { name: 'Home' },
                ],
              })
            }
          />
        </View>
      </SafeAreaView>
    )
  }

  const currentStatus =
    status ?? 'pending_payment'

  return (
    <SafeAreaView
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={
          styles.page
        }
      >
        <Header
          onBack={() =>
            navigation.goBack()
          }
        />

        <Text style={styles.title}>
          Track your worker
        </Text>

        <Text style={styles.subtitle}>
          Your booking status and worker
          location update automatically.
        </Text>

        <View style={styles.map}>
          <Text style={styles.pin}>
            📍
          </Text>

          <Text
            style={styles.mapTitle}
          >
            {workerName ||
              'Your worker'}
          </Text>

          <Text
            style={styles.mapText}
          >
            Service:{' '}
            {selectedService ||
              'Staff service'}
          </Text>

          <Text
            style={styles.mapText}
          >
            Booking: #
            {activeBookingId.slice(
              0,
              8
            )}
          </Text>

          {workerId && (
            <Text
              style={styles.mapText}
            >
              Worker assigned
            </Text>
          )}
        </View>

        <View
          style={styles.locationCard}
        >
          <Text
            style={styles.locationTitle}
          >
            Live Worker Location
          </Text>

          {locationLoading ? (
            <View
              style={styles.locationLoading}
            >
              <ActivityIndicator />

              <Text
                style={
                  styles.locationText
                }
              >
                Loading worker location...
              </Text>
            </View>
          ) : workerLocation ? (
            <>
              <View
                style={
                  styles.locationStatus
                }
              >
                <View
                  style={
                    styles.locationDot
                  }
                />

                <Text
                  style={
                    styles.locationStatusText
                  }
                >
                  Location active
                </Text>
              </View>

              <Text
                style={
                  styles.coordinates
                }
              >
                {workerLocation.latitude.toFixed(
                  6
                )}
                {' , '}
                {workerLocation.longitude.toFixed(
                  6
                )}
              </Text>

              <Text
                style={
                  styles.locationText
                }
              >
                Last updated:{' '}
                {new Date(
                  workerLocation.recorded_at
                ).toLocaleTimeString(
                  'en-IN',
                  {
                    hour: 'numeric',
                    minute: '2-digit',
                    second: '2-digit',
                  }
                )}
              </Text>

              <PrimaryButton
                title="Open Worker Location in Maps"
                onPress={
                  openWorkerLocation
                }
              />
            </>
          ) : (
            <>
              <Text
                style={
                  styles.locationText
                }
              >
                Waiting for the worker's
                location.
              </Text>

              <Text
                style={
                  styles.locationHint
                }
              >
                The location will appear
                when the worker starts
                sharing their position.
              </Text>
            </>
          )}
        </View>

        <View
          style={styles.statusCard}
        >
          <View
            style={styles.statusDot}
          />

          <Text
            style={styles.statusTitle}
          >
            {
              STATUS_TEXT[
                currentStatus
              ]
            }
          </Text>

          <Text style={styles.text}>
            {
              STATUS_DESCRIPTION[
                currentStatus
              ]
            }
          </Text>
        </View>

        <View
          style={styles.timeline}
        >
          <TimelineItem
            label="Worker assigned"
            active={[
              'assigned',
              'on_the_way',
              'arrived',
              'in_progress',
              'completed',
            ].includes(
              currentStatus
            )}
          />

          <TimelineItem
            label="Worker on the way"
            active={[
              'on_the_way',
              'arrived',
              'in_progress',
              'completed',
            ].includes(
              currentStatus
            )}
          />

          <TimelineItem
            label="Worker arrived"
            active={[
              'arrived',
              'in_progress',
              'completed',
            ].includes(
              currentStatus
            )}
          />

          <TimelineItem
            label="Shift in progress"
            active={[
              'in_progress',
              'completed',
            ].includes(
              currentStatus
            )}
          />

          <TimelineItem
            label="Shift completed"
            active={
              currentStatus ===
              'completed'
            }
            last
          />
        </View>

        {currentStatus ===
          'arrived' && (
          <View
            style={styles.card}
          >
            <Text
              style={styles.section}
            >
              Worker has arrived
            </Text>

            <Text
              style={styles.text}
            >
              Generate the Start OTP
              and give it to your
              worker.
            </Text>

            {startOtp ? (
              <View
                style={
                  styles.otpBox
                }
              >
                <Text
                  style={
                    styles.otpLabel
                  }
                >
                  START OTP
                </Text>

                <Text
                  style={styles.otp}
                >
                  {startOtp}
                </Text>

                <Text
                  style={styles.text}
                >
                  Give this code to
                  the worker.
                </Text>
              </View>
            ) : (
              <PrimaryButton
                title={
                  otpLoading
                    ? 'Generating...'
                    : 'Generate Start OTP'
                }
                onPress={
                  generateStartOtp
                }
              />
            )}
          </View>
        )}

        {currentStatus ===
          'in_progress' && (
          <View
            style={styles.card}
          >
            <Text
              style={styles.section}
            >
              Shift in progress
            </Text>

            <Text
              style={styles.text}
            >
              Your worker is
              currently working.
            </Text>

            {endOtp ? (
              <View
                style={
                  styles.otpBox
                }
              >
                <Text
                  style={
                    styles.otpLabel
                  }
                >
                  END OTP
                </Text>

                <Text
                  style={styles.otp}
                >
                  {endOtp}
                </Text>

                <Text
                  style={styles.text}
                >
                  Give this code to the
                  worker when the shift
                  is finished.
                </Text>
              </View>
            ) : (
              <PrimaryButton
                title={
                  otpLoading
                    ? 'Generating...'
                    : 'Generate End OTP'
                }
                onPress={
                  generateEndOtp
                }
              />
            )}
          </View>
        )}

        {currentStatus ===
          'completed' && (
          <View
            style={styles.done}
          >
            <Text
              style={styles.check}
            >
              ✓
            </Text>

            <Text
              style={styles.doneTitle}
            >
              Shift completed
            </Text>

            <Text
              style={styles.text}
            >
              The worker has completed
              this booking.
            </Text>

            <PrimaryButton
              title="Finish & Go Home"
              onPress={finish}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

function TimelineItem({
  label,
  active,
  last = false,
}: {
  label: string
  active: boolean
  last?: boolean
}) {
  return (
    <View
      style={styles.timelineRow}
    >
      <View
        style={styles.timelineLeft}
      >
        <View
          style={[
            styles.timelineDot,
            active &&
              styles.timelineDotActive,
          ]}
        />

        {!last && (
          <View
            style={
              styles.timelineLine
            }
          />
        )}
      </View>

      <Text
        style={[
          styles.timelineText,
          active &&
            styles.timelineTextActive,
        ]}
      >
        {label}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.light,
  },

  page: {
    padding: 22,
    paddingBottom: 45,
  },

  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 22,
  },

  loadingText: {
    color: COLORS.gray,
    marginTop: 12,
  },

  title: {
    color: COLORS.navy,
    fontSize: 31,
    fontWeight: '800',
    marginBottom: 7,
  },

  subtitle: {
    color: COLORS.gray,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 22,
  },

  map: {
    width: '100%',
    minHeight: 220,
    borderRadius: 22,
    backgroundColor: '#DCEBF1',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    marginBottom: 18,
  },

  pin: {
    fontSize: 46,
    marginBottom: 8,
  },

  mapTitle: {
    color: COLORS.navy,
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 8,
  },

  mapText: {
    color: COLORS.gray,
    fontSize: 13,
    marginBottom: 3,
  },

  locationCard: {
    width: '100%',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 18,
  },

  locationTitle: {
    color: COLORS.navy,
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 12,
  },

  locationLoading: {
    alignItems: 'center',
    paddingVertical: 12,
  },

  locationStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },

  locationDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.teal,
    marginRight: 8,
  },

  locationStatusText: {
    color: COLORS.teal,
    fontSize: 13,
    fontWeight: '800',
  },

  coordinates: {
    color: COLORS.navy,
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 8,
  },

  locationText: {
    color: COLORS.gray,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },

  locationHint: {
    color: COLORS.gray,
    fontSize: 13,
    lineHeight: 19,
  },

  statusCard: {
    width: '100%',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 18,
  },

  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.teal,
    marginBottom: 10,
  },

  statusTitle: {
    color: COLORS.navy,
    fontSize: 21,
    fontWeight: '900',
    marginBottom: 7,
  },

  card: {
    width: '100%',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },

  section: {
    color: COLORS.navy,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 7,
  },

  text: {
    color: COLORS.gray,
    fontSize: 14,
    lineHeight: 20,
  },

  timeline: {
    width: '100%',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 18,
  },

  timelineRow: {
    flexDirection: 'row',
    minHeight: 55,
  },

  timelineLeft: {
    width: 28,
    alignItems: 'center',
  },

  timelineDot: {
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: '#D9DEE5',
    marginTop: 2,
  },

  timelineDotActive: {
    backgroundColor: COLORS.teal,
  },

  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#D9DEE5',
    marginVertical: 3,
  },

  timelineText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '600',
    paddingLeft: 8,
  },

  timelineTextActive: {
    color: COLORS.navy,
    fontWeight: '800',
  },

  done: {
    width: '100%',
    backgroundColor: '#ECFDF3',
    borderRadius: 20,
    padding: 22,
    alignItems: 'center',
  },

  check: {
    color: COLORS.green,
    fontSize: 42,
    fontWeight: '900',
  },

  doneTitle: {
    color: COLORS.navy,
    fontSize: 21,
    fontWeight: '900',
    marginVertical: 6,
  },

  otpBox: {
    marginTop: 18,
    padding: 20,
    borderRadius: 16,
    backgroundColor: '#F6F8FA',
    alignItems: 'center',
  },

  otpLabel: {
    color: COLORS.gray,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 8,
  },

  otp: {
    color: COLORS.navy,
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: 8,
    marginBottom: 8,
  },
})