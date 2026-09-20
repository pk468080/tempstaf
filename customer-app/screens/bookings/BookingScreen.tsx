import { useEffect, useMemo, useState } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

import { ScreenContainer } from '../../components/layout/ScreenContainer'
import BookingMethodCard from '../../components/booking/BookingMethodCard'
import ServiceAreaStatusCard from '../../components/booking/ServiceAreaStatusCard'
import TimeRangePicker from '../../components/booking/TimeRangePicker'
import DateRangePicker from '../../components/booking/DateRangePicker'
import WeekdaySelector from '../../components/booking/WeekdaySelector'
import RecurringOccurrencePreview from '../../components/booking/RecurringOccurrencePreview'
import BookingPriceSummary from '../../components/booking/BookingPriceSummary'
import BookingSection from '../../components/booking/BookingSection'
import BookingLoadingState from '../../components/booking/BookingLoadingState'
import BookingErrorState from '../../components/booking/BookingErrorState'
import AvailabilitySlot from '../../components/booking/AvailabilitySlot'

import { useAvailability } from '../../hooks/useAvailability'
import { getOrCreateCustomerAddress } from '../../services/addresses/customerAddress.service'
import {
  getScheduledAvailabilitySlots,
  type ScheduledAvailabilitySlot,
} from '../../services/availability/scheduledAvailability.service'
import {
  calculateMultiOccurrenceBookingPrice,
  type BookingPriceResult,
} from '../../services/booking/bookingPricing.service'

import {
  startOfToday,
  startOfDay,
  isNearTermDate,
  getDurationHours,
  isValidTimeRange,
  getWeekdayIndex,
  generateRecurringOccurrences,
  generateScheduledOccurrences,
  formatDateDisplay,
} from '../../lib/bookingUtils'

import type { HomeService } from '../../types/service'
import type { BookingDraft } from '../../types/booking'

type BookingScreenProps = {
  service: HomeService
  location: {
    latitude: number
    longitude: number
    address: string
  } | null
  onContinue?: (draft: BookingDraft) => void
}

