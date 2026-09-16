import { useState } from 'react'

import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'

import {
  NativeStackScreenProps,
} from '@react-navigation/native-stack'

import RazorpayCheckout from 'react-native-razorpay'

import { COLORS } from '../constants/theme'
import { RootStackParamList } from '../types'

import {
  useBooking,
} from '../context/BookingContext'

import Header from '../components/Header'
import PrimaryButton from '../components/PrimaryButton'

import {
  createScheduledBooking,
} from '../services/booking'

import {
  createRazorpayOrder,
  verifyRazorpayPayment,
} from '../services/payment'

type Props =
  NativeStackScreenProps<
    RootStackParamList,
    'Checkout'
  >

function formatDate(
  value: string
) {
  if (!value) {
    return ''
  }

  const date =
    new Date(`${value}T00:00:00`)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleDateString(
    'en-IN',
    {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }
  )
}

function formatTime(
  value: string
) {
  if (!value) {
    return ''
  }

  const [hourText, minuteText] =
    value.split(':')

  const hour =
    Number(hourText)

  const minute =
    Number(minuteText)

  if (
    Number.isNaN(hour) ||
    Number.isNaN(minute)
  ) {
    return value
  }

  const date =
    new Date()

  date.setHours(
    hour,
    minute,
    0,
    0
  )

  return date.toLocaleTimeString(
    'en-IN',
    {
      hour: 'numeric',
      minute: '2-digit',
    }
  )
}

function getWeekdayName(
  day: number
) {
  const names = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ]

  return names[day] ?? ''
}

