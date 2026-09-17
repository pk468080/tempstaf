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
import { supabase } from '../lib/supabase'
import { RootStackParamList } from '../types'
import PrimaryButton from '../components/PrimaryButton'
import {
  DEV_HARDCODED_OTP,
  DEV_HARDCODED_OTP_MODE,
} from './LoginScreen'

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

async function getCustomerProfileStatus() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) {
    throw userError
  }

  if (!user) {
    throw new Error(
      'Supabase did not return an authenticated user.'
    )
  }

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from('profiles')
    .select(
      `
        id,
        full_name,
        company_name,
        phone,
        role,
        is_active
      `
    )
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) {
    throw profileError
  }

  if (
    profile &&
    profile.role === 'customer' &&
    profile.is_active === true &&
    (profile.full_name ?? '').trim().length >= 2 &&
    (profile.company_name ?? '').trim().length >= 2
  ) {
    return {
      user,
      profile,
      complete: true,
    }
  }

  return {
    user,
    profile,
    complete: false,
  }
}

export default function VerifyOtpScreen({
  navigation,
  route,
}: Props) {
  const { phone } = route.params

  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)

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

      /*
       * ========================================================
       * DEVELOPMENT OTP FLOW
       * ========================================================
       *
       * Temporary testing only.
       *
       * NOTE:
       * Anonymous Supabase authentication cannot identify the
       * same phone number across separate registrations.
       *
       * Therefore this development mode is still temporary.
       * Production must use Supabase Phone OTP.
       */

      if (DEV_HARDCODED_OTP_MODE) {
        if (cleanOtp !== DEV_HARDCODED_OTP) {
          Alert.alert(
            'Invalid OTP',
            `For development testing, use ${DEV_HARDCODED_OTP}.`
          )

          return
        }

        console.log(
          '[TempStaff] DEV OTP accepted'
        )

       let developmentUser = null
const { data: accountCheck, error: accountCheckError } =
  await supabase.rpc('check_account_phone', {
    p_phone: phone,
  })

if (accountCheckError) {
  throw accountCheckError
}

if (
  accountCheck?.exists &&
  accountCheck?.account_type === 'worker'
) {
  Alert.alert(
    'Worker account already exists',
    'This phone number is already registered as a worker account. Close your worker account or use a different number.'
  )
  return
}
/*
 * First check whether the existing development session
 * belongs to this phone number.
 */
const {
  data: existingSessionData,
} =
  await supabase.auth.getSession()

if (existingSessionData.session?.user) {
  const currentUser =
    existingSessionData.session.user

  const {
    data: currentProfile,
    error: currentProfileError,
  } =
    await supabase
      .from('profiles')
      .select(
        `
          id,
          full_name,
          company_name,
          phone,
          role,
          is_active
        `
      )
      .eq('id', currentUser.id)
      .maybeSingle()

  if (currentProfileError) {
    throw currentProfileError
  }

  /*
   * Reuse the existing development user only when
   * the stored phone matches the phone being entered.
   */
  if (
    currentProfile?.phone === phone
  ) {
    developmentUser = currentUser

    console.log(
      '[TempStaff] Reusing existing development customer:',
      currentUser.id
    )

    if (
      currentProfile.role === 'customer' &&
      currentProfile.is_active === true &&
      (currentProfile.full_name ?? '').trim().length >= 2 &&
      (currentProfile.company_name ?? '').trim().length >= 2
    ) {
      console.log(
        '[TempStaff] Existing customer profile complete; skipping details'
      )

      navigation.reset({
        index: 0,
        routes: [
          {
            name: 'CustomerLocation',
          },
        ],
      })

      return
    }
  } else {
    /*
     * A different phone number was entered.
     * Start a new development identity.
     */
    console.log(
      '[TempStaff] Different phone detected; creating new development customer'
    )

    await supabase.auth.signOut()
  }
}

/*
 * No matching development session exists.
 * Create a new anonymous Supabase user.
 */
if (!developmentUser) {
  const {
    data: sessionData,
    error: sessionError,
  } =
    await supabase.auth.signInAnonymously()

  if (sessionError) {
    throw sessionError
  }

  if (
    !sessionData.session ||
    !sessionData.user
  ) {
    throw new Error(
      'Supabase did not return a development authentication session.'
    )
  }

  developmentUser =
    sessionData.user

  console.log(
    '[TempStaff] New development customer created:',
    developmentUser.id
  )
}
console.log(
  '[TempStaff] New customer profile requires details'
)

navigation.reset({
  index: 0,
  routes: [
    {
      name: 'CustomerDetails',
    },
  ],
})

return

/*
 * New customer / incomplete profile.
 * Create the profile record but leave name/company empty.
 * CustomerDetailsScreen will complete it.
 */


        console.log(
          '[TempStaff] New customer profile requires details'
        )

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

      /*
       * ========================================================
       * PRODUCTION SUPABASE PHONE OTP
       * ========================================================
       */

      const {
        data,
        error,
      } = await supabase.auth.verifyOtp({
        phone,
        token: cleanOtp,
        type: 'sms',
      })

      if (error) {
        throw error
      }

      if (!data.session || !data.user) {
        throw new Error(
          'OTP was accepted but no authenticated session was returned.'
        )
      }

      const {
        complete,
      } = await getCustomerProfileStatus()

      if (complete) {
        console.log(
          '[TempStaff] Existing customer verified; skipping details'
        )

        navigation.reset({
          index: 0,
          routes: [
            {
              name: 'CustomerLocation',
            },
          ],
        })

        return
      }

      

      console.log(
        '[TempStaff] New customer verified; details required'
      )

      navigation.reset({
        index: 0,
        routes: [
          {
            name: 'CustomerDetails',
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
          'The verification code could not be verified. Please try again.'
      )
    } finally {
      setLoading(false)
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
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
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
              Enter the 6-digit code for
            </Text>

            <Text style={styles.phone}>
              {getFriendlyPhone(phone)}
            </Text>

            {DEV_HARDCODED_OTP_MODE && (
              <View style={styles.devNotice}>
                <Text style={styles.devNoticeTitle}>
                  DEVELOPMENT MODE
                </Text>

                <Text style={styles.devNoticeText}>
                  SMS verification is temporarily disabled.
                </Text>

                <Text style={styles.devOtp}>
                  Test OTP: {DEV_HARDCODED_OTP}
                </Text>
              </View>
            )}

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
              Enter the 6-digit verification code.
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

            <Text style={styles.note}>
              Development OTP is temporarily enabled.
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
    marginBottom: 24,
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },

  devNotice: {
    marginBottom: 24,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },

  devNoticeTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#92400E',
    marginBottom: 4,
  },

  devNoticeText: {
    fontSize: 12,
    color: '#92400E',
  },

  devOtp: {
    marginTop: 6,
    fontSize: 15,
    fontWeight: '800',
    color: '#92400E',
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

  note: {
    marginTop: 20,
    fontSize: 12,
    lineHeight: 18,
    color: '#6B7280',
    textAlign: 'center',
  },
})