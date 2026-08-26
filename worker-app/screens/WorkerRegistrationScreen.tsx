import { useState } from 'react'
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

import { supabase } from '../lib/supabase'

type Props = {
  onBack: () => void
  onRegistered: () => void
}

export default function WorkerRegistrationScreen({
  onBack,
  onRegistered,
}: Props) {
  const [fullName, setFullName] = useState('')
  const [mobile, setMobile] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] =
    useState('')

  const [loading, setLoading] = useState(false)

  const registerWorker = async () => {
    const cleanName = fullName.trim()
    const cleanMobile = mobile.trim()
    const cleanEmail = email.trim().toLowerCase()

    if (
      !cleanName ||
      !cleanMobile ||
      !cleanEmail ||
      !password ||
      !confirmPassword
    ) {
      Alert.alert(
        'Missing information',
        'Please complete all fields.'
      )
      return
    }

    if (cleanName.length < 2) {
      Alert.alert(
        'Invalid name',
        'Please enter your full name.'
      )
      return
    }

    const mobileDigits =
      cleanMobile.replace(/\D/g, '')

    if (mobileDigits.length < 10) {
      Alert.alert(
        'Invalid mobile number',
        'Please enter a valid mobile number.'
      )
      return
    }

    if (password.length < 8) {
      Alert.alert(
        'Weak password',
        'Password must contain at least 8 characters.'
      )
      return
    }

    if (password !== confirmPassword) {
      Alert.alert(
        'Password mismatch',
        'Password and confirm password must match.'
      )
      return
    }

    setLoading(true)

    let createdUserId: string | null = null

    try {
      /*
       * 1. Create Supabase Auth account
       */
      const {
        data: authData,
        error: authError,
      } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            full_name: cleanName,
            phone: cleanMobile,
            role: 'worker',
          },
        },
      })

      if (authError) {
        throw authError
      }

      if (!authData.user) {
        throw new Error(
          'Unable to create your account.'
        )
      }

      createdUserId = authData.user.id

      /*
       * Supabase may require email confirmation.
       *
       * When confirmation is enabled, signUp can
       * return a user without an active session.
       *
       * We still create the profile/application
       * using the authenticated session when one
       * exists. If confirmation is required, the
       * profile/application creation is handled by
       * the database trigger if configured.
       */

      /*
       * 2. Create worker profile when a session
       *    is immediately available.
       */
      if (authData.session) {
        const { error: profileError } =
          await supabase
            .from('profiles')
            .upsert(
              {
                id: createdUserId,
                role: 'worker',
                full_name: cleanName,
                phone: cleanMobile,
                is_active: true,
              },
              {
                onConflict: 'id',
              }
            )

        if (profileError) {
          throw profileError
        }

        /*
         * 3. Create worker profile
         */
        const { error: workerProfileError } =
          await supabase
            .from('worker_profiles')
            .upsert(
              {
                id: createdUserId,
                is_verified: false,
                worker_status: 'offline',
              },
              {
                onConflict: 'id',
              }
            )

        if (workerProfileError) {
          throw workerProfileError
        }

        /*
         * 4. Create onboarding application
         */
        const { error: applicationError } =
          await supabase
            .from('worker_applications')
            .insert({
              worker_id: createdUserId,
              onboarding_type:
                'self_registered',
              status: 'draft',
            })

        if (applicationError) {
          throw applicationError
        }
      }

      /*
       * 5. Email confirmation flow
       */
      if (!authData.session) {
        Alert.alert(
          'Account created',
          'Your account has been created. Please check your email and confirm your email address before continuing.',
          [
            {
              text: 'Back to Login',
              onPress: onRegistered,
            },
          ]
        )

        return
      }

      /*
       * 6. Continue to onboarding
       *
       * The next step will replace this callback
       * with the actual onboarding flow.
       */
      Alert.alert(
        'Account created',
        'Your worker account has been created. Next, you will complete your worker onboarding.',
        [
          {
            text: 'Continue',
            onPress: onRegistered,
          },
        ]
      )
    } catch (error: any) {
      console.error(
        '[TempStaff Worker] Registration failed:',
        error
      )

      /*
       * If the account was created but a later
       * database step failed, don't expose technical
       * database details to the worker.
       */
      Alert.alert(
        'Registration failed',
        error?.message ||
          'We could not complete your registration. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
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
            onPress={onBack}
            disabled={loading}
          >
            <Text style={styles.backText}>
              ← Back to Login
            </Text>
          </TouchableOpacity>

          <View style={styles.logo}>
            <Text style={styles.logoText}>
              TS
            </Text>
          </View>

          <Text style={styles.title}>
            Become a Worker
          </Text>

          <Text style={styles.subtitle}>
            Create your TempStaff worker account
            to start the onboarding process.
          </Text>

          <View style={styles.form}>
            <Text style={styles.label}>
              Full Name
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Enter your full name"
              placeholderTextColor="#9CA3AF"
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
              editable={!loading}
            />

            <Text style={styles.label}>
              Mobile Number
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Enter your mobile number"
              placeholderTextColor="#9CA3AF"
              value={mobile}
              onChangeText={setMobile}
              keyboardType="phone-pad"
              editable={!loading}
            />

            <Text style={styles.label}>
              Email
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              placeholderTextColor="#9CA3AF"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />

            <Text style={styles.label}>
              Password
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Create a password"
              placeholderTextColor="#9CA3AF"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              editable={!loading}
            />

            <Text style={styles.passwordHint}>
              Use at least 8 characters.
            </Text>

            <Text style={styles.label}>
              Confirm Password
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Confirm your password"
              placeholderTextColor="#9CA3AF"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoCapitalize="none"
              editable={!loading}
            />

            <TouchableOpacity
              style={[
                styles.createButton,
                loading && styles.disabled,
              ]}
              onPress={registerWorker}
              disabled={loading}
            >
              <Text style={styles.createButtonText}>
                {loading
                  ? 'Creating Account...'
                  : 'Create Worker Account'}
              </Text>
            </TouchableOpacity>

            <Text style={styles.footerText}>
              By creating an account, you agree to
              provide accurate information and
              complete the required verification
              documents.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },

  container: {
    flex: 1,
    backgroundColor: '#F6F8FA',
  },

  content: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
  },

  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 2,
    marginBottom: 18,
  },

  backText: {
    color: '#0B1F33',
    fontSize: 14,
    fontWeight: '700',
  },

  logo: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: '#0B1F33',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 20,
  },

  logoText: {
    color: '#FFFFFF',
    fontSize: 23,
    fontWeight: '900',
  },

  title: {
    color: '#0B1F33',
    fontSize: 29,
    fontWeight: '800',
    marginBottom: 8,
  },

  subtitle: {
    color: '#667085',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
  },

  form: {
    width: '100%',
  },

  label: {
    color: '#0B1F33',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 7,
    marginTop: 13,
  },

  input: {
    height: 54,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D9DEE5',
    borderRadius: 14,
    paddingHorizontal: 15,
    fontSize: 16,
    color: '#0B1F33',
  },

  passwordHint: {
    color: '#98A2B3',
    fontSize: 12,
    marginTop: 6,
  },

  createButton: {
    height: 55,
    borderRadius: 14,
    backgroundColor: '#F28C28',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 26,
  },

  disabled: {
    opacity: 0.6,
  },

  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },

  footerText: {
    color: '#667085',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 18,
  },
})