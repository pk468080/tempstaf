import { useEffect, useState } from 'react'

import {
  ActivityIndicator,
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

type EditProfileScreenProps = {
  onBack: () => void
  onSaved: () => void
}

export default function EditProfileScreen({
  onBack,
  onSaved,
}: EditProfileScreenProps) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        throw new Error(
          'Worker is not authenticated.'
        )
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, phone')
        .eq('id', user.id)
        .maybeSingle()

      if (error) {
        throw error
      }

      setName(
        data?.full_name ??
          user.user_metadata?.full_name ??
          ''
      )

      setPhone(
        data?.phone ??
          user.phone ??
          ''
      )
  setEmail(user.email ?? '')
    } catch (error: any) {
      console.error(
        '[TempStaff Worker] Failed to load profile:',
        error
      )

      Alert.alert(
        'Unable to load profile',
        error?.message ||
          'Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  const saveProfile = async () => {
    const trimmedName = name.trim()
    const trimmedPhone = phone.trim()

    if (!trimmedName) {
      Alert.alert(
        'Name required',
        'Please enter your full name.'
      )
      return
    }

    if (!trimmedPhone) {
      Alert.alert(
        'Phone required',
        'Please enter your phone number.'
      )
      return
    }

    try {
      setSaving(true)

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        throw new Error(
          'Worker is not authenticated.'
        )
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: trimmedName,
          phone: trimmedPhone,
        })
        .eq('id', user.id)

      if (error) {
        throw error
      }

      Alert.alert(
        'Profile updated',
        'Your profile has been updated successfully.',
        [
          {
            text: 'OK',
            onPress: onSaved,
          },
        ]
      )
    } catch (error: any) {
      console.error(
        '[TempStaff Worker] Failed to update profile:',
        error
      )

      Alert.alert(
        'Unable to save profile',
        error?.message ||
          'Please try again.'
      )
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loading}>
          <ActivityIndicator size="large" />

          <Text style={styles.loadingText}>
            Loading profile...
          </Text>
        </View>
      </SafeAreaView>
    )
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
          contentContainerStyle={styles.page}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBack}
            disabled={saving}
          >
            <Text style={styles.backText}>
              ← Back
            </Text>
          </TouchableOpacity>

          <Text style={styles.title}>
            Edit Profile
          </Text>

          <Text style={styles.subtitle}>
            Update your personal information.
          </Text>

          <View style={styles.card}>
            <Text style={styles.label}>
              Full name
            </Text>

            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Enter your full name"
              placeholderTextColor="#9ca3af"
              style={styles.input}
              autoCapitalize="words"
              editable={!saving}
            />

            <Text style={styles.label}>
              Phone number
            </Text>

            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder="Enter your phone number"
              placeholderTextColor="#9ca3af"
              style={styles.input}
              keyboardType="phone-pad"
              editable={!saving}
            />

            <Text style={styles.emailLabel}>
              Email
            </Text>

            <View style={styles.emailBox}>
              <Text style={styles.emailText}>
                {email || 'Not available'}
              </Text>
            </View>

            <Text style={styles.emailNote}>
              Email cannot be changed here.
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.saveButton,
              saving && styles.disabledButton,
            ]}
            onPress={saveProfile}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.saveText}>
                Save Changes
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onBack}
            disabled={saving}
          >
            <Text style={styles.cancelText}>
              Cancel
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },

  keyboard: {
    flex: 1,
  },

  page: {
    padding: 22,
    paddingBottom: 50,
  },

  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    marginTop: 12,
    color: '#6b7280',
  },

  backButton: {
    marginBottom: 18,
  },

  backText: {
    color: '#0f766e',
    fontSize: 16,
    fontWeight: '700',
  },

  title: {
    color: '#0b1f3a',
    fontSize: 31,
    fontWeight: '800',
    marginBottom: 7,
  },

  subtitle: {
    color: '#6b7280',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 22,
  },

  card: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 16,
  },

  label: {
    color: '#374151',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },

  input: {
    height: 52,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 13,
    paddingHorizontal: 15,
    color: '#111827',
    fontSize: 15,
    backgroundColor: '#fafafa',
    marginBottom: 18,
  },

  emailLabel: {
    color: '#374151',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },

  emailBox: {
    height: 52,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 13,
    paddingHorizontal: 15,
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
  },

  emailText: {
    color: '#6b7280',
    fontSize: 15,
  },

  emailNote: {
    color: '#9ca3af',
    fontSize: 11,
    marginTop: 7,
  },

  saveButton: {
    backgroundColor: '#0f766e',
    borderRadius: 15,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 11,
  },

  disabledButton: {
    opacity: 0.7,
  },

  saveText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '800',
  },

  cancelButton: {
    backgroundColor: 'white',
    borderRadius: 15,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },

  cancelText: {
    color: '#374151',
    fontSize: 15,
    fontWeight: '700',
  },
})
