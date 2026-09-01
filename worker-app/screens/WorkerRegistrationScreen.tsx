import { useEffect, useState } from 'react'
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

type ServiceOption = {
  id: string
  name: string
}

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
  const [services, setServices] = useState<ServiceOption[]>([])
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingServices, setLoadingServices] = useState(true)

  useEffect(() => {
    const loadServices = async () => {
      try {
        const { data, error } = await supabase
          .from('services')
          .select('id, name')
          .eq('is_active', true)
          .order('name')

        if (error) throw error

        setServices((data ?? []) as ServiceOption[])
      } catch (error: any) {
        console.error('[TempStaff Worker] Failed to load services:', error)
      } finally {
        setLoadingServices(false)
      }
    }

    void loadServices()
  }, [])

  const toggleService = (serviceId: string) => {
    setSelectedServiceIds(current =>
      current.includes(serviceId)
        ? current.filter(id => id !== serviceId)
        : [...current, serviceId]
    )
  }

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

    if (selectedServiceIds.length === 0) {
      Alert.alert(
        'Select a service',
        'Choose at least one service you can work.'
      )
      return
    }

    setLoading(true)

    try {
      /*
       * Worker records are created by the
       * Supabase auth.users signup trigger.
       *
       * The trigger creates:
       * - profiles
       * - worker_profiles
       * - worker_applications
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

      /*
       * Email confirmation may be enabled.
       *
       * If there is no session, the worker must
       * confirm the email before continuing.
       */
      if (!authData.session) {
        Alert.alert(
          'Account created',
          'Your worker account has been created. Please check your email and confirm your email address before logging in.',
          [
            {
              text: 'Back to Login',
              onPress: onRegistered,
            },
          ]
        )

        return
      }

      const { data: serviceData, error: serviceError } = await supabase.rpc(
        'set_worker_services',
        {
          p_service_ids: selectedServiceIds,
        }
      )

      if (serviceError) {
        throw serviceError
      }

      if (!serviceData?.success) {
        throw new Error(serviceData?.error || 'Unable to save your services.')
      }

      Alert.alert(
        'Account created',
        'Your worker account has been created successfully. You can now continue with worker onboarding.',
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

      Alert.alert(
        'Registration failed',
        error?.message ||
          'We could not create your account. Please try again.'
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
              Services you can work
            </Text>

            {loadingServices ? (
              <Text style={styles.helperText}>Loading services...</Text>
            ) : services.length === 0 ? (
              <Text style={styles.helperText}>No active services available.</Text>
            ) : (
              <View style={styles.serviceGrid}>
                {services.map(service => {
                  const selected = selectedServiceIds.includes(service.id)

                  return (
                    <TouchableOpacity
                      key={service.id}
                      style={[
                        styles.serviceChip,
                        selected && styles.serviceChipSelected,
                      ]}
                      onPress={() => toggleService(service.id)}
                      disabled={loading}
                    >
                      <Text
                        style={[
                          styles.serviceChipText,
                          selected && styles.serviceChipTextSelected,
                        ]}
                      >
                        {service.name}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
            )}

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
              Your information will be used to
              create your TempStaff worker account.
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

  helperText: {
    color: '#667085',
    fontSize: 13,
    marginBottom: 10,
  },

  serviceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },

  serviceChip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D9DEE5',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  serviceChipSelected: {
    backgroundColor: '#0B1F33',
    borderColor: '#0B1F33',
  },

  serviceChipText: {
    color: '#0B1F33',
    fontSize: 12,
    fontWeight: '700',
  },

  serviceChipTextSelected: {
    color: '#FFFFFF',
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