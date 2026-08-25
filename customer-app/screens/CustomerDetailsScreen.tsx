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

import { COLORS, LOGO } from '../constants/theme'
import { RootStackParamList } from '../types'
import PrimaryButton from '../components/PrimaryButton'

type Props = NativeStackScreenProps<
  RootStackParamList,
  'CustomerDetails'
>

export default function CustomerDetailsScreen({
  navigation,
}: Props) {
  const [fullName, setFullName] = useState('')
  const [companyName, setCompanyName] = useState('')

  const canContinue =
    fullName.trim().length >= 2 &&
    companyName.trim().length >= 2

  const continueToLocation = () => {
    if (!canContinue) {
      Alert.alert(
        'Complete your details',
        'Please enter your name and company name.'
      )
      return
    }

    navigation.reset({
  index: 0,
  routes: [{ name: 'Home' }],
})
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
            <ImageLogo />
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
              editable
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
              editable
            />
          </View>

          <View style={styles.bottom}>
            <PrimaryButton
              title="Continue"
              onPress={continueToLocation}
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

function ImageLogo() {
  return (
    <View style={styles.logoContainer}>
      <Text style={styles.logoPlaceholder}>
        Temp<Text style={styles.logoTeal}>Staff</Text>
      </Text>
    </View>
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