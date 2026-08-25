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
  View,
} from 'react-native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'

import { COLORS } from '../constants/theme'
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
  const [saving, setSaving] = useState(false)

  const canContinue =
    fullName.trim().length >= 2 &&
    companyName.trim().length >= 2 &&
    !saving

  const continueToHome = async () => {
    if (!canContinue) {
      Alert.alert(
        'Complete your details',
        'Please enter your name and company name.'
      )
      return
    }

    try {
      setSaving(true)

      await saveCustomerProfile({
        fullName,
        companyName,
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
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Text style={styles.logoPlaceholder}>
                Temp
                <Text style={styles.logoTeal}>
                  Staff
                </Text>
              </Text>
            </View>
          </View>

          <Text style={styles.title}>
            Tell us about yourself
          </Text>

          <Text style={styles.subtitle}>
            We just need a few basic details to set up
            your TempStaff account.
          </Text>

          <View style={styles.form}>
            <Text style={styles.label}>
              Full name
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Enter your name"
              placeholderTextColor="#9CA3AF"
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
              autoCorrect={false}
              editable={!saving}
            />

            <Text style={styles.label}>
              Company / Business name
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Enter company or business name"
              placeholderTextColor="#9CA3AF"
              value={companyName}
              onChangeText={setCompanyName}
              autoCapitalize="words"
              autoCorrect={false}
              editable={!saving}
            />
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
              You can update these details later from
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
    padding: 28,
    paddingTop: 35,
    paddingBottom: 35,
  },

  header: {
    alignItems: 'center',
    marginBottom: 38,
  },

  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  logoPlaceholder: {
    fontSize: 30,
    fontWeight: '800',
    color: COLORS.navy,
  },

  logoTeal: {
    color: COLORS.teal,
  },

  title: {
    color: COLORS.navy,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    marginBottom: 10,
  },

  subtitle: {
    color: COLORS.gray,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 30,
  },

  form: {
    width: '100%',
  },

  label: {
    color: COLORS.navy,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },

  input: {
    width: '100%',
    height: 56,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#D9DEE5',
    borderRadius: 14,
    paddingHorizontal: 16,
    color: COLORS.navy,
    fontSize: 16,
    marginBottom: 22,
  },

  bottom: {
    marginTop: 'auto',
  },

  note: {
    color: COLORS.gray,
    fontSize: 11,
    lineHeight: 17,
    textAlign: 'center',
    marginTop: 14,
  },
})