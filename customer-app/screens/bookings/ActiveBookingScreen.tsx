import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'

import {
  ScreenContainer,
} from '../../components/layout/ScreenContainer'

import {
  getCustomerBooking,
  getLatestWorkerLocation,
  requestBookingOtp,
  type BookingStatus,
  type CustomerBooking,
  type WorkerLocation,
} from '../../services/booking/bookingTracking.service'

import { supabase } from '../../lib/supabase'

type ActiveBookingScreenProps = {
  bookingId: string
}

function formatStatus(
  status: BookingStatus,
) {
  return status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, value =>
      value.toUpperCase(),
    )
}

function formatMoney(
  amount: number | null,
) {
  if (amount === null) {
    return '—'
  }

  return amount.toFixed(2)
}

function formatDateTime(
  value: string | null,
) {
  if (!value) {
    return 'Not set'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString()
}

function elapsedSince(
  startedAt: string,
  completedAt: string | null,
) {
  const end = completedAt
    ? Date.parse(completedAt)
    : Date.now()

  const seconds = Math.max(
    0,
    Math.floor(
      (end - Date.parse(startedAt)) /
        1000,
    ),
  )

  const hours = Math.floor(
    seconds / 3600,
  )

  const minutes = Math.floor(
    (seconds % 3600) / 60,
  )

  const remainder = seconds % 60

  return [
    hours,
    minutes,
    remainder,
  ]
    .map(value =>
      String(value).padStart(2, '0'),
    )
    .join(':')
}

function isTerminalStatus(
  status: BookingStatus,
) {
  return (
    status === 'completed' ||
    status === 'cancelled' ||
    status === 'expired'
  )
}

function getStateTitle(
  booking: CustomerBooking,
) {
  switch (booking.status) {
    case 'paid':
      return 'Payment confirmed'

    case 'searching_worker':
      return 'Finding your worker'

    case 'assigned':
      return 'Worker assigned'

    case 'on_the_way':
      return 'Worker is on the way'

    case 'arrived':
      return 'Worker has arrived'

    case 'in_progress':
      return 'Service in progress'

    case 'completed':
      return 'Booking completed'

    case 'cancelled':
      return 'Booking cancelled'

    case 'expired':
      return 'Booking expired'

    case 'payment_failed':
      return 'Payment failed'

    case 'pending_payment':
      return 'Payment pending'

    default:
      return formatStatus(
        booking.status,
      )
  }
}

function getStateMessage(
  booking: CustomerBooking,
) {
  switch (booking.status) {
    case 'paid':
      return 'Your payment was confirmed. We are completing worker assignment.'

    case 'searching_worker':
      return 'Your payment is confirmed. We are finding an eligible worker.'

    case 'assigned':
      return 'Your booking is confirmed and a worker has been assigned.'

    case 'on_the_way':
      return 'Your assigned worker is travelling to the booking location.'

    case 'arrived':
      return 'Your worker has arrived at the booking location.'

    case 'in_progress':
      return 'Your service is currently in progress.'

    case 'completed':
      return 'This booking has been completed.'

    case 'cancelled':
      return 'This booking has been cancelled.'

    case 'expired':
      return 'This booking has expired.'

    case 'payment_failed':
      return 'Payment was not completed for this booking.'

    case 'pending_payment':
      return 'Payment is required before this booking can be confirmed.'

    default:
      return 'Booking status updated.'
  }
}

export default function ActiveBookingScreen({
  bookingId,
}: ActiveBookingScreenProps) {
  const [
    booking,
    setBooking,
  ] = useState<CustomerBooking | null>(
    null,
  )

  const [
    location,
    setLocation,
  ] = useState<WorkerLocation | null>(
    null,
  )

  const [
    loading,
    setLoading,
  ] = useState(true)

  const [
    error,
    setError,
  ] = useState<string | null>(
    null,
  )

  const [
    otp,
    setOtp,
  ] = useState<string | null>(
    null,
  )

  const [
    timer,
    setTimer,
  ] = useState('00:00:00')

  async function refresh() {
    try {
      const nextBooking =
        await getCustomerBooking(
          bookingId,
        )

      setBooking(nextBooking)

      if (nextBooking.worker_id) {
        setLocation(
          await getLatestWorkerLocation(
            bookingId,
          ),
        )
      } else {
        setLocation(null)
      }

      setError(null)
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : 'Unable to load booking.',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()

    const interval =
      setInterval(
        () => void refresh(),
        15000,
      )

    const channel =
      supabase
        .channel(
          `customer-booking-${bookingId}`,
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'bookings',
            filter: `id=eq.${bookingId}`,
          },
          () => void refresh(),
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'worker_locations',
            filter: `booking_id=eq.${bookingId}`,
          },
          payload =>
            setLocation(
              payload.new as WorkerLocation,
            ),
        )
        .subscribe()

    return () => {
      clearInterval(interval)
      void supabase.removeChannel(
        channel,
      )
    }
  }, [bookingId])

  useEffect(() => {
    if (!booking?.started_at) {
      setTimer('00:00:00')
      return
    }

    const update = () => {
      setTimer(
        elapsedSince(
          booking.started_at!,
          booking.completed_at,
        ),
      )
    }

    update()

    const interval =
      setInterval(update, 1000)

    return () =>
      clearInterval(interval)
  }, [
    booking?.started_at,
    booking?.completed_at,
  ])

  async function showOtp(
    type: 'start' | 'end',
  ) {
    try {
      const result =
        await requestBookingOtp(
          bookingId,
          type,
        )

      setOtp(
        result.otp ??
          'OTP sent to your registered contact.',
      )

      setError(null)
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : 'Unable to generate the booking OTP.',
      )
    }
  }

  if (loading) {
    return (
      <ScreenContainer>
        <View
          style={styles.loading}
        >
          <ActivityIndicator />
          <Text
            style={styles.loadingText}
          >
            Loading booking...
          </Text>
        </View>
      </ScreenContainer>
    )
  }

  if (!booking) {
    return (
      <ScreenContainer>
        <View
          style={styles.container}
        >
          <Text
            style={styles.title}
          >
            Booking
          </Text>

          <Text
            style={styles.error}
          >
            {error ??
              'Booking could not be loaded.'}
          </Text>
        </View>
      </ScreenContainer>
    )
  }

  const workerAssigned =
    booking.worker_id !== null

  const terminal =
    isTerminalStatus(
      booking.status,
    )

  return (
    <ScreenContainer>
      <View
        style={styles.container}
      >
        <Text
          style={styles.title}
        >
          Booking confirmation
        </Text>

        <View
          style={[
            styles.stateCard,
            booking.status ===
              'searching_worker' &&
              styles.searchingCard,
          ]}
        >
          <Text
            style={styles.stateTitle}
          >
            {getStateTitle(
              booking,
            )}
          </Text>

          <Text
            style={styles.stateMessage}
          >
            {getStateMessage(
              booking,
            )}
          </Text>
        </View>

        {error ? (
          <Text
            style={styles.error}
          >
            {error}
          </Text>
        ) : null}

        <View
          style={styles.card}
        >
          <Text
            style={styles.sectionTitle}
          >
            Booking details
          </Text>

          <Row
            label="Service"
            value={
              booking.service_name ??
              'Service'
            }
          />

          <Row
            label="Status"
            value={formatStatus(
              booking.status,
            )}
          />

          <Row
            label="Booking ID"
            value={booking.id}
          />

          <Row
            label="Start"
            value={formatDateTime(
              booking.scheduled_start,
            )}
          />

          <Row
            label="End"
            value={formatDateTime(
              booking.scheduled_end,
            )}
          />

          <Row
            label="Working hours"
            value={
              booking.total_working_hours ===
              null
                ? '—'
                : String(
                    booking.total_working_hours,
                  )
            }
          />

          <Row
            label="Amount"
            value={formatMoney(
              booking.total_amount,
            )}
          />
        </View>

        {!terminal &&
        booking.status !==
          'pending_payment' &&
        booking.status !==
          'payment_failed' ? (
          <View
            style={styles.card}
          >
            <Text
              style={styles.sectionTitle}
            >
              Worker
            </Text>

            {workerAssigned ? (
              <>
                <Text
                  style={styles.worker}
                >
                  Worker assigned
                </Text>

                <Text
                  style={
                    styles.workerId
                  }
                >
                  Worker ID: {
                    booking.worker_id
                  }
                </Text>

                {location ? (
                  <Text
                    style={
                      styles.location
                    }
                  >
                    Latest location:{' '}
                    {location.latitude.toFixed(
                      5,
                    )}
                    ,{' '}
                    {location.longitude.toFixed(
                      5,
                    )}
                    {'\n'}
                    Updated{' '}
                    {new Date(
                      location.recorded_at,
                    ).toLocaleTimeString()}
                  </Text>
                ) : null}
              </>
            ) : (
              <Text
                style={styles.worker}
              >
                Searching for a worker...
              </Text>
            )}
          </View>
        ) : null}

        {booking.status ===
          'in_progress' &&
        booking.started_at ? (
          <View
            style={styles.timerCard}
          >
            <Text
              style={styles.timerLabel}
            >
              Service duration
            </Text>

            <Text
              style={styles.timer}
            >
              {timer}
            </Text>
          </View>
        ) : null}

        {booking.status ===
            'arrived' ||
        booking.status ===
            'assigned' ? (
          <Pressable
            style={styles.button}
            onPress={() =>
              void showOtp('start')
            }
          >
            <Text
              style={
                styles.buttonText
              }
            >
              Show start OTP
            </Text>
          </Pressable>
        ) : null}

        {booking.status ===
        'in_progress' ? (
          <Pressable
            style={styles.button}
            onPress={() =>
              void showOtp('end')
            }
          >
            <Text
              style={
                styles.buttonText
              }
            >
              Show end OTP
            </Text>
          </Pressable>
        ) : null}

        {otp ? (
          <View
            style={styles.otpCard}
          >
            <Text
              style={styles.otpLabel}
            >
              Booking OTP
            </Text>

            <Text
              style={styles.otp}
            >
              {otp}
            </Text>
          </View>
        ) : null}

        {booking.status ===
          'searching_worker' ? (
          <Text
            style={styles.refreshHint}
          >
            We will continue checking for
            an eligible worker automatically.
          </Text>
        ) : null}
      </View>
    </ScreenContainer>
  )
}

