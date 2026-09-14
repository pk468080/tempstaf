import { useMemo, useState } from 'react'
import {
  Alert,
  Image,
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
import { supabase } from '../lib/supabase'
import PrimaryButton from '../components/PrimaryButton'

type Props = NativeStackScreenProps<
  RootStackParamList,
  'Login'
>

function normalizePhone(value: string) {
  return value.replace(/[^\d+]/g, '')
}

function isValidPhone(phone: string) {
  return /^\+[1-9]\d{7,14}$/.test(phone)
}

export default function LoginScreen({
  navigation,
}: Props) {
  const [phone, setPhone] = useState('')
  const [focused, setFocused] = useState(false)
  const [loading, setLoading] = useState(false)

  const normalizedPhone = useMemo(
    () => normalizePhone(phone),
    [phone]
  )

  const validPhone = useMemo(
    () => isValidPhone(normalizedPhone),
    [normalizedPhone]
  )

  const handleSendOtp = async () => {
    if (!validPhone) {
      Alert.alert(
        'Invalid phone number',
        'Enter your phone number in international format, for example +919876543210.'
      )
      return
    }

    try {
      setLoading(true)

      const { error } =
        await supabase.auth.signInWithOtp({
          phone: normalizedPhone,
        })

      if (error) {
        throw error
      }

      navigation.navigate('VerifyOtp', {
        phone: normalizedPhone,
      })
    } catch (error: any) {
      console.error(
        '[TempStaff] Failed to send customer OTP:',
        error
      )

      Alert.alert(
        'Unable to send OTP',
        error?.message ||
          'Something went wrong. Please try again.'
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
          <View style={styles.top}>
            <Image
              source={LOGO}
              style={styles.logo}
              resizeMode="contain"
              accessibilityLabel="TempStaff logo"
            />

            <Text style={styles.brand}>
              Temp
              <Text style={styles.teal}>
                Staff
              </Text>
            </Text>

            <Text style={styles.tagline}>
              STAFF WHEN YOU NEED THEM.
            </Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.title}>
              Welcome to TempStaff
            </Text>

            <Text style={styles.subtitle}>
              Enter your mobile number and we'll
              send you a one-time verification code.
            </Text>

            <Text style={styles.label}>
              Mobile number
            </Text>

            <TextInput
              style={[
                styles.input,
                focused && styles.inputFocused,
              ]}
              placeholder="+91 9876543210"
              placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
              inputMode="tel"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="tel"
              textContentType="telephoneNumber"
              value={phone}
              onChangeText={setPhone}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              returnKeyType="done"
              editable={!loading}
              maxLength={16}
            />

            <Text style={styles.helper}>
              Use international format including your
              country code.
            </Text>

            <PrimaryButton
              title={
                loading
                  ? 'Sending OTP...'
                  : 'Send OTP'
              }
              onPress={handleSendOtp}
              disabled={loading || !validPhone}
            />

            <Text style={styles.securityText}>
              Your mobile number is used to securely
              authenticate your TempStaff account.
            </Text>
          </View>

          <View style={styles.bottom}>
            <View style={styles.securityRow}>
              <View style={styles.securityIcon}>
                <Text
                  style={styles.securityIconText}
                >
                  ✓
                </Text>
              </View>

              <Text style={styles.securityText}>
                Authentication is handled securely by
                Supabase. No customer password is
                required.
              </Text>
            </View>
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
    paddingTop: 36,
    paddingBottom: 28,
  },

  top: {
    alignItems: 'center',
    marginBottom: 42,
  },

  logo: {
    width: 82,
    height: 82,
    marginBottom: 10,
  },

  brand: {
    fontSize: 32,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -1,
  },

  teal: {
    color: '#0F766E',
  },

  tagline: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    color: '#6B7280',
  },

  form: {
    width: '100%',
  },

  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
  },

  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: '#6B7280',
    marginBottom: 28,
  },

  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
  },

  input: {
    height: 54,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 17,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },

  inputFocused: {
    borderColor: '#0F766E',
    borderWidth: 2,
  },

  helper: {
    marginTop: 8,
    marginBottom: 22,
    fontSize: 12,
    lineHeight: 18,
    color: '#6B7280',
  },

  securityText: {
    marginTop: 22,
    fontSize: 12,
    lineHeight: 18,
    color: '#6B7280',
    textAlign: 'center',
  },

  bottom: {
    marginTop: 'auto',
    paddingTop: 36,
  },

  securityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },

  securityIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#0F766E',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  securityIconText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
})