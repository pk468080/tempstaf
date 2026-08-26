import { useState } from 'react'
import {
  Alert,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'

import { supabase } from '../lib/supabase'

type Props = {
  onLogin: () => void
  onBecomeWorker: () => void
}

export default function LoginScreen({
  onLogin,
  onBecomeWorker,
}: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const login = async () => {
    if (!email.trim() || !password) {
      Alert.alert(
        'Missing details',
        'Enter your email and password.'
      )
      return
    }

    setLoading(true)

    try {
      const { data, error } =
        await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        })

      if (error) {
        throw error
      }

      if (!data.user) {
        throw new Error(
          'Authentication failed.'
        )
      }

      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from('profiles')
        .select(
          'id, role, is_active'
        )
        .eq('id', data.user.id)
        .maybeSingle()

      if (profileError) {
        throw profileError
      }

      if (!profile) {
        await supabase.auth.signOut()

        throw new Error(
          'Your worker profile has not been created yet. Please create a new worker account or contact TempStaff.'
        )
      }

      if (
        profile.role !== 'worker' ||
        !profile.is_active
      ) {
        await supabase.auth.signOut()

        throw new Error(
          'This account is not an active worker account.'
        )
      }

      onLogin()
    } catch (error: any) {
      console.error(
        '[TempStaff Worker] Login failed:',
        error
      )

      Alert.alert(
        'Login failed',
        error?.message ||
          'Unable to sign in.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>
            TS
          </Text>
        </View>

        <Text style={styles.title}>
          Worker Login
        </Text>

        <Text style={styles.subtitle}>
          Sign in to manage your TempStaff jobs.
        </Text>

        <Text style={styles.label}>
          Email
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Worker email"
          placeholderTextColor="#9CA3AF"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          value={email}
          onChangeText={setEmail}
          editable={!loading}
        />

        <Text style={styles.label}>
          Password
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#9CA3AF"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          editable={!loading}
        />

        <TouchableOpacity
          style={[
            styles.button,
            loading && styles.disabled,
          ]}
          disabled={loading}
          onPress={login}
        >
          <Text style={styles.buttonText}>
            {loading
              ? 'Signing in...'
              : 'Sign In'}
          </Text>
        </TouchableOpacity>

        <View style={styles.dividerRow}>
          <View style={styles.divider} />

          <Text style={styles.dividerText}>
            OR
          </Text>

          <View style={styles.divider} />
        </View>

        <TouchableOpacity
          style={styles.registerButton}
          disabled={loading}
          onPress={onBecomeWorker}
        >
          <Text
            style={styles.registerButtonText}
          >
            Become a Worker
          </Text>
        </TouchableOpacity>

        <Text style={styles.note}>
          Already have a TempStaff worker
          account? Sign in above.
        </Text>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F8FA',
  },

  content: {
    flex: 1,
    padding: 28,
    justifyContent: 'center',
  },

  logo: {
    width: 68,
    height: 68,
    borderRadius: 18,
    backgroundColor: '#0B1F33',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 24,
  },

  logoText: {
    color: 'white',
    fontSize: 24,
    fontWeight: '900',
  },

  title: {
    color: '#0B1F33',
    fontSize: 30,
    fontWeight: '800',
    marginBottom: 8,
  },

  subtitle: {
    color: '#667085',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 28,
  },

  label: {
    color: '#0B1F33',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 7,
  },

  input: {
    height: 54,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#D9DEE5',
    borderRadius: 14,
    paddingHorizontal: 15,
    fontSize: 16,
    color: '#0B1F33',
    marginBottom: 18,
  },

  button: {
    height: 54,
    borderRadius: 14,
    backgroundColor: '#F28C28',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },

  disabled: {
    opacity: 0.6,
  },

  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '800',
  },

  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 22,
  },

  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#D9DEE5',
  },

  dividerText: {
    color: '#98A2B3',
    fontSize: 11,
    fontWeight: '800',
    marginHorizontal: 12,
  },

  registerButton: {
    height: 54,
    borderRadius: 14,
    backgroundColor: 'white',
    borderWidth: 1.5,
    borderColor: '#0B1F33',
    alignItems: 'center',
    justifyContent: 'center',
  },

  registerButtonText: {
    color: '#0B1F33',
    fontSize: 16,
    fontWeight: '800',
  },

  note: {
    color: '#667085',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 18,
  },
})