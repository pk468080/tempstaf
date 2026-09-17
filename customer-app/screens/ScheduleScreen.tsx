import { useMemo, useState } from 'react'

import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'

import {
  NativeStackScreenProps,
} from '@react-navigation/native-stack'

import { COLORS } from '../constants/theme'
import { RootStackParamList } from '../types'
import { useBooking } from '../context/BookingContext'

import Header from '../components/Header'
import PrimaryButton from '../components/PrimaryButton'

type Props =
  NativeStackScreenProps<
    RootStackParamList,
    'Schedule'
  >

type BookingMethod =
  | 'Instant'
  | 'Scheduled'
  | 'Recurring'

type ScheduleOccurrence = {
  occurrence_date: string
  scheduled_start: string
  scheduled_end: string
}

const WEEKDAYS = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
]

function toDateKey(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

function fromDateKey(value: string) {
  return new Date(`${value}T00:00:00`)
}

function addDays(
  value: string,
  amount: number,
) {
  const date = fromDateKey(value)

  date.setDate(
    date.getDate() + amount,
  )

  return toDateKey(date)
}

function weekdayForDate(
  value: string,
) {
  return fromDateKey(value).getDay()
}

function formatDate(
  value: string,
) {
  if (!value) {
    return 'Select date'
  }

  return fromDateKey(value).toLocaleDateString(
    'en-IN',
    {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    },
  )
}

function isValidDateKey(
  value: string,
) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false
  }

  const date = fromDateKey(value)

  return (
    !Number.isNaN(date.getTime()) &&
    toDateKey(date) === value
  )
}

function isValidTime(
  value: string,
) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(
    value,
  )
}

function timeToMinutes(
  value: string,
) {
  const [
    hours,
    minutes,
  ] = value
    .split(':')
    .map(Number)

  return (
    hours * 60 +
    minutes
  )
}

function calculateHours(
  startTime: string,
  endTime: string,
) {
  if (
    !isValidTime(startTime) ||
    !isValidTime(endTime)
  ) {
    return 0
  }

  const minutes =
    timeToMinutes(endTime) -
    timeToMinutes(startTime)

  if (minutes <= 0) {
    return 0
  }

  return minutes / 60
}

function dateRange(
  start: string,
  end: string,
) {
  const result: string[] = []

  if (
    !isValidDateKey(start) ||
    !isValidDateKey(end) ||
    start > end
  ) {
    return result
  }

  let current = start

  while (current <= end) {
    result.push(current)
    current = addDays(
      current,
      1,
    )
  }

  return result
}

function buildOccurrences(
  startDate: string,
  endDate: string,
  startTime: string,
  endTime: string,
  weekdays: number[],
  offDates: string[],
  method: BookingMethod,
) {
  const dates =
    dateRange(
      startDate,
      endDate,
    )

  const effectiveWeekdays =
    method === 'Recurring'
      ? weekdays
      : [
          weekdayForDate(
            startDate,
          ),
        ]

  return dates
    .filter(date => {
      if (
        !effectiveWeekdays.includes(
          weekdayForDate(date),
        )
      ) {
        return false
      }

      if (
        offDates.includes(date)
      ) {
        return false
      }

      if (
        method === 'Instant' ||
        method === 'Scheduled'
      ) {
        return (
          date === startDate
        )
      }

      return true
    })
    .map(date => ({
      occurrence_date: date,
      scheduled_start:
        `${date}T${startTime}:00`,
      scheduled_end:
        `${date}T${endTime}:00`,
    }))
}

