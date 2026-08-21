import { useState } from 'react'
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { COLORS } from '../constants/theme'
import { RootStackParamList } from '../types'
import { useBooking } from '../context/BookingContext'
import { verifyDevelopmentEndOtp, verifyDevelopmentStartOtp } from '../services/booking'
import Header from '../components/Header'
import PrimaryButton from '../components/PrimaryButton'

type Props = NativeStackScreenProps<RootStackParamList, 'Tracking'>

export default function TrackingScreen({ navigation }: Props) {
  const { selectedWorker, selectedService, shiftStarted, shiftEnded, startOtp, endOtp, setStartOtp, setEndOtp, setShiftStarted, setShiftEnded, resetBooking } = useBooking()

  const start = () => {
    if (!verifyDevelopmentStartOtp(startOtp)) { Alert.alert('Invalid start OTP', 'Development start OTP is 246810.'); return }
    setShiftStarted(true)
  }
  const end = () => {
    if (!verifyDevelopmentEndOtp(endOtp)) { Alert.alert('Invalid end OTP', 'Development end OTP is 864201.'); return }
    setShiftEnded(true)
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.page}>
        <Header onBack={() => navigation.goBack()} />
        <Text style={styles.title}>Track your worker</Text>
        <Text style={styles.subtitle}>The map is a development placeholder. Real-time Supabase location will be connected after the worker app.</Text>

        <View style={styles.map}>
          <Text style={styles.pin}>📍</Text>
          <Text style={styles.mapTitle}>Live tracking area</Text>
          <Text style={styles.mapText}>Worker: {selectedWorker?.name}</Text>
          <Text style={styles.mapText}>Distance: {selectedWorker?.distance}</Text>
          <Text style={styles.mapText}>Service: {selectedService}</Text>
        </View>

        {!shiftStarted && !shiftEnded && (
          <View style={styles.card}>
            <Text style={styles.section}>Worker has arrived?</Text>
            <Text style={styles.text}>Enter the start OTP to begin the shift.</Text>
            <TextInput style={styles.input} placeholder="Start OTP" placeholderTextColor="#9CA3AF" keyboardType="number-pad" maxLength={6} value={startOtp} onChangeText={setStartOtp} />
            <PrimaryButton title="Start Shift" onPress={start} />
            <Text style={styles.dev}>Development start OTP: 246810</Text>
          </View>
        )}

        {shiftStarted && !shiftEnded && (
          <View style={styles.card}>
            <Text style={styles.section}>Shift started</Text>
            <Text style={styles.text}>The worker is now marked as working.</Text>
            <TextInput style={styles.input} placeholder="End OTP" placeholderTextColor="#9CA3AF" keyboardType="number-pad" maxLength={6} value={endOtp} onChangeText={setEndOtp} />
            <PrimaryButton title="End Shift" onPress={end} />
            <Text style={styles.dev}>Development end OTP: 864201</Text>
          </View>
        )}

        {shiftEnded && (
          <View style={styles.done}>
            <Text style={styles.check}>✓</Text>
            <Text style={styles.doneTitle}>Shift completed</Text>
            <Text style={styles.text}>End OTP verified successfully.</Text>
            <PrimaryButton title="Finish & Go Home" onPress={() => { resetBooking(); navigation.reset({ index: 0, routes: [{ name: 'Home' }] }) }} />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.light },
  page: { padding: 22, paddingBottom: 45 },
  title: { color: COLORS.navy, fontSize: 31, fontWeight: '800', marginBottom: 7 },
  subtitle: { color: COLORS.gray, fontSize: 15, lineHeight: 22, marginBottom: 22 },
  map: { width: '100%', minHeight: 270, borderRadius: 22, backgroundColor: '#DCEBF1', alignItems: 'center', justifyContent: 'center', padding: 20, marginBottom: 18 },
  pin: { fontSize: 46, marginBottom: 8 },
  mapTitle: { color: COLORS.navy, fontSize: 20, fontWeight: '900', marginBottom: 8 },
  mapText: { color: COLORS.gray, fontSize: 13, marginBottom: 3 },
  card: { width: '100%', backgroundColor: 'white', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: COLORS.border, marginBottom: 16 },
  section: { color: COLORS.navy, fontSize: 20, fontWeight: '800', marginBottom: 7 },
  text: { color: COLORS.gray, fontSize: 14, lineHeight: 20 },
  input: { width: '100%', height: 56, borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, backgroundColor: 'white', paddingHorizontal: 16, fontSize: 20, letterSpacing: 6, textAlign: 'center', color: COLORS.navy, marginTop: 14 },
  dev: { color: COLORS.orange, fontWeight: '700', marginTop: 14, textAlign: 'center' },
  done: { width: '100%', backgroundColor: '#ECFDF3', borderRadius: 20, padding: 22, alignItems: 'center' },
  check: { color: COLORS.green, fontSize: 42, fontWeight: '900' },
  doneTitle: { color: COLORS.navy, fontSize: 21, fontWeight: '900', marginVertical: 6 },
})
