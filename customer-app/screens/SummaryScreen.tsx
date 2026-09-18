import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'

import { COLORS } from '../constants/theme'
import { RootStackParamList } from '../types'
import { useBooking } from '../context/BookingContext'
import Header from '../components/Header'
import PrimaryButton from '../components/PrimaryButton'

type Props = NativeStackScreenProps<
  RootStackParamList,
  'Summary'
>

function formatAmount(
  amount: number,
  currency: string
) {
  return `${currency === 'INR' ? '₹' : currency + ' '}${amount.toFixed(2)}`
}

function formatHours(hours: number) {
  if (!hours) {
    return '—'
  }

  return `${hours} ${
    hours === 1 ? 'hour' : 'hours'
  }`
}

export default function SummaryScreen({
  navigation,
}: Props) {
  const {
    selectedService,
    selectedVariant,
    bookingMode,

    scheduledDate,

    scheduleStartDate,
    scheduleEndDate,
    scheduleDailyStartTime,
    scheduleDailyEndTime,
    scheduleSelectedWeekdays,

    hourlyStartTime,
    hourlyEndTime,
    hourlyTotalHours,

    address,
    bookingPricing,
  } = useBooking()

  const duration =
    bookingMode === 'Recurring'
      ? scheduleDailyStartTime &&
        scheduleDailyEndTime
        ? 0
        : 0
      : hourlyTotalHours

  const scheduleText =
    bookingMode === 'Recurring'
      ? `${scheduleDailyStartTime} – ${scheduleDailyEndTime}`
      : bookingMode === 'Scheduled'
        ? `${scheduledDate || scheduleStartDate} · ${scheduleDailyStartTime} – ${scheduleDailyEndTime}`
        : `${hourlyStartTime || 'Now'} – ${hourlyEndTime || '—'}`

  const continueToPayment = () => {
    navigation.navigate('Payment')
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.page}
        showsVerticalScrollIndicator={false}
      >
        <Header
          onBack={() =>
            navigation.goBack()
          }
        />

        <Text style={styles.step}>
          STEP 3 OF 5 · REVIEW
        </Text>

        <Text style={styles.title}>
          Review your booking
        </Text>

        <Text style={styles.subtitle}>
          Check the details before continuing to
          secure payment.
        </Text>

        <View style={styles.card}>
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>
                SERVICE
              </Text>

              <Text style={styles.service}>
                {selectedService ||
                  'Staff service'}
              </Text>

              <Text style={styles.variant}>
                {selectedVariant?.name ||
                  'Hourly staffing'}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.edit}
              onPress={() =>
                navigation.goBack()
              }
            >
              <Text style={styles.editText}>
                Edit
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          <Row
            label="Booking type"
            value={bookingMode}
          />

          <Row
            label="Schedule"
            value={scheduleText}
          />

          {bookingMode ===
          'Recurring' ? (
            <>
              <Row
                label="Date range"
                value={`${scheduleStartDate} – ${scheduleEndDate}`}
              />

              <Row
                label="Working days"
                value={scheduleSelectedWeekdays
                  .slice()
                  .sort(
                    (a, b) => a - b
                  )
                  .map(day =>
                    [
                      'Sun',
                      'Mon',
                      'Tue',
                      'Wed',
                      'Thu',
                      'Fri',
                      'Sat',
                    ][day]
                  )
                  .join(', ')}
              />
            </>
          ) : (
            <Row
              label="Duration"
              value={formatHours(duration)}
            />
          )}

          <Row
            label="Location"
            value={
              address ||
              'Service address'
            }
          />
        </View>

        <View style={styles.priceCard}>
          <Text style={styles.priceLabel}>
            TOTAL PAYABLE
          </Text>

          <Text style={styles.price}>
            {bookingPricing
              ? formatAmount(
                  bookingPricing.finalAmount,
                  bookingPricing.currency
                )
              : '—'}
          </Text>

          {bookingPricing &&
          bookingPricing.discountAmount >
            0 ? (
            <Text style={styles.discount}>
              Discount applied: -
              {formatAmount(
                bookingPricing.discountAmount,
                bookingPricing.currency
              )}
            </Text>
          ) : null}

          <Text style={styles.priceNote}>
            Final pricing is calculated using the
            backend pricing configuration.
          </Text>
        </View>

        <View style={styles.info}>
          <Text style={styles.infoTitle}>
            Worker assignment
          </Text>

          <Text style={styles.infoText}>
            You do not need to select a worker.
            TempStaff handles worker assignment and
            availability.
          </Text>
        </View>

        <PrimaryButton
          title="Continue to payment"
          disabled={!bookingPricing}
          onPress={continueToPayment}
        />
      </ScrollView>
    </SafeAreaView>
  )
}

function Row({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>
        {label}
      </Text>

      <Text style={styles.rowValue}>
        {value || '—'}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.light,
  },

  page: {
    padding: 20,
    paddingBottom: 45,
  },

  step: {
    color: COLORS.teal,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginTop: 4,
  },

  title: {
    color: COLORS.navy,
    fontSize: 28,
    fontWeight: '900',
    marginTop: 5,
  },

  subtitle: {
    color: COLORS.gray,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 5,
    marginBottom: 18,
  },

  card: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 17,
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  label: {
    color: COLORS.gray,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.7,
  },

  service: {
    color: COLORS.navy,
    fontSize: 19,
    fontWeight: '900',
    marginTop: 4,
  },

  variant: {
    color: COLORS.teal,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 3,
  },

  edit: {
    backgroundColor: COLORS.tealSoft,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
  },

  editText: {
    color: COLORS.teal,
    fontSize: 10,
    fontWeight: '900',
  },

  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 15,
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 15,
    marginBottom: 13,
  },

  rowLabel: {
    flex: 1,
    color: COLORS.gray,
    fontSize: 12,
  },

  rowValue: {
    flex: 1.5,
    color: COLORS.navy,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'right',
  },

  priceCard: {
    backgroundColor: COLORS.navy,
    borderRadius: 20,
    padding: 19,
    marginTop: 14,
  },

  priceLabel: {
    color: '#CBD5E1',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
  },

  price: {
    color: COLORS.white,
    fontSize: 29,
    fontWeight: '900',
    marginTop: 5,
  },

  discount: {
    color: '#86EFAC',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 4,
  },

  priceNote: {
    color: '#CBD5E1',
    fontSize: 10,
    lineHeight: 16,
    marginTop: 10,
  },

  info: {
    backgroundColor: COLORS.tealSoft,
    borderRadius: 17,
    padding: 15,
    marginVertical: 14,
  },

  infoTitle: {
    color: COLORS.navy,
    fontSize: 13,
    fontWeight: '900',
  },

  infoText: {
    color: COLORS.gray,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 4,
  },
})