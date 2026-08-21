import { useState } from 'react'
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { COLORS } from '../constants/theme'
import { RootStackParamList } from '../types'
import { getCurrentLocation } from '../services/location'
import { useBooking } from '../context/BookingContext'
import Header from '../components/Header'
import PrimaryButton from '../components/PrimaryButton'

type Props = NativeStackScreenProps<RootStackParamList, 'Location'>

export default function LocationScreen({ navigation }: Props) {
  const { selectedService, selectedDuration, bookingMode, address, coordinates, setAddress, setCoordinates } = useBooking()
  const [loading, setLoading] = useState(false)

  const current = async () => {
    setLoading(true)
    try {
      const result = await getCurrentLocation()
      setCoordinates(result.label)
      setAddress('Current location')
    } catch {
      Alert.alert('Permission needed', 'Allow location access or enter the address manually.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.page}>
        <Header onBack={() => navigation.goBack()} />
        <Text style={styles.title}>Where do you need staff?</Text>
        <Text style={styles.subtitle}>Choose your location so we can find nearby workers.</Text>

        <TouchableOpacity style={styles.location} onPress={current}>
          <View style={styles.icon}><Text style={{ fontSize: 20 }}>📍</Text></View>
          <View style={styles.content}><Text style={styles.locationTitle}>{loading ? 'Getting location...' : 'Use my current location'}</Text><Text style={styles.description}>Allow location access on this device.</Text></View>
        </TouchableOpacity>

        <Text style={styles.or}>OR</Text>

        <TextInput
          style={styles.address}
          placeholder="Enter full service address"
          placeholderTextColor="#9CA3AF"
          multiline
          value={address === 'Current location' ? '' : address}
          onChangeText={v => { setAddress(v); setCoordinates('') }}
        />

        {address === 'Current location' && (
          <View style={styles.success}><Text style={styles.green}>✓ Current location selected</Text><Text style={styles.small}>{coordinates}</Text></View>
        )}

        <View style={styles.summary}>
          <Text style={styles.label}>Service</Text><Text style={styles.value}>{selectedService}</Text>
          <Text style={styles.label}>Duration</Text><Text style={styles.value}>{selectedDuration}</Text>
          <Text style={styles.label}>Booking type</Text><Text style={styles.value}>{bookingMode}</Text>
        </View>

        <PrimaryButton
          title="Find Nearby Staff"
          onPress={() => {
            if (!address.trim()) { Alert.alert('Location required', 'Select your location or enter an address.'); return }
            navigation.navigate('Workers')
          }}
        />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.light },
  page: { padding: 22, paddingBottom: 45 },
  title: { color: COLORS.navy, fontSize: 31, fontWeight: '800', marginBottom: 7 },
  subtitle: { color: COLORS.gray, fontSize: 15, lineHeight: 22, marginBottom: 22 },
  location: { width: '100%', flexDirection: 'row', backgroundColor: 'white', borderWidth: 1, borderColor: COLORS.border, borderRadius: 18, padding: 18 },
  icon: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFF1DF', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  content: { flex: 1, justifyContent: 'center' },
  locationTitle: { color: COLORS.navy, fontSize: 16, fontWeight: '800', marginBottom: 5 },
  description: { color: COLORS.gray, fontSize: 13, lineHeight: 19 },
  or: { color: COLORS.gray, textAlign: 'center', fontSize: 12, fontWeight: '800', marginVertical: 12 },
  address: { width: '100%', minHeight: 100, borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, backgroundColor: 'white', padding: 14, fontSize: 15, color: COLORS.navy, textAlignVertical: 'top' },
  success: { backgroundColor: '#ECFDF3', borderRadius: 15, padding: 14, marginTop: 12 },
  green: { color: COLORS.green, fontWeight: '800', marginBottom: 4 },
  small: { color: COLORS.gray, fontSize: 12 },
  summary: { width: '100%', backgroundColor: 'white', borderRadius: 18, padding: 18, borderWidth: 1, borderColor: COLORS.border, marginTop: 18, marginBottom: 16 },
  label: { color: COLORS.gray, fontSize: 12, marginBottom: 3 },
  value: { color: COLORS.navy, fontSize: 16, fontWeight: '800', marginBottom: 12 },
})
