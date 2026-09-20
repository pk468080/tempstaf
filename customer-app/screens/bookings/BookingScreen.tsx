import { useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'

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

type BookingType = 'instant' | 'scheduled' | 'recurring'

const METHOD_COPY: Record<
  BookingType,
  {
    eyebrow: string
    title: string
    description: string
    badge?: string
  }
> = {
  instant: {
    eyebrow: 'FASTEST',
    title: 'Instant',
    description:
      'Start today with a nearby available worker.',
    badge: 'Available now',
  },
  scheduled: {
    eyebrow: 'FLEXIBLE',
    title: 'Scheduled',
    description:
      'Choose a date and time that works for you.',
  },
  recurring: {
    eyebrow: 'REPEAT',
    title: 'Recurring',
    description:
      'Book the same service on selected days.',
  },
}

export default function BookingScreen({
  service,
  location,
  onContinue,
}: BookingScreenProps) {
  const today = useMemo(() => startOfToday(), [])

  const [bookingType, setBookingType] =
    useState<BookingType>('instant')

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

  const [startDate, setStartDate] =
    useState<Date | null>(null)

  const [endDate, setEndDate] =
    useState<Date | null>(null)

  const [excludedDates, setExcludedDates] =
    useState<string[]>([])

  const [selectedWeekdays, setSelectedWeekdays] =
    useState<string[]>([])

  const {
    status: availabilityStatus,
    result: availabilityResult,
    error: availabilityError,
    checkInstant,
  } = useAvailability()

  const [scheduledSlots, setScheduledSlots] =
    useState<ScheduledAvailabilitySlot[]>([])

  const [
    scheduledAvailabilityLoading,
    setScheduledAvailabilityLoading,
  ] = useState(false)

  const [
    scheduledAvailabilityError,
    setScheduledAvailabilityError,
  ] = useState<string | null>(null)

  const [
    scheduledServiceAreaAvailable,
    setScheduledServiceAreaAvailable,
  ] = useState<boolean | null>(null)

  const [
    selectedScheduledSlotKey,
    setSelectedScheduledSlotKey,
  ] = useState<string | null>(null)

  const [currentTime, setCurrentTime] =
    useState(() => new Date())

  const [pricing, setPricing] =
    useState<BookingPriceResult | null>(null)

  const [pricingLoading, setPricingLoading] =
    useState(false)

  const [pricingError, setPricingError] =
    useState<string | null>(null)

  const durationHours = getDurationHours(
    startTime,
    endTime,
  )

  const timeRangeValid =
    isValidTimeRange(startTime, endTime)

  const isNearTerm =
    startDate &&
    isNearTermDate(startDate, today)

  const canSelectScheduledSlots =
    bookingType === 'scheduled' &&
    Boolean(isNearTerm)

  const isTodaySelected =
    !!startDate &&
    startOfDay(startDate).getTime() ===
      today.getTime()

  const visibleScheduledSlots = useMemo(() => {
    if (!isTodaySelected) {
      return scheduledSlots
    }

    return scheduledSlots.filter(
      slot =>
        new Date(slot.start).getTime() >=
        currentTime.getTime(),
    )
  }, [
    currentTime,
    isTodaySelected,
    scheduledSlots,
  ])

  const selectedSlotIsAvailable =
    visibleScheduledSlots.some(
      slot =>
        `${slot.start}-${slot.end}` ===
          selectedScheduledSlotKey &&
        slot.available_worker_count > 0,
    )

  const recurringOccurrences = useMemo(() => {
    if (
      bookingType !== 'recurring' ||
      !startDate ||
      !endDate
    ) {
      return []
    }

    const weekdayIndexes = selectedWeekdays
      .map(getWeekdayIndex)
      .filter(index => index >= 0)

    return generateRecurringOccurrences(
      startDate,
      endDate,
      weekdayIndexes,
      excludedDates,
    )
  }, [
    bookingType,
    startDate,
    endDate,
    selectedWeekdays,
    excludedDates,
  ])

  useEffect(() => {
    if (!location) {
      return
    }

    void checkInstant(
      service.id,
      location.latitude,
      location.longitude,
    )
  }, [
    checkInstant,
    location,
    service.id,
  ])

  useEffect(() => {
    if (
      availabilityResult &&
      !availabilityResult.instantAvailable &&
      bookingType === 'instant'
    ) {
      setBookingType('scheduled')
    }
  }, [
    availabilityResult,
    bookingType,
  ])

  useEffect(() => {
    let cancelled = false

    async function loadScheduledSlots() {
      setScheduledSlots([])
      setScheduledAvailabilityError(null)
      setScheduledServiceAreaAvailable(null)

      if (
        !canSelectScheduledSlots ||
        !startDate ||
        !location
      ) {
        return
      }

      if (!timeRangeValid) {
        setScheduledAvailabilityError(
          'Select a time range of at least 1 hour.',
        )
        return
      }

      setScheduledAvailabilityLoading(true)

      try {
        const addressId =
          await getOrCreateCustomerAddress(
            location,
          )

        const startOfSelectedDay =
          new Date(startDate)

        startOfSelectedDay.setHours(
          0,
          0,
          0,
          0,
        )

        const endOfSelectedDay =
          new Date(startOfSelectedDay)

        endOfSelectedDay.setHours(
          23,
          59,
          59,
          999,
        )

        const result =
          await getScheduledAvailabilitySlots(
            service.serviceVariantId,
            addressId,
            startOfSelectedDay.toISOString(),
            endOfSelectedDay.toISOString(),
            durationHours,
          )

        if (cancelled) {
          return
        }

        if (!result.service_area_available) {
          setScheduledServiceAreaAvailable(
            false,
          )

          setScheduledAvailabilityError(
            'Service is not available in this area for the selected date.',
          )

          return
        }

        setScheduledServiceAreaAvailable(
          true,
        )

        setScheduledSlots(result.slots)
      } catch (error) {
        if (cancelled) {
          return
        }

        setScheduledAvailabilityError(
          error instanceof Error
            ? error.message
            : 'Unable to load availability.',
        )
      } finally {
        if (!cancelled) {
          setScheduledAvailabilityLoading(
            false,
          )
        }
      }
    }

    void loadScheduledSlots()

    return () => {
      cancelled = true
    }
  }, [
    canSelectScheduledSlots,
    startDate,
    location,
    service.serviceVariantId,
    durationHours,
    timeRangeValid,
  ])

  useEffect(() => {
    if (
      bookingType !== 'instant' &&
      (!isTodaySelected ||
        !canSelectScheduledSlots)
    ) {
      return
    }

    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 30_000)

    return () => clearInterval(interval)
  }, [
    bookingType,
    canSelectScheduledSlots,
    isTodaySelected,
  ])

  useEffect(() => {
    if (
      selectedScheduledSlotKey &&
      !selectedSlotIsAvailable
    ) {
      setSelectedScheduledSlotKey(null)
    }
  }, [
    selectedScheduledSlotKey,
    selectedSlotIsAvailable,
  ])

  const instantStartTimeValid =
    bookingType !== 'instant' ||
    (startOfDay(startTime).getTime() ===
      today.getTime() &&
      startTime.getTime() >
        currentTime.getTime())

  useEffect(() => {
    let cancelled = false

    async function loadPricing() {
      setPricing(null)
      setPricingError(null)

      if (bookingType === 'instant') {
        return
      }

      if (!startDate || !endDate) {
        return
      }

      if (
        bookingType === 'recurring' &&
        selectedWeekdays.length === 0
      ) {
        return
      }

      setPricingLoading(true)

      try {
        const toDateString = (date: Date) => {
          const year = date.getFullYear()
          const month = String(
            date.getMonth() + 1,
          ).padStart(2, '0')
          const day = String(
            date.getDate(),
          ).padStart(2, '0')

          return `${year}-${month}-${day}`
        }

        const toTimeString = (date: Date) => {
          const hours = String(
            date.getHours(),
          ).padStart(2, '0')

          const minutes = String(
            date.getMinutes(),
          ).padStart(2, '0')

          const seconds = String(
            date.getSeconds(),
          ).padStart(2, '0')

          return `${hours}:${minutes}:${seconds}`
        }

        const weekdayIndexes =
          bookingType === 'scheduled'
            ? [
                0,
                1,
                2,
                3,
                4,
                5,
                6,
              ]
            : selectedWeekdays
                .map(getWeekdayIndex)
                .filter(index => index >= 0)

        const result =
          await calculateMultiOccurrenceBookingPrice(
            {
              serviceVariantId:
                service.serviceVariantId,
              startDate:
                toDateString(startDate),
              endDate:
                toDateString(endDate),
              startTime:
                toTimeString(startTime),
              endTime:
                toTimeString(endTime),
              selectedWeekdays:
                weekdayIndexes,
              excludedDates,
              bookingType,
            },
          )

        if (cancelled) {
          return
        }

        setPricing(result)
      } catch (error) {
        if (cancelled) {
          return
        }

        setPricingError(
          error instanceof Error
            ? error.message
            : 'Unable to calculate price.',
        )
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
  }, [
    bookingType,
    startDate,
    endDate,
    startTime,
    endTime,
    selectedWeekdays,
    excludedDates,
    service.serviceVariantId,
  ])

  function handleSelectBookingType(
    type: BookingType,
  ) {
    if (
      type === 'instant' &&
      !hasInstantAvailability
    ) {
      return
    }

    setBookingType(type)
    setSelectedScheduledSlotKey(null)

    if (type === 'recurring') {
      if (!startDate) {
        setStartDate(today)
      }

      if (!endDate) {
        setEndDate(today)
      }
    }
  }

  function handleSelectScheduledSlot(
    slot: ScheduledAvailabilitySlot,
  ) {
    if (slot.available_worker_count <= 0) {
      return
    }

    const slotStart = new Date(slot.start)
    const slotEnd = new Date(slot.end)

    setSelectedScheduledSlotKey(
      `${slot.start}-${slot.end}`,
    )

    setStartTime(slotStart)
    setEndTime(slotEnd)
  }

  function handleStartDateChange(date: Date) {
    setSelectedScheduledSlotKey(null)
    setStartDate(date)

    if (endDate && date > endDate) {
      setEndDate(date)
    }
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

  function handleToggleExcludedDate(
    dateKey: string,
  ) {
    setExcludedDates(current =>
      current.includes(dateKey)
        ? current.filter(
            date => date !== dateKey,
          )
        : [...current, dateKey].sort(),
    )
  }

  function handleToggleWeekday(
    weekday: string,
  ) {
    setSelectedWeekdays(current =>
      current.includes(weekday)
        ? current.filter(
            day => day !== weekday,
          )
        : [...current, weekday],
    )
  }

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
    (bookingType === 'recurring'
      ? recurringOccurrences.length > 0
      : scheduledOccurrences.length > 0)

  const areaCheckPassed =
    availabilityResult?.serviceAreaAvailable ===
      true &&
    (availabilityStatus === 'available' ||
      availabilityStatus === 'fallback')

  const hasInstantAvailability =
    areaCheckPassed &&
    availabilityResult?.instantAvailable === true

  const canContinue = Boolean(
    location &&
      areaCheckPassed &&
      timeRangeValid &&
      instantStartTimeValid &&
      (bookingType === 'instant'
        ? hasInstantAvailability
        : hasRequiredDates &&
          (bookingType === 'scheduled'
            ? !canSelectScheduledSlots ||
              selectedSlotIsAvailable
            : selectedWeekdays.length > 0)),
  )

  const instantWorkerCount =
    availabilityResult?.nearbyWorkerCount ?? 0

  const nearestDistance =
    availabilityResult?.nearestWorkerDistanceKm

  function handleContinue() {
    if (
      !onContinue ||
      !location ||
      !canContinue
    ) {
      return
    }

    const draft: BookingDraft = {
      serviceId: service.id,
      bookingType,
      location,
      startDate: startDate
        ? startDate.toISOString()
        : null,
      endDate: endDate
        ? endDate.toISOString()
        : null,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      selectedWeekdays,
      excludedDates,
      hourlyPrice: service.hourlyPrice ?? 0,
      currency: service.currency ?? null,
    }

    onContinue(draft)
  }

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.stepBadge}>
            <Text style={styles.stepBadgeText}>
              1
            </Text>
          </View>

          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>
              BOOK A SERVICE
            </Text>

            <Text
              style={styles.title}
              numberOfLines={2}
            >
              {service.name}
            </Text>
          </View>
        </View>

        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: '25%' },
            ]}
          />
        </View>

        <View style={styles.progressLabels}>
          <Text style={styles.progressActive}>
            Choose service
          </Text>

          <Text style={styles.progressLabel}>
            Review
          </Text>

          <Text style={styles.progressLabel}>
            Payment
          </Text>

          <Text style={styles.progressLabel}>
            Confirmation
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={
          styles.content
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.serviceHero}>
          <View style={styles.serviceHeroIcon}>
            <Text style={styles.serviceHeroIconText}>
              {service.name
                .trim()
                .charAt(0)
                .toUpperCase()}
            </Text>
          </View>

          <View style={styles.serviceHeroContent}>
            <Text
              style={styles.serviceHeroName}
              numberOfLines={2}
            >
              {service.name}
            </Text>

            {service.hourlyPrice !== null &&
              service.hourlyPrice !== undefined && (
                <Text style={styles.serviceHeroPrice}>
                  {service.currency ?? ''}
                  {service.hourlyPrice}
                  <Text
                    style={styles.serviceHeroPriceSuffix}
                  >
                    {' '}
                    / hour
                  </Text>
                </Text>
              )}
          </View>
        </View>

        <View style={styles.locationCard}>
          <View style={styles.locationIcon}>
            <Text style={styles.locationIconText}>
              •
            </Text>
          </View>

          <View style={styles.locationContent}>
            <Text style={styles.locationEyebrow}>
              SERVICE LOCATION
            </Text>

            <Text
              style={styles.locationAddress}
              numberOfLines={2}
            >
              {location?.address ??
                'No location selected'}
            </Text>
          </View>
        </View>

        <View style={styles.availabilityShell}>
          <ServiceAreaStatusCard
            address={
              location?.address ||
              'No location selected'
            }
            available={
              availabilityResult
                ?.serviceAreaAvailable === true
            }
            loading={
              availabilityStatus ===
              'checking'
            }
            error={
              availabilityStatus === 'error'
                ? availabilityError
                : null
            }
          />

          {availabilityStatus ===
            'available' &&
            areaCheckPassed && (
              <View
                style={
                  styles.availabilityDetails
                }
              >
                <View
                  style={
                    styles.availabilityStatusDot
                  }
                />

                <View
                  style={
                    styles.availabilityDetailsText
                  }
                >
                  <Text
                    style={
                      styles.availabilityTitle
                    }
                  >
                    Service area confirmed
                  </Text>

                  <Text
                    style={
                      styles.availabilitySubtitle
                    }
                  >
                    {hasInstantAvailability
                      ? `${instantWorkerCount} nearby worker${
                          instantWorkerCount === 1
                            ? ''
                            : 's'
                        } available`
                      : 'Instant service is not available right now'}
                  </Text>
                </View>

                {hasInstantAvailability &&
                  nearestDistance !==
                    null &&
                  nearestDistance !==
                    undefined && (
                    <View
                      style={
                        styles.distanceBadge
                      }
                    >
                      <Text
                        style={
                          styles.distanceBadgeText
                        }
                      >
                        {nearestDistance.toFixed(
                          1,
                        )}{' '}
                        km
                      </Text>
                    </View>
                  )}
              </View>
            )}
        </View>

        <BookingSection title="How do you want to book?">
          <Text
            style={styles.sectionDescription}
          >
            Choose the option that fits your
            schedule.
          </Text>

          <View style={styles.methodList}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityState={{
                selected:
                  bookingType === 'instant',
                disabled:
                  !hasInstantAvailability,
              }}
              activeOpacity={0.86}
              disabled={
                !hasInstantAvailability
              }
              onPress={() =>
                handleSelectBookingType(
                  'instant',
                )
              }
              style={[
                styles.methodCard,
                bookingType === 'instant' &&
                  styles.methodCardSelected,
                !hasInstantAvailability &&
                  styles.methodCardDisabled,
              ]}
            >
              <View
                style={[
                  styles.methodIcon,
                  bookingType === 'instant' &&
                    styles.methodIconSelected,
                ]}
              >
                <Text
                  style={[
                    styles.methodIconText,
                    bookingType ===
                      'instant' &&
                      styles.methodIconTextSelected,
                  ]}
                >
                  N
                </Text>
              </View>

              <View
                style={styles.methodContent}
              >
                <View
                  style={styles.methodTitleRow}
                >
                  <View>
                    <Text
                      style={[
                        styles.methodEyebrow,
                        bookingType ===
                          'instant' &&
                          styles.methodEyebrowSelected,
                      ]}
                    >
                      {METHOD_COPY.instant.eyebrow}
                    </Text>

                    <Text
                      style={[
                        styles.methodTitle,
                        bookingType ===
                          'instant' &&
                          styles.methodTitleSelected,
                      ]}
                    >
                      {METHOD_COPY.instant.title}
                    </Text>
                  </View>

                  {hasInstantAvailability ? (
                    <View
                      style={
                        styles.availableBadge
                      }
                    >
                      <Text
                        style={
                          styles.availableBadgeText
                        }
                      >
                        Available
                      </Text>
                    </View>
                  ) : (
                    <View
                      style={
                        styles.unavailableBadge
                      }
                    >
                      <Text
                        style={
                          styles.unavailableBadgeText
                        }
                      >
                        Unavailable
                      </Text>
                    </View>
                  )}
                </View>

                <Text
                  style={styles.methodDescription}
                >
                  {
                    METHOD_COPY.instant
                      .description
                  }
                </Text>
              </View>

              <View
                style={[
                  styles.radioOuter,
                  bookingType ===
                    'instant' &&
                    styles.radioOuterSelected,
                ]}
              >
                {bookingType ===
                  'instant' && (
                  <View
                    style={
                      styles.radioInner
                    }
                  />
                )}
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              accessibilityRole="button"
              accessibilityState={{
                selected:
                  bookingType ===
                  'scheduled',
              }}
              activeOpacity={0.86}
              onPress={() =>
                handleSelectBookingType(
                  'scheduled',
                )
              }
              style={[
                styles.methodCard,
                bookingType ===
                  'scheduled' &&
                  styles.methodCardSelected,
              ]}
            >
              <View
                style={[
                  styles.methodIcon,
                  bookingType ===
                    'scheduled' &&
                    styles.methodIconSelected,
                ]}
              >
                <Text
                  style={[
                    styles.methodIconText,
                    bookingType ===
                      'scheduled' &&
                      styles.methodIconTextSelected,
                  ]}
                >
                  S
                </Text>
              </View>

              <View
                style={styles.methodContent}
              >
                <View
                  style={styles.methodTitleRow}
                >
                  <View>
                    <Text
                      style={[
                        styles.methodEyebrow,
                        bookingType ===
                          'scheduled' &&
                          styles.methodEyebrowSelected,
                      ]}
                    >
                      {METHOD_COPY.scheduled.eyebrow}
                    </Text>

                    <Text
                      style={[
                        styles.methodTitle,
                        bookingType ===
                          'scheduled' &&
                          styles.methodTitleSelected,
                      ]}
                    >
                      {METHOD_COPY.scheduled.title}
                    </Text>
                  </View>
                </View>

                <Text
                  style={styles.methodDescription}
                >
                  {
                    METHOD_COPY
                      .scheduled
                      .description
                  }
                </Text>
              </View>

              <View
                style={[
                  styles.radioOuter,
                  bookingType ===
                    'scheduled' &&
                    styles.radioOuterSelected,
                ]}
              >
                {bookingType ===
                  'scheduled' && (
                  <View
                    style={
                      styles.radioInner
                    }
                  />
                )}
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              accessibilityRole="button"
              accessibilityState={{
                selected:
                  bookingType ===
                  'recurring',
              }}
              activeOpacity={0.86}
              onPress={() =>
                handleSelectBookingType(
                  'recurring',
                )
              }
              style={[
                styles.methodCard,
                bookingType ===
                  'recurring' &&
                  styles.methodCardSelected,
              ]}
            >
              <View
                style={[
                  styles.methodIcon,
                  bookingType ===
                    'recurring' &&
                    styles.methodIconSelected,
                ]}
              >
                <Text
                  style={[
                    styles.methodIconText,
                    bookingType ===
                      'recurring' &&
                      styles.methodIconTextSelected,
                  ]}
                >
                  R
                </Text>
              </View>

              <View
                style={styles.methodContent}
              >
                <View
                  style={styles.methodTitleRow}
                >
                  <View>
                    <Text
                      style={[
                        styles.methodEyebrow,
                        bookingType ===
                          'recurring' &&
                          styles.methodEyebrowSelected,
                      ]}
                    >
                      {METHOD_COPY.recurring.eyebrow}
                    </Text>

                    <Text
                      style={[
                        styles.methodTitle,
                        bookingType ===
                          'recurring' &&
                          styles.methodTitleSelected,
                      ]}
                    >
                      {METHOD_COPY.recurring.title}
                    </Text>
                  </View>
                </View>

                <Text
                  style={styles.methodDescription}
                >
                  {
                    METHOD_COPY
                      .recurring
                      .description
                  }
                </Text>
              </View>

              <View
                style={[
                  styles.radioOuter,
                  bookingType ===
                    'recurring' &&
                    styles.radioOuterSelected,
                ]}
              >
                {bookingType ===
                  'recurring' && (
                  <View
                    style={
                      styles.radioInner
                    }
                  />
                )}
              </View>
            </TouchableOpacity>
          </View>
        </BookingSection>

        {bookingType === 'instant' && (
          <BookingSection title="When should service start?">
            <View
              style={styles.infoBanner}
            >
              <View
                style={styles.infoBannerIcon}
              >
                <Text
                  style={
                    styles.infoBannerIconText
                  }
                >
                  i
                </Text>
              </View>

              <Text
                style={styles.infoBannerText}
              >
                Instant bookings are for today.
                Your start time must be in
                the future.
              </Text>
            </View>

            <TimeRangePicker
              startTime={startTime}
              endTime={endTime}
              onStartTimeChange={
                handleStartTimeChange
              }
              onEndTimeChange={
                handleEndTimeChange
              }
            />

            <View
              style={styles.durationCard}
            >
              <View>
                <Text
                  style={
                    styles.durationEyebrow
                  }
                >
                  SERVICE DURATION
                </Text>

                <Text
                  style={
                    styles.durationValue
                  }
                >
                  {durationHours} hour
                  {durationHours === 1
                    ? ''
                    : 's'}
                </Text>
              </View>

              <View
                style={styles.durationDivider}
              />

              <View
                style={styles.durationRight}
              >
                <Text
                  style={
                    styles.durationHint
                  }
                >
                  Minimum
                </Text>

                <Text
                  style={
                    styles.durationMinimum
                  }
                >
                  1 hour
                </Text>
              </View>
            </View>

            {!instantStartTimeValid && (
              <View
                style={styles.warningCard}
              >
                <Text
                  style={styles.warningTitle}
                >
                  Choose a future start time
                </Text>

                <Text
                  style={styles.warningText}
                >
                  Instant service can only
                  start later today.
                </Text>
              </View>
            )}

            {!hasInstantAvailability &&
              areaCheckPassed && (
                <View
                  style={styles.fallbackCard}
                >
                  <Text
                    style={
                      styles.fallbackTitle
                    }
                  >
                    Instant service is
                    unavailable
                  </Text>

                  <Text
                    style={
                      styles.fallbackText
                    }
                  >
                    No nearby worker is
                    currently available.
                    Scheduled booking is
                    available instead.
                  </Text>

                  <TouchableOpacity
                    style={
                      styles.fallbackButton
                    }
                    onPress={() =>
                      setBookingType(
                        'scheduled',
                      )
                    }
                    activeOpacity={0.8}
                  >
                    <Text
                      style={
                        styles.fallbackButtonText
                      }
                    >
                      Switch to Scheduled
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
          </BookingSection>
        )}

        {bookingType === 'scheduled' && (
          <BookingSection title="Choose your schedule">
            <Text
              style={styles.sectionDescription}
            >
              Select your service dates and
              preferred time.
            </Text>

            <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              excludedDates={excludedDates}
              minDate={today}
              onStartDateChange={
                handleStartDateChange
              }
              onEndDateChange={
                handleEndDateChange
              }
              onExcludedDateToggle={
                handleToggleExcludedDate
              }
            />

            <TimeRangePicker
              startTime={startTime}
              endTime={endTime}
              onStartTimeChange={
                handleStartTimeChange
              }
              onEndTimeChange={
                handleEndTimeChange
              }
            />

            {canSelectScheduledSlots && (
              <View
                style={styles.availabilitySection}
              >
                <View
                  style={
                    styles.availabilityHeader
                  }
                >
                  <View>
                    <Text
                      style={
                        styles.availabilityHeading
                      }
                    >
                      Available worker slots
                    </Text>

                    <Text
                      style={
                        styles.availabilitySubheading
                      }
                    >
                      {startDate
                        ? formatDateDisplay(
                            startDate,
                          )
                        : 'Select a date'}
                    </Text>
                  </View>

                  {scheduledServiceAreaAvailable ===
                    true && (
                    <View
                      style={
                        styles.slotConfirmedBadge
                      }
                    >
                      <Text
                        style={
                          styles.slotConfirmedBadgeText
                        }
                      >
                        Area covered
                      </Text>
                    </View>
                  )}
                </View>

                {scheduledAvailabilityLoading && (
                  <BookingLoadingState />
                )}

                {scheduledAvailabilityError && (
                  <BookingErrorState
                    message={
                      scheduledAvailabilityError
                    }
                  />
                )}

                {!scheduledAvailabilityLoading &&
                  !scheduledAvailabilityError &&
                  visibleScheduledSlots.length ===
                    0 && (
                    <View
                      style={
                        styles.emptySlotsCard
                      }
                    >
                      <Text
                        style={
                          styles.emptySlotsTitle
                        }
                      >
                        No matching slots
                      </Text>

                      <Text
                        style={
                          styles.emptySlotsText
                        }
                      >
                        {isTodaySelected
                          ? 'No future availability remains today for this duration.'
                          : 'No worker is currently available for this duration on the selected date.'}
                      </Text>
                    </View>
                  )}

                {!scheduledAvailabilityLoading &&
                  !scheduledAvailabilityError &&
                  visibleScheduledSlots.map(
                    (slot, index) => (
                      <AvailabilitySlot
                        key={`${slot.start}-${slot.end}-${index}`}
                        start={slot.start}
                        end={slot.end}
                        availableWorkerCount={
                          slot.available_worker_count
                        }
                        selected={
                          selectedScheduledSlotKey ===
                          `${slot.start}-${slot.end}`
                        }
                        onPress={() =>
                          handleSelectScheduledSlot(
                            slot,
                          )
                        }
                      />
                    ),
                  )}
              </View>
            )}

            {!canSelectScheduledSlots &&
              startDate &&
              endDate && (
                <View
                  style={styles.futureBookingCard}
                >
                  <View
                    style={
                      styles.futureBookingIcon
                    }
                  >
                    <Text
                      style={
                        styles.futureBookingIconText
                      }
                    >
                      F
                    </Text>
                  </View>

                  <View
                    style={
                      styles.futureBookingContent
                    }
                  >
                    <Text
                      style={
                        styles.futureBookingTitle
                      }
                    >
                      Future booking
                    </Text>

                    <Text
                      style={
                        styles.futureBookingText
                      }
                    >
                      Your request will be
                      matched with an eligible
                      worker for the selected
                      schedule.
                    </Text>
                  </View>
                </View>
              )}
          </BookingSection>
        )}

        {bookingType === 'recurring' && (
          <BookingSection title="Build your recurring schedule">
            <Text
              style={styles.sectionDescription}
            >
              Set a date range, choose the
              weekdays, and select one daily
              time window.
            </Text>

            <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              excludedDates={excludedDates}
              minDate={today}
              onStartDateChange={
                handleStartDateChange
              }
              onEndDateChange={
                handleEndDateChange
              }
              onExcludedDateToggle={
                handleToggleExcludedDate
              }
            />

            <WeekdaySelector
              selectedWeekdays={
                selectedWeekdays
              }
              onToggleWeekday={
                handleToggleWeekday
              }
            />

            <TimeRangePicker
              startTime={startTime}
              endTime={endTime}
              onStartTimeChange={
                handleStartTimeChange
              }
              onEndTimeChange={
                handleEndTimeChange
              }
            />

            {recurringOccurrences.length >
              0 && (
              <View
                style={
                  styles.recurringSummary
                }
              >
                <View
                  style={
                    styles.recurringSummaryTop
                  }
                >
                  <View>
                    <Text
                      style={
                        styles.recurringEyebrow
                      }
                    >
                      RECURRING SCHEDULE
                    </Text>

                    <Text
                      style={
                        styles.recurringCount
                      }
                    >
                      {
                        recurringOccurrences.length
                      }{' '}
                      service dates
                    </Text>
                  </View>

                  <View
                    style={
                      styles.recurringBadge
                    }
                  >
                    <Text
                      style={
                        styles.recurringBadgeText
                      }
                    >
                      {
                        selectedWeekdays.length
                      }{' '}
                      days/week
                    </Text>
                  </View>
                </View>

                <RecurringOccurrencePreview
                  occurrences={
                    recurringOccurrences
                  }
                  startTime={startTime}
                  endTime={endTime}
                />
              </View>
            )}
          </BookingSection>
        )}

        {(bookingType === 'scheduled' ||
          bookingType === 'recurring') && (
          <BookingSection title="Estimated price">
            <Text
              style={styles.sectionDescription}
            >
              Final pricing is calculated by
              the booking engine using current
              service pricing, discounts, fees
              and applicable tax settings.
            </Text>

            <BookingPriceSummary
              baseAmount={
                pricing?.gross_amount
              }
              discountAmount={
                pricing?.discount_amount
              }
              platformFee={
                pricing?.platform_fee
              }
              taxAmount={
                pricing?.tax_amount
              }
              finalAmount={
                pricing?.final_amount
              }
              currency={pricing?.currency}
              occurrenceCount={
                pricing?.occurrence_count
              }
              loading={pricingLoading}
              error={pricingError}
            />
          </BookingSection>
        )}

        <View
          style={styles.trustCard}
        >
          <View
            style={styles.trustItem}
          >
            <View
              style={styles.trustDot}
            />
            <Text
              style={styles.trustText}
            >
              Secure booking
            </Text>
          </View>

          <View
            style={styles.trustItem}
          >
            <View
              style={styles.trustDot}
            />
            <Text
              style={styles.trustText}
            >
              Verified workers
            </Text>
          </View>

          <View
            style={styles.trustItem}
          >
            <View
              style={styles.trustDot}
            />
            <Text
              style={styles.trustText}
            >
              Live booking status
            </Text>
          </View>
        </View>

        <View
          style={styles.bottomSpacer}
        />
      </ScrollView>

      <View style={styles.footer}>
        <View
          style={styles.footerSummary}
        >
          <View>
            <Text
              style={styles.footerLabel}
            >
              {bookingType ===
              'instant'
                ? 'Service duration'
                : 'Booking'}
            </Text>

            <Text
              style={styles.footerValue}
            >
              {bookingType ===
              'instant'
                ? `${durationHours} hour${
                    durationHours === 1
                      ? ''
                      : 's'
                  }`
                : bookingType ===
                    'recurring'
                  ? `${
                      recurringOccurrences.length
                    } occurrence${
                      recurringOccurrences.length ===
                      1
                        ? ''
                        : 's'
                    }`
                  : startDate
                    ? formatDateDisplay(
                        startDate,
                      )
                    : 'Select a date'}
            </Text>
          </View>

          {pricing?.final_amount != null &&
            bookingType !== 'instant' && (
              <View
                style={
                  styles.footerPriceBlock
                }
              >
                <Text
                  style={
                    styles.footerPriceLabel
                  }
                >
                  Total
                </Text>

                <Text
                  style={
                    styles.footerPrice
                  }
                >
                  {pricing.currency ?? ''}
                  {pricing.final_amount.toFixed(
                    2,
                  )}
                </Text>
              </View>
            )}
        </View>

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityState={{
            disabled: !canContinue,
          }}
          activeOpacity={0.86}
          style={[
            styles.continueButton,
            !canContinue &&
              styles.continueButtonDisabled,
          ]}
          onPress={handleContinue}
          disabled={!canContinue}
        >
          <Text
            style={
              styles.continueButtonText
            }
          >
            Continue to Review
          </Text>

          <Text
            style={
              styles.continueButtonArrow
            }
          >
            →
          </Text>
        </TouchableOpacity>
      </View>
    </ScreenContainer>
  )
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
  },

  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  stepBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111827',
  },

  stepBadgeText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },

  headerText: {
    flex: 1,
  },

  eyebrow: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '800',
    letterSpacing: 1.1,
    color: '#6B7280',
  },

  title: {
    marginTop: 2,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
    color: '#111827',
  },

  progressTrack: {
    height: 4,
    marginTop: 16,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
    overflow: 'hidden',
  },

  progressFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: '#111827',
  },

  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 7,
  },

  progressActive: {
    fontSize: 10,
    fontWeight: '700',
    color: '#111827',
  },

  progressLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#9CA3AF',
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 180,
  },

  serviceHero: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
    borderRadius: 18,
    backgroundColor: '#111827',
  },

  serviceHeroIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    marginRight: 14,
  },

  serviceHeroIconText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
  },

  serviceHeroContent: {
    flex: 1,
  },

  serviceHeroName: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  serviceHeroPrice: {
    marginTop: 4,
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  serviceHeroPriceSuffix: {
    fontWeight: '500',
    opacity: 0.72,
  },

  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    marginBottom: 14,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  locationIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E2E8F0',
    marginRight: 12,
  },

  locationIconText: {
    fontSize: 28,
    lineHeight: 26,
    color: '#334155',
    fontWeight: '800',
  },

  locationContent: {
    flex: 1,
  },

  locationEyebrow: {
    fontSize: 9,
    lineHeight: 13,
    fontWeight: '800',
    letterSpacing: 0.9,
    color: '#64748B',
  },

  locationAddress: {
    marginTop: 2,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '600',
    color: '#0F172A',
  },

  availabilityShell: {
    marginBottom: 4,
  },

  availabilityDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingBottom: 14,
    marginTop: -18,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: '#BBF7D0',
  },

  availabilityStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#16A34A',
    marginRight: 9,
  },

  availabilityDetailsText: {
    flex: 1,
  },

  availabilityTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#166534',
  },

  availabilitySubtitle: {
    marginTop: 2,
    fontSize: 11,
    color: '#15803D',
  },

  distanceBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#DCFCE7',
  },

  distanceBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#166534',
  },

  sectionDescription: {
    marginTop: -3,
    marginBottom: 2,
    fontSize: 13,
    lineHeight: 19,
    color: '#64748B',
  },

  methodList: {
    gap: 10,
  },

  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 92,
    padding: 14,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  methodCardSelected: {
    backgroundColor: '#F8FAFC',
    borderColor: '#111827',
    borderWidth: 2,
  },

  methodCardDisabled: {
    opacity: 0.55,
  },

  methodIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    marginRight: 12,
  },

  methodIconSelected: {
    backgroundColor: '#111827',
  },

  methodIconText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#475569',
  },

  methodIconTextSelected: {
    color: '#FFFFFF',
  },

  methodContent: {
    flex: 1,
    minWidth: 0,
  },

  methodTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  methodEyebrow: {
    fontSize: 9,
    lineHeight: 12,
    letterSpacing: 0.8,
    fontWeight: '800',
    color: '#94A3B8',
  },

  methodEyebrowSelected: {
    color: '#475569',
  },

  methodTitle: {
    marginTop: 1,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '800',
    color: '#0F172A',
  },

  methodTitleSelected: {
    color: '#111827',
  },

  methodDescription: {
    marginTop: 4,
    paddingRight: 4,
    fontSize: 12,
    lineHeight: 17,
    color: '#64748B',
  },

  availableBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#DCFCE7',
  },

  availableBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#166534',
  },

  unavailableBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#F1F5F9',
  },

  unavailableBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
  },

  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },

  radioOuterSelected: {
    borderColor: '#111827',
  },

  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#111827',
  },

  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 13,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  infoBannerIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E2E8F0',
    marginRight: 10,
  },

  infoBannerIconText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#334155',
  },

  infoBannerText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: '#475569',
    fontWeight: '500',
  },

  durationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#111827',
  },

  durationEyebrow: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: '#94A3B8',
  },

  durationValue: {
    marginTop: 3,
    fontSize: 21,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  durationDivider: {
    width: 1,
    height: 32,
    marginHorizontal: 18,
    backgroundColor: '#334155',
  },

  durationRight: {
    flex: 1,
  },

  durationHint: {
    fontSize: 10,
    color: '#94A3B8',
  },

  durationMinimum: {
    marginTop: 3,
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  warningCard: {
    padding: 13,
    borderRadius: 14,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
  },

  warningTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#9A3412',
  },

  warningText: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 17,
    color: '#C2410C',
  },

  fallbackCard: {
    padding: 15,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },

  fallbackTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },

  fallbackText: {
    marginTop: 5,
    fontSize: 12,
    lineHeight: 18,
    color: '#64748B',
  },

  fallbackButton: {
    alignSelf: 'flex-start',
    minHeight: 44,
    marginTop: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111827',
  },

  fallbackButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  availabilitySection: {
    marginTop: 8,
    padding: 14,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  availabilityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  availabilityHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },

  availabilitySubheading: {
    marginTop: 2,
    fontSize: 11,
    color: '#64748B',
  },

  slotConfirmedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#DCFCE7',
  },

  slotConfirmedBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#166534',
  },

  emptySlotsCard: {
    padding: 18,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },

  emptySlotsTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#334155',
  },

  emptySlotsText: {
    marginTop: 5,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    color: '#64748B',
  },

  futureBookingCard: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  futureBookingIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E2E8F0',
    marginRight: 11,
  },

  futureBookingIconText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#334155',
  },

  futureBookingContent: {
    flex: 1,
  },

  futureBookingTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },

  futureBookingText: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 17,
    color: '#64748B',
  },

  recurringSummary: {
    padding: 14,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  recurringSummaryTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  recurringEyebrow: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: '#64748B',
  },

  recurringCount: {
    marginTop: 3,
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },

  recurringBadge: {
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#E2E8F0',
  },

  recurringBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#475569',
  },

  trustCard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  trustItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  trustDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#16A34A',
    marginRight: 6,
  },

  trustText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },

  bottomSpacer: {
    height: 20,
  },

  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },

  footerSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },

  footerLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
  },

  footerValue: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },

  footerPriceBlock: {
    alignItems: 'flex-end',
  },

  footerPriceLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
  },

  footerPrice: {
    marginTop: 1,
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },

  continueButton: {
    minHeight: 52,
    borderRadius: 16,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111827',
  },

  continueButtonDisabled: {
    backgroundColor: '#CBD5E1',
  },

  continueButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  continueButtonArrow: {
    marginLeft: 10,
    fontSize: 19,
    fontWeight: '700',
    color: '#FFFFFF',
  },
})