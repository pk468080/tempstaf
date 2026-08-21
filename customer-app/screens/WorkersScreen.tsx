import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { COLORS } from '../constants/theme'
import { RootStackParamList } from '../types'
import { WORKERS } from '../data/catalog'
import { useBooking } from '../context/BookingContext'
import Header from '../components/Header'
import WorkerCard from '../components/WorkerCard'

type Props = NativeStackScreenProps<RootStackParamList, 'Workers'>

export default function WorkersScreen({ navigation }: Props) {
  const { selectedService, address, setSelectedWorker } = useBooking()
  const matching = WORKERS.filter(w => w.service === selectedService)

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.page}>
        <Header onBack={() => navigation.goBack()} />
        <Text style={styles.title}>Available Staff</Text>
        <Text style={styles.subtitle}>Verified {selectedService} workers near your location.</Text>

        <View style={styles.info}>
          <Text style={styles.pin}>📍</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.infoTitle}>Staff near you</Text>
            <Text style={styles.infoText}>{address === 'Current location' ? 'Using your current location' : address}</Text>
          </View>
        </View>

        <Text style={styles.count}>{matching.length} staff available</Text>

        {matching.length === 0 ? (
          <View style={styles.empty}><Text style={styles.emptyTitle}>No staff available</Text><Text style={styles.emptyText}>Try another service or location.</Text></View>
        ) : matching.map(worker => (
          <WorkerCard key={worker.id} worker={worker} onSelect={() => { setSelectedWorker(worker); navigation.navigate('Summary') }} />
        ))}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.light },
  page: { padding: 22, paddingBottom: 45 },
  title: { color: COLORS.navy, fontSize: 31, fontWeight: '800', marginBottom: 7 },
  subtitle: { color: COLORS.gray, fontSize: 15, lineHeight: 22, marginBottom: 22 },
  info: { width: '100%', flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderWidth: 1, borderColor: COLORS.border, borderRadius: 18, padding: 16, marginBottom: 20 },
  pin: { fontSize: 20, marginRight: 14 },
  infoTitle: { color: COLORS.navy, fontSize: 16, fontWeight: '800' },
  infoText: { color: COLORS.gray, fontSize: 13, marginTop: 4 },
  count: { color: COLORS.navy, fontSize: 17, fontWeight: '800', marginBottom: 12 },
  empty: { backgroundColor: 'white', borderRadius: 18, padding: 25, alignItems: 'center' },
  emptyTitle: { color: COLORS.navy, fontSize: 18, fontWeight: '800' },
  emptyText: { color: COLORS.gray, marginTop: 7 },
})
