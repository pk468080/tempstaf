import { useEffect, useState } from 'react'
import {
  Alert,
  ActivityIndicator,
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
import Header from '../components/Header'
import PrimaryButton from '../components/PrimaryButton'
import { supabase } from '../lib/supabase'

type Props = NativeStackScreenProps<
  RootStackParamList,
  'DeleteAccount'
>

type RequestStatus =
  | 'loading'
  | 'none'
  | 'pending'
  | 'approved'
  | 'rejected'

export default function DeleteAccountScreen({
  navigation,
}: Props) {
  const [reason, setReason] = useState('')
  const [status, setStatus] =
    useState<RequestStatus>('loading')
  const [submitting, setSubmitting] =
    useState(false)

  useEffect(() => {
    loadRequest()
  }, [])

  const loadRequest = async () => {
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError) {
        throw authError
      }

      if (!user) {
        setStatus('none')
        return
      }

      const { data, error } = await supabase
        .from('account_deletion_requests')
        .select('status, reason')
        .eq('user_id', user.id)
        .order('requested_at', {
          ascending: false,
        })
        .limit(1)
        .maybeSingle()

      if (error) {
        throw error
      }

      if (!data) {
        setStatus('none')
        return
      }

      setReason(data.reason || '')
      setStatus(data.status as RequestStatus)
    } catch (error: any) {
      console.error(
        '[TempStaff] Failed to load deletion request:',
        error
      )

      Alert.alert(
        'Unable to load',
        error?.message ||
          'We could not check your deletion request.'
      )

      setStatus('none')
    }
  }

  const submitRequest = () => {
    Alert.alert(
      'Request account deletion',
      'Your account will not be deleted immediately. Your request will be sent to TempStaff for admin review.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: createRequest,
        },
      ]
    )
  }

  const createRequest = async () => {
    if (submitting) {
      return
    }

    try {
      setSubmitting(true)

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError) {
        throw authError
      }

      if (!user) {
        Alert.alert(
          'Sign in required',
          'Please sign in again before requesting account deletion.'
        )
        return
      }

      const { data: existing, error: existingError } =
        await supabase
          .from('account_deletion_requests')
          .select('id, status')
          .eq('user_id', user.id)
          .eq('status', 'pending')
          .limit(1)
          .maybeSingle()

      if (existingError) {
        throw existingError
      }

      if (existing) {
        setStatus('pending')

        Alert.alert(
          'Request already submitted',
          'Your account deletion request is already waiting for admin approval.'
        )

        return
      }

      const { error } = await supabase
        .from('account_deletion_requests')
        .insert({
          user_id: user.id,
          reason:
            reason.trim().length > 0
              ? reason.trim()
              : null,
          status: 'pending',
        })

      if (error) {
        throw error
      }

      setStatus('pending')

      Alert.alert(
        'Request submitted',
        'Your account deletion request has been submitted. Your account will remain active until an administrator reviews the request.'
      )
    } catch (error: any) {
      console.error(
        '[TempStaff] Account deletion request failed:',
        error
      )

      Alert.alert(
        'Unable to submit request',
        error?.message ||
          'We could not submit your deletion request. Please try again.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (status === 'loading') {
    return (
      <SafeAreaView style={styles.container}>
        <Header
          onBack={() => navigation.goBack()}
        />

        <View style={styles.loading}>
          <ActivityIndicator
            size="large"
            color={COLORS.teal}
          />

          <Text style={styles.loadingText}>
            Checking account status...
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  if (status === 'pending') {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.page}
          showsVerticalScrollIndicator={false}
        >
          <Header
            onBack={() => navigation.goBack()}
          />

          <View style={styles.pendingHero}>
            <View style={styles.pendingIcon}>
              <Text style={styles.pendingIconText}>
                ✓
              </Text>
            </View>

            <Text style={styles.title}>
              Deletion request pending
            </Text>

            <Text style={styles.subtitle}>
              Your request has been sent to TempStaff
              for administrator review.
            </Text>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>
              What happens next?
            </Text>

            <Step
              number="1"
              title="Admin review"
              text="A TempStaff administrator will review your request."
            />

            <Step
              number="2"
              title="Decision"
              text="The administrator can approve or reject the request."
            />

            <Step
              number="3"
              title="Account deletion"
              text="If approved, the account deletion process will be completed by the authorized backend/admin process."
            />
          </View>

          <View style={styles.warningCard}>
            <Text style={styles.warningTitle}>
              Your account is still active
            </Text>

            <Text style={styles.warningText}>
              Requesting deletion does not immediately
              sign you out or remove your account.
              You can continue using TempStaff while
              your request is being reviewed.
            </Text>
          </View>

          <PrimaryButton
            title="Back to Profile"
            onPress={() => navigation.goBack()}
          />
        </ScrollView>
      </SafeAreaView>
    )
  }

  if (status === 'approved') {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.page}
        >
          <Header
            onBack={() => navigation.goBack()}
          />

          <View style={styles.pendingHero}>
            <View style={styles.pendingIcon}>
              <Text style={styles.pendingIconText}>
                ✓
              </Text>
            </View>

            <Text style={styles.title}>
              Request approved
            </Text>

            <Text style={styles.subtitle}>
              Your deletion request has been approved
              by an administrator.
            </Text>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>
              Account deletion is being processed
            </Text>

            <Text style={styles.infoText}>
              The authorized TempStaff backend process
              will complete the account deletion.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    )
  }

  if (status === 'rejected') {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.page}
        >
          <Header
            onBack={() => navigation.goBack()}
          />

          <View style={styles.rejectedHero}>
            <View style={styles.rejectedIcon}>
              <Text style={styles.rejectedIconText}>
                !
              </Text>
            </View>

            <Text style={styles.title}>
              Request not approved
            </Text>

            <Text style={styles.subtitle}>
              Your previous deletion request was not
              approved.
            </Text>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>
              Need help?
            </Text>

            <Text style={styles.infoText}>
              Contact TempStaff support if you believe
              this decision was made in error or if you
              need assistance with your account.
            </Text>
          </View>

          <PrimaryButton
            title="Request Again"
            onPress={() => setStatus('none')}
          />
        </ScrollView>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.page}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Header
          onBack={() => navigation.goBack()}
        />

        <View style={styles.header}>
          <View style={styles.dangerIcon}>
            <Text style={styles.dangerIconText}>
              !
            </Text>
          </View>

          <Text style={styles.title}>
            Delete Account
          </Text>

          <Text style={styles.subtitle}>
            Request the deletion of your TempStaff
            customer account.
          </Text>
        </View>

        <View style={styles.warningCard}>
          <Text style={styles.warningTitle}>
            Account deletion requires approval
          </Text>

          <Text style={styles.warningText}>
            Submitting this form does not immediately
            delete your account. Your request will be
            reviewed by a TempStaff administrator.
          </Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>
            Before you continue
          </Text>

          <Bullet text="Your deletion request will be recorded." />
          <Bullet text="Your account remains active while the request is reviewed." />
          <Bullet text="An administrator must approve the request." />
          <Bullet text="Only the authorized backend/admin process can complete the deletion." />
        </View>

        <Text style={styles.label}>
          Reason for deletion
          <Text style={styles.optional}>
            {' '}
            (optional)
          </Text>
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Tell us why you want to delete your account"
          placeholderTextColor="#9CA3AF"
          value={reason}
          onChangeText={setReason}
          multiline
          numberOfLines={5}
          textAlignVertical="top"
          maxLength={500}
        />

        <Text style={styles.counter}>
          {reason.length}/500
        </Text>

        <PrimaryButton
          title={
            submitting
              ? 'Submitting...'
              : 'Request Account Deletion'
          }
          onPress={submitRequest}
          disabled={submitting}
        />

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
          disabled={submitting}
        >
          <Text style={styles.cancelText}>
            Keep My Account
          </Text>
        </TouchableOpacity>

        <Text style={styles.footer}>
          Your account will only be deleted after an
          authorized administrator approves the request.
        </Text>
      </ScrollView>
    </SafeAreaView>
  )
}

