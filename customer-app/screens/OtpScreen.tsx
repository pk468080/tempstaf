import { useState } from 'react'
import {
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
} from 'react-native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'

import { COLORS, LOGO } from '../constants/theme'
import { RootStackParamList } from '../types'
import PrimaryButton from '../components/PrimaryButton'
import {
  ensureDevelopmentSession,
  verifyDevelopmentLoginOtp,
} from '../services/booking'

type Props = NativeStackScreenProps<RootStackParamList, 'OTP'>

export default function OtpScreen({
  navigation,
  route,
}: Props) {
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)

  const verify = async () => {
    if (otp !== '123456') {
      Alert.alert(
        'Invalid OTP',
        'Please enter the test OTP 123456.'
      )
      return
    }

    if (loading) {
      return
    }

    setLoading(true)

    try {
      await ensureDevelopmentSession(route.params.phone)
      
navigation.reset({
  index: 0,
  routes: [{ name: 'CustomerDetails' }],
})
    } catch (error: any) {
      console.error(
        '[TempStaff] Development authentication failed:',
        error
      )

      Alert.alert(
        'Authentication Error',
        error?.message ||
          'Unable to create the development session.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Image
          source={LOGO}
          style={styles.logo}
          resizeMode="contain"
        />

        <Text style={styles.title}>
          Verify your number
        </Text>

        <Text style={styles.subtitle}>
          Enter the 6-digit verification code for
        </Text>

        <Text style={styles.phone}>
          {route.params.phone}
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Enter OTP"
          placeholderTextColor="#9CA3AF"
          keyboardType="number-pad"
          maxLength={6}
          value={otp}
          onChangeText={(value) =>
            setOtp(value.replace(/\D/g, ''))
          }
          editable={!loading}
          autoFocus
        />

        <PrimaryButton
          title={
            loading
              ? 'Verifying...'
              : 'Verify & Continue'
          }
          onPress={verify}
          disabled={otp.length !== 6 || loading}
        />

        <Text style={styles.dev}>
          Test OTP: 123456
        </Text>

        <TouchableOpacity
          onPress={() => navigation.goBack()}
          disabled={loading}
        >
          <Text style={styles.back}>
            Change number
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.light,
  },

  content: {
    flexGrow: 1,
    padding: 28,
    paddingTop: 55,
    alignItems: 'center',
  },

  logo: {
    width: 90,
    height: 90,
    marginBottom: 30,
  },

  title: {
    width: '100%',
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.navy,
    marginBottom: 10,
  },

  subtitle: {
    width: '100%',
    color: COLORS.gray,
    fontSize: 15,
  },

  phone: {
    width: '100%',
    color: COLORS.navy,
    fontWeight: '700',
    marginVertical: 18,
    fontSize: 16,
  },

  input: {
    width: '100%',
    height: 56,
    borderWidth: 1,
    borderColor: '#D9DEE5',
    borderRadius: 14,
    backgroundColor: 'white',
    paddingHorizontal: 16,
    fontSize: 20,
    letterSpacing: 6,
    textAlign: 'center',
    color: COLORS.navy,
  },

  dev: {
    color: COLORS.orange,
    fontWeight: '700',
    marginTop: 14,
    marginBottom: 20,
  },

  back: {
    color: COLORS.teal,
    fontSize: 15,
    fontWeight: '700',
  },
})