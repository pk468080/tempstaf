import { Image, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { COLORS, LOGO } from '../constants/theme'
import { RootStackParamList } from '../types'
import { SERVICES, iconFor } from '../data/catalog'
import { useBooking } from '../context/BookingContext'

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>

export default function HomeScreen({ navigation }: Props) {
  const { resetBooking, setSelectedService } = useBooking()

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.top}>
          <Image source={LOGO} style={styles.logo} resizeMode="contain" />
          <View><Text style={styles.small}>Hello 👋</Text><Text style={styles.name}>Need staff today?</Text></View>
        </View>

        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Reliable staff, when you need them.</Text>
          <Text style={styles.heroText}>Book temporary staff for home or office work.</Text>
          <TouchableOpacity style={styles.heroButton} onPress={() => { resetBooking(); navigation.navigate('Services') }}>
            <Text style={styles.buttonText}>Find Staff</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.section}>Popular services</Text>
        <View style={styles.grid}>
          {SERVICES.map(service => (
            <TouchableOpacity key={service} style={styles.card} onPress={() => {
              resetBooking(); setSelectedService(service); navigation.navigate('Services')
            }}>
              <Text style={styles.icon}>{iconFor(service)}</Text>
              <Text style={styles.cardText}>{service}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.light },
  content: { padding: 22, paddingBottom: 45 },
  top: { flexDirection: 'row', alignItems: 'center', marginBottom: 22 },
  logo: { width: 64, height: 64, marginRight: 14 },
  small: { color: COLORS.gray, fontSize: 13 },
  name: { color: COLORS.navy, fontSize: 22, fontWeight: '800' },
  hero: { backgroundColor: COLORS.navy, borderRadius: 24, padding: 22, marginBottom: 28 },
  heroTitle: { color: 'white', fontSize: 25, lineHeight: 31, fontWeight: '800' },
  heroText: { color: '#D8E4EF', fontSize: 14, lineHeight: 21, marginTop: 8, marginBottom: 18 },
  heroButton: { backgroundColor: COLORS.orange, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: 'white', fontSize: 17, fontWeight: '800' },
  section: { color: COLORS.navy, fontSize: 20, fontWeight: '800', marginBottom: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: { width: '48%', backgroundColor: 'white', borderWidth: 1, borderColor: COLORS.border, borderRadius: 18, padding: 16, marginBottom: 12 },
  icon: { fontSize: 27, marginBottom: 7 },
  cardText: { color: COLORS.navy, fontSize: 14, fontWeight: '800' },
})
