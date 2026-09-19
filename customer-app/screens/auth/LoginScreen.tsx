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

type LoginScreenProps = {
  onContinue: (phone: string) => void
}

export default function LoginScreen({
  onContinue,
}: LoginScreenProps) {
  const [phone, setPhone] = useState('')

  const normalizedPhone = phone.replace(/\D/g, '')

  const isValid =
    normalizedPhone.length >= 10 &&
    normalizedPhone.length <= 15

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>
          <View>
            <Text style={styles.title}>Welcome to TempStaff</Text>
            <Text style={styles.subtitle}>
              Enter your mobile number to continue.
            </Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>Mobile number</Text>

            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder="Enter mobile number"
              keyboardType="phone-pad"
              autoComplete="tel"
              maxLength={15}
              style={styles.input}
            />

            <AppButton
              title="Send OTP"
              disabled={!isValid}
              onPress={() => onContinue(normalizedPhone)}
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
    fontSize: 17,
    color: '#111827',
  },
})