import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useState } from 'react'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import RazorpayCheckout from 'react-native-razorpay'

import { COLORS } from '../constants/theme'
import { RootStackParamList } from '../types'
import { useBooking } from '../context/BookingContext'
import {
  createHourlyBooking,
  createRecurringBooking,
} from '../services/booking'
import {
  createRazorpayOrder,
  verifyRazorpayPayment,
} from '../services/payment'
import Header from '../components/Header'
import PrimaryButton from '../components/PrimaryButton'

type Props = NativeStackScreenProps<
  RootStackParamList,
  'Payment'
>

function combineDateAndTime(
  date: string,
  time: string
) {
  return `${date}T${time}:00`
}

export default function PaymentScreen({
  navigation,
}: Props) {
  const {
    selectedService,
    selectedVariantId,
    bookingMode,

    scheduledDate,

    scheduleStartDate,
    scheduleEndDate,
    scheduleDailyStartTime,
    scheduleDailyEndTime,
    scheduleSelectedWeekdays,
    scheduleOffDates,

    hourlyStartTime,
    hourlyEndTime,

    addressId,

    bookingPricing,

    setBookingId,
    setPaymentDone,
  } = useBooking()

  const [paying, setPaying] =
    useState(false)

  const [error, setError] =
    useState('')

  const createBooking = async () => {
    if (
      !selectedVariantId ||
      !addressId
    ) {
      throw new Error(
        'Booking information is incomplete.'
      )
    }

    if (
      bookingMode === 'Instant'
    ) {
      return createHourlyBooking({
        serviceVariantId:
          selectedVariantId,
        addressId,
        bookingType: 'instant',
        scheduledStart:
          hourlyStartTime,
        scheduledEnd:
          hourlyEndTime,
      })
    }

    if (
      bookingMode === 'Scheduled'
    ) {
      return createHourlyBooking({
        serviceVariantId:
          selectedVariantId,
        addressId,
        bookingType: 'scheduled',
        scheduledStart:
          combineDateAndTime(
            scheduledDate ||
              scheduleStartDate,
            scheduleDailyStartTime
          ),
        scheduledEnd:
          combineDateAndTime(
            scheduledDate ||
              scheduleStartDate,
            scheduleDailyEndTime
          ),
      })
    }

    return createRecurringBooking({
      serviceVariantId:
        selectedVariantId,

      addressId,

      scheduleStartDate,
      scheduleEndDate,

      dailyStartTime:
        scheduleDailyStartTime,

      dailyEndTime:
        scheduleDailyEndTime,

      selectedWeekdays:
        scheduleSelectedWeekdays,

      offDates:
        scheduleOffDates,
    })
  }

  const payNow = async () => {
    if (paying) {
      return
    }

    try {
      setPaying(true)
      setError('')

      const booking =
        await createBooking()

      /*
       * Instant booking may legitimately fail because
       * no worker is currently available.
       */
      if (
        bookingMode === 'Instant' &&
        booking.instantAvailable === false &&
        booking.fallbackToScheduled
      ) {
        Alert.alert(
          'No worker available now',
          booking.message ||
            'No worker is currently available. Please choose a scheduled time.',
          [
            {
              text: 'Back to booking',
              onPress: () =>
                navigation.goBack(),
            },
          ]
        )

        return
      }

      if (
        booking.success === false &&
        !booking.id
      ) {
        throw new Error(
          booking.message ||
            'The booking could not be created.'
        )
      }

      const currentBookingId =
        booking.id ||
        booking.bookingId

      if (!currentBookingId) {
        throw new Error(
          'The server did not return a booking ID.'
        )
      }

      setBookingId(
        currentBookingId
      )

      const order =
        await createRazorpayOrder(
          currentBookingId
        )

      const payment =
        await RazorpayCheckout.open({
          key: order.keyId,
          amount: order.amount,
          currency: order.currency,
          name: 'TempStaff',
          description:
            `${selectedService || 'Staff service'} booking`,
          order_id: order.orderId,

          prefill: {
            name: '',
            email: '',
            contact: '',
          },

          theme: {
            color: COLORS.orange,
          },
        })

      const verification =
        await verifyRazorpayPayment(
          currentBookingId,

          String(
            payment.razorpay_order_id ||
              order.orderId
          ),

          String(
            payment.razorpay_payment_id ||
              ''
          ),

          String(
            payment.razorpay_signature ||
              ''
          )
        )

      if (!verification?.success) {
        throw new Error(
          verification?.error ||
            'Payment verification failed.'
        )
      }

      setPaymentDone(true)

      navigation.navigate(
        'BookingConfirmed'
      )
    } catch (err: any) {
      const message =
        String(
          err?.description ||
            err?.message ||
            'Payment could not be completed.'
        )

      const cancelled =
        message
          .toLowerCase()
          .includes('cancel')

      if (!cancelled) {
        setError(message)

        Alert.alert(
          'Payment not completed',
          message
        )
      }
    } finally {
      setPaying(false)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.page}
        showsVerticalScrollIndicator={false}
      >
        <Header
          onBack={() =>
            navigation.goBack()
          }
        />

        <Text style={styles.step}>
          STEP 4 OF 5 · PAYMENT
        </Text>

        <Text style={styles.title}>
          Secure payment
        </Text>

        <Text style={styles.subtitle}>
          Your booking is created and payment is
          verified securely through Razorpay.
        </Text>

        <View style={styles.amountCard}>
          <Text style={styles.amountLabel}>
            AMOUNT TO PAY
          </Text>

          <Text style={styles.amount}>
            {bookingPricing
              ? `₹${bookingPricing.finalAmount.toFixed(2)}`
              : '—'}
          </Text>

          <Text style={styles.amountNote}>
            The payable amount comes from the
            server-side booking price.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            Secure payment
          </Text>

          <Text style={styles.cardText}>
            TempStaff never trusts the mobile app to
            mark a booking as paid. Razorpay payment is
            verified by the TempStaff backend before the
            confirmation screen is shown.
          </Text>
        </View>

        {error ? (
          <View style={styles.error}>
            <Text style={styles.errorTitle}>
              Payment issue
            </Text>

            <Text style={styles.errorText}>
              {error}
            </Text>
          </View>
        ) : null}

        <PrimaryButton
          title={
            paying
              ? 'Processing...'
              : 'Pay securely'
          }
          disabled={
            paying ||
            !bookingPricing
          }
          onPress={payNow}
        />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.light,
  },

  page: {
    padding: 20,
    paddingBottom: 45,
  },

  step: {
    color: COLORS.teal,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginTop: 5,
  },

  title: {
    color: COLORS.navy,
    fontSize: 29,
    fontWeight: '900',
    marginTop: 5,
  },

  subtitle: {
    color: COLORS.gray,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 5,
    marginBottom: 18,
  },

  amountCard: {
    backgroundColor: COLORS.navy,
    borderRadius: 22,
    padding: 20,
    marginBottom: 14,
  },

  amountLabel: {
    color: '#CBD5E1',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
  },

  amount: {
    color: COLORS.white,
    fontSize: 34,
    fontWeight: '900',
    marginTop: 6,
  },

  amountNote: {
    color: '#CBD5E1',
    fontSize: 10,
    lineHeight: 16,
    marginTop: 9,
  },

  card: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 17,
    marginBottom: 14,
  },

  cardTitle: {
    color: COLORS.navy,
    fontSize: 14,
    fontWeight: '900',
  },

  cardText: {
    color: COLORS.gray,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 6,
  },

  error: {
    backgroundColor: '#FFF1F0',
    borderRadius: 16,
    padding: 15,
    marginBottom: 15,
  },

  errorTitle: {
    color: '#B42318',
    fontSize: 13,
    fontWeight: '900',
  },

  errorText: {
    color: COLORS.gray,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 4,
  },
})