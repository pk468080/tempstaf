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
import {
  NativeStackScreenProps,
} from '@react-navigation/native-stack'
import { useEffect, useState } from 'react'

import { COLORS } from '../constants/theme'
import { RootStackParamList } from '../types'
import { supabase } from '../lib/supabase'

type Props = NativeStackScreenProps<
  RootStackParamList,
  'EditProfile'
>

type ProfileData = {
  full_name: string
  company_name: string
  phone: string
  email: string
}

export default function EditProfileScreen({
  navigation,
}: Props) {
  const [profile, setProfile] =
    useState<ProfileData>({
      full_name: '',
      company_name: '',
      phone: '',
      email: '',
    })

  const [loading, setLoading] =
    useState(true)

  const [saving, setSaving] =
    useState(false)

  const [focused, setFocused] =
    useState<string | null>(null)

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      setLoading(true)

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError) {
        throw userError
      }

      if (!user) {
        throw new Error(
          'Customer is not authenticated.'
        )
      }

      const {
        data,
        error,
      } = await supabase
        .from('profiles')
        .select(
          'full_name, company_name, phone'
        )
        .eq('id', user.id)
        .maybeSingle()

      if (error) {
        throw error
      }

      setProfile({
        full_name:
          data?.full_name ||
          user.user_metadata?.full_name ||
          '',

        company_name:
          data?.company_name ||
          user.user_metadata?.company_name ||
          '',

        phone:
          data?.phone ||
          user.phone ||
          '',

        email:
          user.email ||
          '',
      })
    } catch (error: any) {
      console.error(
        '[TempStaff] Failed to load customer profile:',
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
    const fullName =
      profile.full_name.trim()

    const companyName =
      profile.company_name.trim()

    if (fullName.length < 2) {
      Alert.alert(
        'Invalid name',
        'Please enter your full name.'
      )
      return
    }

    if (companyName.length < 2) {
      Alert.alert(
        'Invalid company name',
        'Please enter your company or business name.'
      )
      return
    }

    try {
      setSaving(true)

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError) {
        throw userError
      }

      if (!user) {
        throw new Error(
          'Customer is not authenticated.'
        )
      }

      const {
        error,
      } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          company_name: companyName,
          updated_at:
            new Date().toISOString(),
        })
        .eq('id', user.id)

      if (error) {
        throw error
      }

      Alert.alert(
        'Profile updated',
        'Your profile details have been saved.',
        [
          {
            text: 'OK',
            onPress: () =>
              navigation.goBack(),
          },
        ]
      )
    } catch (error: any) {
      console.error(
        '[TempStaff] Failed to update profile:',
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
      <SafeAreaView
        style={styles.container}
      >
        <View style={styles.loading}>
          <ActivityIndicator
            size="large"
            color={COLORS.teal}
          />

          <Text style={styles.loadingText}>
            Loading your profile...
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView
      style={styles.container}
    >
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
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.topBar}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() =>
                navigation.goBack()
              }
              disabled={saving}
            >
              <Text style={styles.backText}>
                ‹
              </Text>
            </TouchableOpacity>

            <Text style={styles.topTitle}>
              Edit Profile
            </Text>

            <View
              style={styles.topSpacer}
            />
          </View>

          <View style={styles.avatar}>
            <Text
              style={styles.avatarText}
            >
              {getInitials(
                profile.full_name
              )}
            </Text>
          </View>

          <Text style={styles.heading}>
            Your profile
          </Text>

          <Text style={styles.subtitle}>
            Keep your account information
            up to date.
          </Text>

          <View style={styles.form}>
            <Field
              label="Full name"
              value={profile.full_name}
              placeholder="Enter your full name"
              focused={focused === 'name'}
              editable={!saving}
              onFocus={() =>
                setFocused('name')
              }
              onBlur={() =>
                setFocused(null)
              }
              onChangeText={value =>
                setProfile(current => ({
                  ...current,
                  full_name: value,
                }))
              }
              autoCapitalize="words"
            />

            <Field
              label="Company / Business name"
              value={profile.company_name}
              placeholder="Enter company or business name"
              focused={
                focused === 'company'
              }
              editable={!saving}
              onFocus={() =>
                setFocused('company')
              }
              onBlur={() =>
                setFocused(null)
              }
              onChangeText={value =>
                setProfile(current => ({
                  ...current,
                  company_name: value,
                }))
              }
              autoCapitalize="words"
            />

            <Text style={styles.label}>
              Phone number
            </Text>

            <View
              style={[
                styles.inputBox,
                styles.disabledBox,
              ]}
            >
              <TextInput
                style={styles.input}
                value={profile.phone}
                editable={false}
                placeholder="Phone number"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <Text style={styles.helper}>
              Phone number is linked to your
              authentication account.
            </Text>

            <Text style={styles.label}>
              Email
            </Text>

            <View
              style={[
                styles.inputBox,
                styles.disabledBox,
              ]}
            >
              <TextInput
                style={styles.input}
                value={profile.email}
                editable={false}
                placeholder="Email address"
                placeholderTextColor="#9CA3AF"
                keyboardType="email-address"
              />
            </View>

            <Text style={styles.helper}>
              Authentication details are managed
              by your TempStaff account.
            </Text>
          </View>

          <View style={styles.infoBox}>
            <View style={styles.infoIcon}>
              <Text
                style={styles.infoIconText}
              >
                i
              </Text>
            </View>

            <Text style={styles.infoText}>
              Your name and business information
              are used when managing bookings
              and identifying your account.
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.saveButton,
              saving &&
                styles.saveButtonDisabled,
            ]}
            onPress={saveProfile}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator
                color={COLORS.white}
              />
            ) : (
              <Text
                style={styles.saveText}
              >
                Save Changes
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() =>
              navigation.goBack()
            }
            disabled={saving}
            activeOpacity={0.8}
          >
            <Text
              style={styles.cancelText}
            >
              Cancel
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

