
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

type AuthMode = 'signin' | 'signup'

export default function LoginScreen({
  navigation,
}: Props) {
  const [mode, setMode] = useState<AuthMode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [magicLinkLoading, setMagicLinkLoading] = useState(false)

  const normalizedEmail = useMemo(
    () => email.trim().toLowerCase(),
    [email]
  )

  const isValidEmail = useMemo(
    () =>
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        normalizedEmail
      ),
    [normalizedEmail]
  )

  const isValidPassword = password.length >= 8

  const isValidSignup =
    mode === 'signup'
      ? isValidEmail &&
        isValidPassword &&
        password === confirmPassword
      : isValidEmail && isValidPassword

  const handleEmailChange = (value: string) => {
    setEmail(value.trimStart())
  }

  const handlePasswordChange = (value: string) => {
    setPassword(value)
  }

  const handleSubmit = async () => {
    if (!isValidEmail) {
      Alert.alert(
        'Invalid email',
        'Please enter a valid email address.'
      )
      return
    }

    if (!isValidPassword) {
      Alert.alert(
        'Invalid password',
        'Password must be at least 8 characters.'
      )
      return
    }

    if (
      mode === 'signup' &&
      password !== confirmPassword
    ) {
      Alert.alert(
        'Passwords do not match',
        'Please enter the same password in both fields.'
      )
      return
    }

    try {
      setLoading(true)

      if (mode === 'signup') {
        const {
          data,
          error,
        } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
        })

        if (error) {
          throw error
        }

        /*
         * Supabase may return a user without an active session
         * when email confirmation is enabled.
         *
         * Customer launch policy requires email verification
         * before the account can enter the application.
         */
        if (!data.session) {
          Alert.alert(
            'Check your email',
            'Your account has been created. Please verify your email address using the link we sent you, then return to TempStaff and sign in.'
          )

          setMode('signin')
          setPassword('')
          setConfirmPassword('')

          return
        }

        /*
         * Do not trust the client to decide whether the account
         * is a customer. The profile and server-side authorization
         * remain authoritative.
         */
        if (!data.user) {
  Alert.alert('Login failed', 'No authenticated user was returned.');
  return;
}

const { data: profile, error: profileError } = await supabase
  .from('profiles')
  .select('role, is_active')
  .eq('id', data.user.id)
  .single();

        if (profileError) {
          await supabase.auth.signOut()
          throw profileError
        }

        if (
          !profile ||
          profile.role !== 'customer' ||
          profile.is_active !== true
        ) {
          await supabase.auth.signOut()

          Alert.alert(
            'Account unavailable',
            'This account is not configured as an active customer account.'
          )

          return
        }

        navigation.reset({
          index: 0,
          routes: [{ name: 'Home' }],
        })

        return
      }

      const {
        data,
        error,
      } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      })

      if (error) {
        throw error
      }

      if (!data.session || !data.user) {
        throw new Error(
          'Authentication succeeded without an active session.'
        )
      }

      /*
       * Email verification is mandatory for customers.
       * Do not allow an unverified account into the application.
       */
      if (!data.user.email_confirmed_at) {
        await supabase.auth.signOut()

        Alert.alert(
          'Verify your email',
          'Please verify your email address before signing in to TempStaff.'
        )

        return
      }

      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from('profiles')
        .select('id, role, is_active')
        .eq('id', data.user.id)
        .maybeSingle()

      if (profileError) {
        await supabase.auth.signOut()
        throw profileError
      }

      if (!profile) {
        await supabase.auth.signOut()

        Alert.alert(
          'Profile setup required',
          'Your account exists, but the customer profile has not been created yet.'
        )

        return
      }

      if (profile.role !== 'customer') {
        await supabase.auth.signOut()

        Alert.alert(
          'Wrong account type',
          'This account cannot be used in the TempStaff customer app.'
        )

        return
      }

      if (profile.is_active !== true) {
        await supabase.auth.signOut()

        Alert.alert(
          'Account inactive',
          'Your TempStaff customer account is currently inactive.'
        )

        return
      }

      navigation.reset({
        index: 0,
        routes: [{ name: 'Home' }],
      })
    } catch (error: any) {
      console.error(
        '[TempStaff] Customer authentication failed:',
        error
      )

      Alert.alert(
        mode === 'signup'
          ? 'Unable to create account'
          : 'Unable to sign in',
        error?.message ||
          'Something went wrong. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  const handleMagicLink = async () => {
    if (!isValidEmail) {
      Alert.alert(
        'Enter your email',
        'Enter a valid email address first.'
      )
      return
    }

    try {
      setMagicLinkLoading(true)

      const { error } =
        await supabase.auth.signInWithOtp({
          email: normalizedEmail,
          options: {
            shouldCreateUser: false,
          },
        })

      if (error) {
        throw error
      }

      Alert.alert(
        'Check your email',
        'We sent you a secure sign-in link. Open the link on this device to continue to TempStaff.'
      )
    } catch (error: any) {
      console.error(
        '[TempStaff] Magic-link authentication failed:',
        error
      )

      Alert.alert(
        'Unable to send sign-in link',
        error?.message ||
          'Something went wrong. Please try again.'
      )
    } finally {
      setMagicLinkLoading(false)
    }
  }

  const switchMode = () => {
    setMode(
      current =>
        current === 'signin'
          ? 'signup'
          : 'signin'
    )

    setPassword('')
    setConfirmPassword('')
  }

  const passwordHelper =
    password.length === 0
      ? 'Use at least 8 characters.'
      : password.length < 8
        ? `${8 - password.length} more characters required.`
        : 'Password looks good.'

  const emailHelper =
    email.length === 0
      ? 'Enter the email address for your TempStaff account.'
      : !isValidEmail
        ? 'Enter a valid email address.'
        : 'Email address looks good.'

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
              {mode === 'signin'
                ? 'Welcome back'
                : 'Create your account'}
            </Text>

            <Text style={styles.subtitle}>
              {mode === 'signin'
                ? 'Sign in to your TempStaff customer account.'
                : 'Create your TempStaff customer account using your email address.'}
            </Text>

            <Text style={styles.label}>
              Email address
            </Text>

            <TextInput
              style={[
                styles.input,
                focusedField === 'email' &&
                  styles.inputFocused,
              ]}
              placeholder="Enter your email"
              placeholderTextColor="#9CA3AF"
              keyboardType="email-address"
              inputMode="email"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              value={email}
              onChangeText={handleEmailChange}
              onFocus={() =>
                setFocusedField('email')
              }
              onBlur={() =>
                setFocusedField(null)
              }
              returnKeyType="next"
              editable={!loading}
            />

            <Text style={styles.helper}>
              {emailHelper}
            </Text>

            <Text style={styles.label}>
              Password
            </Text>

            <TextInput
              style={[
                styles.input,
                focusedField === 'password' &&
                  styles.inputFocused,
              ]}
              placeholder="Enter your password"
              placeholderTextColor="#9CA3AF"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete={
                mode === 'signup'
                  ? 'new-password'
                  : 'current-password'
              }
              textContentType={
                mode === 'signup'
                  ? 'newPassword'
                  : 'password'
              }
              value={password}
              onChangeText={handlePasswordChange}
              onFocus={() =>
                setFocusedField('password')
              }
              onBlur={() =>
                setFocusedField(null)
              }
              returnKeyType={
                mode === 'signup'
                  ? 'next'
                  : 'done'
              }
              editable={!loading}
            />

            <Text
              style={[
                styles.helper,
                password.length > 0 &&
                  password.length < 8 &&
                  styles.helperWarning,
              ]}
            >
              {passwordHelper}
            </Text>

            {mode === 'signup' && (
              <>
                <Text style={styles.label}>
                  Confirm password
                </Text>

                <TextInput
                  style={[
                    styles.input,
                    focusedField ===
                      'confirmPassword' &&
                      styles.inputFocused,
                  ]}
                  placeholder="Re-enter your password"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="new-password"
                  textContentType="newPassword"
                  value={confirmPassword}
                  onChangeText={
                    setConfirmPassword
                  }
                  onFocus={() =>
                    setFocusedField(
                      'confirmPassword'
                    )
                  }
                  onBlur={() =>
                    setFocusedField(null)
                  }
                  returnKeyType="done"
                  editable={!loading}
                />

                {confirmPassword.length > 0 && (
                  <Text
                    style={[
                      styles.helper,
                      password !==
                        confirmPassword &&
                        styles.helperWarning,
                    ]}
                  >
                    {password ===
                    confirmPassword
                      ? 'Passwords match.'
                      : 'Passwords do not match.'}
                  </Text>
                )}
              </>
            )}

            <PrimaryButton
              title={
                loading
                  ? 'Please wait...'
                  : mode === 'signin'
                    ? 'Sign in'
                    : 'Create account'
              }
              onPress={handleSubmit}
              disabled={
                loading ||
                !isValidSignup
              }
            />

            {mode === 'signin' && (
              <>
                <View style={styles.orRow}>
                  <View
                    style={styles.orLine}
                  />
                  <Text style={styles.orText}>
                    OR
                  </Text>
                  <View
                    style={styles.orLine}
                  />
                </View>

                <TouchableOpacity
                  style={[
                    styles.magicButton,
                    magicLinkLoading &&
                      styles.magicButtonDisabled,
                  ]}
                  onPress={handleMagicLink}
                  disabled={
                    magicLinkLoading ||
                    loading ||
                    !isValidEmail
                  }
                  activeOpacity={0.8}
                >
                  <Text
                    style={
                      styles.magicButtonText
                    }
                  >
                    {magicLinkLoading
                      ? 'Sending...'
                      : 'Email me a sign-in link'}
                  </Text>
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity
              style={styles.switchButton}
              onPress={switchMode}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Text style={styles.switchText}>
                {mode === 'signin'
                  ? "Don't have an account? "
                  : 'Already have an account? '}

                <Text
                  style={styles.switchAction}
                >
                  {mode === 'signin'
                    ? 'Create one'
                    : 'Sign in'}
                </Text>
              </Text>
            </TouchableOpacity>

            <Text style={styles.terms}>
              By continuing, you agree to our Terms
              of Service and Privacy Policy.
            </Text>
          </View>

          <View style={styles.bottom}>
            <View style={styles.securityRow}>
              <View style={styles.securityIcon}>
                <Text
                  style={
                    styles.securityIconText
                  }
                >
                  ✓
                </Text>
              </View>

              <Text style={styles.securityText}>
                Your account is secured using
                Supabase authentication. We never
                use development or anonymous
                authentication for customer access.
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
    marginTop: 10,
  },

  input: {
    width: '100%',
    height: 58,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#D9DEE5',
    borderRadius: 14,
    paddingHorizontal: 16,
    color: COLORS.navy,
    fontSize: 16,
    fontWeight: '500',
  },

  inputFocused: {
    borderColor: COLORS.teal,
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

  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },

  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E1E5EA',
  },

  orText: {
    color: COLORS.gray,
    fontSize: 11,
    fontWeight: '700',
    marginHorizontal: 12,
  },

  magicButton: {
    width: '100%',
    height: 54,
    borderWidth: 1,
    borderColor: COLORS.teal,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
  },

  magicButtonDisabled: {
    opacity: 0.55,
  },

  magicButtonText: {
    color: COLORS.teal,
    fontSize: 15,
    fontWeight: '700',
  },

  switchButton: {
    alignItems: 'center',
    marginTop: 20,
    paddingVertical: 8,
  },

  switchText: {
    color: COLORS.gray,
    fontSize: 13,
    lineHeight: 20,
  },

  switchAction: {
    color: COLORS.teal,
    fontWeight: '700',
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