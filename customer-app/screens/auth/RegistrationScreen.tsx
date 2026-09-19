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
  onContinue: (
    name: string,
    companyName: string,
  ) => Promise<void>
}

const MAX_NAME_LENGTH = 100
const MAX_COMPANY_NAME_LENGTH = 150

export default function RegistrationScreen({
  phone,
  onContinue,
}: RegistrationScreenProps) {
  const [name, setName] = useState('')
  const [companyName, setCompanyName] =
    useState('')

  const [loading, setLoading] =
    useState(false)

  const [error, setError] =
    useState('')

  const normalizedName = name.trim()
  const normalizedCompanyName =
    companyName.trim()

  const isValid =
    normalizedName.length > 0 &&
    normalizedName.length <=
      MAX_NAME_LENGTH &&
    normalizedCompanyName.length > 0 &&
    normalizedCompanyName.length <=
      MAX_COMPANY_NAME_LENGTH

  async function handleContinue() {
    if (!isValid || loading) {
      return
    }

    setError('')
    setLoading(true)

    try {
      await onContinue(
        normalizedName,
        normalizedCompanyName,
      )
    } catch (error) {
      console.error(
        'Registration screen error:',
        error,
      )

      setError(
        error instanceof Error
          ? error.message
          : 'Unable to create the customer account.',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }
      >
        <View style={styles.container}>
          <View>
            <Text style={styles.title}>
              Create your account
            </Text>

            <Text style={styles.subtitle}>
              Complete your details to continue.
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>
                Name
              </Text>

              <TextInput
                value={name}
                onChangeText={value => {
                  setName(value)
                  setError('')
                }}
                placeholder="Enter your name"
                autoCapitalize="words"
                autoCorrect={false}
                editable={!loading}
                maxLength={
                  MAX_NAME_LENGTH
                }
                style={styles.input}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>
                Company name
              </Text>

              <TextInput
                value={companyName}
                onChangeText={value => {
                  setCompanyName(value)
                  setError('')
                }}
                placeholder="Enter company name"
                autoCapitalize="words"
                autoCorrect={false}
                editable={!loading}
                maxLength={
                  MAX_COMPANY_NAME_LENGTH
                }
                style={styles.input}
              />
            </View>

            {error.length > 0 && (
              <Text style={styles.error}>
                {error}
              </Text>
            )}

            <AppButton
              title={
                loading
                  ? 'Creating account...'
                  : 'Continue'
              }
              disabled={!isValid || loading}
              onPress={handleContinue}
            />
          </View>

          <Text style={styles.phone}>
            Mobile: {phone || 'Not available'}
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
  error: {
    fontSize: 14,
    lineHeight: 20,
    color: '#DC2626',
  },
  phone: {
    marginTop: 'auto',
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
})