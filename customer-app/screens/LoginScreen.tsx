import { useMemo, useState } from 'react'
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'

import { COLORS, LOGO } from '../constants/theme'
import { RootStackParamList } from '../types'
import PrimaryButton from '../components/PrimaryButton'

type Props = NativeStackScreenProps<
  RootStackParamList,
  'Login'
>

export default function LoginScreen({
  navigation,
}: Props) {
  const [phone, setPhone] = useState('')
  const [focused, setFocused] = useState(false)

  const isValidPhone = useMemo(
    () => phone.length === 10,
    [phone]
  )

  const continueToOtp = () => {
    if (!isValidPhone) {
      return
    }

    navigation.navigate('OTP', {
      phone: `+91${phone}`,
    })
  }

  const handlePhoneChange = (value: string) => {
    const digitsOnly = value
      .replace(/\D/g, '')
      .slice(0, 10)

    setPhone(digitsOnly)
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
              Welcome
            </Text>

            <Text style={styles.subtitle}>
              Sign in or create your TempStaff account
              using your mobile number.
            </Text>

            <Text style={styles.label}>
              Mobile number
            </Text>

            <View
              style={[
                styles.phoneRow,
                focused && styles.phoneRowFocused,
              ]}
            >
              <View style={styles.country}>
                <Text style={styles.countryCode}>
                  +91
                </Text>
              </View>

              <View style={styles.divider} />

              <TextInput
                style={styles.phone}
                placeholder="Enter mobile number"
                placeholderTextColor="#9CA3AF"
                keyboardType="number-pad"
                inputMode="numeric"
                maxLength={10}
                value={phone}
                onChangeText={handlePhoneChange}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                returnKeyType="done"
                onSubmitEditing={continueToOtp}
                autoComplete="tel"
                textContentType="telephoneNumber"
              />
            </View>

            <Text
              style={[
                styles.helper,
                phone.length > 0 &&
                  phone.length < 10 &&
                  styles.helperWarning,
              ]}
            >
              {phone.length === 0
                ? 'Enter your 10-digit mobile number.'
                : phone.length < 10
                  ? `${10 - phone.length} digits remaining`
                  : 'Mobile number looks good.'}
            </Text>

            <PrimaryButton
              title="Continue"
              onPress={continueToOtp}
              disabled={!isValidPhone}
            />

            <Text style={styles.terms}>
              By continuing, you agree to our Terms of
              Service and Privacy Policy.
            </Text>
          </View>

          <View style={styles.bottom}>
            <View style={styles.securityRow}>
              <View style={styles.securityIcon}>
                <Text style={styles.securityIconText}>
                  ✓
                </Text>
              </View>

              <Text style={styles.securityText}>
                Your mobile number is used to securely
                access your account.
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
    paddingTop: 34,
    paddingBottom: 28,
  },

  top: {
    alignItems: 'center',
  },

  logo: {
    width: 104,
    height: 104,
    marginBottom: 4,
  },

  brand: {
    color: COLORS.navy,
    fontSize: 36,
    lineHeight: 44,
    fontWeight: '800',
    letterSpacing: -0.7,
  },

  teal: {
    color: COLORS.teal,
  },

  tagline: {
    marginTop: 5,
    color: COLORS.gray,
    fontSize: 10,
    lineHeight: 15,
    fontWeight: '700',
    letterSpacing: 1.8,
  },

  form: {
    width: '100%',
    marginTop: 54,
  },

  title: {
    color: COLORS.navy,
    fontSize: 29,
    lineHeight: 35,
    fontWeight: '800',
    marginBottom: 9,
  },

  subtitle: {
    color: COLORS.gray,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 29,
  },

  label: {
    color: COLORS.navy,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    marginBottom: 9,
  },

  phoneRow: {
    width: '100%',
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#D9DEE5',
    borderRadius: 14,
  },

  phoneRowFocused: {
    borderColor: COLORS.teal,
  },

  country: {
    height: '100%',
    paddingLeft: 16,
    paddingRight: 14,
    justifyContent: 'center',
  },

  countryCode: {
    color: COLORS.navy,
    fontSize: 16,
    fontWeight: '700',
  },

  divider: {
    width: 1,
    height: 28,
    backgroundColor: '#E1E5EA',
  },

  phone: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 14,
    paddingVertical: 0,
    color: COLORS.navy,
    fontSize: 17,
    fontWeight: '500',
  },

  helper: {
    color: COLORS.gray,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 8,
  },

  helperWarning: {
    color: COLORS.orange,
  },

  terms: {
    color: COLORS.gray,
    fontSize: 11,
    lineHeight: 17,
    textAlign: 'center',
    marginTop: 19,
    paddingHorizontal: 10,
  },

  bottom: {
    marginTop: 'auto',
    paddingTop: 32,
  },

  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },

  securityIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#E8F6F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },

  securityIconText: {
    color: COLORS.teal,
    fontSize: 13,
    fontWeight: '800',
  },

  securityText: {
    flex: 1,
    color: COLORS.gray,
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
  },
})