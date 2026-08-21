import { useState } from 'react'
import { Image, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { COLORS, LOGO } from '../constants/theme'
import { RootStackParamList } from '../types'
import PrimaryButton from '../components/PrimaryButton'

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>

export default function LoginScreen({ navigation }: Props) {
  const [phone, setPhone] = useState('')

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Image source={LOGO} style={styles.logo} resizeMode="contain" />
        <Text style={styles.brand}>Temp<Text style={styles.teal}>Staff</Text></Text>
        <Text style={styles.tagline}>STAFF WHEN YOU NEED THEM.</Text>
        <Text style={styles.title}>Welcome</Text>
        <Text style={styles.subtitle}>Get reliable temporary staff for your home or business.</Text>

        <View style={styles.phoneRow}>
          <View style={styles.country}><Text style={styles.countryText}>🇮🇳 +91</Text></View>
          <TextInput
            style={styles.phone}
            placeholder="Mobile number"
            placeholderTextColor="#9CA3AF"
            keyboardType="number-pad"
            maxLength={10}
            value={phone}
            onChangeText={setPhone}
          />
        </View>

        <PrimaryButton
          title="Continue"
          onPress={() => {
            if (/^\d{10}$/.test(phone)) navigation.navigate('OTP', { phone })
          }}
          disabled={!/^\d{10}$/.test(phone)}
        />
        <Text style={styles.note}>Development authentication only. Real OTP will be connected later.</Text>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.light },
  content: { flexGrow: 1, padding: 28, paddingTop: 40, paddingBottom: 30, alignItems: 'center' },
  logo: { width: 120, height: 120, marginBottom: 8 },
  brand: { fontSize: 38, fontWeight: '800', color: COLORS.navy },
  teal: { color: COLORS.teal },
  tagline: { marginTop: 4, color: COLORS.gray, fontSize: 11, fontWeight: '700', letterSpacing: 2, marginBottom: 55 },
  title: { width: '100%', fontSize: 28, fontWeight: '800', color: COLORS.navy, marginBottom: 10 },
  subtitle: { width: '100%', color: COLORS.gray, fontSize: 15, lineHeight: 22, marginBottom: 28 },
  phoneRow: { width: '100%', flexDirection: 'row', marginBottom: 18 },
  country: { height: 56, paddingHorizontal: 14, borderWidth: 1, borderColor: '#D9DEE5', borderRadius: 14, backgroundColor: 'white', justifyContent: 'center', marginRight: 8 },
  countryText: { color: COLORS.navy, fontSize: 15, fontWeight: '600' },
  phone: { flex: 1, height: 56, borderWidth: 1, borderColor: '#D9DEE5', borderRadius: 14, backgroundColor: 'white', paddingHorizontal: 16, fontSize: 16, color: COLORS.navy },
  note: { color: COLORS.gray, fontSize: 11, lineHeight: 17, textAlign: 'center', marginTop: 16 },
})
