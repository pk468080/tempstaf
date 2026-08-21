import { SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { COLORS } from '../constants/theme'
import { RootStackParamList, BookingMode } from '../types'
import { SERVICES, DURATIONS, BOOKING_MODES, iconFor } from '../data/catalog'
import { useBooking } from '../context/BookingContext'
import Header from '../components/Header'
import PrimaryButton from '../components/PrimaryButton'

type Props = NativeStackScreenProps<RootStackParamList, 'Services'>

export default function ServicesScreen({ navigation }: Props) {
  const { selectedService, selectedDuration, bookingMode, scheduledDate, setSelectedService, setSelectedDuration, setBookingMode, setScheduledDate } = useBooking()
  const disabled = !selectedService || !selectedDuration || (bookingMode === 'Scheduled' && !scheduledDate)

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.page}>
        <Header onBack={() => navigation.goBack()} />
        <Text style={styles.title}>Find Staff</Text>
        <Text style={styles.subtitle}>What type of staff do you need?</Text>

        <View style={styles.grid}>
          {SERVICES.map(service => (
            <TouchableOpacity key={service} style={[styles.service, selectedService === service && styles.selected]} onPress={() => setSelectedService(service)}>
              <Text style={styles.icon}>{iconFor(service)}</Text>
              <Text style={[styles.cardText, selectedService === service && styles.selectedText]}>{service}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.section}>How long do you need them?</Text>
        <View style={styles.grid}>
          {DURATIONS.map(duration => (
            <TouchableOpacity key={duration} style={[styles.duration, selectedDuration === duration && styles.selected]} onPress={() => setSelectedDuration(duration)}>
              <Text style={[styles.cardText, selectedDuration === duration && styles.selectedText]}>{duration}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.section}>When do you need them?</Text>
        <View style={styles.modes}>
          {BOOKING_MODES.map(mode => (
            <TouchableOpacity key={mode} style={[styles.mode, bookingMode === mode && styles.selected]} onPress={() => setBookingMode(mode as BookingMode)}>
              <Text style={[styles.modeText, bookingMode === mode && styles.selectedText]}>{mode}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {bookingMode === 'Scheduled' && (
          <TextInput
            style={styles.input}
            placeholder="Date & time (e.g. 25 Aug, 10:00 AM)"
            placeholderTextColor="#9CA3AF"
            value={scheduledDate}
            onChangeText={setScheduledDate}
          />
        )}

        <PrimaryButton title="Continue" disabled={disabled} onPress={() => navigation.navigate('Location')} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.light },
  page: { padding: 22, paddingBottom: 45 },
  title: { color: COLORS.navy, fontSize: 31, fontWeight: '800', marginBottom: 7 },
  subtitle: { color: COLORS.gray, fontSize: 15, lineHeight: 22, marginBottom: 22 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  service: { width: '48%', minHeight: 108, borderRadius: 18, backgroundColor: 'white', borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  duration: { width: '48%', height: 58, borderRadius: 16, backgroundColor: 'white', borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  icon: { fontSize: 27, marginBottom: 7 },
  cardText: { color: COLORS.navy, fontSize: 14, fontWeight: '800', textAlign: 'center' },
  selected: { backgroundColor: COLORS.orange, borderColor: COLORS.orange },
  selectedText: { color: 'white' },
  section: { color: COLORS.navy, fontSize: 20, fontWeight: '800', marginTop: 18, marginBottom: 14 },
  modes: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  mode: { width: '31%', height: 48, borderRadius: 24, backgroundColor: 'white', borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  modeText: { color: COLORS.navy, fontSize: 13, fontWeight: '800' },
  input: { width: '100%', height: 56, borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, backgroundColor: 'white', paddingHorizontal: 16, fontSize: 15, color: COLORS.navy, marginBottom: 4 },
})