function Field({
  label,
  value,
  placeholder,
  focused,
  editable,
  onFocus,
  onBlur,
  onChangeText,
  autoCapitalize,
}: {
  label: string
  value: string
  placeholder: string
  focused: boolean
  editable: boolean
  onFocus: () => void
  onBlur: () => void
  onChangeText: (value: string) => void
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters'
}) {
  return (
    <View>
      <Text style={styles.label}>
        {label}
      </Text>

      <View
        style={[
          styles.inputBox,
          focused &&
            styles.inputFocused,
        ]}
      >
        <TextInput
          style={styles.input}
          value={value}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          editable={editable}
          autoCapitalize={
            autoCapitalize || 'sentences'
          }
          autoCorrect={false}
          onFocus={onFocus}
          onBlur={onBlur}
          onChangeText={onChangeText}
        />
      </View>
    </View>
  )
}

function getInitials(name: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (!parts.length) {
    return 'TS'
  }

  if (parts.length === 1) {
    return parts[0]
      .slice(0, 2)
      .toUpperCase()
  }

  return (
    parts[0][0] +
    parts[parts.length - 1][0]
  ).toUpperCase()
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.light,
  },

  keyboard: {
    flex: 1,
  },

  page: {
    padding: 22,
    paddingBottom: 40,
  },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 28,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  backText: {
    color: COLORS.navy,
    fontSize: 30,
    lineHeight: 32,
    marginTop: -3,
  },

  topTitle: {
    color: COLORS.navy,
    fontSize: 18,
    fontWeight: '900',
  },

  topSpacer: {
    width: 42,
  },

  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: COLORS.navy,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 17,
  },

  avatarText: {
    color: COLORS.white,
    fontSize: 25,
    fontWeight: '900',
  },

  heading: {
    color: COLORS.navy,
    fontSize: 27,
    fontWeight: '900',
    textAlign: 'center',
  },

  subtitle: {
    color: COLORS.gray,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 28,
  },

  form: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 17,
  },

  label: {
    color: COLORS.navy,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 8,
    marginTop: 3,
  },

  inputBox: {
    height: 54,
    borderWidth: 1,
    borderColor: '#D9DEE5',
    borderRadius: 13,
    backgroundColor: COLORS.white,
    marginBottom: 17,
  },

  inputFocused: {
    borderColor: COLORS.teal,
  },

  disabledBox: {
    backgroundColor: '#F3F5F7',
  },

  input: {
    flex: 1,
    paddingHorizontal: 15,
    color: COLORS.navy,
    fontSize: 15,
    fontWeight: '500',
  },

  helper: {
    color: COLORS.gray,
    fontSize: 10,
    lineHeight: 15,
    marginTop: -11,
    marginBottom: 17,
  },

  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F6F6',
    borderRadius: 14,
    padding: 13,
    marginTop: 16,
  },

  infoIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.teal,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },

  infoIconText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '900',
  },

  infoText: {
    flex: 1,
    color: COLORS.navy,
    fontSize: 11,
    lineHeight: 16,
  },

  saveButton: {
    height: 54,
    borderRadius: 16,
    backgroundColor: COLORS.orange,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },

  saveButtonDisabled: {
    opacity: 0.65,
  },

  saveText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '900',
  },

  cancelButton: {
    height: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 9,
  },

  cancelText: {
    color: COLORS.gray,
    fontSize: 13,
    fontWeight: '800',
  },

  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    color: COLORS.gray,
    fontSize: 13,
    marginTop: 12,
  },
})