import { useState } from 'react'
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import RazorpayCheckout from 'react-native-razorpay'

import { COLORS } from '../constants/theme'
import { RootStackParamList } from '../types'
import { useBooking } from '../context/BookingContext'
import Header from '../components/Header'
import PrimaryButton from '../components/PrimaryButton'
import { createRazorpayOrder } from '../services/payment'

type Props = NativeStackScreenProps<
  RootStackParamList,
  'Checkout'
>

export default function CheckoutScreen({
  navigation,
}: Props) {
  const {
    selectedService,
    selectedPackage,
    address,
    total,
    bookingMode,
  } = useBooking()

  const [paying, setPaying] = useState(false)

  const payNow = async () => {
    if (!selectedPackage?.id) {
      Alert.alert(
        'Payment error',
        'No service package has been selected.'
      )
      return
    }

    if (paying) {
      return
    }

    try {
      setPaying(true)

      /*
       * Ask our Supabase Edge Function to create
       * the Razorpay order.
       *
       * The server gets the real package price
       * directly from Supabase.
       */
      const order =
        await createRazorpayOrder(
          selectedPackage.id
        )

      if (
        !order.orderId ||
        !order.keyId
      ) {
        throw new Error(
          'Invalid Razorpay order received.'
        )
      }

      const options = {
        description:
          `TempStaff - ${selectedPackage.name}`,

        image:
          'https://your-tempstaff-logo-url.com/logo.png',

        currency:
          order.currency || 'INR',

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
          color: '#0B1F3A',
        },
      }

      const payment =
        await RazorpayCheckout.open(
          options
        )

      console.log(
        '[TempStaff] Razorpay payment success:',
        payment
      )

      /*
       * IMPORTANT:
       * We are NOT confirming the booking yet.
       *
       * Next step will verify the Razorpay
       * signature on the Supabase server.
       */

      Alert.alert(
        'Payment received',
        'Test payment completed successfully.',
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
        '[TempStaff] Razorpay payment failed:',
        error
      )

      if (
        error?.code ===
        '2'
      ) {
        Alert.alert(
          'Payment cancelled',
          'You cancelled the payment.'
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Header
          onBack={() => navigation.goBack()}
        />

        <Text style={styles.title}>
          Payment
        </Text>

        <Text style={styles.subtitle}>
          Review your booking before payment.
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

          {selectedPackage?.duration_value ? (
            <Text style={styles.duration}>
              {selectedPackage.duration_value}{' '}
              {selectedPackage.duration_unit}
            </Text>
          ) : null}

          <View style={styles.divider} />

          <Text style={styles.label}>
            BOOKING TYPE
          </Text>

          <Text style={styles.value}>
            {bookingMode}
          </Text>

          <View style={styles.divider} />

          <Text style={styles.label}>
            SERVICE ADDRESS
          </Text>

          <Text style={styles.address}>
            {address}
          </Text>
        </View>

        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>
            TOTAL PAYABLE
          </Text>

          <Text style={styles.total}>
            ₹{total.toLocaleString('en-IN')}
          </Text>

          <Text style={styles.totalNote}>
            Final amount is verified from the
            TempStaff database before the
            Razorpay order is created.
          </Text>
        </View>

        <View style={styles.secureCard}>
          <Text style={styles.secureTitle}>
            🔒 Secure Test Payment
          </Text>

          <Text style={styles.secureText}>
            You are currently using Razorpay
            Test Mode. No real money will be
            charged.
          </Text>
        </View>

        <PrimaryButton
          title={
            paying
              ? 'Opening payment...'
              : `Pay ₹${total.toLocaleString(
                  'en-IN'
                )}`
          }
          onPress={payNow}
          disabled={paying}
        />

        <Text style={styles.note}>
          TempStaff assigns the worker.
          Customers cannot select individual
          workers.
        </Text>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.light,
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
    borderColor: COLORS.border,
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

  duration: {
    color: COLORS.gray,
    fontSize: 13,
    marginTop: 4,
  },

  value: {
    color: COLORS.navy,
    fontSize: 16,
    fontWeight: '800',
  },

  address: {
    color: COLORS.navy,
    fontSize: 14,
    lineHeight: 21,
  },

  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 18,
  },

  totalCard: {
    backgroundColor: COLORS.navy,
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
    fontSize: 38,
    fontWeight: '900',
    marginTop: 5,
  },

  totalNote: {
    color: '#D9E7F5',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
  },

  secureCard: {
    backgroundColor: '#E8F8F7',
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