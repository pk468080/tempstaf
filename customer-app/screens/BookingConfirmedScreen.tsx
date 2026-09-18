import React from 'react'
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'

import { RootStackParamList } from '../types'
import { useBooking } from '../context/BookingContext'
import {
  BORDER,
  GRAY,
  GREEN,
  LIGHT,
  NAVY,
  ORANGE,
  WHITE,
} from '../constants/theme'

type Props = NativeStackScreenProps<
  RootStackParamList,
  'BookingConfirmed'
>

export default function BookingConfirmedScreen({
  navigation,
}: Props) {
  const {
    bookingId,
    selectedService,
    selectedVariant,
    bookingMode,
    scheduledDate,
    scheduleStartDate,
    scheduleEndDate,
    scheduleSelectedWeekdays,
    address,
    bookingPricing,
    paymentDone,
    resetBooking,
  } = useBooking()

  const formatDate = (value?: Date | string | null) => {
    if (!value) return ''

    const date =
      value instanceof Date
        ? value
        : new Date(`${value}T00:00:00`)

    if (Number.isNaN(date.getTime())) return ''

    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  const formatPrice = (value?: number | null) => {
    if (value === undefined || value === null) {
      return null
    }

    return `₹${Number(value).toLocaleString('en-IN')}`
  }

  const getBookingTypeLabel = () => {
    switch (bookingMode) {
      case 'Instant':
        return 'Instant booking'
      case 'Scheduled':
        return 'Scheduled booking'
      case 'Recurring':
        return 'Recurring booking'
      default:
        return 'Booking'
    }
  }

  const handleViewBookings = () => {
    navigation.navigate('MyBookings')
  }

  const handleDone = () => {
    resetBooking()
    navigation.replace('Home')
  }

  const recurringDateText =
    bookingMode === 'Recurring'
      ? [
          scheduleStartDate
            ? formatDate(scheduleStartDate)
            : '',
          scheduleEndDate
            ? `to ${formatDate(scheduleEndDate)}`
            : '',
        ]
          .filter(Boolean)
          .join(' ')
      : ''

  const recurringDaysText =
    bookingMode === 'Recurring' &&
    scheduleSelectedWeekdays?.length
      ? scheduleSelectedWeekdays.join(', ')
      : ''

  const totalPrice =
    bookingPricing?.total_price ??
    bookingPricing?.totalPrice ??
    bookingPricing?.amount ??
    null

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.successCircle}>
          <Text style={styles.checkmark}>✓</Text>
        </View>

        <Text style={styles.title}>
          Booking confirmed
        </Text>

        <Text style={styles.subtitle}>
          Your booking has been successfully placed.
        </Text>

        <View style={styles.statusCard}>
          <View style={styles.statusIcon}>
            <Text style={styles.statusCheck}>✓</Text>
          </View>

          <View style={styles.statusContent}>
            <Text style={styles.statusTitle}>
              Payment successful
            </Text>

            <Text style={styles.statusText}>
              {paymentDone
                ? 'Your payment has been verified.'
                : 'Your booking has been confirmed.'}
            </Text>
          </View>
        </View>

        {bookingId ? (
          <View style={styles.bookingIdCard}>
            <Text style={styles.bookingIdLabel}>
              BOOKING ID
            </Text>

            <Text style={styles.bookingId}>
              {bookingId}
            </Text>
          </View>
        ) : null}

        <View style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>
            Booking details
          </Text>

          <DetailRow
            label="Service"
            value={selectedService || 'Service'}
          />

          {selectedVariant?.name ? (
            <DetailRow
              label="Service option"
              value={selectedVariant.name}
            />
          ) : null}

          <DetailRow
            label="Booking type"
            value={getBookingTypeLabel()}
          />

          {bookingMode === 'Scheduled' &&
          scheduledDate ? (
            <DetailRow
              label="Date"
              value={formatDate(scheduledDate)}
            />
          ) : null}

          {bookingMode === 'Recurring' &&
          recurringDateText ? (
            <DetailRow
              label="Date range"
              value={recurringDateText}
            />
          ) : null}

          {bookingMode === 'Recurring' &&
          recurringDaysText ? (
            <DetailRow
              label="Days"
              value={recurringDaysText}
            />
          ) : null}

          {address ? (
            <DetailRow
              label="Location"
              value={address}
            />
          ) : null}

          {formatPrice(totalPrice) ? (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>
                Total paid
              </Text>

              <Text style={styles.totalValue}>
                {formatPrice(totalPrice)}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>
            What happens next?
          </Text>

          <Text style={styles.infoText}>
            You can view your booking status, details, and
            updates from My Bookings.
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.primaryButton}
          onPress={handleViewBookings}
        >
          <Text style={styles.primaryButtonText}>
            View My Bookings
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.secondaryButton}
          onPress={handleDone}
        >
          <Text style={styles.secondaryButtonText}>
            Back to Home
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

function DetailRow({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>
        {label}
      </Text>

      <Text
        style={styles.detailValue}
        numberOfLines={3}
      >
        {value}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: LIGHT,
  },

  container: {
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 32,
  },

  successCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: GREEN,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },

  checkmark: {
    color: WHITE,
    fontSize: 52,
    fontWeight: '700',
    lineHeight: 58,
  },

  title: {
    color: NAVY,
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
  },

  subtitle: {
    color: GRAY,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },

  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WHITE,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 14,
  },

  statusIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  statusCheck: {
    color: WHITE,
    fontSize: 24,
    fontWeight: '800',
  },

  statusContent: {
    flex: 1,
  },

  statusTitle: {
    color: NAVY,
    fontSize: 16,
    fontWeight: '700',
  },

  statusText: {
    color: GRAY,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 3,
  },

  bookingIdCard: {
    backgroundColor: WHITE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 18,
    marginBottom: 14,
  },

  bookingIdLabel: {
    color: GRAY,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 7,
  },

  bookingId: {
    color: NAVY,
    fontSize: 18,
    fontWeight: '800',
  },

  detailsCard: {
    backgroundColor: WHITE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 18,
    marginBottom: 14,
  },

  sectionTitle: {
    color: NAVY,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 12,
  },

  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },

  detailLabel: {
    flex: 0.8,
    color: GRAY,
    fontSize: 13,
  },

  detailValue: {
    flex: 1.4,
    color: NAVY,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
  },

  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
  },

  totalLabel: {
    color: NAVY,
    fontSize: 16,
    fontWeight: '700',
  },

  totalValue: {
    color: ORANGE,
    fontSize: 20,
    fontWeight: '800',
  },

  infoBox: {
    backgroundColor: '#FFF7F0',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },

  infoTitle: {
    color: NAVY,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 5,
  },

  infoText: {
    color: GRAY,
    fontSize: 13,
    lineHeight: 20,
  },

  primaryButton: {
    backgroundColor: ORANGE,
    minHeight: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },

  primaryButtonText: {
    color: WHITE,
    fontSize: 16,
    fontWeight: '800',
  },

  secondaryButton: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
  },

  secondaryButtonText: {
    color: ORANGE,
    fontSize: 16,
    fontWeight: '700',
  },
})