export default function BookingScreen({ service, location, onContinue }: BookingScreenProps) {
  const today = useMemo(() => startOfToday(), [])

  // Booking type selection
  const [bookingType, setBookingType] = useState<'instant' | 'scheduled' | 'recurring'>('instant')

  // Time range
  const [startTime, setStartTime] = useState(() => {
    const date = new Date()
    date.setHours(10, 0, 0, 0)
    return date
  })

  const [endTime, setEndTime] = useState(() => {
    const date = new Date()
    date.setHours(18, 0, 0, 0)
    return date
  })

  // Date range
  const [startDate, setStartDate] = useState<Date | null>(null)
  const [endDate, setEndDate] = useState<Date | null>(null)
  const [excludedDates, setExcludedDates] = useState<string[]>([])

  // Recurring weekdays
  const [selectedWeekdays, setSelectedWeekdays] = useState<string[]>([])

  // Availability checking
  const { status: availabilityStatus, result: availabilityResult, error: availabilityError, checkInstant } = useAvailability()

  // Scheduled availability slots
  const [scheduledSlots, setScheduledSlots] = useState<ScheduledAvailabilitySlot[]>([])
  const [scheduledAvailabilityLoading, setScheduledAvailabilityLoading] = useState(false)
  const [scheduledAvailabilityError, setScheduledAvailabilityError] = useState<string | null>(null)
  const [scheduledServiceAreaAvailable, setScheduledServiceAreaAvailable] = useState<boolean | null>(null)
  const [selectedScheduledSlotKey, setSelectedScheduledSlotKey] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(() => new Date())

  // Pricing
  const [pricing, setPricing] = useState<BookingPriceResult | null>(null)
  const [pricingLoading, setPricingLoading] = useState(false)
  const [pricingError, setPricingError] = useState<string | null>(null)

  // Derived state
  const durationHours = getDurationHours(startTime, endTime)
  const timeRangeValid = isValidTimeRange(startTime, endTime)
  const isNearTerm = startDate && isNearTermDate(startDate, today)
  const canSelectScheduledSlots = bookingType === 'scheduled' && isNearTerm
  const isTodaySelected = !!startDate && startOfDay(startDate).getTime() === today.getTime()
  const visibleScheduledSlots = useMemo(() => {
    if (!isTodaySelected) return scheduledSlots

    return scheduledSlots.filter(slot => new Date(slot.start).getTime() >= currentTime.getTime())
  }, [currentTime, isTodaySelected, scheduledSlots])
  const selectedSlotIsAvailable = visibleScheduledSlots.some(
    slot => `${slot.start}-${slot.end}` === selectedScheduledSlotKey && slot.available_worker_count > 0,
  )
  const serviceAreaUnavailable =
    availabilityResult?.serviceAreaAvailable === false || scheduledServiceAreaAvailable === false

  const recurringOccurrences = useMemo(() => {
    if (bookingType !== 'recurring' || !startDate || !endDate) return []
    const weekdayIndexes = selectedWeekdays.map(w => getWeekdayIndex(w)).filter(i => i >= 0)
    return generateRecurringOccurrences(startDate, endDate, weekdayIndexes, excludedDates)
  }, [bookingType, startDate, endDate, selectedWeekdays, excludedDates])

  // Check instant availability when location changes
  useEffect(() => {
    if (!location) return

    void checkInstant(service.id, location.latitude, location.longitude)
  }, [checkInstant, location, service.id])

  // Auto-switch from instant to scheduled if no workers
  useEffect(() => {
    if (availabilityResult && !availabilityResult.instantAvailable && bookingType === 'instant') {
      setBookingType('scheduled')
    }
  }, [availabilityResult, bookingType])

  // Load scheduled availability slots for near-term dates
  useEffect(() => {
    let cancelled = false

    async function loadScheduledSlots() {
      setScheduledSlots([])
      setScheduledAvailabilityError(null)
      setScheduledServiceAreaAvailable(null)

      if (!canSelectScheduledSlots || !startDate || !location) {
        return
      }

      if (!timeRangeValid) {
        setScheduledAvailabilityError('Select a time range of at least 1 hour.')
        return
      }

      setScheduledAvailabilityLoading(true)

      try {
        const addressId = await getOrCreateCustomerAddress(location)
        const startOfDay = new Date(startDate)
        startOfDay.setHours(0, 0, 0, 0)
        const endOfDay = new Date(startOfDay)
        endOfDay.setHours(23, 59, 59, 999)

        const result = await getScheduledAvailabilitySlots(
          service.serviceVariantId,
          addressId,
          startOfDay.toISOString(),
          endOfDay.toISOString(),
          durationHours,
        )

        if (cancelled) return

        if (!result.service_area_available) {
          setScheduledServiceAreaAvailable(false)
          setScheduledAvailabilityError('Service not available in this area for the selected date.')
          return
        }

        setScheduledServiceAreaAvailable(true)
        setScheduledSlots(result.slots)
      } catch (error) {
        if (cancelled) return
        setScheduledAvailabilityError(error instanceof Error ? error.message : 'Unable to load availability.')
      } finally {
        if (!cancelled) {
          setScheduledAvailabilityLoading(false)
        }
      }
    }

    void loadScheduledSlots()
    return () => {
      cancelled = true
    }
  }, [canSelectScheduledSlots, startDate, location, service.serviceVariantId, durationHours, timeRangeValid])

  useEffect(() => {
    if (!isTodaySelected || !canSelectScheduledSlots) return

    const interval = setInterval(() => setCurrentTime(new Date()), 30_000)
    return () => clearInterval(interval)
  }, [canSelectScheduledSlots, isTodaySelected])

  useEffect(() => {
    if (selectedScheduledSlotKey && !selectedSlotIsAvailable) {
      setSelectedScheduledSlotKey(null)
    }
  }, [selectedScheduledSlotKey, selectedSlotIsAvailable])

  // Load pricing for scheduled/recurring bookings
  useEffect(() => {
    let cancelled = false

    async function loadPricing() {
      setPricing(null)
      setPricingError(null)

      // Instant booking pricing is handled at checkout
      if (bookingType === 'instant') {
        return
      }

      // For scheduled/recurring, both need dates
      if (!startDate || !endDate) {
        return
      }

      // Recurring needs weekdays
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
            ? [0, 1, 2, 3, 4, 5, 6] // All days for scheduled
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

        if (cancelled) return

        setPricing(result)
      } catch (error) {
        if (cancelled) return
        setPricingError(error instanceof Error ? error.message : 'Unable to calculate price.')
      } finally {
        if (!cancelled) {
          setPricingLoading(false)
        }
      }
    }

    void loadPricing()
    return () => {
      cancelled = true
    }
  }, [bookingType, startDate, endDate, startTime, endTime, selectedWeekdays, excludedDates, service.serviceVariantId])

  // Handle scheduling slot selection
  function handleSelectScheduledSlot(slot: ScheduledAvailabilitySlot) {
    if (slot.available_worker_count <= 0) return

    const slotStart = new Date(slot.start)
    const slotEnd = new Date(slot.end)

    setSelectedScheduledSlotKey(`${slot.start}-${slot.end}`)
    setStartTime(slotStart)
    setEndTime(slotEnd)
  }

  function handleStartDateChange(date: Date) {
    setSelectedScheduledSlotKey(null)
    setStartDate(date)
  }

  function handleEndDateChange(date: Date) {
    setSelectedScheduledSlotKey(null)
    setEndDate(date)
  }

  function handleStartTimeChange(time: Date) {
    setSelectedScheduledSlotKey(null)
    setStartTime(time)
  }

  function handleEndTimeChange(time: Date) {
    setSelectedScheduledSlotKey(null)
    setEndTime(time)
  }

  // Handle toggling excluded dates
  function handleToggleExcludedDate(dateKey: string) {
    setExcludedDates(current =>
      current.includes(dateKey) ? current.filter(d => d !== dateKey) : [...current, dateKey].sort(),
    )
  }

  // Handle booking continuation
  function handleContinue() {
    if (!onContinue || !location || !canContinue) return

    const draft: BookingDraft = {
      serviceId: service.id,
      bookingType,
      location,
      startDate: startDate ? startDate.toISOString() : null,
      endDate: endDate ? endDate.toISOString() : null,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      selectedWeekdays,
      excludedDates,
      hourlyPrice: service.hourlyPrice ?? 0,
      currency: service.currency ?? null,
    }

    onContinue(draft)
  }

  // Validation
 // Validation
