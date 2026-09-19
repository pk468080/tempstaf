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

type RegistrationScreenProps = {
  phone: string
  onContinue: (name: string, companyName: string) => void
}

export default function RegistrationScreen({
  phone,
  onContinue,
}: RegistrationScreenProps) {
  const [name, setName] = useState('')
  const [companyName, setCompanyName] = useState('')

  const isValid =
    name.trim().length > 0 &&
    companyName.trim().length > 0

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>
          <View>
            <Text style={styles.title}>Create your account</Text>

            <Text style={styles.subtitle}>
              Complete your details to continue.
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>Name</Text>

              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Enter your name"
                autoCapitalize="words"
                style={styles.input}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Company name</Text>

              <TextInput
                value={companyName}
                onChangeText={setCompanyName}
                placeholder="Enter company name"
                autoCapitalize="words"
                style={styles.input}
              />
            </View>

            <AppButton
              title="Continue"
              disabled={!isValid}
              onPress={() =>
                onContinue(
                  name.trim(),
                  companyName.trim(),
                )
              }
            />
          </View>

          <Text style={styles.phone}>
            Mobile: {phone}
          </Text>
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
    marginTop: 48,
    gap: 20,
  },
  field: {
    gap: 8,
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
    fontSize: 16,
    color: '#111827',
  },
  phone: {
    marginTop: 'auto',
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
})