function Row({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <View
      style={styles.row}
    >
      <Text
        style={styles.label}
      >
        {label}
      </Text>

      <Text
        style={styles.value}
      >
        {value}
      </Text>
    </View>
  )
}

const styles =
  StyleSheet.create({
    loading: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
    },

    loadingText: {
      color: '#6B7280',
    },

    container: {
      padding: 20,
    },

    title: {
      fontSize: 28,
      fontWeight: '700',
      color: '#111827',
      marginBottom: 16,
    },

    stateCard: {
      padding: 18,
      borderRadius: 16,
      backgroundColor: '#ECFDF5',
      marginBottom: 16,
    },

    searchingCard: {
      backgroundColor: '#EFF6FF',
    },

    stateTitle: {
      fontSize: 20,
      fontWeight: '800',
      color: '#111827',
    },

    stateMessage: {
      marginTop: 8,
      lineHeight: 21,
      color: '#374151',
    },

    card: {
      padding: 18,
      borderRadius: 16,
      backgroundColor: '#F9FAFB',
      marginBottom: 16,
    },

    sectionTitle: {
      fontSize: 17,
      fontWeight: '800',
      color: '#111827',
      marginBottom: 10,
    },

    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 16,
      paddingVertical: 8,
    },

    label: {
      color: '#6B7280',
    },

    value: {
      flex: 1,
      maxWidth: '65%',
      color: '#111827',
      fontWeight: '600',
      textAlign: 'right',
    },

    worker: {
      marginTop: 4,
      fontSize: 17,
      fontWeight: '700',
      color: '#111827',
    },

    workerId: {
      marginTop: 6,
      color: '#6B7280',
      fontSize: 12,
    },

    location: {
      marginTop: 12,
      color: '#374151',
      lineHeight: 20,
    },

    timerCard: {
      padding: 18,
      borderRadius: 16,
      backgroundColor: '#F9FAFB',
      marginBottom: 16,
      alignItems: 'center',
    },

    timerLabel: {
      color: '#6B7280',
    },

    timer: {
      marginTop: 6,
      fontSize: 36,
      fontWeight: '800',
      color: '#111827',
    },

    button: {
      marginTop: 4,
      marginBottom: 12,
      padding: 14,
      borderRadius: 10,
      backgroundColor: '#111827',
      alignItems: 'center',
    },

    buttonText: {
      color: '#FFFFFF',
      fontWeight: '700',
    },

    otpCard: {
      marginTop: 4,
      marginBottom: 16,
      padding: 18,
      borderRadius: 16,
      backgroundColor: '#F9FAFB',
      alignItems: 'center',
    },

    otpLabel: {
      color: '#6B7280',
    },

    otp: {
      marginTop: 6,
      fontSize: 28,
      fontWeight: '800',
      color: '#111827',
      letterSpacing: 4,
    },

    refreshHint: {
      marginTop: 4,
      marginBottom: 16,
      color: '#6B7280',
      textAlign: 'center',
      lineHeight: 20,
    },

    error: {
      marginBottom: 12,
      color: '#B91C1C',
    },
  })