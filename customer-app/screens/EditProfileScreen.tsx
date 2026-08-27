import { useEffect, useMemo, useState } from 'react'
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
import { NativeStackScreenProps } from '@react-navigation/native-stack'

import { COLORS } from '../constants/theme'
import { RootStackParamList } from '../types'
import { supabase } from '../lib/supabase'
import { saveCustomerProfile } from '../services/customer'
import CustomerBottomNav from '../components/CustomerBottomNav'

type Props = NativeStackScreenProps<
  RootStackParamList,
  'EditProfile'
>

export default function EditProfileScreen({
  navigation,
}: Props) {
  const [fullName, setFullName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [focusedField, setFocusedField] =
    useState<'name' | 'company' | null>(null)

  const canSave = useMemo(() => {
    return (
      fullName.trim().length >= 2 &&
      companyName.trim().length >= 2 &&
      !saving
    )
  }, [fullName, companyName, saving])

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

      setFullName(
        data?.full_name ??
          user.user_metadata?.full_name ??
          ''
      )

      setCompanyName(
        data?.company_name ??
          user.user_metadata?.company_name ??
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
        '[TempStaff Customer] Failed to load edit profile:',
        error
      )

      Alert.alert(
        'Unable to load profile',
        error?.message ||
          'We could not load your profile details.'
      )
    } finally {
      setLoading(false)
    }
  }

  const saveChanges = async () => {
    const trimmedName = fullName.trim()
    const trimmedCompany = companyName.trim()

    if (trimmedName.length < 2) {
      Alert.alert(
        'Invalid name',
        'Please enter your full name.'
      )
      return
    }

    if (trimmedCompany.length < 2) {
      Alert.alert(
        'Invalid company name',
        'Please enter your company or business name.'
      )
      return
    }

    if (saving) {
      return
    }

    try {
      setSaving(true)

      await saveCustomerProfile({
        fullName: trimmedName,
        companyName: trimmedCompany,
      })

      Alert.alert(
        'Profile updated',
        'Your profile details have been saved successfully.',
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
        '[TempStaff Customer] Failed to save profile:',
        error
      )

      Alert.alert(
        'Unable to save profile',
        error?.message ||
          'We could not save your profile. Please try again.'
      )
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loading}>
          <ActivityIndicator
            size="large"
            color={COLORS.teal}
          />

          <Text style={styles.loadingText}>
            Loading profile...
          </Text>
        </View>

        <CustomerBottomNav
          navigation={navigation}
          active="Profile"
        />
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
        <View style={styles.screen}>
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.topBar}>
              <TouchableOpacity
                style={styles.backButton}
                activeOpacity={0.8}
                onPress={() =>
                  navigation.goBack()
                }
              >
                <Text style={styles.backIcon}>
                  ‹
                </Text>
              </TouchableOpacity>

              <View style={styles.topTitleContainer}>
                <Text style={styles.eyebrow}>
                  ACCOUNT
                </Text>

                <Text style={styles.title}>
                  Edit Profile
                </Text>
              </View>

              <View style={styles.topSpacer} />
            </View>

            <Text style={styles.subtitle}>
              Update your personal and business
              details.
            </Text>

            <View style={styles.avatarSection}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {getInitials(fullName)}
                </Text>
              </View>

              <View>
                <Text style={styles.avatarName}>
                  {fullName.trim() || 'Customer'}
                </Text>

                <Text style={styles.avatarCompany}>
                  {companyName.trim() ||
                    'Business account'}
                </Text>
              </View>
            </View>

            <View style={styles.formCard}>
              <Text style={styles.sectionTitle}>
                Personal details
              </Text>

              <Text style={styles.label}>
                Full name
              </Text>

              <View
                style={[
                  styles.inputContainer,
                  focusedField === 'name' &&
                    styles.inputFocused,
                ]}
              >
                <TextInput
                  style={styles.input}
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Enter your full name"
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="words"
                  autoCorrect={false}
                  editable={!saving}
                  returnKeyType="next"
                  onFocus={() =>
                    setFocusedField('name')
                  }
                  onBlur={() =>
                    setFocusedField(null)
                  }
                />
              </View>

              <Text style={styles.label}>
                Company / Business name
              </Text>

              <View
                style={[
                  styles.inputContainer,
                  focusedField === 'company' &&
                    styles.inputFocused,
                ]}
              >
                <TextInput
                  style={styles.input}
                  value={companyName}
                  onChangeText={setCompanyName}
                  placeholder="Enter company or business name"
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="words"
                  autoCorrect={false}
                  editable={!saving}
                  returnKeyType="done"
                  onFocus={() =>
                    setFocusedField('company')
                  }
                  onBlur={() =>
                    setFocusedField(null)
                  }
                  onSubmitEditing={saveChanges}
                />
              </View>
            </View>

            <View style={styles.contactCard}>
              <Text style={styles.sectionTitle}>
                Account contact
              </Text>

              <View style={styles.contactRow}>
                <View style={styles.contactIcon}>
                  <Text style={styles.contactIconText}>
                    ☎
                  </Text>
                </View>

                <View style={styles.contactContent}>
                  <Text style={styles.contactLabel}>
                    Phone number
                  </Text>

                  <Text style={styles.contactValue}>
                    {phone || 'Not available'}
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.contactRow}>
                <View style={styles.contactIcon}>
                  <Text style={styles.contactIconText}>
                    @
                  </Text>
                </View>

                <View style={styles.contactContent}>
                  <Text style={styles.contactLabel}>
                    Email address
                  </Text>

                  <Text style={styles.contactValue}>
                    {email || 'Not available'}
                  </Text>
                </View>
              </View>

              <Text style={styles.readOnlyNote}>
                Phone and email are managed through
                your account authentication and cannot
                be changed here.
              </Text>
            </View>

            <View style={styles.infoBox}>
              <View style={styles.infoIcon}>
                <Text style={styles.infoIconText}>
                  i
                </Text>
              </View>

              <Text style={styles.infoText}>
                Your name and business details are used
                when creating and managing bookings.
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.saveButton,
                !canSave &&
                  styles.saveButtonDisabled,
              ]}
              activeOpacity={0.85}
              disabled={!canSave}
              onPress={saveChanges}
            >
              {saving ? (
                <ActivityIndicator
                  color={COLORS.white}
                />
              ) : (
                <Text style={styles.saveText}>
                  Save Changes
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              activeOpacity={0.8}
              disabled={saving}
              onPress={() =>
                navigation.goBack()
              }
            >
              <Text style={styles.cancelText}>
                Cancel
              </Text>
            </TouchableOpacity>

            <View style={styles.bottomSpace} />
          </ScrollView>

          <CustomerBottomNav
            navigation={navigation}
            active="Profile"
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

function getInitials(name: string) {
  if (!name.trim()) {
    return 'TS'
  }

  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)

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

  screen: {
    flex: 1,
  },

  content: {
    padding: 22,
    paddingBottom: 35,
  },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
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

  backIcon: {
    color: COLORS.navy,
    fontSize: 31,
    lineHeight: 34,
    marginTop: -3,
  },

  topTitleContainer: {
    flex: 1,
    marginLeft: 13,
  },

  topSpacer: {
    width: 42,
  },

  eyebrow: {
    color: COLORS.teal,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.4,
    marginBottom: 3,
  },

  title: {
    color: COLORS.navy,
    fontSize: 25,
    fontWeight: '900',
  },

  subtitle: {
    color: COLORS.gray,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 7,
    marginBottom: 20,
  },

  avatarSection: {
    backgroundColor: COLORS.navy,
    borderRadius: 21,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },

  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.teal,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },

  avatarText: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: '900',
  },

  avatarName: {
    color: COLORS.white,
    fontSize: 17,
    fontWeight: '900',
  },

  avatarCompany: {
    color: '#B9CBD8',
    fontSize: 12,
    marginTop: 4,
  },

  formCard: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 17,
    marginBottom: 14,
  },

  sectionTitle: {
    color: COLORS.navy,
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 16,
  },

  label: {
    color: COLORS.navy,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 7,
  },

  inputContainer: {
    height: 54,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D9DEE5',
    backgroundColor: COLORS.white,
    marginBottom: 17,
  },

  inputFocused: {
    borderColor: COLORS.teal,
  },

  input: {
    flex: 1,
    color: COLORS.navy,
    fontSize: 15,
    fontWeight: '500',
    paddingHorizontal: 15,
    paddingVertical: 0,
  },

  contactCard: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 17,
    marginBottom: 14,
  },

  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  contactIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#E8F6F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },

  contactIconText: {
    color: COLORS.teal,
    fontSize: 15,
    fontWeight: '900',
  },

  contactContent: {
    flex: 1,
  },

  contactLabel: {
    color: COLORS.gray,
    fontSize: 10,
    fontWeight: '700',
  },

  contactValue: {
    color: COLORS.navy,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 2,
  },

  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 13,
  },

  readOnlyNote: {
    color: COLORS.gray,
    fontSize: 10,
    lineHeight: 15,
    marginTop: 13,
  },

  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F6F6',
    borderRadius: 14,
    padding: 12,
    marginBottom: 17,
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
    fontSize: 12,
    fontWeight: '900',
  },

  infoText: {
    flex: 1,
    color: COLORS.navy,
    fontSize: 10,
    lineHeight: 15,
  },

  saveButton: {
    height: 52,
    borderRadius: 16,
    backgroundColor: COLORS.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },

  saveButtonDisabled: {
    opacity: 0.5,
  },

  saveText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '900',
  },

  cancelButton: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 5,
  },

  cancelText: {
    color: COLORS.navy,
    fontSize: 13,
    fontWeight: '800',
  },

  bottomSpace: {
    height: 20,
  },

  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    color: COLORS.gray,
    fontSize: 13,
    marginTop: 11,
  },
})