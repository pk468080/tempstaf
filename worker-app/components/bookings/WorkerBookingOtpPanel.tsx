import {
  useState,
} from 'react'

import {
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'

import {
  AppButton,
} from '../ui/AppButton'

import {
  UI,
} from '../../constants/ui'

import {
  verifyWorkerBookingStartOtp,
  verifyWorkerBookingEndOtp,
} from '../../services/bookings/workerBookingOtp.service'

import {
  isStartOtpRequired,
  isEndOtpRequired,
} from '../../lib/workerBookingUtils'

import type {
  WorkerBooking,
} from '../../types/booking'

type WorkerBookingOtpPanelProps = {
  booking: WorkerBooking
  onVerified?: () => void | Promise<void>
}

export default function WorkerBookingOtpPanel({
  booking,
  onVerified,
}: WorkerBookingOtpPanelProps) {
  const startRequired =
    isStartOtpRequired(
      booking,
    )

  const endRequired =
    isEndOtpRequired(
      booking,
    )

  const [otp, setOtp] =
    useState('')

  const [loading, setLoading] =
    useState(false)

  const [error, setError] =
    useState<string | null>(null)

  if (
    !startRequired &&
    !endRequired
  ) {
    return null
  }

  const otpType =
    startRequired
      ? 'start'
      : 'end'

  const title =
    startRequired
      ? 'Start service'
      : 'Complete service'

  const description =
    startRequired
      ? "Enter the 6-digit OTP provided by the customer before starting the service."
      : "Enter the 6-digit OTP provided by the customer to complete the service."

  async function handleVerify() {
    const normalizedOtp =
      otp
        .replace(/\D/g, '')
        .slice(0, 6)

    if (
      normalizedOtp.length !== 6 ||
      loading
    ) {
      return
    }

    setError(null)
    setLoading(true)

    try {
      if (
        otpType === 'start'
      ) {
        await verifyWorkerBookingStartOtp(
          booking.id,
          normalizedOtp,
        )
      } else {
        await verifyWorkerBookingEndOtp(
          booking.id,
          normalizedOtp,
        )
      }

      setOtp('')

      await onVerified?.()
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Unable to verify the OTP.',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>
        {title}
      </Text>

      <Text style={styles.description}>
        {description}
      </Text>

      <TextInput
        value={otp}
        onChangeText={value => {
          setOtp(
            value
              .replace(/\D/g, '')
              .slice(0, 6),
          )

          setError(null)
        }}
        keyboardType="number-pad"
        maxLength={6}
        placeholder="6-digit OTP"
        placeholderTextColor={
          UI.colors.textMuted
        }
        editable={!loading}
        style={styles.input}
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
      />

      {error ? (
        <Text style={styles.error}>
          {error}
        </Text>
      ) : null}

      <AppButton
        title={
          loading
            ? 'Verifying...'
            : startRequired
              ? 'Verify Start OTP'
              : 'Verify End OTP'
        }
        disabled={
          loading ||
          otp.length !== 6
        }
        onPress={() => {
          void handleVerify()
        }}
      />
    </View>
  )
}

const styles =
  StyleSheet.create({
    card: {
      marginTop:
        UI.spacing.lg,

      padding:
        UI.spacing.lg,

      borderRadius:
        UI.radius.lg,

      backgroundColor:
        UI.colors.warningBackground,

      borderWidth: 1,

      borderColor:
        UI.colors.warning,
    },

    title: {
      fontSize:
        UI.typography.subtitle,

      fontWeight: '800',

      color:
        UI.colors.text,
    },

    description: {
      marginTop:
        UI.spacing.xs,

      fontSize:
        UI.typography.small,

      lineHeight: 18,

      color:
        UI.colors.textSecondary,
    },

    input: {
      height: 56,

      marginTop:
        UI.spacing.lg,

      marginBottom:
        UI.spacing.md,

      paddingHorizontal:
        UI.spacing.lg,

      borderRadius:
        UI.radius.md,

      borderWidth: 1,

      borderColor:
        UI.colors.border,

      backgroundColor:
        UI.colors.surface,

      color:
        UI.colors.text,

      fontSize: 22,

      fontWeight: '800',

      letterSpacing: 6,

      textAlign: 'center',
    },

    error: {
      marginBottom:
        UI.spacing.md,

      fontSize:
        UI.typography.small,

      lineHeight: 18,

      color:
        UI.colors.error,
    },
  })