import { useEffect, useRef, useState } from 'react'
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

import { COLORS, LOGO } from '../constants/theme'
import { RootStackParamList } from '../types'
import PrimaryButton from '../components/PrimaryButton'
import {
  ensureDevelopmentSession,
  verifyDevelopmentLoginOtp,
} from '../services/booking'

type Props = NativeStackScreenProps<
  RootStackParamList,
  'OTP'
>

const OTP_LENGTH = 6
const RESEND_SECONDS = 30

export default function OtpScreen({
  navigation,
  route,
}: Props) {
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [secondsLeft, setSecondsLeft] =
    useState(RESEND_SECONDS)
  const [focused, setFocused] = useState(false)

  const inputRef = useRef<TextInput>(null)

  useEffect(() => {
    if (secondsLeft <= 0) {
      return
    }

    const timer = setInterval(() => {
      setSecondsLeft((current) =>
        current > 0 ? current - 1 : 0
      )
    }, 1000)

    return () => clearInterval(timer)
  }, [secondsLeft])

  const verify = async () => {
    if (otp.length !== OTP_LENGTH || loading) {
      return
    }

    if (!verifyDevelopmentLoginOtp(otp)) {
      Alert.alert(
        'Invalid OTP',
        'Please enter the test OTP 123456.'
      )
      return
    }

    try {
      setLoading(true)

      await ensureDevelopmentSession(
        route.params.phone
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
        '[TempStaff] Development authentication failed:',
        error
      )

      Alert.alert(
        'Authentication Error',
        error?.message ||
          'Unable to create your account session. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  const changeNumber = () => {
    if (loading) {
      return
    }

    navigation.goBack()
  }

  const handleOtpChange = (value: string) => {
    const digitsOnly = value
      .replace(/\D/g, '')
      .slice(0, OTP_LENGTH)

    setOtp(digitsOnly)
  }

  const resendCode = () => {
    if (secondsLeft > 0 || loading) {
      return
    }

    /*
     * Real OTP sending will be connected later.
     * For now this only resets the development UI timer.
     */
    setSecondsLeft(RESEND_SECONDS)
    setOtp('')

    requestAnimationFrame(() => {
      inputRef.current?.focus()
    })
  }

  const maskedPhone = route.params.phone
    .replace(
      /^(\+\d{2})(\d{4})(\d{4})$/,
      '$1 $2 $3'
    )

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
            onPress={changeNumber}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel="Change mobile number"
          >
            <Text style={styles.backArrow}>
              ‹
            </Text>

            <Text style={styles.backText}>
              Change number
            </Text>
          </TouchableOpacity>

          <View style={styles.header}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoText}>
                Temp
                <Text style={styles.logoTeal}>
                  Staff
                </Text>
              </Text>
            </View>

            <Text style={styles.title}>
              Verify your number
            </Text>

            <Text style={styles.subtitle}>
              We sent a 6-digit verification code to
            </Text>

            <Text style={styles.phone}>
              {maskedPhone}
            </Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>
              Verification code
            </Text>

            <TouchableOpacity
              activeOpacity={1}
              onPress={() => inputRef.current?.focus()}
              style={styles.otpWrapper}
            >
              <View
                style={[
                  styles.otpRow,
                  focused && styles.otpRowFocused,
                ]}
              >
                {Array.from({
                  length: OTP_LENGTH,
                }).map((_, index) => {
                  const digit = otp[index] ?? ''
                  const isActive =
                    focused &&
                    index === otp.length &&
                    otp.length < OTP_LENGTH

                  return (
                    <View
                      key={index}
                      style={[
                        styles.otpBox,
                        digit.length > 0 &&
                          styles.otpBoxFilled,
                        isActive &&
                          styles.otpBoxActive,
                      ]}
                    >
                      <Text style={styles.otpDigit}>
                        {digit}
                      </Text>
                    </View>
                  )
                })}
              </View>

              <TextInput
                ref={inputRef}
                value={otp}
                onChangeText={handleOtpChange}
                keyboardType="number-pad"
                inputMode="numeric"
                maxLength={OTP_LENGTH}
                autoFocus
                editable={!loading}
                style={styles.hiddenInput}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                textContentType="oneTimeCode"
                autoComplete="sms-otp"
                caretHidden
              />
            </TouchableOpacity>

            <Text style={styles.helper}>
              Enter the 6-digit code to continue.
            </Text>

            <PrimaryButton
              title={
                loading
                  ? 'Verifying...'
                  : 'Verify & Continue'
              }
              onPress={verify}
              disabled={
                otp.length !== OTP_LENGTH ||
                loading
              }
            />

            <View style={styles.resendContainer}>
              <Text style={styles.resendLabel}>
                Didn't receive the code?
              </Text>

              {secondsLeft > 0 ? (
                <Text style={styles.timer}>
                  Resend in {secondsLeft}s
                </Text>
              ) : (
                <TouchableOpacity
                  onPress={resendCode}
                  disabled={loading}
                >
                  <Text style={styles.resendButton}>
                    Resend code
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.devNotice}>
              <Text style={styles.devTitle}>
                Development mode
              </Text>

              <Text style={styles.devText}>
                Test OTP: 123456
              </Text>
            </View>
          </View>

          <View style={styles.bottom}>
            <View style={styles.securityIcon}>
              <Text style={styles.securityCheck}>
                ✓
              </Text>
            </View>

            <Text style={styles.securityText}>
              Your verification code is used only to
              securely access your TempStaff account.
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
    paddingBottom: 28,
  },

  backButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 40,
    paddingRight: 12,
  },

  backArrow: {
    color: COLORS.navy,
    fontSize: 31,
    lineHeight: 31,
    marginRight: 5,
    marginTop: -2,
  },

  backText: {
    color: COLORS.navy,
    fontSize: 14,
    fontWeight: '700',
  },

  header: {
    alignItems: 'center',
    marginTop: 26,
  },

  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#E8F6F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 27,
  },

  logoText: {
    color: COLORS.navy,
    fontSize: 15,
    fontWeight: '800',
  },

  logoTeal: {
    color: COLORS.teal,
  },

  title: {
    color: COLORS.navy,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 9,
  },

  subtitle: {
    color: COLORS.gray,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },

  phone: {
    color: COLORS.navy,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '800',
    marginTop: 5,
  },

  form: {
    width: '100%',
    marginTop: 39,
  },

  label: {
    color: COLORS.navy,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    marginBottom: 10,
  },

  otpWrapper: {
    width: '100%',
    position: 'relative',
  },

  otpRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 2,
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: 16,
  },

  otpRowFocused: {
    borderColor: '#E8F6F6',
  },

  otpBox: {
    width: 45,
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D9DEE5',
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },

  otpBoxFilled: {
    borderColor: COLORS.teal,
    backgroundColor: '#F8FEFE',
  },

  otpBoxActive: {
    borderColor: COLORS.orange,
    borderWidth: 2,
  },

  otpDigit: {
    color: COLORS.navy,
    fontSize: 21,
    lineHeight: 26,
    fontWeight: '800',
  },

  hiddenInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },

  helper: {
    color: COLORS.gray,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 9,
  },

  resendContainer: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 19,
  },

  resendLabel: {
    color: COLORS.gray,
    fontSize: 12,
  },

  timer: {
    color: COLORS.gray,
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 5,
  },

  resendButton: {
    color: COLORS.teal,
    fontSize: 12,
    fontWeight: '800',
    marginLeft: 5,
  },

  devNotice: {
    marginTop: 18,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    alignItems: 'center',
  },

  devTitle: {
    color: COLORS.orange,
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 3,
  },

  devText: {
    color: COLORS.navy,
    fontSize: 13,
    fontWeight: '700',
  },

  bottom: {
    marginTop: 'auto',
    paddingTop: 35,
    alignItems: 'center',
  },

  securityIcon: {
    width: 25,
    height: 25,
    borderRadius: 13,
    backgroundColor: '#E8F6F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },

  securityCheck: {
    color: COLORS.teal,
    fontSize: 14,
    fontWeight: '900',
  },

  securityText: {
    maxWidth: 290,
    color: COLORS.gray,
    fontSize: 10.5,
    lineHeight: 16,
    textAlign: 'center',
  },
})