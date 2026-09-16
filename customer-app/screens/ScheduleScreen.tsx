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
import { supabase } from '../lib/supabase'

import Header from '../components/Header'
import PrimaryButton from '../components/PrimaryButton'

type Props =
  NativeStackScreenProps<
    RootStackParamList,
    'Schedule'
  >

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
    String(
      date.getMonth() + 1
    ).padStart(2, '0'),
    String(
      date.getDate()
    ).padStart(2, '0'),
  ].join('-')
}

function fromDateKey(value: string) {
  return new Date(
    `${value}T00:00:00`
  )
}

function addDays(
  value: string,
  amount: number
) {
  const date = fromDateKey(value)

  date.setDate(
    date.getDate() + amount
  )

  return toDateKey(date)
}

function weekdayForDate(
  value: string
) {
  return fromDateKey(value).getDay()
}

function formatDate(
  value: string
) {
  return fromDateKey(
    value
  ).toLocaleDateString(
    'en-IN',
    {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    }
  )
}

function isValidTime(
  value: string
) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(
    value
  )
}

function timeToMinutes(
  value: string
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

function dateRange(
  start: string,
  end: string
) {
  const result: string[] = []

  let current = start

  while (current <= end) {
    result.push(current)

    current = addDays(
      current,
      1
    )
  }

  return result
}

export default function ScheduleScreen({
  navigation,
}: Props) {
  const {
    selectedService,
    selectedPackage,
    selectedPackageId,
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
    []
  )

  const [startDate, setStartDate] =
    useState(today)

  const [endDate, setEndDate] =
    useState(today)

  const [startTime, setStartTime] =
    useState('')

  const [endTime, setEndTime] =
    useState('')

  const [
    selectedWeekdays,
    setSelectedWeekdays,
  ] = useState<number[]>([])

  const [offDates, setOffDates] =
    useState<string[]>([])

  const [rangeStep, setRangeStep] =
    useState<
      'start' | 'end'
    >('start')

  const [loading, setLoading] =
    useState(false)

  const [schedule, setSchedule] =
    useState<{
      totalWorkingHours: number
      occurrences: ScheduleOccurrence[]
    } | null>(null)

  const days = useMemo(() => {
    const result: string[] = []

    for (
      let index = 0;
      index < 31;
      index += 1
    ) {
      result.push(
        addDays(today, index)
      )
    }

    return result
  }, [today])

  const multiDay =
    startDate !== endDate

  const applicableWeekdays =
    useMemo(() => {
      if (!multiDay) {
        return [
          weekdayForDate(
            startDate
          ),
        ]
      }

      return selectedWeekdays
    }, [
      multiDay,
      selectedWeekdays,
      startDate,
    ])

  const selectableDates =
    useMemo(() => {
      if (!startDate || !endDate) {
        return []
      }

      if (startDate > endDate) {
        return []
      }

      return dateRange(
        startDate,
        endDate
      )
    }, [
      startDate,
      endDate,
    ])

  const toggleWeekday = (
    weekday: number
  ) => {
    setSelectedWeekdays(
      current => {
        if (
          current.includes(
            weekday
          )
        ) {
          return current.filter(
            value =>
              value !== weekday
          )
        }

        return [
          ...current,
          weekday,
        ].sort(
          (a, b) => a - b
        )
      }
    )

    setSchedule(null)
  }

  const toggleOffDate = (
    date: string
  ) => {
    setOffDates(
      current =>
        current.includes(date)
          ? current.filter(
              value =>
                value !== date
            )
          : [
              ...current,
              date,
            ].sort()
    )

    setSchedule(null)
  }

  const selectStartDate = (
    date: string
  ) => {
    if (
      rangeStep === 'start'
    ) {
      setStartDate(date)

      if (
        endDate < date
      ) {
        setEndDate(date)
      }

      setRangeStep('end')
      setOffDates([])
      setSchedule(null)

      return
    }

    if (date < startDate) {
      setStartDate(date)
      setEndDate(
        endDate < date
          ? date
          : endDate
      )
    } else {
      setEndDate(date)
    }

    setRangeStep('start')
    setOffDates([])
    setSchedule(null)
  }

  const calculateSchedule =
    async () => {
      if (
        !selectedPackageId ||
        !addressId
      ) {
        Alert.alert(
          'Booking information missing',
          'Please select a service package and service location first.'
        )

        return
      }

      if (
        !startDate ||
        !endDate
      ) {
        Alert.alert(
          'Select dates',
          'Please select a booking date.'
        )

        return
      }

      if (
        startDate > endDate
      ) {
        Alert.alert(
          'Invalid date range',
          'The end date must be on or after the start date.'
        )

        return
      }

      if (
        !isValidTime(startTime) ||
        !isValidTime(endTime)
      ) {
        Alert.alert(
          'Enter working hours',
          'Enter time using HH:MM, for example 09:00 or 18:00.'
        )

        return
      }

      if (
        timeToMinutes(
          endTime
        ) <=
        timeToMinutes(
          startTime
        )
      ) {
        Alert.alert(
          'Invalid working hours',
          'End time must be later than start time.'
        )

        return
      }

      if (
        multiDay &&
        selectedWeekdays.length === 0
      ) {
        Alert.alert(
          'Select working days',
          'Choose at least one weekday for a multi-day booking.'
        )

        return
      }

      setLoading(true)

      try {
        const {
          data,
          error,
        } =
          await supabase.rpc(
            'calculate_customer_booking_schedule',
            {
              p_service_variant_id:
                selectedPackageId,

              p_address_id:
                addressId,

              p_start_date:
                startDate,

              p_end_date:
                endDate,

              p_daily_start_time:
                startTime,

              p_daily_end_time:
                endTime,

              p_selected_weekdays:
                applicableWeekdays,

              p_off_dates:
                offDates,
            }
          )

        if (error) {
          throw error
        }

        const result =
          data as {
            total_working_hours?: number
            occurrences?: ScheduleOccurrence[]
          }

        const occurrences =
          Array.isArray(
            result?.occurrences
          )
            ? result.occurrences
            : []

        const totalWorkingHours =
          Number(
            result?.total_working_hours ??
              0
          )

        if (
          occurrences.length === 0 ||
          totalWorkingHours <= 0
        ) {
          Alert.alert(
            'No working dates',
            'The selected schedule does not contain any working dates.'
          )

          setSchedule(null)

          return
        }

        setSchedule({
          totalWorkingHours,
          occurrences,
        })
      } catch (error) {
        console.error(
          '[TempStaff] Schedule calculation failed:',
          error
        )

        Alert.alert(
          'Schedule unavailable',
          'Unable to calculate this schedule right now. Please try again.'
        )
      } finally {
        setLoading(false)
      }
    }

  const continueToCheckout =
    () => {
      if (!schedule) {
        Alert.alert(
          'Review schedule',
          'Please calculate and review your schedule before continuing.'
        )

        return
      }

      setBookingMode(
        bookingMode === 'Recurring'
          ? 'Recurring'
          : 'Scheduled'
      )

      setScheduleStartDate(
        startDate
      )

      setScheduleEndDate(
        endDate
      )

      setScheduleDailyStartTime(
        startTime
      )

      setScheduleDailyEndTime(
        endTime
      )

      setScheduleSelectedWeekdays(
        applicableWeekdays
      )

      setScheduleOffDates(
        offDates
      )

      setScheduleTotalWorkingHours(
        schedule.totalWorkingHours
      )

      setScheduleOccurrences(
        schedule.occurrences
      )

      setScheduledDate(
        schedule.occurrences[0]
          ?.scheduled_start ?? ''
      )

      navigation.navigate(
        'Checkout'
      )
    }

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
          {bookingMode === 'Recurring'
            ? 'RECURRING BOOKING'
            : 'SCHEDULED BOOKING'}
        </Text>

        <Text style={styles.title}>
          Plan your service
        </Text>

        <Text
          style={styles.subtitle}
        >
          Choose the date and working
          hours that fit your schedule.
        </Text>

        <View style={styles.serviceCard}>
          <Text style={styles.cardLabel}>
            SERVICE
          </Text>

          <Text style={styles.serviceName}>
            {selectedService ||
              'Staff service'}
          </Text>

          <Text style={styles.packageName}>
            {selectedPackage?.name ||
              'Staffing package'}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>
          Select date
        </Text>

        <Text style={styles.helper}>
          Tap once for a single day.
          Tap again to create a date
          range.
        </Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={
            false
          }
          contentContainerStyle={
            styles.dateRow
          }
        >
          {days.map(date => {
            const active =
              date >= startDate &&
              date <= endDate

            const first =
              date === startDate

            const last =
              date === endDate

            return (
              <TouchableOpacity
                key={date}
                onPress={() =>
                  selectStartDate(
                    date
                  )
                }
                style={[
                  styles.dateCard,
                  active &&
                    styles.dateCardActive,
                  first &&
                    styles.dateCardFirst,
                  last &&
                    styles.dateCardLast,
                ]}
                activeOpacity={0.85}
              >
                <Text
                  style={[
                    styles.dateWeekday,
                    active &&
                      styles.activeText,
                  ]}
                >
                  {fromDateKey(
                    date
                  ).toLocaleDateString(
                    'en-IN',
                    {
                      weekday: 'short',
                    }
                  )}
                </Text>

                <Text
                  style={[
                    styles.dateNumber,
                    active &&
                      styles.activeText,
                  ]}
                >
                  {fromDateKey(
                    date
                  ).getDate()}
                </Text>

                <Text
                  style={[
                    styles.dateMonth,
                    active &&
                      styles.activeText,
                  ]}
                >
                  {fromDateKey(
                    date
                  ).toLocaleDateString(
                    'en-IN',
                    {
                      month: 'short',
                    }
                  )}
                </Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>

        {multiDay ? (
          <>
            <Text
              style={[
                styles.sectionTitle,
                styles.sectionSpacing,
              ]}
            >
              Working days
            </Text>

            <Text
              style={styles.helper}
            >
              Select any weekdays you
              need. There are no fixed
              weekly days.
            </Text>

            <View
              style={styles.weekdayRow}
            >
              {WEEKDAYS.map(day => {
                const active =
                  selectedWeekdays.includes(
                    day.value
                  )

                return (
                  <TouchableOpacity
                    key={day.value}
                    onPress={() =>
                      toggleWeekday(
                        day.value
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

        <Text
          style={[
            styles.sectionTitle,
            styles.sectionSpacing,
          ]}
        >
          Working hours
        </Text>

        <Text
          style={styles.helper}
        >
          Enter the working hours for
          each selected working date.
        </Text>

        <View
          style={styles.timeRow}
        >
          <View
            style={styles.timeField}
          >
            <Text
              style={styles.fieldLabel}
            >
              START
            </Text>

            <TextInput
              value={startTime}
              onChangeText={value => {
                setStartTime(value)
                setSchedule(null)
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

          <Text
            style={styles.timeSeparator}
          >
            →
          </Text>

          <View
            style={styles.timeField}
          >
            <Text
              style={styles.fieldLabel}
            >
              END
            </Text>

            <TextInput
              value={endTime}
              onChangeText={value => {
                setEndTime(value)
                setSchedule(null)
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

        {multiDay &&
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

            <Text
              style={styles.helper}
            >
              Tap any selected working
              date to remove it from this
              booking.
            </Text>

            <View
              style={styles.offDateList}
            >
              {selectableDates
                .filter(date =>
                  applicableWeekdays.includes(
                    weekdayForDate(
                      date
                    )
                  )
                )
                .map(date => {
                  const off =
                    offDates.includes(
                      date
                    )

                  return (
                    <TouchableOpacity
                      key={date}
                      onPress={() =>
                        toggleOffDate(
                          date
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
                          date
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

        <View
          style={styles.previewCard}
        >
          <Text
            style={styles.previewLabel}
          >
            SCHEDULE PREVIEW
          </Text>

          <Text
            style={styles.previewTitle}
          >
            {formatDate(startDate)}
            {multiDay
              ? ` → ${formatDate(
                  endDate
                )}`
              : ''}
          </Text>

          {startTime &&
          endTime ? (
            <Text
              style={styles.previewTime}
            >
              {startTime} → {endTime}
            </Text>
          ) : (
            <Text
              style={styles.previewEmpty}
            >
              Working hours not selected
            </Text>
          )}

          {multiDay ? (
            <Text
              style={styles.previewMeta}
            >
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
            <Text
              style={styles.previewMeta}
            >
              Single-day booking
            </Text>
          )}
        </View>

        {schedule ? (
          <View
            style={styles.resultCard}
          >
            <Text
              style={styles.resultLabel}
            >
              CALCULATED SCHEDULE
            </Text>

            <Text
              style={styles.resultHours}
            >
              {schedule.totalWorkingHours}{' '}
              hours
            </Text>

            <Text
              style={styles.resultText}
            >
              {schedule.occurrences.length}{' '}
              working date
              {schedule.occurrences.length ===
              1
                ? ''
                : 's'}{' '}
              will be created.
            </Text>
          </View>
        ) : null}

        <View
          style={styles.actions}
        >
          <PrimaryButton
            title={
              loading
                ? 'Calculating...'
                : schedule
                  ? 'Continue'
                  : 'Review Schedule'
            }
            onPress={
              schedule
                ? continueToCheckout
                : calculateSchedule
            }
            disabled={loading}
          />
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
      backgroundColor: 'white',
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

    packageName: {
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

    dateRow: {
      paddingVertical: 4,
      paddingRight: 8,
    },

    dateCard: {
      width: 68,
      minHeight: 91,
      backgroundColor:
        'white',
      borderWidth: 1,
      borderColor:
        COLORS.border,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 9,
    },

    dateCardActive: {
      backgroundColor:
        COLORS.navy,
      borderColor:
        COLORS.navy,
    },

    dateCardFirst: {
      borderWidth: 2,
    },

    dateCardLast: {
      borderWidth: 2,
    },

    dateWeekday: {
      color: COLORS.gray,
      fontSize: 11,
      fontWeight: '800',
    },

    dateNumber: {
      color: COLORS.navy,
      fontSize: 25,
      fontWeight: '900',
      marginVertical: 2,
    },

    dateMonth: {
      color: COLORS.gray,
      fontSize: 10,
      fontWeight: '700',
    },

    activeText: {
      color: 'white',
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
        'white',
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

    fieldLabel: {
      color: COLORS.gray,
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 1,
      marginBottom: 6,
    },

    input: {
      height: 54,
      backgroundColor:
        'white',
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

    offDateList: {
      gap: 8,
    },

    offDate: {
      minHeight: 52,
      backgroundColor:
        'white',
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
      color: 'white',
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
      color: 'white',
      fontSize: 29,
      fontWeight: '900',
      marginTop: 5,
    },

    resultText: {
      color: '#D9E7F5',
      fontSize: 12,
      marginTop: 4,
    },

    actions: {
      marginTop: 24,
    },
  })