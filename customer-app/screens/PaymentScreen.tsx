import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { COLORS } from '../constants/theme'
import { RootStackParamList } from '../types'
import { useBooking } from '../context/BookingContext'
import Header from '../components/Header'
import PrimaryButton from '../components/PrimaryButton'
import { markBookingPaid } from '../services/booking'
type Props = NativeStackScreenProps<RootStackParamList, 'Payment'>

export default function PaymentScreen({ navigation }: Props) {
  const { total, selectedService, selectedDuration, bookingId, setPaymentDone } = useBooking()
  const pay = () => {
    Alert.alert(
      'Demo payment',
      'No real money will be charged in development mode.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Pay Now',
          onPress: async () => {
            try {
              if (!bookingId) {
                throw new Error('Booking ID is missing.')
              }

              await markBookingPaid(bookingId)

              setPaymentDone(true)

              navigation.reset({
                index: 0,
                routes: [{ name: 'BookingConfirmed' }],
              })
            } catch (error: any) {
              console.error(
                '[TempStaff] Payment update failed:',
                error
              )

              Alert.alert(
                'Payment failed',
                error?.message || 'Unable to update payment status.'
              )
            }
          },
        },
      ]
    )
  }
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.page}>
        <Header onBack={() => navigation.goBack()} />
        <Text style={styles.title}>Pay before booking</Text>
        <Text style={styles.subtitle}>Your worker is confirmed only after successful payment.</Text>
        <View style={styles.card}>
          <Text style={styles.amount}>₹{total.toLocaleString('en-IN')}</Text>
          <Text style={styles.text}>{selectedService} · {selectedDuration}</Text>
          <Text style={styles.text}>Booking ID: {bookingId}</Text>
        </View>
        <PrimaryButton title="Pay Now" onPress={pay} />
        <Text style={styles.note}>Real UPI/card payment will be connected later.</Text>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.light },
  page: { padding: 22, paddingBottom: 45 },
  title: { color: COLORS.navy, fontSize: 31, fontWeight: '800', marginBottom: 7 },
  subtitle: { color: COLORS.gray, fontSize: 15, lineHeight: 22, marginBottom: 22 },
  card: { width: '100%', backgroundColor: 'white', borderRadius: 20, padding: 22, borderWidth: 1, borderColor: COLORS.border, marginBottom: 18 },
  amount: { color: COLORS.navy, fontSize: 31, fontWeight: '900', marginBottom: 10 },
  text: { color: COLORS.gray, fontSize: 14, marginBottom: 5 },
  note: { color: COLORS.gray, fontSize: 11, textAlign: 'center', marginTop: 16 },
})
