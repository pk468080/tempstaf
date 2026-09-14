import { useMemo, useState } from 'react'
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
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
  'VerifyOtp'
>

function getFriendlyPhone(phone: string) {
  if (phone.length <= 6) {
    return phone
  }

  return `${phone.slice(0, 4)} ${phone.slice(4, -4)} ${phone.slice(-4)}`
}

export default function VerifyOtpScreen({
  navigation,
  route,
}: Props) {
  const { phone } = route.params

  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)

  const cleanOtp = useMemo(
    () => otp.replace(/\D/g, '').slice(0, 6),
    [otp]
  )

  const verifyOtp = async () => {
    if (cleanOtp.length !== 6) {
      Alert.alert(
        'Invalid OTP',
        'Enter the 6-digit verification code.'
      )
      return
    }

    try {
      setLoading(true)

      const {
        data: { user },
        error,
      } = await supabase.auth.verifyOtp({
        phone,
        token: cleanOtp,
        type: 'sms',
      })

      if (error) {
        throw error
      }

      if (!user) {
        throw new Error(
          'Authentication succeeded without returning a user.'
        )
      }

      /*
       * The authenticated user's phone is authoritative.
       * Never trust the phone entered on the previous screen
       * after OTP verification.
       */
      const verifiedPhone =
        user.phone || phone

      const {
        data: existingProfile,
        error: profileError,
      } = await supabase
        .from('profiles')
        .select(
          'id, full_name, phone, email, role, is_active, company_name'
        )
        .eq('id', user.id)
        .maybeSingle()

      if (profileError) {
        await supabase.auth.signOut()
        throw profileError
      }

      /*
       * New phone-authenticated users may not have a
       * profile row yet. The profiles table defaults role
       * to customer and is_active to true, while the
       * server-side trigger protects privileged fields.
       */
      if (!existingProfile) {
        const {
          data: createdProfile,
          error: createProfileError,
        } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            phone: verifiedPhone,
            email: user.email ?? null,
          })
          .select(
            'id, full_name, phone, email, role, is_active, company_name'
          )
          .single()

        if (createProfileError) {
          await supabase.auth.signOut()
          throw createProfileError
        }

        if (
          !createdProfile ||
          createdProfile.role !== 'customer' ||
          createdProfile.is_active !== true
        ) {
          await supabase.auth.signOut()

          Alert.alert(
            'Account unavailable',
            'Your account could not be configured as an active customer account.'
          )

          return
        }

        navigation.reset({
          index: 0,
          routes: [
            {
              name: 'CustomerDetails',
            },
          ],
        })

        return
      }

      if (
        existingProfile.role !== 'customer'
      ) {
        await supabase.auth.signOut()

        Alert.alert(
          'Wrong account type',
          'This account cannot be used in the TempStaff customer app.'
        )

        return
      }

      if (
        existingProfile.is_active !== true
      ) {
        await supabase.auth.signOut()

        Alert.alert(
          'Account inactive',
          'Your TempStaff customer account is currently inactive.'
        )

        return
      }

      /*
       * Keep the customer's profile phone/email aligned
       * with the authenticated Supabase user.
       */
      const profileUpdates: {
        phone?: string
        email?: string | null
      } = {}

      if (
        existingProfile.phone !== verifiedPhone
      ) {
        profileUpdates.phone = verifiedPhone
      }

      const verifiedEmail =
        user.email ?? null

      if (
        existingProfile.email !== verifiedEmail
      ) {
        profileUpdates.email = verifiedEmail
      }

      if (
        Object.keys(profileUpdates).length > 0
      ) {
        const { error: updateError } =
          await supabase
            .from('profiles')
            .update(profileUpdates)
            .eq('id', user.id)

        if (updateError) {
          await supabase.auth.signOut()
          throw updateError
        }
      }

      const profileComplete =
        (existingProfile.full_name ?? '')
          .trim().length >= 2 &&
        (existingProfile.company_name ?? '')
          .trim().length >= 2

      navigation.reset({
        index: 0,
        routes: [
          {
            name: profileComplete
              ? 'Home'
              : 'CustomerDetails',
          },
        ],
      })
    } catch (error: any) {
      console.error(
        '[TempStaff] Customer OTP verification failed:',
        error
      )

      Alert.alert(
        'OTP verification failed',
        error?.message ||
          'The verification code is invalid or expired. Please request a new code.'
      )
    } finally {
      setLoading(false)
    }
  }

  const resendOtp = async () => {
    try {
      setResending(true)

      const { error } =
        await supabase.auth.signInWithOtp({
          phone,
        })

      if (error) {
        throw error
      }

      setOtp('')

      Alert.alert(
        'OTP sent',
        'A new verification code has been sent to your mobile number.'
      )
    } catch (error: any) {
      console.error(
        '[TempStaff] Failed to resend customer OTP:',
        error
      )

      Alert.alert(
        'Unable to resend OTP',
        error?.message ||
          'Please wait before requesting another code.'
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
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() =>
              navigation.goBack()
            }
            disabled={loading}
          >
            <Text style={styles.backText}>
              ‹ Back
            </Text>
          </TouchableOpacity>

          <View style={styles.form}>
            <Text style={styles.title}>
              Verify your number
            </Text>

            <Text style={styles.subtitle}>
              Enter the 6-digit code sent to
            </Text>

            <Text style={styles.phone}>
              {getFriendlyPhone(phone)}
            </Text>

            <Text style={styles.label}>
              Verification code
            </Text>

            <TextInput
              style={styles.otpInput}
              value={cleanOtp}
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
              Enter the 6-digit OTP from the SMS.
            </Text>

            <PrimaryButton
              title={
                loading
                  ? 'Verifying...'
                  : 'Verify OTP'
              }
              onPress={verifyOtp}
              disabled={
                loading ||
                cleanOtp.length !== 6
              }
            />

            <TouchableOpacity
              style={styles.resendButton}
              onPress={resendOtp}
              disabled={
                loading || resending
              }
            >
              <Text
                style={[
                  styles.resendText,
                  (loading || resending) &&
                    styles.disabledText,
                ]}
              >
                {resending
                  ? 'Sending...'
                  : 'Resend OTP'}
              </Text>
            </TouchableOpacity>

            <Text style={styles.note}>
              For security, verification codes expire
              and repeated requests are rate-limited.
            </Text>
          </View>
        </ScrollView>
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
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 24,
    paddingBottom: 36,
  },

  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },

  backText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F766E',
  },

  form: {
    marginTop: 48,
  },

  title: {
    fontSize: 29,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 10,
  },

  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: '#6B7280',
  },

  phone: {
    marginTop: 5,
    marginBottom: 32,
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },

  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
  },

  otpInput: {
    height: 60,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 8,
    fontSize: 25,
    fontWeight: '700',
    color: '#111827',
  },

  helper: {
    marginTop: 8,
    marginBottom: 22,
    fontSize: 12,
    color: '#6B7280',
  },

  resendButton: {
    alignItems: 'center',
    paddingVertical: 18,
  },

  resendText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F766E',
  },

  disabledText: {
    color: '#9CA3AF',
  },

  note: {
    marginTop: 12,
    fontSize: 12,
    lineHeight: 18,
    color: '#6B7280',
    textAlign: 'center',
  },
})