export default function ScheduleScreen({
  navigation,
}: Props) {
  const {
    selectedService,
    selectedVariant,
    addressId,

    bookingMode,
    setBookingMode,

    setScheduledDate,

    setScheduleStartDate,
    setScheduleEndDate,
    setScheduleDailyStartTime,
    setScheduleDailyEndTime,
    setScheduleSelectedWeekdays,
    setScheduleOffDates,
    setScheduleTotalWorkingHours,
    setScheduleOccurrences,
  } = useBooking()

  const today = useMemo(
    () => toDateKey(new Date()),
    [],
  )

  const tomorrow = useMemo(
    () => addDays(today, 1),
    [today],
  )

  const [method, setMethod] =
    useState<BookingMethod>(
      bookingMode === 'Recurring'
        ? 'Recurring'
        : bookingMode === 'Instant'
          ? 'Instant'
          : 'Scheduled',
    )

  const [startDate, setStartDate] =
    useState(
      bookingMode === 'Instant'
        ? today
        : today,
    )

  const [endDate, setEndDate] =
    useState(
      bookingMode === 'Recurring'
        ? tomorrow
        : today,
    )

  const [startTime, setStartTime] =
    useState('')

  const [endTime, setEndTime] =
    useState('')

  const [
    selectedWeekdays,
    setSelectedWeekdays,
  ] = useState<number[]>(
    bookingMode === 'Recurring'
      ? [weekdayForDate(today)]
      : [weekdayForDate(today)],
  )

  const [offDates, setOffDates] =
    useState<string[]>([])

  const [schedule, setSchedule] =
    useState<{
      totalWorkingHours: number
      occurrences: ScheduleOccurrence[]
    } | null>(null)

  const [startDateInput, setStartDateInput] =
    useState(startDate)

  const [endDateInput, setEndDateInput] =
    useState(endDate)

  const hours = useMemo(
    () =>
      calculateHours(
        startTime,
        endTime,
      ),
    [
      startTime,
      endTime,
    ],
  )

  const multiDay =
    startDate !== endDate

  const selectableDates =
    useMemo(
      () =>
        dateRange(
          startDate,
          endDate,
        ),
      [
        startDate,
        endDate,
      ],
    )

  const resetCalculatedSchedule =
    () => {
      setSchedule(null)
    }

  const changeMethod = (
    nextMethod: BookingMethod,
  ) => {
    setMethod(nextMethod)

    setBookingMode(
      nextMethod,
    )

    resetCalculatedSchedule()

    if (
      nextMethod === 'Instant'
    ) {
      setStartDate(today)
      setEndDate(today)

      setStartDateInput(today)
      setEndDateInput(today)

      setSelectedWeekdays([
        weekdayForDate(today),
      ])

      setOffDates([])
      return
    }

    if (
      nextMethod === 'Scheduled'
    ) {
      setStartDate(today)
      setEndDate(today)

      setStartDateInput(today)
      setEndDateInput(today)

      setSelectedWeekdays([
        weekdayForDate(today),
      ])

      setOffDates([])
      return
    }

    setStartDate(today)
    setEndDate(
      addDays(today, 7),
    )

    setStartDateInput(today)
    setEndDateInput(
      addDays(today, 7),
    )

    setSelectedWeekdays([
      weekdayForDate(today),
    ])

    setOffDates([])
  }

  const applyStartDate =
    () => {
      if (
        !isValidDateKey(
          startDateInput,
        )
      ) {
        Alert.alert(
          'Invalid date',
          'Use YYYY-MM-DD, for example 2026-10-15.',
        )
        return
      }

      if (
        startDateInput < today
      ) {
        Alert.alert(
          'Invalid date',
          'The booking date cannot be in the past.',
        )
        return
      }

      setStartDate(
        startDateInput,
      )

      if (
        endDateInput <
        startDateInput
      ) {
        setEndDate(
          startDateInput,
        )

        setEndDateInput(
          startDateInput,
        )
      }

      setSelectedWeekdays(
        current =>
          method === 'Recurring'
            ? current
            : [
                weekdayForDate(
                  startDateInput,
                ),
              ],
      )

      setOffDates([])
      resetCalculatedSchedule()
    }

  const applyEndDate =
    () => {
      if (
        !isValidDateKey(
          endDateInput,
        )
      ) {
        Alert.alert(
          'Invalid date',
          'Use YYYY-MM-DD, for example 2026-10-15.',
        )
        return
      }

      if (
        endDateInput <
        startDate
      ) {
        Alert.alert(
          'Invalid date range',
          'The end date must be on or after the start date.',
        )
        return
      }

      setEndDate(
        endDateInput,
      )

      setOffDates([])
      resetCalculatedSchedule()
    }

  const toggleWeekday = (
    weekday: number,
  ) => {
    setSelectedWeekdays(
      current => {
        if (
          current.includes(
            weekday,
          )
        ) {
          return current.filter(
            value =>
              value !== weekday,
          )
        }

        return [
          ...current,
          weekday,
        ].sort(
          (a, b) => a - b,
        )
      },
    )

    resetCalculatedSchedule()
  }

  const toggleOffDate = (
    date: string,
  ) => {
    setOffDates(
      current =>
        current.includes(date)
          ? current.filter(
              value =>
                value !== date,
            )
          : [
              ...current,
              date,
            ].sort(),
    )

    resetCalculatedSchedule()
  }

  const validateCommon =
    () => {
      if (!selectedVariant) {
        Alert.alert(
          'Service not selected',
          'Please select an hourly service before choosing a schedule.',
        )
        return false
      }

      if (!addressId) {
        Alert.alert(
          'Location required',
          'Please add the service location before choosing the schedule.',
        )
        return false
      }

      if (
        !isValidTime(startTime) ||
        !isValidTime(endTime)
      ) {
        Alert.alert(
          'Enter working hours',
          'Enter time using HH:MM, for example 09:00 or 18:00.',
        )
        return false
      }

      if (
        timeToMinutes(endTime) <=
        timeToMinutes(startTime)
      ) {
        Alert.alert(
          'Invalid working hours',
          'End time must be later than start time.',
        )
        return false
      }

      if (hours < 1) {
        Alert.alert(
          'Minimum duration',
          'The minimum booking duration is 1 hour.',
        )
        return false
      }

      return true
    }

  const validateMethod =
    () => {
      if (
        !validateCommon()
      ) {
        return false
      }

      if (
        method === 'Instant'
      ) {
        if (
          startDate !== today
        ) {
          Alert.alert(
            'Instant booking',
            'Instant bookings are available for today only.',
          )
          return false
        }

        if (
          timeToMinutes(
            startTime,
          ) <=
          new Date().getHours() *
            60 +
            new Date().getMinutes()
        ) {
          Alert.alert(
            'Start time unavailable',
            'Choose a start time later than the current time.',
          )
          return false
        }

        return true
      }

      if (
        method === 'Scheduled'
      ) {
        if (
          startDate < today
        ) {
          Alert.alert(
            'Invalid date',
            'Choose today or a future date.',
          )
          return false
        }

        return true
      }

      if (
        !isValidDateKey(
          startDate,
        ) ||
        !isValidDateKey(
          endDate,
        )
      ) {
        Alert.alert(
          'Select dates',
          'Choose a valid recurring date range.',
        )
        return false
      }

      if (
        startDate > endDate
      ) {
        Alert.alert(
          'Invalid date range',
          'The end date must be on or after the start date.',
        )
        return false
      }

      if (
        selectedWeekdays.length === 0
      ) {
        Alert.alert(
          'Select working days',
          'Choose at least one weekday for a recurring booking.',
        )
        return false
      }

      return true
    }

  const reviewSchedule =
    () => {
      if (
        !validateMethod()
      ) {
        return
      }

      const effectiveWeekdays =
        method === 'Recurring'
          ? selectedWeekdays
          : [
              weekdayForDate(
                startDate,
              ),
            ]

      const occurrences =
        buildOccurrences(
          startDate,
          method === 'Recurring'
            ? endDate
            : startDate,
          startTime,
          endTime,
          effectiveWeekdays,
          method === 'Recurring'
            ? offDates
            : [],
          method,
        )

      if (
        occurrences.length === 0
      ) {
        Alert.alert(
          'No working dates',
          'The selected schedule does not contain any working dates.',
        )

        setSchedule(null)
        return
      }

      const totalWorkingHours =
        occurrences.length *
        hours

      const normalizedMode =
        method

      setBookingMode(
        normalizedMode,
      )

      setScheduleStartDate(
        startDate,
      )

      setScheduleEndDate(
        method === 'Recurring'
          ? endDate
          : startDate,
      )

      setScheduleDailyStartTime(
        startTime,
      )

      setScheduleDailyEndTime(
        endTime,
      )

      setScheduleSelectedWeekdays(
        effectiveWeekdays,
      )

      setScheduleOffDates(
        method === 'Recurring'
          ? offDates
          : [],
      )

      setScheduleTotalWorkingHours(
        totalWorkingHours,
      )

      setScheduleOccurrences(
        occurrences,
      )

      setScheduledDate(
        occurrences[0]
          ?.scheduled_start ?? '',
      )

      setSchedule({
        totalWorkingHours,
        occurrences,
      })
    }

  const continueToCheckout =
    () => {
      if (!schedule) {
        Alert.alert(
          'Review schedule',
          'Please review your schedule before continuing.',
        )
        return
      }

      navigation.navigate(
        'Checkout',
      )
    }

  const serviceName =
    selectedService ||
    'Staff service'

  const variantName =
    selectedVariant?.name ||
    'Hourly staffing'

  const previewTitle =
    method === 'Recurring'
      ? `${formatDate(startDate)} → ${formatDate(endDate)}`
      : formatDate(startDate)

  const methodDescription =
    method === 'Instant'
      ? 'Book for today using currently available nearby workers.'
      : method === 'Scheduled'
        ? startDate <= tomorrow
          ? 'Choose a near-term time. Worker schedule availability will be checked during booking.'
          : 'Choose a future date and time. Worker assignment will happen for the future booking.'
        : 'Choose one or more weekdays over a date range. Each selected date becomes its own occurrence.'

  return (
    <SafeAreaView
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={
          styles.content
        }
        showsVerticalScrollIndicator={
          false
        }
      >
        <Header
          onBack={() =>
            navigation.goBack()
          }
        />

        <Text style={styles.eyebrow}>
          BOOKING SCHEDULE
        </Text>

        <Text style={styles.title}>
          When do you need staff?
        </Text>

        <Text style={styles.subtitle}>
          Choose how you want to book
          your hourly service.
        </Text>

        {/* Service */}
        <View style={styles.serviceCard}>
          <Text style={styles.cardLabel}>
            SERVICE
          </Text>

          <Text style={styles.serviceName}>
            {serviceName}
          </Text>

          <Text style={styles.variantName}>
            {variantName}
          </Text>
        </View>

        {/* Booking method */}
        <Text style={styles.sectionTitle}>
          Booking method
        </Text>

        <View style={styles.methodList}>
          <TouchableOpacity
            style={[
              styles.methodCard,
              method === 'Instant' &&
                styles.methodCardActive,
            ]}
            onPress={() =>
              changeMethod(
                'Instant',
              )
            }
            activeOpacity={0.85}
          >
            <View
              style={[
                styles.methodIcon,
                method === 'Instant' &&
                  styles.methodIconActive,
              ]}
            >
              <Text
                style={[
                  styles.methodIconText,
                  method === 'Instant' &&
                    styles.activeText,
                ]}
              >
                ⚡
              </Text>
            </View>

            <View style={styles.methodContent}>
              <Text
                style={[
                  styles.methodTitle,
                  method === 'Instant' &&
                    styles.methodTitleActive,
                ]}
              >
                Instant
              </Text>

              <Text
                style={[
                  styles.methodText,
                  method === 'Instant' &&
                    styles.methodTextActive,
                ]}
              >
                Today, subject to nearby
                worker availability.
              </Text>
            </View>

            {method === 'Instant' ? (
              <View style={styles.selectedDot} />
            ) : null}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.methodCard,
              method === 'Scheduled' &&
                styles.methodCardActive,
            ]}
            onPress={() =>
              changeMethod(
                'Scheduled',
              )
            }
            activeOpacity={0.85}
          >
            <View
              style={[
                styles.methodIcon,
                method === 'Scheduled' &&
                  styles.methodIconActive,
              ]}
            >
              <Text
                style={[
                  styles.methodIconText,
                  method === 'Scheduled' &&
                    styles.activeText,
                ]}
              >
                📅
              </Text>
            </View>

            <View style={styles.methodContent}>
              <Text
                style={[
                  styles.methodTitle,
                  method === 'Scheduled' &&
                    styles.methodTitleActive,
                ]}
              >
                Scheduled
              </Text>

              <Text
                style={[
                  styles.methodText,
                  method === 'Scheduled' &&
                    styles.methodTextActive,
                ]}
              >
                Book a specific future date
                and working time.
              </Text>
            </View>

            {method === 'Scheduled' ? (
              <View style={styles.selectedDot} />
            ) : null}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.methodCard,
              method === 'Recurring' &&
                styles.methodCardActive,
            ]}
            onPress={() =>
              changeMethod(
                'Recurring',
              )
            }
            activeOpacity={0.85}
          >
            <View
              style={[
                styles.methodIcon,
                method === 'Recurring' &&
                  styles.methodIconActive,
              ]}
            >
              <Text
                style={[
                  styles.methodIconText,
                  method === 'Recurring' &&
                    styles.activeText,
                ]}
              >
                🔁
              </Text>
            </View>

            <View style={styles.methodContent}>
              <Text
                style={[
                  styles.methodTitle,
                  method === 'Recurring' &&
                    styles.methodTitleActive,
                ]}
              >
                Recurring
              </Text>

              <Text
                style={[
                  styles.methodText,
                  method === 'Recurring' &&
                    styles.methodTextActive,
                ]}
              >
                Repeat on selected weekdays
                over a date range.
              </Text>
            </View>

            {method === 'Recurring' ? (
              <View style={styles.selectedDot} />
            ) : null}
          </TouchableOpacity>
        </View>

        {/* Method information */}
        <View style={styles.infoCard}>
          <View style={styles.infoIcon}>
            <Text style={styles.infoIconText}>
              i
            </Text>
          </View>

          <Text style={styles.infoText}>
            {methodDescription}
          </Text>
        </View>

        {/* Dates */}
        <Text
          style={[
            styles.sectionTitle,
            styles.sectionSpacing,
          ]}
        >
          {method === 'Recurring'
            ? 'Booking date range'
            : 'Booking date'}
        </Text>

        <Text style={styles.helper}>
          Use YYYY-MM-DD. There is no
          artificial maximum future date.
        </Text>

        <View style={styles.dateInputRow}>
          <View style={styles.dateInputField}>
            <Text style={styles.fieldLabel}>
              START DATE
            </Text>

            <TextInput
              value={startDateInput}
              onChangeText={value => {
                setStartDateInput(
                  value,
                )
                resetCalculatedSchedule()
              }}
              onBlur={
                applyStartDate
              }
              placeholder="2026-10-15"
              placeholderTextColor={
                COLORS.gray
              }
              keyboardType="numbers-and-punctuation"
              maxLength={10}
              style={styles.dateInput}
            />
          </View>

          {method === 'Recurring' ? (
            <View style={styles.dateInputField}>
              <Text style={styles.fieldLabel}>
                END DATE
              </Text>

              <TextInput
                value={endDateInput}
                onChangeText={value => {
                  setEndDateInput(
                    value,
                  )
                  resetCalculatedSchedule()
                }}
                onBlur={
                  applyEndDate
                }
                placeholder="2026-11-15"
                placeholderTextColor={
                  COLORS.gray
                }
                keyboardType="numbers-and-punctuation"
                maxLength={10}
                style={styles.dateInput}
              />
            </View>
          ) : null}
        </View>

        {/* Quick date choices */}
        {method !== 'Recurring' ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={
              false
            }
            contentContainerStyle={
              styles.quickDateRow
            }
          >
            {[
              today,
              tomorrow,
              addDays(
                today,
                2,
              ),
              addDays(
                today,
                3,
              ),
              addDays(
                today,
                4,
              ),
            ].map(date => {
              const active =
                date === startDate

              return (
                <TouchableOpacity
                  key={date}
                  style={[
                    styles.quickDate,
                    active &&
                      styles.quickDateActive,
                  ]}
                  onPress={() => {
                    setStartDate(
                      date,
                    )
                    setEndDate(
                      date,
                    )
                    setStartDateInput(
                      date,
                    )
                    setEndDateInput(
                      date,
                    )

                    setSelectedWeekdays([
                      weekdayForDate(
                        date,
                      ),
                    ])

                    setOffDates([])
                    resetCalculatedSchedule()
                  }}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[
                      styles.quickDateDay,
                      active &&
                        styles.activeText,
                    ]}
                  >
                    {fromDateKey(
                      date,
                    ).toLocaleDateString(
                      'en-IN',
                      {
                        weekday:
                          'short',
                      },
                    )}
                  </Text>

                  <Text
                    style={[
                      styles.quickDateNumber,
                      active &&
                        styles.activeText,
                    ]}
                  >
                    {fromDateKey(
                      date,
                    ).getDate()}
                  </Text>

                  <Text
                    style={[
                      styles.quickDateMonth,
                      active &&
                        styles.activeText,
                    ]}
                  >
                    {fromDateKey(
                      date,
                    ).toLocaleDateString(
                      'en-IN',
                      {
                        month:
                          'short',
                      },
                    )}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </ScrollView>
        ) : null}

        {/* Recurring weekdays */}
        {method === 'Recurring' ? (
          <>
            <Text
              style={[
                styles.sectionTitle,
                styles.sectionSpacing,
              ]}
            >
              Working days
            </Text>

            <Text style={styles.helper}>
              Select any combination of
              weekdays.
            </Text>

            <View
              style={styles.weekdayRow}
            >
              {WEEKDAYS.map(day => {
                const active =
                  selectedWeekdays.includes(
                    day.value,
                  )

                return (
                  <TouchableOpacity
                    key={day.value}
                    onPress={() =>
                      toggleWeekday(
                        day.value,
                      )
                    }
                    style={[
                      styles.weekday,
                      active &&
                        styles.weekdayActive,
                    ]}
                    activeOpacity={0.85}
                  >
                    <Text
                      style={[
                        styles.weekdayText,
                        active &&
                          styles.activeText,
                      ]}
                    >
                      {day.label}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </>
        ) : null}

        {/* Working hours */}
        <Text
          style={[
            styles.sectionTitle,
            styles.sectionSpacing,
          ]}
        >
          Working hours
        </Text>

        <Text style={styles.helper}>
          Minimum booking duration is 1
          hour. Select any start and end
          time within operating hours.
        </Text>

        <View style={styles.timeRow}>
          <View style={styles.timeField}>
            <Text style={styles.fieldLabel}>
              START
            </Text>

            <TextInput
              value={startTime}
              onChangeText={value => {
                setStartTime(
                  value,
                )
                resetCalculatedSchedule()
              }}
              placeholder="09:00"
              placeholderTextColor={
                COLORS.gray
              }
              keyboardType="numbers-and-punctuation"
              maxLength={5}
              style={styles.input}
            />
          </View>

          <Text style={styles.timeSeparator}>
            →
          </Text>

          <View style={styles.timeField}>
            <Text style={styles.fieldLabel}>
              END
            </Text>

            <TextInput
              value={endTime}
              onChangeText={value => {
                setEndTime(
                  value,
                )
                resetCalculatedSchedule()
              }}
              placeholder="18:00"
              placeholderTextColor={
                COLORS.gray
              }
              keyboardType="numbers-and-punctuation"
              maxLength={5}
              style={styles.input}
            />
          </View>
        </View>

        {hours > 0 ? (
          <View style={styles.durationBadge}>
            <Text style={styles.durationBadgeText}>
              {hours === 1
                ? '1 hour'
                : `${hours} hours`}
            </Text>
          </View>
        ) : null}

        {/* Off dates */}
        {method === 'Recurring' &&
        selectableDates.length > 0 ? (
          <>
            <Text
              style={[
                styles.sectionTitle,
                styles.sectionSpacing,
              ]}
            >
              Optional off dates
            </Text>

            <Text style={styles.helper}>
              Remove individual dates without
              changing the recurring weekdays.
            </Text>

            <View style={styles.offDateList}>
              {selectableDates
                .filter(date =>
                  selectedWeekdays.includes(
                    weekdayForDate(
                      date,
                    ),
                  ),
                )
                .map(date => {
                  const off =
                    offDates.includes(
                      date,
                    )

                  return (
                    <TouchableOpacity
                      key={date}
                      onPress={() =>
                        toggleOffDate(
                          date,
                        )
                      }
                      style={[
                        styles.offDate,
                        off &&
                          styles.offDateActive,
                      ]}
                      activeOpacity={
                        0.85
                      }
                    >
                      <View
                        style={[
                          styles.checkbox,
                          off &&
                            styles.checkboxActive,
                        ]}
                      >
                        {off ? (
                          <Text
                            style={
                              styles.checkmark
                            }
                          >
                            ✓
                          </Text>
                        ) : null}
                      </View>

                      <Text
                        style={
                          styles.offDateText
                        }
                      >
                        {formatDate(
                          date,
                        )}
                      </Text>

                      <Text
                        style={[
                          styles.offDateStatus,
                          off &&
                            styles.offStatus,
                        ]}
                      >
                        {off
                          ? 'OFF'
                          : 'WORK'}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
            </View>
          </>
        ) : null}

        {/* Preview */}
        <View style={styles.previewCard}>
          <Text style={styles.previewLabel}>
            SCHEDULE PREVIEW
          </Text>

          <Text style={styles.previewTitle}>
            {previewTitle}
          </Text>

          {startTime &&
          endTime ? (
            <Text style={styles.previewTime}>
              {startTime} → {endTime}
            </Text>
          ) : (
            <Text style={styles.previewEmpty}>
              Working hours not selected
            </Text>
          )}

          {method === 'Recurring' ? (
            <Text style={styles.previewMeta}>
              {selectedWeekdays.length}{' '}
              weekday
              {selectedWeekdays.length ===
              1
                ? ''
                : 's'}{' '}
              selected
              {offDates.length > 0
                ? ` · ${offDates.length} off date${
                    offDates.length ===
                    1
                      ? ''
                      : 's'
                  }`
                : ''}
            </Text>
          ) : (
            <Text style={styles.previewMeta}>
              {method} booking
            </Text>
          )}
        </View>

        {/* Calculated schedule */}
        {schedule ? (
          <View
            style={styles.resultCard}
          >
            <Text style={styles.resultLabel}>
              SCHEDULE READY
            </Text>

            <Text style={styles.resultHours}>
              {schedule.totalWorkingHours}{' '}
              {schedule.totalWorkingHours ===
              1
                ? 'hour'
                : 'hours'}
            </Text>

            <Text style={styles.resultText}>
              {schedule.occurrences.length}{' '}
              occurrence
              {schedule.occurrences.length ===
              1
                ? ''
                : 's'}{' '}
              prepared for booking.
            </Text>

            <View style={styles.resultDivider} />

            {schedule.occurrences
              .slice(0, 5)
              .map(occurrence => (
                <View
                  key={
                    occurrence.scheduled_start
                  }
                  style={
                    styles.occurrenceRow
                  }
                >
                  <Text
                    style={
                      styles.occurrenceDate
                    }
                  >
                    {formatDate(
                      occurrence.occurrence_date,
                    )}
                  </Text>

                  <Text
                    style={
                      styles.occurrenceTime
                    }
                  >
                    {startTime} → {endTime}
                  </Text>
                </View>
              ))}

            {schedule.occurrences.length >
            5 ? (
              <Text style={styles.moreText}>
                +
                {schedule.occurrences.length -
                  5}{' '}
                more occurrence
                {schedule.occurrences.length -
                  5 ===
                1
                  ? ''
                  : 's'}
              </Text>
            ) : null}
          </View>
        ) : null}

        {/* Action */}
        <View style={styles.actions}>
          <PrimaryButton
            title={
              schedule
                ? 'Continue'
                : 'Review Schedule'
            }
            onPress={
              schedule
                ? continueToCheckout
                : reviewSchedule
            }
          />

          <Text style={styles.actionText}>
            {method === 'Instant'
              ? 'Worker availability and booking eligibility are verified by the backend when the booking is submitted.'
              : method === 'Scheduled'
                ? 'The backend rechecks service-area and worker scheduling rules when the booking is submitted.'
                : 'Each recurring occurrence is handled separately by the backend for worker assignment and pricing.'}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor:
        COLORS.light,
    },

    content: {
      padding: 22,
      paddingBottom: 48,
    },

    eyebrow: {
      color: COLORS.teal,
      fontSize: 11,
      fontWeight: '900',
      letterSpacing: 1.2,
      marginTop: 18,
      marginBottom: 8,
    },

    title: {
      color: COLORS.navy,
      fontSize: 31,
      fontWeight: '900',
      marginBottom: 8,
    },

    subtitle: {
      color: COLORS.gray,
      fontSize: 15,
      lineHeight: 22,
      marginBottom: 22,
    },

    serviceCard: {
      backgroundColor:
        COLORS.white,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      borderRadius: 20,
      padding: 18,
      marginBottom: 26,
    },

    cardLabel: {
      color: COLORS.gray,
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 1,
      marginBottom: 7,
    },

    serviceName: {
      color: COLORS.navy,
      fontSize: 21,
      fontWeight: '900',
    },

    variantName: {
      color: COLORS.teal,
      fontSize: 14,
      fontWeight: '800',
      marginTop: 4,
    },

    sectionTitle: {
      color: COLORS.navy,
      fontSize: 19,
      fontWeight: '900',
      marginBottom: 5,
    },

    sectionSpacing: {
      marginTop: 25,
    },

    helper: {
      color: COLORS.gray,
      fontSize: 12,
      lineHeight: 18,
      marginBottom: 13,
    },

    methodList: {
      gap: 10,
    },

    methodCard: {
      backgroundColor:
        COLORS.white,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      borderRadius: 18,
      padding: 14,
      flexDirection: 'row',
      alignItems: 'center',
    },

    methodCardActive: {
      backgroundColor:
        COLORS.navy,
      borderColor:
        COLORS.navy,
    },

    methodIcon: {
      width: 43,
      height: 43,
      borderRadius: 14,
      backgroundColor:
        '#EAF0F5',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },

    methodIconActive: {
      backgroundColor:
        'rgba(255,255,255,0.12)',
    },

    methodIconText: {
      fontSize: 19,
    },

    methodContent: {
      flex: 1,
    },

    methodTitle: {
      color: COLORS.navy,
      fontSize: 14,
      fontWeight: '900',
    },

    methodTitleActive: {
      color: COLORS.white,
    },

    methodText: {
      color: COLORS.gray,
      fontSize: 10.5,
      lineHeight: 16,
      marginTop: 3,
    },

    methodTextActive: {
      color: '#D7E2ED',
    },

    selectedDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor:
        COLORS.orange,
      marginLeft: 8,
    },

    infoCard: {
      backgroundColor:
        '#EAF7F6',
      borderRadius: 17,
      padding: 14,
      marginTop: 14,
      flexDirection: 'row',
      alignItems: 'flex-start',
    },

    infoIcon: {
      width: 28,
      height: 28,
      borderRadius: 10,
      backgroundColor:
        COLORS.teal,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },

    infoIconText: {
      color: COLORS.white,
      fontSize: 13,
      fontWeight: '900',
    },

    infoText: {
      flex: 1,
      color: COLORS.navy,
      fontSize: 11,
      lineHeight: 17,
      fontWeight: '600',
    },

    dateInputRow: {
      flexDirection: 'row',
      gap: 10,
    },

    dateInputField: {
      flex: 1,
    },

    fieldLabel: {
      color: COLORS.gray,
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 1,
      marginBottom: 6,
    },

    dateInput: {
      height: 54,
      backgroundColor:
        COLORS.white,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      borderRadius: 15,
      paddingHorizontal: 13,
      color: COLORS.navy,
      fontSize: 14,
      fontWeight: '800',
    },

    quickDateRow: {
      paddingVertical: 14,
      paddingRight: 8,
    },

    quickDate: {
      width: 68,
      minHeight: 84,
      backgroundColor:
        COLORS.white,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 8,
    },

    quickDateActive: {
      backgroundColor:
        COLORS.navy,
      borderColor:
        COLORS.navy,
    },

    quickDateDay: {
      color: COLORS.gray,
      fontSize: 10,
      fontWeight: '800',
    },

    quickDateNumber: {
      color: COLORS.navy,
      fontSize: 23,
      fontWeight: '900',
      marginVertical: 2,
    },

    quickDateMonth: {
      color: COLORS.gray,
      fontSize: 9,
      fontWeight: '700',
    },

    activeText: {
      color: COLORS.white,
    },

    weekdayRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },

    weekday: {
      width: 45,
      height: 45,
      borderRadius: 14,
      backgroundColor:
        COLORS.white,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      alignItems: 'center',
      justifyContent: 'center',
    },

    weekdayActive: {
      backgroundColor:
        COLORS.navy,
      borderColor:
        COLORS.navy,
    },

    weekdayText: {
      color: COLORS.navy,
      fontSize: 12,
      fontWeight: '900',
    },

    timeRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 10,
    },

    timeField: {
      flex: 1,
    },

    input: {
      height: 54,
      backgroundColor:
        COLORS.white,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      borderRadius: 15,
      paddingHorizontal: 15,
      color: COLORS.navy,
      fontSize: 18,
      fontWeight: '800',
    },

    timeSeparator: {
      color: COLORS.gray,
      fontSize: 18,
      paddingBottom: 16,
    },

    durationBadge: {
      alignSelf: 'flex-start',
      backgroundColor:
        '#E8F6F6',
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 7,
      marginTop: 10,
    },

    durationBadgeText: {
      color: COLORS.teal,
      fontSize: 11,
      fontWeight: '900',
    },

    offDateList: {
      gap: 8,
    },

    offDate: {
      minHeight: 52,
      backgroundColor:
        COLORS.white,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      borderRadius: 15,
      paddingHorizontal: 13,
      flexDirection: 'row',
      alignItems: 'center',
    },

    offDateActive: {
      opacity: 0.72,
    },

    checkbox: {
      width: 25,
      height: 25,
      borderRadius: 8,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 11,
    },

    checkboxActive: {
      backgroundColor:
        COLORS.teal,
      borderColor:
        COLORS.teal,
    },

    checkmark: {
      color: COLORS.white,
      fontSize: 14,
      fontWeight: '900',
    },

    offDateText: {
      flex: 1,
      color: COLORS.navy,
      fontSize: 13,
      fontWeight: '800',
    },

    offDateStatus: {
      color: COLORS.teal,
      fontSize: 10,
      fontWeight: '900',
    },

    offStatus: {
      color: COLORS.gray,
    },

    previewCard: {
      backgroundColor:
        '#EAF7F6',
      borderRadius: 19,
      padding: 18,
      marginTop: 25,
    },

    previewLabel: {
      color: COLORS.teal,
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 1,
    },

    previewTitle: {
      color: COLORS.navy,
      fontSize: 18,
      fontWeight: '900',
      marginTop: 7,
    },

    previewTime: {
      color: COLORS.navy,
      fontSize: 15,
      fontWeight: '800',
      marginTop: 5,
    },

    previewEmpty: {
      color: COLORS.gray,
      fontSize: 13,
      marginTop: 5,
    },

    previewMeta: {
      color: COLORS.gray,
      fontSize: 12,
      marginTop: 8,
    },

    resultCard: {
      backgroundColor:
        COLORS.navy,
      borderRadius: 19,
      padding: 19,
      marginTop: 13,
    },

    resultLabel: {
      color: '#D9E7F5',
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 1,
    },

    resultHours: {
      color: COLORS.white,
      fontSize: 29,
      fontWeight: '900',
      marginTop: 5,
    },

    resultText: {
      color: '#D9E7F5',
      fontSize: 12,
      marginTop: 4,
    },

    resultDivider: {
      height: 1,
      backgroundColor:
        'rgba(255,255,255,0.15)',
      marginVertical: 14,
    },

    occurrenceRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 6,
    },

    occurrenceDate: {
      color: COLORS.white,
      fontSize: 11,
      fontWeight: '700',
      flex: 1,
    },

    occurrenceTime: {
      color: '#D9E7F5',
      fontSize: 11,
      fontWeight: '700',
    },

    moreText: {
      color: COLORS.orange,
      fontSize: 11,
      fontWeight: '800',
      marginTop: 7,
    },

    actions: {
      marginTop: 24,
    },

    actionText: {
      color: COLORS.gray,
      fontSize: 10.5,
      lineHeight: 16,
      textAlign: 'center',
      marginTop: 10,
      paddingHorizontal: 12,
    },
  })