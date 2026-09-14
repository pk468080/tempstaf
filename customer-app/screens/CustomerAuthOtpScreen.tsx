import { useMemo, useState } from 'react'
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'

import { COLORS } from '../constants/theme'
import { RootStackParamList } from '../types'
import { supabase } from '../lib/supabase'
import PrimaryButton from '../components/PrimaryButton'

type Props = NativeStackScreenProps<
  RootStackParamList,
  'CustomerAuthOtp'
>

export default function CustomerAuthOtpScreen({
  navigation,
  route,
}: Props) {
  const { email } = route.params

  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)

  const normalizedOtp = useMemo(
    () => otp.replace(/\D/g, '').slice(0, 6),
    [otp]
  )

  const verifyCustomerProfile = async (
    userId: string
  ) => {
    const {
      data: profile,
      error,
    } = await supabase
      .from('profiles')
      .select('id, role, is_active')
      .eq('id', userId)
      .maybeSingle()

    if (error) {
      throw error
    }

    if (!profile) {
      throw new Error(
        'Your customer profile has not been created yet.'
      )
    }

    if (profile.role !== 'customer') {
      throw new Error(
        'This account cannot be used in the TempStaff customer app.'
      )
    }

    if (profile.is_active !== true) {
      throw new Error(
        'Your TempStaff customer account is currently inactive.'
      )
    }
  }

  const handleVerify = async () => {
    if (normalizedOtp.length !== 6) {
      Alert.alert(
        'Invalid code',
        'Enter the six-digit verification code from your email.'
      )
      return
    }

    try {
      setLoading(true)

      const {
        data,
        error,
      } = await supabase.auth.verifyOtp({
        email,
        token: normalizedOtp,
        type: 'email',
      })

      if (error) {
        throw error
      }

      if (!data.user || !data.session) {
        throw new Error(
          'Verification succeeded without an active session.'
        )
      }

      if (!data.user.email_confirmed_at) {
        await supabase.auth.signOut()

        throw new Error(
          'Your email address has not been verified.'
        )
      }

      await verifyCustomerProfile(data.user.id)

      navigation.reset({
        index: 0,
        routes: [{ name: 'Home' }],
      })
    } catch (error: any) {
      await supabase.auth.signOut()

      console.error(
        '[TempStaff] Customer OTP verification failed:',
        error?.message || 'Unknown verification error'
      )

      Alert.alert(
        'Verification failed',
        error?.message ||
          'The verification code is invalid or has expired.'
      )
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    try {
      setResending(true)

      const { error } =
        await supabase.auth.signInWithOtp({
          email,
          options: {
            shouldCreateUser: false,
          },
        })

      if (error) {
        throw error
      }

      setOtp('')

      Alert.alert(
        'Code sent',
        'A new verification code has been sent to your email address.'
      )
    } catch (error: any) {
      console.error(
        '[TempStaff] Customer OTP resend failed:',
        error?.message || 'Unknown resend error'
      )

      Alert.alert(
        'Unable to resend code',
        error?.message ||
          'Something went wrong. Please try again.'
      )
    } finally {
      setResending(false)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.brand}>
              Temp
              <Text style={styles.teal}>
                Staff
              </Text>
            </Text>

            <Text style={styles.title}>
              Verify your email
            </Text>

            <Text style={styles.subtitle}>
              Enter the six-digit code we sent to
            </Text>

            <Text style={styles.email}>
              {email}
            </Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>
              Verification code
            </Text>

            <TextInput
              style={styles.otpInput}
              value={normalizedOtp}
              onChangeText={setOtp}
              keyboardType="number-pad"
              inputMode="numeric"
              autoComplete="one-time-code"
              textContentType="oneTimeCode"
              maxLength={6}
              placeholder="000000"
              placeholderTextColor="#9CA3AF"
              editable={!loading}
              autoFocus
            />

            <Text style={styles.helper}>
              Enter the code exactly as shown in the email.
            </Text>

            <View style={styles.buttonSpacing}>
              <PrimaryButton
                title={
                  loading
                    ? 'Verifying...'
                    : 'Verify and sign in'
                }
                onPress={handleVerify}
                disabled={
                  loading ||
                  resending ||
                  normalizedOtp.length !== 6
                }
              />
            </View>

            <TouchableOpacity
              style={styles.resendButton}
              onPress={handleResend}
              disabled={loading || resending}
              activeOpacity={0.8}
            >
              <Text style={styles.resendText}>
                {resending
                  ? 'Sending...'
                  : 'Resend code'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.backButton}
              onPress={() =>
                navigation.goBack()
              }
              disabled={loading || resending}
              activeOpacity={0.8}
            >
              <Text style={styles.backText}>
                Back to sign in
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.light,
  },

  keyboard: {
    flex: 1,
  },

  content: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 70,
  },

  header: {
    alignItems: 'center',
  },

  brand: {
    color: COLORS.navy,
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 44,
  },

  teal: {
    color: COLORS.teal,
  },

  title: {
    color: COLORS.navy,
    fontSize: 28,
    lineHeight: 35,
    fontWeight: '800',
    textAlign: 'center',
  },

  subtitle: {
    color: COLORS.gray,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: 12,
  },

  email: {
    color: COLORS.navy,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 5,
  },

  form: {
    marginTop: 48,
  },

  label: {
    color: COLORS.navy,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    marginBottom: 10,
  },

  otpInput: {
    width: '100%',
    height: 64,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#D9DEE5',
    borderRadius: 14,
    paddingHorizontal: 16,
    color: COLORS.navy,
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: 8,
    textAlign: 'center',
  },

  helper: {
    color: COLORS.gray,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 9,
    textAlign: 'center',
  },

  buttonSpacing: {
    marginTop: 28,
  },

  resendButton: {
    alignItems: 'center',
    marginTop: 20,
    paddingVertical: 10,
  },

  resendText: {
    color: COLORS.teal,
    fontSize: 14,
    fontWeight: '700',
  },

  backButton: {
    alignItems: 'center',
    marginTop: 8,
    paddingVertical: 10,
  },

  backText: {
    color: COLORS.gray,
    fontSize: 13,
    fontWeight: '600',
  },
})