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
  View,
} from 'react-native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'

import { COLORS, LOGO } from '../constants/theme'
import { RootStackParamList } from '../types'
import PrimaryButton from '../components/PrimaryButton'
import { saveCustomerProfile } from '../services/customer'

type Props = NativeStackScreenProps<
  RootStackParamList,
  'CustomerDetails'
>

export default function CustomerDetailsScreen({
  navigation,
}: Props) {
  const [fullName, setFullName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [focusedField, setFocusedField] =
    useState<'name' | 'company' | null>(null)
  const [saving, setSaving] = useState(false)

  const canContinue = useMemo(() => {
    return (
      fullName.trim().length >= 2 &&
      companyName.trim().length >= 2 &&
      !saving
    )
  }, [fullName, companyName, saving])

  const continueToHome = async () => {
    const trimmedName = fullName.trim()
    const trimmedCompany = companyName.trim()

    if (
      trimmedName.length < 2 ||
      trimmedCompany.length < 2
    ) {
      Alert.alert(
        'Complete your details',
        'Please enter your full name and company or business name.'
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

      navigation.reset({
        index: 0,
        routes: [{ name: 'Home' }],
      })
    } catch (error: any) {
      console.error(
        '[TempStaff] Customer profile save failed:',
        error
      )

      Alert.alert(
        'Unable to save details',
        error?.message ||
          'We could not save your details. Please try again.'
      )
    } finally {
      setSaving(false)
    }
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

            <View style={styles.progressRow}>
              <View
                style={[
                  styles.progressStep,
                  styles.progressActive,
                ]}
              />

              <View style={styles.progressStep} />

              <View style={styles.progressStep} />
            </View>

            <Text style={styles.progressText}>
              Almost there
            </Text>
          </View>

          <View style={styles.header}>
            <Text style={styles.title}>
              Tell us about yourself
            </Text>

            <Text style={styles.subtitle}>
              We just need a few details to set up your
              TempStaff account.
            </Text>
          </View>

          <View style={styles.form}>
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
                placeholder="Enter your full name"
                placeholderTextColor="#9CA3AF"
                value={fullName}
                onChangeText={setFullName}
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
                placeholder="Enter company or business name"
                placeholderTextColor="#9CA3AF"
                value={companyName}
                onChangeText={setCompanyName}
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
                onSubmitEditing={continueToHome}
              />
            </View>
          </View>

          <View style={styles.infoBox}>
            <View style={styles.infoIcon}>
              <Text style={styles.infoIconText}>
                i
              </Text>
            </View>

            <Text style={styles.infoText}>
              These details help us identify your account
              when you make and manage bookings.
            </Text>
          </View>

          <View style={styles.bottom}>
            <PrimaryButton
              title={
                saving
                  ? 'Saving...'
                  : 'Continue'
              }
              onPress={continueToHome}
              disabled={!canContinue}
            />

            <Text style={styles.note}>
              You can update your details later from
              your profile.
            </Text>
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
    paddingTop: 28,
    paddingBottom: 30,
  },

  top: {
    alignItems: 'center',
  },

  logo: {
    width: 82,
    height: 82,
    marginBottom: 18,
  },

  progressRow: {
    width: 150,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  progressStep: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#DDE2E8',
  },

  progressActive: {
    backgroundColor: COLORS.teal,
  },

  progressText: {
    color: COLORS.gray,
    fontSize: 10,
    lineHeight: 15,
    fontWeight: '700',
    marginTop: 7,
    letterSpacing: 0.5,
  },

  header: {
    marginTop: 35,
  },

  title: {
    color: COLORS.navy,
    fontSize: 28,
    lineHeight: 35,
    fontWeight: '800',
    marginBottom: 9,
  },

  subtitle: {
    color: COLORS.gray,
    fontSize: 15,
    lineHeight: 22,
  },

  form: {
    marginTop: 32,
  },

  label: {
    color: COLORS.navy,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    marginBottom: 8,
  },

  inputContainer: {
    width: '100%',
    height: 56,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#D9DEE5',
    borderRadius: 14,
    marginBottom: 21,
  },

  inputFocused: {
    borderColor: COLORS.teal,
  },

  input: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 0,
    color: COLORS.navy,
    fontSize: 16,
    fontWeight: '500',
  },

  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F6F6',
    borderRadius: 13,
    paddingVertical: 12,
    paddingHorizontal: 13,
    marginTop: 2,
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
    fontWeight: '800',
  },

  infoText: {
    flex: 1,
    color: COLORS.navy,
    fontSize: 11,
    lineHeight: 16,
  },

  bottom: {
    marginTop: 'auto',
    paddingTop: 30,
  },

  note: {
    color: COLORS.gray,
    fontSize: 11,
    lineHeight: 17,
    textAlign: 'center',
    marginTop: 13,
    paddingHorizontal: 10,
  },
})