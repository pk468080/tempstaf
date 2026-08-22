import { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
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

type Props = NativeStackScreenProps<RootStackParamList, 'Tracking'>

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

const STATUS_TEXT: Record<BookingStatus, string> = {
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

const STATUS_DESCRIPTION: Record<BookingStatus, string> = {
  pending_payment: 'Complete payment to confirm your booking.',
  paid: 'Your booking is confirmed. The worker will be notified.',
  searching_worker: 'We are finding an available worker for you.',
  assigned: 'Your worker has accepted the booking.',
  on_the_way: 'Your worker is travelling to your location.',
  arrived: 'Your worker has arrived. Give them the Start OTP.',
  in_progress: 'Your worker is currently working.',
  completed: 'Your shift has been completed successfully.',
  cancelled: 'This booking has been cancelled.',
  expired: 'This booking has expired.',
  payment_failed: 'The payment for this booking was unsuccessful.',
}

export default function TrackingScreen({ navigation }: Props) {
  const {
    bookingId,
    selectedWorker,
    selectedService,
    resetBooking,
  } = useBooking()

  const [status, setStatus] = useState<BookingStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [startOtp, setStartOtp] = useState<string | null>(null)
  const [endOtp, setEndOtp] = useState<string | null>(null)
  const [otpLoading, setOtpLoading] = useState(false)

  const loadBooking = useCallback(async () => {
    if (!bookingId) {
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('status')
        .eq('id', bookingId)
        .single()

      if (error) {
        throw error
      }

      setStatus(data.status as BookingStatus)
    } catch (error: any) {
      console.error(
        '[TempStaff] Failed to load booking status:',
        error
      )

      Alert.alert(
        'Unable to load booking',
        error?.message || 'Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }, [bookingId])

  useEffect(() => {
    loadBooking()

    if (!bookingId) {
      return
    }

    const channel = supabase
      .channel(`booking-status-${bookingId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bookings',
          filter: `id=eq.${bookingId}`,
        },
        payload => {
          const newStatus = payload.new.status as BookingStatus

          console.log(
            '[TempStaff] Booking status changed:',
            newStatus
          )

          setStatus(newStatus)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [bookingId, loadBooking])
const generateStartOtp = async () => {
  if (!bookingId) {
    return
  }

  try {
    setOtpLoading(true)

    const result = await createBookingOtp(
      bookingId,
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
      error?.message || 'Please try again.'
    )
  } finally {
    setOtpLoading(false)
  }
}

const generateEndOtp = async () => {
  if (!bookingId) {
    return
  }

  try {
    setOtpLoading(true)

    const result = await createBookingOtp(
      bookingId,
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
      error?.message || 'Please try again.'
    )
  } finally {
    setOtpLoading(false)
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
      <SafeAreaView style={styles.container}>
        <View style={styles.loading}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>
            Loading booking status...
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  if (!bookingId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loading}>
          <Text style={styles.section}>
            No active booking
          </Text>

          <PrimaryButton
            title="Go Home"
            onPress={() =>
              navigation.reset({
                index: 0,
                routes: [{ name: 'Home' }],
              })
            }
          />
        </View>
      </SafeAreaView>
    )
  }

  const currentStatus = status ?? 'pending_payment'

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.page}>
        <Header onBack={() => navigation.goBack()} />

        <Text style={styles.title}>
          Track your worker
        </Text>

        <Text style={styles.subtitle}>
          Your booking status updates automatically.
        </Text>

        <View style={styles.map}>
          <Text style={styles.pin}>📍</Text>

          <Text style={styles.mapTitle}>
            {selectedWorker?.name || 'Your worker'}
          </Text>

          <Text style={styles.mapText}>
            Service: {selectedService || 'Staff service'}
          </Text>

          <Text style={styles.mapText}>
            Booking: #{bookingId.slice(0, 8)}
          </Text>
        </View>

        <View style={styles.statusCard}>
          <View style={styles.statusDot} />

          <Text style={styles.statusTitle}>
            {STATUS_TEXT[currentStatus]}
          </Text>

          <Text style={styles.text}>
            {STATUS_DESCRIPTION[currentStatus]}
          </Text>
        </View>

        <View style={styles.timeline}>
          <TimelineItem
            label="Worker assigned"
            active={[
              'assigned',
              'on_the_way',
              'arrived',
              'in_progress',
              'completed',
            ].includes(currentStatus)}
          />

          <TimelineItem
            label="Worker on the way"
            active={[
              'on_the_way',
              'arrived',
              'in_progress',
              'completed',
            ].includes(currentStatus)}
          />

          <TimelineItem
            label="Worker arrived"
            active={[
              'arrived',
              'in_progress',
              'completed',
            ].includes(currentStatus)}
          />

          <TimelineItem
            label="Shift in progress"
            active={[
              'in_progress',
              'completed',
            ].includes(currentStatus)}
          />

          <TimelineItem
            label="Shift completed"
            active={currentStatus === 'completed'}
            last
          />
        </View>

        {currentStatus === 'arrived' && (
          <View style={styles.card}>
            <Text style={styles.section}>
              Worker has arrived
            </Text>

            <Text style={styles.text}>
              Generate the Start OTP and give it to your worker.
            </Text>

            {startOtp ? (
              <View style={styles.otpBox}>
                <Text style={styles.otpLabel}>
                  START OTP
                </Text>

                <Text style={styles.otp}>
                  {startOtp}
                </Text>

                <Text style={styles.text}>
                  Give this code to the worker.
                </Text>
              </View>
            ) : (
              <PrimaryButton
                title={
                  otpLoading
                    ? 'Generating...'
                    : 'Generate Start OTP'
                }
                onPress={generateStartOtp}
              />
            )}
          </View>
        )}

        {currentStatus === 'in_progress' && (
          <View style={styles.card}>
            <Text style={styles.section}>
              Shift in progress
            </Text>

            <Text style={styles.text}>
              Your worker is currently working.
            </Text>

            {endOtp ? (
              <View style={styles.otpBox}>
                <Text style={styles.otpLabel}>
                  END OTP
                </Text>

                <Text style={styles.otp}>
                  {endOtp}
                </Text>

                <Text style={styles.text}>
                  Give this code to the worker when the shift is finished.
                </Text>
              </View>
            ) : (
              <PrimaryButton
                title={
                  otpLoading
                    ? 'Generating...'
                    : 'Generate End OTP'
                }
                onPress={generateEndOtp}
              />
            )}
          </View>
        )}

        {currentStatus === 'completed' && (
          <View style={styles.done}>
            <Text style={styles.check}>✓</Text>

            <Text style={styles.doneTitle}>
              Shift completed
            </Text>

            <Text style={styles.text}>
              The worker has completed this booking.
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
    <View style={styles.timelineRow}>
      <View style={styles.timelineLeft}>
        <View
          style={[
            styles.timelineDot,
            active && styles.timelineDotActive,
          ]}
        />

        {!last && <View style={styles.timelineLine} />}
      </View>

      <Text
        style={[
          styles.timelineText,
          active && styles.timelineTextActive,
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