function Bullet({
  text,
}: {
  text: string
}) {
  return (
    <View style={styles.bulletRow}>
      <View style={styles.bullet}>
        <Text style={styles.bulletText}>
          ✓
        </Text>
      </View>

      <Text style={styles.bulletContent}>
        {text}
      </Text>
    </View>
  )
}

function Step({
  number,
  title,
  text,
}: {
  number: string
  title: string
  text: string
}) {
  return (
    <View style={styles.step}>
      <View style={styles.stepNumber}>
        <Text style={styles.stepNumberText}>
          {number}
        </Text>
      </View>

      <View style={styles.stepContent}>
        <Text style={styles.stepTitle}>
          {title}
        </Text>

        <Text style={styles.stepText}>
          {text}
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.light,
  },

  page: {
    padding: 22,
    paddingBottom: 45,
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

  header: {
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 22,
  },

  dangerIcon: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },

  dangerIconText: {
    color: '#B91C1C',
    fontSize: 28,
    fontWeight: '900',
  },

  pendingHero: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
  },

  pendingIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#ECFDF3',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },

  pendingIconText: {
    color: COLORS.green,
    fontSize: 29,
    fontWeight: '900',
  },

  rejectedHero: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
  },

  rejectedIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#FFF7E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },

  rejectedIconText: {
    color: '#B45309',
    fontSize: 29,
    fontWeight: '900',
  },

  title: {
    color: COLORS.navy,
    fontSize: 28,
    lineHeight: 35,
    fontWeight: '900',
    textAlign: 'center',
  },

  subtitle: {
    color: COLORS.gray,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 7,
  },

  warningCard: {
    backgroundColor: '#FFF7E8',
    borderWidth: 1,
    borderColor: '#F4D99B',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
  },

  warningTitle: {
    color: '#92400E',
    fontSize: 14,
    fontWeight: '900',
  },

  warningText: {
    color: '#78350F',
    fontSize: 11,
    lineHeight: 17,
    marginTop: 5,
  },

  infoCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    padding: 17,
    marginBottom: 18,
  },

  infoTitle: {
    color: COLORS.navy,
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 8,
  },

  infoText: {
    color: COLORS.gray,
    fontSize: 11,
    lineHeight: 18,
  },

  bulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },

  bullet: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#E8F6F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },

  bulletText: {
    color: COLORS.teal,
    fontSize: 11,
    fontWeight: '900',
  },

  bulletContent: {
    flex: 1,
    color: COLORS.gray,
    fontSize: 11,
    lineHeight: 17,
  },

  step: {
    flexDirection: 'row',
    marginTop: 13,
  },

  stepNumber: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.navy,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  stepNumberText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '900',
  },

  stepContent: {
    flex: 1,
  },

  stepTitle: {
    color: COLORS.navy,
    fontSize: 13,
    fontWeight: '900',
  },

  stepText: {
    color: COLORS.gray,
    fontSize: 10,
    lineHeight: 16,
    marginTop: 2,
  },

  label: {
    color: COLORS.navy,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 8,
  },

  optional: {
    color: COLORS.gray,
    fontSize: 11,
    fontWeight: '500',
  },

  input: {
    minHeight: 125,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 15,
    padding: 14,
    color: COLORS.navy,
    fontSize: 13,
    lineHeight: 19,
  },

  counter: {
    color: COLORS.gray,
    fontSize: 10,
    textAlign: 'right',
    marginTop: 5,
    marginBottom: 15,
  },

  cancelButton: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 9,
  },

  cancelText: {
    color: COLORS.navy,
    fontSize: 14,
    fontWeight: '800',
  },

  footer: {
    color: COLORS.gray,
    fontSize: 10,
    lineHeight: 15,
    textAlign: 'center',
    marginTop: 12,
    paddingHorizontal: 12,
  },
})