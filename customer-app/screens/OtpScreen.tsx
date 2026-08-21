import { useState } from 'react'
import { Alert, Image, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity } from 'react-native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { COLORS, LOGO } from '../constants/theme'
import { RootStackParamList } from '../types'
import PrimaryButton from '../components/PrimaryButton'
import { verifyDevelopmentLoginOtp } from '../services/booking'

type Props = NativeStackScreenProps<RootStackParamList, 'OTP'>

export default function OtpScreen({ navigation, route }: Props) {
  const [otp, setOtp] = useState('')
  const verify = () => {
    if (!verifyDevelopmentLoginOtp(otp)) {
      Alert.alert('Invalid OTP', 'Development OTP is 123456.')
      return
    }
    navigation.reset({ index: 0, routes: [{ name: 'Home' }] })
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Image source={LOGO} style={styles.logo} resizeMode="contain" />
        <Text style={styles.title}>Verify your number</Text>
        <Text style={styles.subtitle}>We sent a 6-digit OTP to</Text>
        <Text style={styles.phone}>+91 {route.params.phone}</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter OTP"
          placeholderTextColor="#9CA3AF"
          keyboardType="number-pad"
          maxLength={6}
          value={otp}
          onChangeText={setOtp}
        />
        <PrimaryButton title="Verify & Continue" onPress={verify} disabled={otp.length !== 6} />
        <Text style={styles.dev}>Development OTP: 123456</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>Change number</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.light },
  content: { flexGrow: 1, padding: 28, paddingTop: 55, alignItems: 'center' },
  logo: { width: 90, height: 90, marginBottom: 30 },
  title: { width: '100%', fontSize: 28, fontWeight: '800', color: COLORS.navy, marginBottom: 10 },
  subtitle: { width: '100%', color: COLORS.gray, fontSize: 15 },
  phone: { width: '100%', color: COLORS.navy, fontWeight: '700', marginVertical: 18 },
  input: { width: '100%', height: 56, borderWidth: 1, borderColor: '#D9DEE5', borderRadius: 14, backgroundColor: 'white', paddingHorizontal: 16, fontSize: 20, letterSpacing: 6, textAlign: 'center', color: COLORS.navy },
  dev: { color: COLORS.orange, fontWeight: '700', marginTop: 14, marginBottom: 20 },
  back: { color: COLORS.teal, fontSize: 15, fontWeight: '700' },
})
