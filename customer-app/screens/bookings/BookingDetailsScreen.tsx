import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useEffect, useState } from 'react'

import { ScreenContainer } from '../../components/layout/ScreenContainer'
import BookingPriceSummary from '../../components/booking/BookingPriceSummary'
import BookingSection from '../../components/booking/BookingSection'
import RecurringOccurrencePreview from '../../components/booking/RecurringOccurrencePreview'

import {
  calculateMultiOccurrenceBookingPrice,
  type BookingPriceResult,
} from '../../services/booking/bookingPricing.service'

import {
  getWeekdayIndex,
  generateRecurringOccurrences,
  formatDateDisplay,
  formatTimeDisplay,
} from '../../lib/bookingUtils'

import type { HomeService } from '../../types/service'

type BookingDetailsScreenProps = {
  service: HomeService
  bookingType: 'instant' | 'scheduled' | 'recurring'
  location: {
    latitude: number
    longitude: number
    address: string
  } | null
  startDate: Date | null
  endDate: Date | null
  startTime: Date
  endTime: Date
  selectedWeekdays: string[]
  excludedDates: string[]
  onContinue?: () => Promise<void> | void
}

export default function BookingDetailsScreen({
  service,
  bookingType,
  location,
  startDate,
  endDate,
  startTime,
  endTime,
  selectedWeekdays,
  excludedDates,
  onContinue,
}: BookingDetailsScreenProps) {
  const [pricing, setPricing] = useState<BookingPriceResult | null>(null)
  const [pricingError, setPricingError] = useState<string | null>(null)
  const [pricingLoading, setPricingLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const recurringOccurrences = selectedWeekdays.length > 0 && startDate && endDate
    ? generateRecurringOccurrences(
        startDate,
        endDate,
        selectedWeekdays.map(w => getWeekdayIndex(w)).filter(i => i >= 0),
        excludedDates,
      )
    : []

  async function handleContinue() {
    if (!onContinue || submitting) {
      return
    }

    setSubmitError(null)
    setSubmitting(true)

    try {
      await onContinue()
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Unable to create the booking.')
    } finally {
      setSubmitting(false)
    }
  }

  useEffect(() => {
    let cancelled = false

    async function loadPrice() {
      setPricing(null)
      setPricingError(null)

      // Instant booking doesn't need backend pricing (calculated at checkout)
      if (bookingType === 'instant') {
        return
      }

      if (!startDate || !endDate) {
        return
      }

      if (bookingType === 'recurring' && selectedWeekdays.length === 0) {
        return
      }

      setPricingLoading(true)

      try {
        const toDateString = (d: Date) => {
          const year = d.getFullYear()
          const month = String(d.getMonth() + 1).padStart(2, '0')
          const day = String(d.getDate()).padStart(2, '0')
          return `${year}-${month}-${day}`
        }

        const toTimeString = (d: Date) => {
          const hours = String(d.getHours()).padStart(2, '0')
          const minutes = String(d.getMinutes()).padStart(2, '0')
          const seconds = String(d.getSeconds()).padStart(2, '0')
          return `${hours}:${minutes}:${seconds}`
        }

        const weekdayIndexes =
          bookingType === 'scheduled'
            ? [0, 1, 2, 3, 4, 5, 6]
            : selectedWeekdays.map(w => getWeekdayIndex(w)).filter(i => i >= 0)

        const result = await calculateMultiOccurrenceBookingPrice({
          serviceVariantId: service.serviceVariantId,
          startDate: toDateString(startDate),
          endDate: toDateString(endDate),
          startTime: toTimeString(startTime),
          endTime: toTimeString(endTime),
          selectedWeekdays: weekdayIndexes,
          excludedDates,
          bookingType,
        })

        if (cancelled) {
          return
        }

        setPricing(result)
      } catch (error) {
        if (cancelled) {
          return
        }

        setPricingError(error instanceof Error ? error.message : 'Unable to calculate booking price.')
      } finally {
        if (!cancelled) {
          setPricingLoading(false)
        }
      }
    }

    void loadPrice()

    return () => {
      cancelled = true
    }
  }, [bookingType, service.serviceVariantId, startDate, endDate, startTime, endTime, selectedWeekdays, excludedDates])

  const durationHours = Math.round((endTime.getTime() - startTime.getTime()) / (60 * 60 * 1000) * 10) / 10

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Review booking</Text>

        {/* Service Section */}
        <BookingSection title="Service">
          <DetailRow label="Service name" value={service.name} />
          <DetailRow
            label="Booking type"
            value={bookingType.charAt(0).toUpperCase() + bookingType.slice(1)}
          />
          <DetailRow
            label="Hourly rate"
            value={service.hourlyPrice === null ? 'Unavailable' : `${service.currency ?? ''} ${service.hourlyPrice}/hour`}
          />
        </BookingSection>

        {/* Location Section */}
        <BookingSection title="Location">
          <Text style={styles.address}>{location?.address ?? 'No location selected'}</Text>
        </BookingSection>

        {/* Schedule Section */}
        <BookingSection title="Schedule">
          <DetailRow label="Start time" value={formatTimeDisplay(startTime)} />
          <DetailRow label="End time" value={formatTimeDisplay(endTime)} />
          <DetailRow label="Duration" value={`${durationHours} hour${durationHours === 1 ? '' : 's'}`} />

          {bookingType !== 'instant' && (
            <>
              <DetailRow label="Start date" value={formatDateDisplay(startDate)} />
              <DetailRow label="End date" value={formatDateDisplay(endDate)} />
            </>
          )}

          {bookingType === 'recurring' && (
            <>
              <DetailRow label="Weekdays" value={selectedWeekdays.join(', ') || 'None'} />
              {excludedDates.length > 0 && <DetailRow label="Excluded dates" value={excludedDates.join(', ')} />}
            </>
          )}
        </BookingSection>

        {/* Recurring Occurrences Preview */}
        {bookingType === 'recurring' && recurringOccurrences.length > 0 && (
          <BookingSection title="Service occurrences">
            <RecurringOccurrencePreview occurrences={recurringOccurrences} startTime={startTime} endTime={endTime} />
          </BookingSection>
        )}

        {/* Pricing Section */}
        {bookingType !== 'instant' && (
          <BookingSection title="Pricing">
            <BookingPriceSummary
              baseAmount={pricing?.gross_amount}
              discountAmount={pricing?.discount_amount}
              platformFee={pricing?.platform_fee}
              taxAmount={pricing?.tax_amount ?? pricing?.tax}
              finalAmount={pricing?.final_amount}
              currency={pricing?.currency}
              occurrenceCount={pricing?.occurrence_count}
              loading={pricingLoading}
              error={pricingError}
            />
          </BookingSection>
        )}

        {/* Error Messages */}
        {submitError && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>Unable to create booking</Text>
            <Text style={styles.errorText}>{submitError}</Text>
          </View>
        )}

        {/* Bottom Padding */}
        <View style={styles.spacer} />
      </ScrollView>

      {/* Sticky Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.continueButton,
            (pricingLoading || Boolean(pricingError) || submitting) && styles.continueButtonDisabled,
          ]}
          disabled={pricingLoading || Boolean(pricingError) || submitting}
          onPress={handleContinue}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.continueButtonText}>Continue to Payment</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScreenContainer>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 100,
  },

  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 24,
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },

  rowLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },

  rowValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },

  address: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
    fontWeight: '500',
  },

  errorContainer: {
    marginHorizontal: 16,
    marginVertical: 16,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },

  errorTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#991B1B',
  },

  errorText: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
    color: '#B91C1C',
  },

  spacer: {
    height: 20,
  },

  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },

  continueButton: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
  },

  continueButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },

  continueButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
})
