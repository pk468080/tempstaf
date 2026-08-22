import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { COLORS } from '../constants/theme'
import { RootStackParamList } from '../types'
import { useBooking } from '../context/BookingContext'
import Header from '../components/Header'
import PrimaryButton from '../components/PrimaryButton'

type Props = NativeStackScreenProps<RootStackParamList, 'BookingConfirmed'>

export default function BookingConfirmedScreen({ navigation }: Props) {
  const { bookingId, selectedWorker, shiftStarted, shiftEnded, resetBooking } = useBooking()
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.page}>
        <Header />
        <View style={styles.success}>
          <Text style={styles.check}>✓</Text>
          <Text style={styles.title}>Booking confirmed</Text>
          <Text style={styles.text}>Payment received and your booking is ready.</Text>
          <Text style={styles.id}>{bookingId}</Text>
        </View>
        {selectedWorker && <View style={styles.worker}><View style={styles.avatar}><Text style={styles.avatarText}>{selectedWorker.name[0]}</Text></View><View><Text style={styles.name}>{selectedWorker.name}</Text><Text style={styles.service}>{selectedWorker.service}</Text><Text style={styles.meta}>★ {selectedWorker.rating} · {selectedWorker.distance}</Text></View></View>}
        <View style={styles.status}><Text style={styles.statusTitle}>
                                      {shiftEnded
                                        ? 'Shift completed'
                                        : shiftStarted
                                          ? 'Shift in progress'
                                          : 'Worker assigned'}
                                    </Text><Text style={styles.text}>
                                             Your booking is confirmed. The worker will be notified and tracking will begin when they are on the way.
                                           </Text></View>
        {!shiftEnded && <PrimaryButton title={shiftStarted ? 'Manage Shift' : 'Track Worker'} onPress={() => navigation.navigate('Tracking')} />}
        <PrimaryButton title="Back to Home" onPress={() => { resetBooking(); navigation.reset({ index: 0, routes: [{ name: 'Home' }] }) }} style={styles.secondary} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.light },
  page: { padding: 22, paddingBottom: 45 },
  success: { width: '100%', backgroundColor: '#ECFDF3', borderRadius: 20, padding: 22, alignItems: 'center', marginBottom: 16 },
  check: { color: COLORS.green, fontSize: 42, fontWeight: '900' },
  title: { color: COLORS.navy, fontSize: 21, fontWeight: '900', marginVertical: 6 },
  text: { color: COLORS.gray, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  id: { color: COLORS.teal, fontSize: 14, fontWeight: '900', marginTop: 10 },
  worker: { width: '100%', flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 18, borderWidth: 1, borderColor: COLORS.border, padding: 16, marginBottom: 14 },
  avatar: { width: 54, height: 54, borderRadius: 27, backgroundColor: COLORS.navy, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  avatarText: { color: 'white', fontSize: 21, fontWeight: '800' },
  name: { color: COLORS.navy, fontSize: 16, fontWeight: '800' },
  service: { color: COLORS.teal, fontSize: 13, fontWeight: '700', marginTop: 3 },
  meta: { color: COLORS.gray, fontSize: 12, marginTop: 4 },
  status: { width: '100%', backgroundColor: 'white', borderRadius: 18, borderWidth: 1, borderColor: COLORS.border, padding: 18, marginBottom: 14 },
  statusTitle: { color: COLORS.navy, fontSize: 16, fontWeight: '800', marginBottom: 5 },
  secondary: { backgroundColor: COLORS.navy },
})
