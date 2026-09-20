import { StyleSheet, Text, View } from 'react-native'

import { formatMoney } from '../../lib/bookingUtils'

interface BookingPriceSummaryProps {
  baseAmount?: number
  discountAmount?: number
  platformFee?: number
  taxAmount?: number
  finalAmount?: number
  currency?: string
  occurrenceCount?: number
  loading?: boolean
  error?: string | null
}

export default function BookingPriceSummary({
  baseAmount,
  discountAmount,
  platformFee,
  taxAmount,
  finalAmount,
  currency,
  occurrenceCount,
  loading = false,
  error,
}: BookingPriceSummaryProps) {
  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Calculating price...</Text>
      </View>
    )
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    )
  }

  if (finalAmount === undefined) {
    return null
  }

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.label}>Base amount</Text>
        <Text style={styles.value}>{formatMoney(baseAmount, currency)}</Text>
      </View>

      {discountAmount !== undefined && discountAmount > 0 && (
        <View style={styles.row}>
          <Text style={styles.label}>Discount</Text>
          <Text style={[styles.value, styles.discount]}>−{formatMoney(discountAmount, currency)}</Text>
        </View>
      )}

      {platformFee !== undefined && platformFee > 0 && (
        <View style={styles.row}>
          <Text style={styles.label}>Platform fee</Text>
          <Text style={styles.value}>{formatMoney(platformFee, currency)}</Text>
        </View>
      )}

      {taxAmount !== undefined && taxAmount > 0 && (
        <View style={styles.row}>
          <Text style={styles.label}>Tax</Text>
          <Text style={styles.value}>{formatMoney(taxAmount, currency)}</Text>
        </View>
      )}

      {occurrenceCount !== undefined && (
        <View style={styles.row}>
          <Text style={styles.label}>Occurrences</Text>
          <Text style={styles.value}>{occurrenceCount}</Text>
        </View>
      )}

      <View style={styles.divider} />

      <View style={styles.rowFinal}>
        <Text style={styles.labelFinal}>Total amount</Text>
        <Text style={styles.valueFinal}>{formatMoney(finalAmount, currency)}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    marginVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  loadingText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    fontWeight: '500',
  },

  errorText: {
    fontSize: 14,
    color: '#DC2626',
    textAlign: 'center',
    fontWeight: '500',
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },

  rowFinal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },

  label: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },

  labelFinal: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '700',
  },

  value: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
  },

  valueFinal: {
    fontSize: 18,
    color: '#111827',
    fontWeight: '800',
  },

  discount: {
    color: '#059669',
  },

  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 10,
  },
})
