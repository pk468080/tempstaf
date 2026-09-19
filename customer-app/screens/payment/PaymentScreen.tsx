import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from 'react-native'

import { ScreenContainer } from '../../components/layout/ScreenContainer'

type PaymentScreenProps = {
  bookingId: string
  finalAmount: number
  currency: string
  occurrenceCount: number
  totalWorkingHours: number
}

function formatMoney(
  amount: number,
  currency: string,
) {
  return `${currency} ${amount.toFixed(2)}`
}

export default function PaymentScreen({
  bookingId,
  finalAmount,
  currency,
  occurrenceCount,
  totalWorkingHours,
}: PaymentScreenProps) {
  return (
    <ScreenContainer>
      <View style={styles.container}>
        <Text style={styles.title}>
          Payment
        </Text>

        <View style={styles.card}>
          <Text style={styles.label}>
            Amount payable
          </Text>

          <Text style={styles.amount}>
            {formatMoney(
              finalAmount,
              currency,
            )}
          </Text>

          <View style={styles.divider} />

          <Row
            label="Occurrences"
            value={String(occurrenceCount)}
          />

          <Row
            label="Working hours"
            value={String(totalWorkingHours)}
          />

          <Row
            label="Booking ID"
            value={bookingId}
          />
        </View>

        <View style={styles.statusCard}>
          <ActivityIndicator size="small" />

          <Text style={styles.statusTitle}>
            Payment integration pending
          </Text>

          <Text style={styles.statusText}>
            The booking has been created and
            the final amount was calculated by
            the backend. Payment processing
            will be connected separately.
          </Text>
        </View>

        <View style={styles.backendCard}>
          <Text style={styles.backendTitle}>
            Backend-calculated amount
          </Text>

          <Text style={styles.backendText}>
            The customer app does not calculate
            the booking price. The amount shown
            above comes directly from the backend
            booking result.
          </Text>
        </View>
      </View>
    </ScreenContainer>
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
        {value}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },

  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 20,
  },

  card: {
    padding: 20,
    borderRadius: 16,
    backgroundColor: '#F9FAFB',
  },

  label: {
    fontSize: 16,
    color: '#6B7280',
  },

  amount: {
    marginTop: 8,
    fontSize: 32,
    fontWeight: '800',
    color: '#111827',
  },

  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 18,
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    paddingVertical: 7,
  },

  rowLabel: {
    color: '#6B7280',
  },

  rowValue: {
    flex: 1,
    textAlign: 'right',
    fontWeight: '600',
    color: '#111827',
  },

  statusCard: {
    marginTop: 16,
    padding: 18,
    borderRadius: 16,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
  },

  statusTitle: {
    marginTop: 10,
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },

  statusText: {
    marginTop: 8,
    lineHeight: 20,
    textAlign: 'center',
    color: '#6B7280',
  },

  backendCard: {
    marginTop: 16,
    padding: 18,
    borderRadius: 16,
    backgroundColor: '#F9FAFB',
  },

  backendTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },

  backendText: {
    marginTop: 8,
    lineHeight: 20,
    color: '#6B7280',
  },
})