export default function CheckoutScreen({
  navigation,
}: Props) {
  const {
    selectedService,
    selectedPackage,
    selectedPackageId,

    address,
    addressId,

    bookingMode,

    scheduleStartDate,
    scheduleEndDate,
    scheduleDailyStartTime,
    scheduleDailyEndTime,
    scheduleSelectedWeekdays,
    scheduleOffDates,
    scheduleTotalWorkingHours,

    bookingId,
    setBookingId,
    setPaymentDone,
  } = useBooking()

  const [paying, setPaying] =
    useState(false)

  const payNow = async () => {
    if (paying) {
      return
    }

    if (bookingMode !== 'Scheduled') {
      Alert.alert(
        'Booking unavailable',
        'Only Scheduled Booking is currently available through this checkout flow.'
      )

      return
    }

    if (!selectedPackageId) {
      Alert.alert(
        'Booking error',
        'No service package has been selected.'
      )

      return
    }

    if (!selectedPackage) {
      Alert.alert(
        'Booking error',
        'Selected service package could not be loaded.'
      )

      return
    }

    if (!addressId) {
      Alert.alert(
        'Booking error',
        'Service address is missing. Please go back and select your service location.'
      )

      return
    }

    if (!scheduleStartDate) {
      Alert.alert(
        'Booking error',
        'Schedule start date is missing.'
      )

      return
    }

    if (!scheduleEndDate) {
      Alert.alert(
        'Booking error',
        'Schedule end date is missing.'
      )

      return
    }

    if (!scheduleDailyStartTime) {
      Alert.alert(
        'Booking error',
        'Daily start time is missing.'
      )

      return
    }

    if (!scheduleDailyEndTime) {
      Alert.alert(
        'Booking error',
        'Daily end time is missing.'
      )

      return
    }

    if (
      !scheduleSelectedWeekdays ||
      scheduleSelectedWeekdays.length === 0
    ) {
      Alert.alert(
        'Booking error',
        'Please select at least one working day.'
      )

      return
    }

    try {
      setPaying(true)

      /*
       * STEP 1
       *
       * Create the scheduled booking on the server.
       *
       * The server calculates:
       * - working occurrences
       * - total working hours
       * - price
       * - discount
       * - final payable amount
       *
       * The customer app does NOT calculate the price.
       */

      let currentBookingId =
        bookingId

      let bookingAmount = 0

      let bookingCurrency = 'INR'

      if (!currentBookingId) {
        const booking =
          await createScheduledBooking({
            serviceVariantId:
              selectedPackageId,

            addressId,

            scheduleStartDate:
              scheduleStartDate,

            scheduleEndDate:
              scheduleEndDate,

            dailyStartTime:
              scheduleDailyStartTime,

            dailyEndTime:
              scheduleDailyEndTime,

            selectedWeekdays:
              scheduleSelectedWeekdays,

            offDates:
              scheduleOffDates ?? [],

            notes:
              'Scheduled booking created from customer app.',
          })

        currentBookingId =
          booking.id

        setBookingId(
          currentBookingId
        )

        bookingAmount =
          Number(
            booking.finalAmount ?? 0
          )

        bookingCurrency =
          String(
            booking.currency ?? 'INR'
          )

        console.log(
          '[TempStaff] Scheduled booking created:',
          booking
        )
      }

      if (!currentBookingId) {
        throw new Error(
          'Booking ID was not created.'
        )
      }

      /*
       * STEP 2
       *
       * Create Razorpay order from the
       * server-calculated booking amount.
       */

      const order =
  await createRazorpayOrder(
    currentBookingId
  )

      if (!order.orderId) {
        throw new Error(
          'Invalid Razorpay order received.'
        )
      }

      if (!order.keyId) {
        throw new Error(
          'Razorpay key was not received.'
        )
      }

      if (
        !Number.isFinite(order.amount) ||
        order.amount <= 0
      ) {
        throw new Error(
          'Invalid payment amount received from the server.'
        )
      }

      /*
       * If this checkout already had a booking,
       * the amount comes from Razorpay/server.
       *
       * bookingAmount is only used for logging.
       */

      console.log(
        '[TempStaff] Booking amount:',
        bookingAmount
      )

      /*
       * STEP 3
       *
       * Open Razorpay.
       */

      const options = {
        description:
          `TempStaff - ${selectedPackage.name}`,

        currency:
          order.currency ||
          bookingCurrency ||
          'INR',

        key:
          order.keyId,

        amount:
          String(order.amount),

        name:
          'TempStaff',

        order_id:
          order.orderId,

        prefill: {
          name: '',
          email: '',
          contact: '',
        },

        theme: {
          color:
            '#0B1F3A',
        },
      }

      const payment =
        await RazorpayCheckout.open(
          options
        )

      console.log(
        '[TempStaff] Razorpay payment response:',
        payment
      )

      /*
       * STEP 4
       *
       * Verify payment on the server.
       *
       * Never trust the mobile payment-success
       * callback by itself.
       */

      if (
        !payment?.razorpay_order_id
      ) {
        throw new Error(
          'Razorpay order ID was not returned.'
        )
      }

      if (
        !payment?.razorpay_payment_id
      ) {
        throw new Error(
          'Razorpay payment ID was not returned.'
        )
      }

      if (
        !payment?.razorpay_signature
      ) {
        throw new Error(
          'Razorpay payment signature was not returned.'
        )
      }

      const verification =
        await verifyRazorpayPayment(
          currentBookingId,
          payment.razorpay_order_id,
          payment.razorpay_payment_id,
          payment.razorpay_signature
        )

      console.log(
        '[TempStaff] Razorpay payment verified:',
        verification
      )

      setPaymentDone(true)

      /*
       * STEP 5
       *
       * Booking is now paid.
       *
       * Worker assignment happens separately.
       * Customer does not select a worker.
       */

      Alert.alert(
        'Payment received',
        'Your payment was successful. We will assign an eligible worker to your booking.',
        [
          {
            text: 'Continue',
            onPress: () =>
              navigation.navigate(
                'BookingConfirmed'
              ),
          },
        ]
      )
    } catch (error: any) {
      console.error(
        '[TempStaff] Scheduled booking/payment failed:',
        error
      )

      if (
        error?.code === '2'
      ) {
        Alert.alert(
          'Payment cancelled',
          'You cancelled the payment. Your booking remains pending payment.'
        )
      } else {
        Alert.alert(
          'Payment failed',
          error?.description ||
            error?.message ||
            'Unable to complete payment.'
        )
      }
    } finally {
      setPaying(false)
    }
  }

  const selectedDays =
    (
      scheduleSelectedWeekdays ?? []
    )
      .slice()
      .sort(
        (a, b) => a - b
      )
      .map(
        getWeekdayName
      )
      .join(', ')

  const hasDateRange =
    scheduleStartDate &&
    scheduleEndDate &&
    scheduleStartDate !==
      scheduleEndDate

  return (
    <SafeAreaView
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={
          styles.content
        }
        showsVerticalScrollIndicator={
          false
        }
      >
        <Header
          onBack={() =>
            navigation.goBack()
          }
        />

        <Text style={styles.title}>
          Review & Pay
        </Text>

        <Text style={styles.subtitle}>
          Review your scheduled booking before payment.
        </Text>

        <View style={styles.card}>
          <Text style={styles.label}>
            SERVICE
          </Text>

          <Text style={styles.service}>
            {selectedService}
          </Text>

          <Text style={styles.package}>
            {selectedPackage?.name}
          </Text>

          <View
            style={styles.divider}
          />

          <Text style={styles.label}>
            BOOKING TYPE
          </Text>

          <Text style={styles.value}>
            Scheduled
          </Text>

          <View
            style={styles.divider}
          />

          <Text style={styles.label}>
            SCHEDULE
          </Text>

          {hasDateRange ? (
            <Text style={styles.value}>
              {formatDate(
                scheduleStartDate
              )}{' '}
              —{' '}
              {formatDate(
                scheduleEndDate
              )}
            </Text>
          ) : (
            <Text style={styles.value}>
              {formatDate(
                scheduleStartDate
              )}
            </Text>
          )}

          <Text
            style={
              styles.scheduleDetail
            }
          >
            {formatTime(
              scheduleDailyStartTime
            )}{' '}
            —{' '}
            {formatTime(
              scheduleDailyEndTime
            )}
          </Text>

          {selectedDays ? (
            <Text
              style={
                styles.scheduleDetail
              }
            >
              {selectedDays}
            </Text>
          ) : null}

          {scheduleOffDates?.length ? (
            <Text
              style={
                styles.scheduleDetail
              }
            >
              {scheduleOffDates.length}{' '}
              off date
              {scheduleOffDates.length ===
              1
                ? ''
                : 's'}{' '}
              selected
            </Text>
          ) : null}

          {scheduleTotalWorkingHours >
          0 ? (
            <Text
              style={
                styles.scheduleHours
              }
            >
              {scheduleTotalWorkingHours}{' '}
              working hours
            </Text>
          ) : null}

          <View
            style={styles.divider}
          />

          <Text style={styles.label}>
            SERVICE ADDRESS
          </Text>

          <Text
            style={styles.address}
          >
            {address}
          </Text>
        </View>

        <View
          style={styles.totalCard}
        >
          <Text
            style={styles.totalLabel}
          >
            TOTAL PAYABLE
          </Text>

          <Text
            style={styles.total}
          >
            Calculated at checkout
          </Text>

          <Text
            style={styles.totalNote}
          >
            The final amount is calculated and verified by TempStaff from the database before the Razorpay order is created.
          </Text>
        </View>

        <View
          style={styles.secureCard}
        >
          <Text
            style={styles.secureTitle}
          >
            Secure Payment
          </Text>

          <Text
            style={styles.secureText}
          >
            Your payment amount is created from the server-side booking total. The mobile app cannot set the payable amount.
          </Text>
        </View>

        <PrimaryButton
          title={
            paying
              ? 'Processing...'
              : 'Continue to Payment'
          }
          onPress={payNow}
          disabled={paying}
        />

        <Text
          style={styles.note}
        >
          TempStaff assigns the worker. Customers cannot select individual workers.
        </Text>
      </ScrollView>
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

    content: {
      padding: 22,
      paddingBottom: 40,
    },

    title: {
      color: COLORS.navy,
      fontSize: 30,
      fontWeight: '900',
      marginTop: 18,
      marginBottom: 8,
    },

    subtitle: {
      color: COLORS.gray,
      fontSize: 15,
      marginBottom: 22,
    },

    card: {
      backgroundColor: 'white',
      borderWidth: 1,
      borderColor:
        COLORS.border,
      borderRadius: 20,
      padding: 20,
      marginBottom: 16,
    },

    label: {
      color: COLORS.gray,
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 1,
      marginBottom: 7,
    },

    service: {
      color: COLORS.navy,
      fontSize: 22,
      fontWeight: '900',
    },

    package: {
      color: COLORS.teal,
      fontSize: 15,
      fontWeight: '800',
      marginTop: 4,
    },

    value: {
      color: COLORS.navy,
      fontSize: 16,
      fontWeight: '800',
    },

    scheduleDetail: {
      color: COLORS.gray,
      fontSize: 14,
      marginTop: 6,
    },

    scheduleHours: {
      color: COLORS.teal,
      fontSize: 14,
      fontWeight: '800',
      marginTop: 8,
    },

    address: {
      color: COLORS.navy,
      fontSize: 14,
      lineHeight: 21,
    },

    divider: {
      height: 1,
      backgroundColor:
        '#E5E7EB',
      marginVertical: 18,
    },

    totalCard: {
      backgroundColor:
        COLORS.navy,
      borderRadius: 20,
      padding: 22,
      marginBottom: 16,
    },

    totalLabel: {
      color: '#D9E7F5',
      fontSize: 11,
      fontWeight: '900',
      letterSpacing: 1,
    },

    total: {
      color: 'white',
      fontSize: 24,
      fontWeight: '900',
      marginTop: 8,
    },

    totalNote: {
      color: '#D9E7F5',
      fontSize: 12,
      lineHeight: 18,
      marginTop: 8,
    },

    secureCard: {
      backgroundColor:
        '#E8F8F7',
      borderRadius: 16,
      padding: 16,
      marginBottom: 22,
    },

    secureTitle: {
      color: COLORS.teal,
      fontSize: 15,
      fontWeight: '900',
      marginBottom: 4,
    },

    secureText: {
      color: COLORS.gray,
      fontSize: 12,
      lineHeight: 18,
    },

    note: {
      color: COLORS.gray,
      fontSize: 11,
      lineHeight: 17,
      textAlign: 'center',
      marginTop: 14,
    },
  })