import { useState } from 'react'
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'

import { AppButton } from '../../components/ui/AppButton'
import { ScreenContainer } from '../../components/layout/ScreenContainer'
import { verifyOtp } from '../../services/auth/auth.service'

type OtpScreenProps = {
  phone: string
  onVerified: (phone: string) => void
}

export default function OtpScreen({
  phone,
  onVerified,
}: OtpScreenProps) {
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const isValid = otp.length === 6

  async function handleVerify() {
    if (!isValid || loading) {
      return
    }

    setError('')
    setLoading(true)

    const result = await verifyOtp(phone, otp)

    setLoading(false)

    if (!result.success) {
      setError(result.error ?? 'Invalid OTP')
      return
    }

    onVerified(phone)
  }

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>
          <View>
            <Text style={styles.title}>Enter OTP</Text>

            <Text style={styles.subtitle}>
              Enter the 6-digit OTP sent to {phone}.
            </Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>OTP</Text>

            <TextInput
              value={otp}
              onChangeText={(value) => {
                setError('')
                setOtp(value.replace(/\D/g, ''))
              }}
              placeholder="Enter 6-digit OTP"
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
              style={styles.input}
            />

            {error ? (
              <Text style={styles.error}>{error}</Text>
            ) : null}

            <AppButton
              title={loading ? 'Verifying...' : 'Verify OTP'}
              disabled={!isValid || loading}
              onPress={handleVerify}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  )
}

const styles = StyleSheet.create({
  keyboard: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 24,
    paddingTop: 60,
    paddingBottom: 32,
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    marginTop: 10,
    fontSize: 16,
    lineHeight: 24,
    color: '#6B7280',
  },
  form: {
    gap: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 20,
    letterSpacing: 4,
    color: '#111827',
  },
  error: {
    fontSize: 14,
    color: '#DC2626',
  },
})