const scheduledOccurrences =
  startDate && endDate
    ? generateScheduledOccurrences(
        startDate,
        endDate,
        excludedDates,
      )
    : []

const hasRequiredDates =
  !!startDate &&
  !!endDate &&
  (
    bookingType === 'recurring'
      ? recurringOccurrences.length > 0
      : scheduledOccurrences.length > 0
  )

const areaCheckPassed =
  availabilityResult?.serviceAreaAvailable === true &&
  (
    availabilityStatus === 'available' ||
    availabilityStatus === 'fallback'
  )

const hasInstantAvailability =
  areaCheckPassed &&
  availabilityResult?.instantAvailable === true

const canContinue = Boolean(
  location &&
  areaCheckPassed &&
  timeRangeValid &&
  (
    bookingType === 'instant'
      ? hasInstantAvailability
      : hasRequiredDates &&
        (
          bookingType === 'scheduled'
            ? (
                !canSelectScheduledSlots ||
                selectedSlotIsAvailable
              )
            : selectedWeekdays.length > 0
        )
  ),
)

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Book {service.name}</Text>

        {/* Service Area Status */}
        <ServiceAreaStatusCard
          address={location?.address || 'No location selected'}
          available={availabilityResult?.serviceAreaAvailable === true}
          loading={availabilityStatus === 'checking'}
          error={availabilityStatus === 'error' ? availabilityError : null}
        />

        {/* Booking Method Selection */}
        <BookingSection title="How would you like to book?">
          <BookingMethodCard
            type="instant"
            selected={bookingType === 'instant'}
            disabled={availabilityResult !== null && !availabilityResult.instantAvailable}
            onPress={() => setBookingType('instant')}
          />

          <BookingMethodCard
            type="scheduled"
            selected={bookingType === 'scheduled'}
            onPress={() => setBookingType('scheduled')}
          />

          <BookingMethodCard
            type="recurring"
            selected={bookingType === 'recurring'}
            onPress={() => setBookingType('recurring')}
          />
        </BookingSection>

        {/* Instant Booking */}
        {bookingType === 'instant' && (
          <BookingSection title="Select time">
            <Text style={styles.helperText}>Choose when you need the service to start and end.</Text>

            <TimeRangePicker
              startTime={startTime}
              endTime={endTime}
              onStartTimeChange={setStartTime}
              onEndTimeChange={setEndTime}
            />

            <View style={styles.durationInfo}>
              <Text style={styles.durationLabel}>Duration</Text>
              <Text style={styles.durationValue}>{durationHours} hour{durationHours === 1 ? '' : 's'}</Text>
            </View>
          </BookingSection>
        )}

        {/* Scheduled Booking */}
        {bookingType === 'scheduled' && (
          <BookingSection title="Select dates and times">
            <Text style={styles.helperText}>Choose when you need the service.</Text>

            <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              excludedDates={excludedDates}
              minDate={today}
              onStartDateChange={handleStartDateChange}
              onEndDateChange={handleEndDateChange}
              onExcludedDateToggle={handleToggleExcludedDate}
            />

            <TimeRangePicker
              startTime={startTime}
              endTime={endTime}
              onStartTimeChange={handleStartTimeChange}
              onEndTimeChange={handleEndTimeChange}
            />

            {/* Near-term availability slots */}
            {canSelectScheduledSlots && (
              <View style={styles.slotsSection}>
                <Text style={styles.slotsTitle}>Available slots for {formatDateDisplay(startDate)}</Text>

                {scheduledAvailabilityLoading && <BookingLoadingState />}

                {scheduledAvailabilityError && <BookingErrorState message={scheduledAvailabilityError} />}

                {!scheduledAvailabilityLoading && !scheduledAvailabilityError && visibleScheduledSlots.length === 0 && (
                  <View style={styles.emptySlots}>
                    <Text style={styles.emptySlotsText}>
                      {isTodaySelected
                        ? 'No future availability remains today for this time duration.'
                        : 'No availability for this time duration on the selected date.'}
                    </Text>
                  </View>
                )}

                {!scheduledAvailabilityLoading &&
                  !scheduledAvailabilityError &&
                  visibleScheduledSlots.map((slot, index) => (
                    <AvailabilitySlot
                      key={`${slot.start}-${slot.end}-${index}`}
                      start={slot.start}
                      end={slot.end}
                      availableWorkerCount={slot.available_worker_count}
                      selected={selectedScheduledSlotKey === `${slot.start}-${slot.end}`}
                      onPress={() => handleSelectScheduledSlot(slot)}
                    />
                  ))}
              </View>
            )}

            {!canSelectScheduledSlots && startDate && endDate && (
              <View style={styles.futureInfo}>
                <Text style={styles.futureInfoText}>Direct scheduling available for this date. Workers will be matched upon confirmation.</Text>
              </View>
            )}
          </BookingSection>
        )}

        {/* Recurring Booking */}
        {bookingType === 'recurring' && (
          <BookingSection title="Set up recurring booking">
            <Text style={styles.helperText}>Choose the period, weekdays, and times for your recurring service.</Text>

            <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              excludedDates={excludedDates}
              minDate={today}
              onStartDateChange={handleStartDateChange}
              onEndDateChange={handleEndDateChange}
              onExcludedDateToggle={handleToggleExcludedDate}
            />

            <WeekdaySelector
              selectedWeekdays={selectedWeekdays}
              onToggleWeekday={day => {
                setSelectedWeekdays(current =>
                  current.includes(day) ? current.filter(d => d !== day) : [...current, day],
                )
              }}
            />

            <TimeRangePicker
              startTime={startTime}
              endTime={endTime}
              onStartTimeChange={handleStartTimeChange}
              onEndTimeChange={handleEndTimeChange}
            />

            {recurringOccurrences.length > 0 && (
              <RecurringOccurrencePreview
                occurrences={recurringOccurrences}
                startTime={startTime}
                endTime={endTime}
              />
            )}
          </BookingSection>
        )}

        {/* Pricing Summary */}
        {(bookingType === 'scheduled' || bookingType === 'recurring') && (
          <BookingSection title="Price breakdown">
            <BookingPriceSummary
              baseAmount={pricing?.gross_amount}
              discountAmount={pricing?.discount_amount}
              platformFee={pricing?.platform_fee}
              taxAmount={pricing?.tax_amount}
              finalAmount={pricing?.final_amount}
              currency={pricing?.currency}
              occurrenceCount={pricing?.occurrence_count}
              loading={pricingLoading}
              error={pricingError}
            />
          </BookingSection>
        )}

        {/* Bottom padding */}
        <View style={styles.spacer} />
      </ScrollView>

      {/* Sticky Continue Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.continueButton, !canContinue && styles.continueButtonDisabled]}
          onPress={handleContinue}
          disabled={!canContinue}
        >
          <Text style={styles.continueButtonText}>Continue to Details</Text>
        </TouchableOpacity>
      </View>
    </ScreenContainer>
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
    marginBottom: 8,
  },

  helperText: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
    marginBottom: 8,
  },

  durationInfo: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#F0F4FF',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  durationLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4F46E5',
  },

  durationValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#4F46E5',
  },

  slotsSection: {
    marginTop: 16,
    gap: 8,
  },

  slotsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },

  emptySlots: {
    padding: 16,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },

  emptySlotsText: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    fontWeight: '500',
  },

  futureInfo: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FCD34D',
    marginTop: 12,
  },

  futureInfoText: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: '500',
    lineHeight: 16,
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
