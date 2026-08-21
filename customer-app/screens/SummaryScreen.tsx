import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { COLORS } from '../constants/theme'
import { RootStackParamList } from '../types'
import { useBooking } from '../context/BookingContext'
import Header from '../components/Header'
import PrimaryButton from '../components/PrimaryButton'

type Props = NativeStackScreenProps<RootStackParamList, 'Summary'>

export default function SummaryScreen({ navigation }: Props) {
  const { selectedWorker, selectedService, selectedDuration, bookingMode, scheduledDate, address, coordinates, total, setBookingId } = useBooking()
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.page}>
        <Header onBack={() => navigation.goBack()} />
        <Text style={styles.title}>Review your booking</Text>

        {selectedWorker && (
          <View style={styles.worker}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{selectedWorker.name[0]}</Text></View>
            <View><Text style={styles.name}>{selectedWorker.name}</Text><Text style={styles.service}>{selectedWorker.service}</Text><Text style={styles.meta}>★ {selectedWorker.rating} · {selectedWorker.jobs} jobs</Text></View>
          </View>
        )}

        <View style={styles.summary}>
          <Text style={styles.label}>Service</Text><Text style={styles.value}>{selectedService}</Text>
          <Text style={styles.label}>Duration</Text><Text style={styles.value}>{selectedDuration}</Text>
          <Text style={styles.label}>Booking type</Text><Text style={styles.value}>{bookingMode}</Text>
          {scheduledDate ? <><Text style={styles.label}>Schedule</Text><Text style={styles.value}>{scheduledDate}</Text></> : null}
          <Text style={styles.label}>Location</Text><Text style={styles.value}>{address === 'Current location' ? coordinates : address}</Text>
        </View>

        <View style={styles.price}>
          <Text style={styles.priceLabel}>Total payable</Text>
          <Text style={styles.amount}>₹{total.toLocaleString('en-IN')}</Text>
          <Text style={styles.note}>Payment is required before the booking is confirmed.</Text>
        </View>

        <PrimaryButton title="Continue to Payment" onPress={() => {
          setBookingId(`TS-${Date.now().toString().slice(-8)}`)
          navigation.navigate('Payment')
        }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.light },
  page: { padding: 22, paddingBottom: 45 },
  title: { color: COLORS.navy, fontSize: 31, fontWeight: '800', marginBottom: 18 },
  worker: { width: '100%', flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 18, borderWidth: 2, borderColor: COLORS.orange, padding: 16, marginBottom: 16 },
  avatar: { width: 54, height: 54, borderRadius: 27, backgroundColor: COLORS.navy, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  avatarText: { color: 'white', fontSize: 21, fontWeight: '800' },
  name: { color: COLORS.navy, fontSize: 16, fontWeight: '800' },
  service: { color: COLORS.teal, fontSize: 13, fontWeight: '700', marginTop: 3 },
  meta: { color: COLORS.gray, fontSize: 12, marginTop: 4 },
  summary: { width: '100%', backgroundColor: 'white', borderRadius: 18, padding: 18, borderWidth: 1, borderColor: COLORS.border, marginBottom: 16 },
  label: { color: COLORS.gray, fontSize: 12, marginBottom: 3 },
  value: { color: COLORS.navy, fontSize: 16, fontWeight: '800', marginBottom: 12 },
  price: { width: '100%', backgroundColor: COLORS.navy, borderRadius: 20, padding: 20, marginBottom: 4 },
  priceLabel: { color: '#D8E4EF', fontSize: 13 },
  amount: { color: 'white', fontSize: 31, fontWeight: '900', marginVertical: 5 },
  note: { color: '#D8E4EF', fontSize: 12, lineHeight: 18 },
})
