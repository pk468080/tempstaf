import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useState } from 'react'
import RazorpayCheckout from 'react-native-razorpay'

import { ScreenContainer } from '../../components/layout/ScreenContainer'
import {
  createRazorpayOrder,
  markRazorpayPaymentFailed,
  verifyRazorpayPayment,
} from '../../services/payment/razorpay.service'

type PaymentScreenProps = {
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
  finalAmount,
  currency,
  occurrenceCount,
  totalWorkingHours,
  onPaid,
}: PaymentScreenProps) {
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handlePayment() {
    if (processing) return

    setProcessing(true)
    setError(null)

    try {
      let order
      try {
        order = await createRazorpayOrder(
          bookingId,
          finalAmount,
          currency,
        )
      } catch (orderError) {
        await markRazorpayPaymentFailed(bookingId).catch(
          statusError => console.error(
            'Unable to mark failed payment order:',
            statusError,
          ),
        )
        throw orderError
      }

      let checkout
      try {
        checkout = await RazorpayCheckout.open({
          key: order.keyId,
          amount: order.amount,
          currency: order.currency,
          order_id: order.orderId,
          name: 'TempStaff',
          description: 'TempStaff booking',
        })
      } catch (checkoutError) {
        await markRazorpayPaymentFailed(bookingId).catch(
          statusError => console.error(
            'Unable to mark cancelled payment:',
            statusError,
          ),
        )
        throw checkoutError
      }

      await verifyRazorpayPayment(bookingId, checkout)
      onPaid()
    } catch (paymentError) {
      const message = paymentError instanceof Error
        ? paymentError.message
        : 'Payment was not completed.'
      setError(message)
      Alert.alert('Payment not completed', message)
    } finally {
      setProcessing(false)
    }
  }

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

          <Text style={styles.amount}>
            {formatMoney(
              finalAmount,
              currency,
            )}
          </Text>

          <View style={styles.divider} />

          <Row
            label="Occurrences"
            value={String(occurrenceCount)}
          />

          <Row
            label="Working hours"
            value={String(totalWorkingHours)}
          />

          <Row
            label="Booking ID"
            value={bookingId}
          />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={styles.payButton}
          disabled={processing}
          onPress={() => void handlePayment()}
        >
          {processing ? <ActivityIndicator color="#FFFFFF" /> : (
            <Text style={styles.payButtonText}>Pay securely</Text>
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
    <View style={styles.row}>
      <Text style={styles.rowLabel}>
        {label}
      </Text>

      <Text style={styles.rowValue}>
        {value}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
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
    backgroundColor: '#F9FAFB',
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

  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 18,
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    paddingVertical: 7,
  },

  rowLabel: {
    color: '#6B7280',
  },

  rowValue: {
    flex: 1,
    textAlign: 'right',
    fontWeight: '600',
    color: '#111827',
  },

  error: { marginTop: 16, color: '#B91C1C' },
  payButton: {
    marginTop: 20,
    minHeight: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111827',
  },
  payButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
})