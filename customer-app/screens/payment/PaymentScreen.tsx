import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import {
  useEffect,
  useState,
} from 'react'
import RazorpayCheckout from 'react-native-razorpay'

import {
  ScreenContainer,
} from '../../components/layout/ScreenContainer'

import {
  createRazorpayOrder,
  getBookingPaymentDetails,

  verifyRazorpayPayment,
  type BookingPaymentDetails,
  type RazorpayOrder,
} from '../../services/payment/razorpay.service'

type PaymentScreenProps = {
  /*
   * These values remain in navigation for compatibility
   * with the existing navigator.
   *
   * They are NOT treated as authoritative for payment.
   */
  bookingId: string
  finalAmount: number
  currency: string
  occurrenceCount: number
  totalWorkingHours: number
  onPaid: () => void
}

function formatMoney(
  amount: number,
  currency: string,
) {
  return `${currency} ${amount.toFixed(2)}`
}

export default function PaymentScreen({
  bookingId,
  finalAmount: navigationAmount,
  currency: navigationCurrency,
  occurrenceCount:
    navigationOccurrenceCount,
  totalWorkingHours:
    navigationTotalWorkingHours,
  onPaid,
}: PaymentScreenProps) {
  const [
    details,
    setDetails,
  ] = useState<
    BookingPaymentDetails | null
  >(null)

  const [
    processing,
    setProcessing,
  ] = useState(false)

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

  useEffect(() => {
    let cancelled = false

    async function loadPaymentDetails() {
      setLoading(true)
      setError(null)

      try {
        const authoritative =
          await getBookingPaymentDetails(
            bookingId,
          )

        if (cancelled) {
          return
        }

        setDetails(
          authoritative,
        )
      } catch (loadError) {
        if (cancelled) {
          return
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Unable to load the booking payment details.',
        )
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadPaymentDetails()

    return () => {
      cancelled = true
    }
  }, [bookingId])

  async function handlePayment() {
    if (
      processing ||
      loading ||
      !details
    ) {
      return
    }

    setProcessing(true)
    setError(null)

    try {
      let order: RazorpayOrder

      order =
  await createRazorpayOrder(
    bookingId,
    details.amount,
    details.currency,
  )
      /*
       * The backend discovered that this payment was
       * already captured and finalized.
       *
       * Never launch Checkout a second time.
       */
      if (
        order.alreadyPaid
      ) {
        onPaid()
        return
      }

      if (order.paymentPending) {
  Alert.alert(
    'Payment is being confirmed',
    'This payment is still being processed by Razorpay. Please do not make another payment.',
  )
  return
}

      if (
        !order.keyId ||
        !order.orderId ||
        !Number.isFinite(
          order.amount,
        ) ||
        order.amount <= 0 ||
        !order.currency
      ) {
        throw new Error(
          'The payment order returned by the server is invalid.',
        )
      }

      let checkout

      try {
        checkout =
          await RazorpayCheckout.open(
            {
              key:
                order.keyId,
              amount:
                order.amount,
              currency:
                order.currency,
              order_id:
                order.orderId,
              name:
                'TempStaff',
              description:
                'TempStaff booking',
            },
          )
      } catch (
  checkoutError
) {
  /*
   * Do not mark the booking payment_failed here.
   *
   * Razorpay may have accepted/captured the payment even
   * when the mobile checkout callback is interrupted.
   * The backend/webhook reconciliation remains authoritative.
   */
  throw checkoutError
}

      /*
       * Verification and finalization are server-side.
       */
     const verification =
  await verifyRazorpayPayment(
    bookingId,
    checkout,
  )

if (
  verification.paymentPending
) {
  Alert.alert(
    'Payment authorized',
    'Razorpay has authorized your payment and is completing the capture. Please do not make another payment. Your booking will be confirmed after capture.',
  )
  return
}

onPaid()
    } catch (
      paymentError
    ) {
      const message =
        paymentError instanceof Error
          ? paymentError.message
          : 'Payment was not completed.'

      setError(message)

      Alert.alert(
        'Payment not completed',
        message,
      )
    } finally {
      setProcessing(false)
    }
  }

  /*
   * The navigation values are retained only as a temporary
   * display fallback before authoritative booking data loads.
   *
   * Payment cannot be initiated until details are loaded.
   */
  const amount =
    details?.amount ??
    navigationAmount

  const displayCurrency =
    details?.currency ??
    navigationCurrency

  const occurrenceCount =
    details?.occurrenceCount ??
    navigationOccurrenceCount

  const totalWorkingHours =
    details?.totalWorkingHours ??
    navigationTotalWorkingHours

  return (
    <ScreenContainer>
      <View style={styles.container}>
        <Text style={styles.title}>
          Payment
        </Text>

        <View style={styles.card}>
          <Text style={styles.label}>
            Amount payable
          </Text>

          {loading ? (
            <ActivityIndicator
              style={
                styles.amountLoader
              }
            />
          ) : (
            <Text
              style={
                styles.amount
              }
            >
              {formatMoney(
                amount,
                displayCurrency,
              )}
            </Text>
          )}

          <View
            style={
              styles.divider
            }
          />

          <Row
            label="Occurrences"
            value={String(
              occurrenceCount,
            )}
          />

          <Row
            label="Working hours"
            value={String(
              totalWorkingHours,
            )}
          />

          <Row
            label="Booking ID"
            value={bookingId}
          />
        </View>

        {error ? (
          <Text
            style={
              styles.error
            }
          >
            {error}
          </Text>
        ) : null}

        <Pressable
          style={[
            styles.payButton,
            (
              processing ||
              loading ||
              !details
            ) &&
              styles.disabledButton,
          ]}
          disabled={
            processing ||
            loading ||
            !details
          }
          onPress={() =>
            void handlePayment()
          }
        >
          {processing ? (
            <ActivityIndicator
              color="#FFFFFF"
            />
          ) : (
            <Text
              style={
                styles.payButtonText
              }
            >
              Pay securely
            </Text>
          )}
        </Pressable>
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
        style={
          styles.rowLabel
        }
      >
        {label}
      </Text>

      <Text
        style={
          styles.rowValue
        }
      >
        {value}
      </Text>
    </View>
  )
}

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      padding: 20,
    },

    title: {
      fontSize: 28,
      fontWeight: '700',
      color: '#111827',
      marginBottom: 20,
    },

    card: {
      padding: 20,
      borderRadius: 16,
      backgroundColor:
        '#F9FAFB',
    },

    label: {
      fontSize: 16,
      color: '#6B7280',
    },

    amount: {
      marginTop: 8,
      fontSize: 32,
      fontWeight: '800',
      color: '#111827',
    },

    amountLoader: {
      marginTop: 18,
      alignSelf:
        'flex-start',
    },

    divider: {
      height: 1,
      backgroundColor:
        '#E5E7EB',
      marginVertical: 18,
    },

    row: {
      flexDirection:
        'row',
      justifyContent:
        'space-between',
      gap: 16,
      paddingVertical: 7,
    },

    rowLabel: {
      color: '#6B7280',
    },

    rowValue: {
      flex: 1,
      textAlign:
        'right',
      fontWeight:
        '600',
      color: '#111827',
    },

    error: {
      marginTop: 16,
      color: '#B91C1C',
    },

    payButton: {
      marginTop: 20,
      minHeight: 52,
      borderRadius: 12,
      alignItems:
        'center',
      justifyContent:
        'center',
      backgroundColor:
        '#111827',
    },

    disabledButton: {
      opacity: 0.5,
    },

    payButtonText: {
      color: '#FFFFFF',
      fontWeight: '700',
      fontSize: 16,
    },
  })