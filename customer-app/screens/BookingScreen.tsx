import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'

import DateTimePicker from '@react-native-community/datetimepicker'
import MapView, {
  Marker,
  Region,
} from 'react-native-maps'

import {
  NativeStackScreenProps,
} from '@react-navigation/native-stack'

import {
  COLORS,
} from '../constants/theme'

import {
  RootStackParamList,
} from '../types'

import {
  useBooking,
} from '../context/BookingContext'

import {
  checkServiceAvailability,
} from '../services/availability'

import {
  calculateBookingPrice,
  calculateRecurringOccurrencePrice,
  getNearTermScheduledSlots,
} from '../services/booking'

type Props =
  NativeStackScreenProps<
    RootStackParamList,
    'Booking'
  >

type Mode =
  | 'Instant'
  | 'Scheduled'
  | 'Recurring'

type PickerMode =
  | 'date'
  | 'startTime'
  | 'endTime'
  | 'scheduleStartDate'
  | 'scheduleEndDate'

type Slot = {
  start: string
  end: string
  label?: string
}

const WEEKDAYS = [
  {
    key: 0,
    label: 'Sun',
  },
  {
    key: 1,
    label: 'Mon',
  },
  {
    key: 2,
    label: 'Tue',
  },
  {
    key: 3,
    label: 'Wed',
  },
  {
    key: 4,
    label: 'Thu',
  },
  {
    key: 5,
    label: 'Fri',
  },
  {
    key: 6,
    label: 'Sat',
  },
]

const MIN_HOURS = 1
const MAX_HOURS = 24

const pad = (value: number) =>
  String(value).padStart(2, '0')

const formatDate = (
  date: Date | null
) => {
  if (!date) return ''

  return `${pad(
    date.getDate()
  )}/${pad(
    date.getMonth() + 1
  )}/${date.getFullYear()}`
}

const formatDateLong = (
  date: Date | null
) => {
  if (!date) return ''

  return date.toLocaleDateString(
    'en-IN',
    {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }
  )
}

const formatTime = (
  date: Date | null
) => {
  if (!date) return ''

  return date.toLocaleTimeString(
    'en-IN',
    {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }
  )
}

const timeToMinutes = (
  date: Date
) =>
  date.getHours() * 60 +
  date.getMinutes()

const dateKey = (
  date: Date
) =>
  `${date.getFullYear()}-${pad(
    date.getMonth() + 1
  )}-${pad(date.getDate())}`

const parseDateKey = (
  value: string
) => {
  const [
    year,
    month,
    day,
  ] = value
    .split('-')
    .map(Number)

  return new Date(
    year,
    month - 1,
    day
  )
}

const addDays = (
  date: Date,
  amount: number
) => {
  const result =
    new Date(date)

  result.setDate(
    result.getDate() + amount
  )

  return result
}

const calculateHours = (
  start: Date | null,
  end: Date | null
) => {
  if (!start || !end) {
    return 0
  }

  const minutes =
    timeToMinutes(end) -
    timeToMinutes(start)

  if (minutes <= 0) {
    return 0
  }

  return minutes / 60
}

const makeDateWithTime = (
  date: Date,
  time: Date
) => {
  const result =
    new Date(date)

  result.setHours(
    time.getHours(),
    time.getMinutes(),
    0,
    0
  )

  return result
}

const currency = (
  value: number | null | undefined,
  code = 'INR'
) => {
  if (
    value === null ||
    value === undefined ||
    Number.isNaN(value)
  ) {
    return '--'
  }

  try {
    return new Intl.NumberFormat(
      'en-IN',
      {
        style: 'currency',
        currency: code,
        maximumFractionDigits: 2,
      }
    ).format(value)
  } catch {
    return `₹${value.toFixed(2)}`
  }
}

export default function BookingScreen({
  navigation,
}: Props) {
  const {
    selectedService,
    selectedServiceId,
    selectedVariantId,
    setSelectedVariantId,
    selectedVariant,
    hourlyVariants,

    bookingMode,
    setBookingMode,

    scheduledDate,
    setScheduledDate,

    scheduleStartDate,
    setScheduleStartDate,

    scheduleEndDate,
    setScheduleEndDate,

    scheduleDailyStartTime,
    setScheduleDailyStartTime,

    scheduleDailyEndTime,
    setScheduleDailyEndTime,

    scheduleSelectedWeekdays,
    setScheduleSelectedWeekdays,

    scheduleOffDates,
    setScheduleOffDates,

    scheduleTotalWorkingHours,
    setScheduleTotalWorkingHours,

    address,
    addressId,
    coordinates,
    setAddress,
    setAddressId,
    setCoordinates,

    bookingPricing,
    pricingLoading,
    pricingError,

    refreshCatalogue,
  } = useBooking()

  const [variantId, setVariantId] =
    useState(
      selectedVariantId || ''
    )

  const [durationHours, setDurationHours] =
    useState(2)

  const [startTime, setStartTime] =
    useState<Date | null>(null)

  const [endTime, setEndTime] =
    useState<Date | null>(null)

  const [picker, setPicker] =
    useState<PickerMode | null>(
      null
    )

  const [slots, setSlots] =
    useState<Slot[]>([])

  const [slotsLoading, setSlotsLoading] =
    useState(false)

  const [slotsError, setSlotsError] =
    useState<string | null>(null)

  const [availabilityLoading, setAvailabilityLoading] =
    useState(false)

  const [serviceAvailable, setServiceAvailable] =
    useState<boolean | null>(null)

  const [availableWorkers, setAvailableWorkers] =
    useState(0)

  const [notes, setNotes] =
    useState('')

  const [manualAddress, setManualAddress] =
    useState(
      address || ''
    )

  const [offDateInput, setOffDateInput] =
    useState<Date | null>(null)

  const [savingAddress, setSavingAddress] =
    useState(false)

  /*
   * --------------------------------------------------
   * INITIAL DATA
   * --------------------------------------------------
   */

  useEffect(() => {
    refreshCatalogue()
  }, [
    refreshCatalogue,
  ])

  /*
   * Keep local variant and BookingContext
   * synchronized.
   */
  useEffect(() => {
    if (
      selectedVariantId &&
      selectedVariantId !== variantId
    ) {
      setVariantId(
        selectedVariantId
      )
    }
  }, [
    selectedVariantId,
  ])

  useEffect(() => {
    if (
      variantId !== selectedVariantId
    ) {
      setSelectedVariantId(
        variantId
      )
    }
  }, [
    variantId,
    selectedVariantId,
    setSelectedVariantId,
  ])

  /*
   * Select the first variant automatically
   * if the service has variants and none
   * has been selected yet.
   */
  useEffect(() => {
    if (
      variantId ||
      hourlyVariants.length === 0
    ) {
      return
    }

    const first =
      hourlyVariants[0]

    if (first?.id) {
      setVariantId(first.id)
      setSelectedVariantId(
        first.id
      )
    }
  }, [
    hourlyVariants,
    variantId,
    setSelectedVariantId,
  ])

  /*
   * --------------------------------------------------
   * DERIVED DATA
   * --------------------------------------------------
   */

  const selectedVariantLocal =
    useMemo(() => {
      if (
        selectedVariant &&
        selectedVariant.id ===
          variantId
      ) {
        return selectedVariant
      }

      return hourlyVariants.find(
        item =>
          item.id === variantId
      )
    }, [
      selectedVariant,
      hourlyVariants,
      variantId,
    ])

  const currentMode =
    bookingMode as Mode

  const scheduledHours =
    useMemo(
      () =>
        calculateHours(
          startTime,
          endTime
        ),
      [
        startTime,
        endTime,
      ]
    )

  const recurringDailyHours =
    useMemo(
      () =>
        calculateHours(
          scheduleDailyStartTime
            ? new Date(
                scheduleDailyStartTime
              )
            : null,
          scheduleDailyEndTime
            ? new Date(
                scheduleDailyEndTime
              )
            : null
        ),
      [
        scheduleDailyStartTime,
        scheduleDailyEndTime,
      ]
    )

  const recurringDays =
    useMemo(() => {
      if (
        !scheduleStartDate ||
        !scheduleEndDate
      ) {
        return []
      }

      const start =
        new Date(
          scheduleStartDate
        )

      const end =
        new Date(
          scheduleEndDate
        )

      start.setHours(
        0,
        0,
        0,
        0
      )

      end.setHours(
        0,
        0,
        0,
        0
      )

      if (
        end.getTime() <
        start.getTime()
      ) {
        return []
      }

      const selected =
        new Set(
          scheduleSelectedWeekdays
        )

      const offDates =
        new Set(
          scheduleOffDates
        )

      const result: Date[] =
        []

      let cursor =
        new Date(start)

      while (
        cursor.getTime() <=
        end.getTime()
      ) {
        if (
          selected.has(
            cursor.getDay()
          ) &&
          !offDates.has(
            dateKey(cursor)
          )
        ) {
          result.push(
            new Date(cursor)
          )
        }

        cursor = addDays(
          cursor,
          1
        )
      }

      return result
    }, [
      scheduleStartDate,
      scheduleEndDate,
      scheduleSelectedWeekdays,
      scheduleOffDates,
    ])

  const calculatedRecurringHours =
    recurringDays.length *
    recurringDailyHours

  /*
   * --------------------------------------------------
   * DEFAULT TIMES
   * --------------------------------------------------
   */

  useEffect(() => {
    if (
      startTime &&
      endTime
    ) {
      return
    }

    const now =
      new Date()

    /*
     * Round current time up to the next
     * 30-minute boundary.
     */
    const minutes =
      now.getMinutes()

    const rounded =
      Math.ceil(
        minutes / 30
      ) * 30

    now.setMinutes(
      rounded,
      0,
      0
    )

    const end =
      new Date(now)

    end.setMinutes(
      end.getMinutes() +
        durationHours * 60
    )

    setStartTime(now)
    setEndTime(end)
  }, [
    startTime,
    endTime,
    durationHours,
  ])

  /*
   * --------------------------------------------------
   * MODE
   * --------------------------------------------------
   */

  const changeMode = (
    mode: Mode
  ) => {
    setBookingMode(mode)

    if (
      mode === 'Instant'
    ) {
      const now =
        new Date()

      const minutes =
        now.getMinutes()

      const rounded =
        Math.ceil(
          minutes / 30
        ) * 30

      now.setMinutes(
        rounded,
        0,
        0
      )

      const end =
        new Date(now)

      end.setMinutes(
        end.getMinutes() +
          durationHours * 60
      )

      setStartTime(now)
      setEndTime(end)

      if (!scheduledDate) {
        setScheduledDate(
          new Date()
        )
      }
    }

    if (
      mode === 'Scheduled'
    ) {
      if (!scheduledDate) {
        setScheduledDate(
          new Date()
        )
      }
    }

    if (
      mode === 'Recurring'
    ) {
      if (!scheduleStartDate) {
        setScheduleStartDate(
          new Date()
        )
      }

      if (!scheduleEndDate) {
        setScheduleEndDate(
          addDays(
            new Date(),
            6
          )
        )
      }

      if (
        scheduleSelectedWeekdays.length ===
        0
      ) {
        setScheduleSelectedWeekdays(
          [
            1,
            2,
            3,
            4,
            5,
          ]
        )
      }

      if (
        !scheduleDailyStartTime
      ) {
        const start =
          new Date()

        start.setHours(
          9,
          0,
          0,
          0
        )

        setScheduleDailyStartTime(
          start
        )
      }

      if (
        !scheduleDailyEndTime
      ) {
        const end =
          new Date()

        end.setHours(
          17,
          0,
          0,
          0
        )

        setScheduleDailyEndTime(
          end
        )
      }
    }
  }

  /*
   * --------------------------------------------------
   * DURATION
   * --------------------------------------------------
   */

  const changeDuration = (
    amount: number
  ) => {
    const next =
      Math.min(
        MAX_HOURS,
        Math.max(
          MIN_HOURS,
          durationHours +
            amount
        )
      )

    setDurationHours(
      next
    )

    if (startTime) {
      const end =
        new Date(
          startTime
        )

      end.setMinutes(
        end.getMinutes() +
          next * 60
      )

      setEndTime(end)
    }
  }

  /*
   * --------------------------------------------------
   * DATE/TIME PICKER
   * --------------------------------------------------
   */

  const openPicker = (
    type: PickerMode
  ) => {
    setPicker(type)
  }

  const getPickerValue =
    () => {
      if (
        picker === 'date'
      ) {
        return (
          scheduledDate ||
          new Date()
        )
      }

      if (
        picker ===
        'startTime'
      ) {
        return (
          startTime ||
          new Date()
        )
      }

      if (
        picker ===
        'endTime'
      ) {
        return (
          endTime ||
          new Date()
        )
      }

      if (
        picker ===
        'scheduleStartDate'
      ) {
        return (
          scheduleStartDate ||
          new Date()
        )
      }

      if (
        picker ===
        'scheduleEndDate'
      ) {
        return (
          scheduleEndDate ||
          addDays(
            new Date(),
            6
          )
        )
      }

      return new Date()
    }

  const handlePickerChange = (
    _event: unknown,
    value?: Date
  ) => {
    if (!value) {
      setPicker(null)
      return
    }

    if (
      picker === 'date'
    ) {
      setScheduledDate(
        value
      )
    }

    if (
      picker === 'startTime'
    ) {
      setStartTime(value)

      if (
        endTime &&
        timeToMinutes(value) >=
          timeToMinutes(endTime)
      ) {
        const nextEnd =
          new Date(value)

        nextEnd.setMinutes(
          nextEnd.getMinutes() +
            durationHours * 60
        )

        setEndTime(
          nextEnd
        )
      }
    }

    if (
      picker === 'endTime'
    ) {
      setEndTime(value)
    }

    if (
      picker ===
      'scheduleStartDate'
    ) {
      setScheduleStartDate(
        value
      )

      if (
        scheduleEndDate &&
        scheduleEndDate <
          value
      ) {
        setScheduleEndDate(
          value
        )
      }
    }

    if (
      picker ===
      'scheduleEndDate'
    ) {
      if (
        scheduleStartDate &&
        value <
          scheduleStartDate
      ) {
        Alert.alert(
          'Invalid date',
          'End date must be on or after the start date.'
        )

        setPicker(null)
        return
      }

      setScheduleEndDate(
        value
      )
    }

    setPicker(null)
  }

  /*
   * --------------------------------------------------
   * SCHEDULED SLOTS
   * --------------------------------------------------
   */

  const loadSlots =
    useCallback(
      async () => {
        if (
          currentMode !==
            'Scheduled' ||
          !variantId ||
          !addressId
        ) {
          setSlots([])
          return
        }

        setSlotsLoading(true)
        setSlotsError(null)

        try {
          const result =
            await getNearTermScheduledSlots(
              variantId,
              addressId
            )

          setSlots(
            (result || []) as Slot[]
          )
        } catch (
          error
        ) {
          console.error(
            '[TempStaff] Failed to load slots:',
            error
          )

          setSlots([])
          setSlotsError(
            'Unable to load available slots.'
          )
        } finally {
          setSlotsLoading(
            false
          )
        }
      },
      [
        currentMode,
        variantId,
        addressId,
      ]
    )

  useEffect(() => {
    loadSlots()
  }, [
    loadSlots,
  ])

  /*
   * --------------------------------------------------
   * AVAILABILITY
   * --------------------------------------------------
   */

  const checkAvailability =
    useCallback(
      async () => {
        if (
          !selectedServiceId ||
          !coordinates
        ) {
          setServiceAvailable(
            null
          )
          return
        }

        setAvailabilityLoading(
          true
        )

        try {
          const result =
            await checkServiceAvailability(
              selectedServiceId,
              coordinates.latitude,
              coordinates.longitude
            )

          setServiceAvailable(
            result.service_area_covered
          )

          setAvailableWorkers(
            result.available_workers ||
              0
          )
        } catch (
          error
        ) {
          console.error(
            '[TempStaff] Booking availability error:',
            error
          )

          setServiceAvailable(
            false
          )

          setAvailableWorkers(
            0
          )
        } finally {
          setAvailabilityLoading(
            false
          )
        }
      },
      [
        selectedServiceId,
        coordinates,
      ]
    )

  useEffect(() => {
    checkAvailability()
  }, [
    checkAvailability,
  ])

  /*
   * --------------------------------------------------
   * RECURRING DAYS
   * --------------------------------------------------
   */

  const toggleWeekday = (
    weekday: number
  ) => {
    const current =
      new Set(
        scheduleSelectedWeekdays
      )

    if (
      current.has(weekday)
    ) {
      current.delete(
        weekday
      )
    } else {
      current.add(
        weekday
      )
    }

    setScheduleSelectedWeekdays(
      Array.from(
        current
      ).sort(
        (a, b) =>
          a - b
      )
    )
  }

  /*
   * --------------------------------------------------
   * OFF DATES
   * --------------------------------------------------
   */

  const addOffDate = () => {
    if (
      !offDateInput
    ) {
      return
    }

    if (
      scheduleStartDate &&
      offDateInput <
        scheduleStartDate
    ) {
      Alert.alert(
        'Invalid date',
        'The off-date must fall inside the recurring date range.'
      )

      return
    }

    if (
      scheduleEndDate &&
      offDateInput >
        scheduleEndDate
    ) {
      Alert.alert(
        'Invalid date',
        'The off-date must fall inside the recurring date range.'
      )

      return
    }

    const key =
      dateKey(
        offDateInput
      )

    if (
      scheduleOffDates.includes(
        key
      )
    ) {
      setOffDateInput(null)
      return
    }

    setScheduleOffDates([
      ...scheduleOffDates,
      key,
    ])

    setOffDateInput(null)
  }

  const removeOffDate = (
    value: string
  ) => {
    setScheduleOffDates(
      scheduleOffDates.filter(
        date =>
          date !== value
      )
    )
  }

  /*
   * --------------------------------------------------
   * LOCATION
   * --------------------------------------------------
   */

  const openLocation =
    () => {
      navigation.navigate(
        'ManualLocation'
      )
    }

  /*
   * ManualLocation should return coordinates/address
   * through route params. This screen also accepts
   * those values when the screen remounts.
   *
   * If your ManualLocation screen uses a different
   * route-param shape, keep its existing shape and
   * map it here.
   */

  /*
   * --------------------------------------------------
   * PRICING
   * --------------------------------------------------
   */

  const [pricePreview, setPricePreview] =
    useState<
      {
        total: number
        currency: string
      } | null
    >(null)

  const [priceLoadingLocal, setPriceLoadingLocal] =
    useState(false)

  const requestPrice =
    useCallback(
      async () => {
        if (
          !variantId
        ) {
          setPricePreview(
            null
          )

          return
        }

        const hours =
          currentMode ===
          'Recurring'
            ? calculatedRecurringHours
            : currentMode ===
                'Scheduled'
              ? scheduledHours
              : durationHours

        if (
          hours <= 0
        ) {
          setPricePreview(
            null
          )

          return
        }

        setPriceLoadingLocal(
          true
        )

        try {
          if (
            currentMode ===
            'Recurring'
          ) {
            const result =
              await calculateRecurringOccurrencePrice(
                {
                  serviceVariantId:
                    variantId,
                  occurrenceHours:
                    recurringDailyHours,
                  commitmentDays:
                    recurringDays.length,
                }
              )

            if (result) {
              const total =
                Number(
                  result.total_price ??
                    result.total ??
                    result.amount ??
                    0
                )

              const currencyCode =
                result.currency ||
                'INR'

              setPricePreview({
                total,
                currency:
                  currencyCode,
              })
            }
          } else {
            const result =
              await calculateBookingPrice(
                {
                  serviceVariantId:
                    variantId,
                  totalWorkingHours:
                    hours,
                }
              )

            if (result) {
              const total =
                Number(
                  result.total_price ??
                    result.total ??
                    result.amount ??
                    0
                )

              const currencyCode =
                result.currency ||
                'INR'

              setPricePreview({
                total,
                currency:
                  currencyCode,
              })
            }
          }
        } catch (
          error
        ) {
          console.error(
            '[TempStaff] Pricing preview failed:',
            error
          )

          setPricePreview(
            null
          )
        } finally {
          setPriceLoadingLocal(
            false
          )
        }
      },
      [
        variantId,
        currentMode,
        calculatedRecurringHours,
        scheduledHours,
        durationHours,
        recurringDailyHours,
        recurringDays.length,
      ]
    )

  useEffect(() => {
    requestPrice()
  }, [
    requestPrice,
  ])

  /*
   * --------------------------------------------------
   * VALIDATION
   * --------------------------------------------------
   */

  const validationError =
    useMemo(() => {
      if (
        !selectedService
      ) {
        return 'Please select a service.'
      }

      if (
        !selectedServiceId
      ) {
        return 'The selected service is missing.'
      }

      if (
        !variantId
      ) {
        return 'Please select a service option.'
      }

      if (
        !coordinates
      ) {
        return 'Please select your service location.'
      }

      if (
        serviceAvailable ===
        false
      ) {
        return 'This service is not available at the selected location.'
      }

      if (
        currentMode ===
        'Scheduled'
      ) {
        if (
          !scheduledDate
        ) {
          return 'Please select a booking date.'
        }

        if (
          !startTime ||
          !endTime
        ) {
          return 'Please select a start and end time.'
        }

        if (
          scheduledHours <= 0
        ) {
          return 'End time must be after start time.'
        }
      }

      if (
        currentMode ===
        'Recurring'
      ) {
        if (
          !scheduleStartDate ||
          !scheduleEndDate
        ) {
          return 'Please select the recurring date range.'
        }

        if (
          scheduleEndDate <
          scheduleStartDate
        ) {
          return 'Recurring end date must be after the start date.'
        }

        if (
          scheduleSelectedWeekdays.length ===
          0
        ) {
          return 'Select at least one recurring day.'
        }

        if (
          recurringDailyHours <=
          0
        ) {
          return 'Please select valid recurring start and end times.'
        }

        if (
          recurringDays.length ===
          0
        ) {
          return 'No working dates remain after applying the selected days and off-dates.'
        }
      }

      return null
    }, [
      selectedService,
      selectedServiceId,
      variantId,
      coordinates,
      serviceAvailable,
      currentMode,
      scheduledDate,
      startTime,
      endTime,
      scheduledHours,
      scheduleStartDate,
      scheduleEndDate,
      scheduleSelectedWeekdays,
      recurringDailyHours,
      recurringDays.length,
    ])

  const canContinue =
    !validationError &&
    !pricingLoading &&
    !priceLoadingLocal &&
    !availabilityLoading &&
    !savingAddress

  /*
   * --------------------------------------------------
   * CONTINUE
   * --------------------------------------------------
   */

  const handleContinue =
    () => {
      if (
        validationError
      ) {
        Alert.alert(
          'Complete booking details',
          validationError
        )

        return
      }

      /*
       * Keep recurring total working hours
       * in BookingContext so Summary and
       * booking creation can use it.
       */
      if (
        currentMode ===
        'Recurring'
      ) {
        setScheduleTotalWorkingHours(
          calculatedRecurringHours
        )
      }

      /*
       * Do not create the booking here.
       *
       * Booking -> Summary
       * Summary -> Payment
       *
       * Payment is the booking/payment boundary.
       */
      navigation.navigate(
        'Summary'
      )
    }

  /*
   * --------------------------------------------------
   * UI HELPERS
   * --------------------------------------------------
   */

  const renderMode =
    (
      mode: Mode,
      label: string,
      description: string
    ) => (
      <Pressable
        onPress={() =>
          changeMode(mode)
        }
        style={[
          styles.modeItem,
          currentMode === mode
            ? styles.modeItemActive
            : null,
        ]}
      >
        <Text
          style={[
            styles.modeLabel,
            currentMode === mode
              ? styles.modeLabelActive
              : null,
          ]}
        >
          {label}
        </Text>

        <Text
          style={[
            styles.modeDescription,
            currentMode === mode
              ? styles.modeDescriptionActive
              : null,
          ]}
        >
          {description}
        </Text>
      </Pressable>
    )

  const renderField = (
    label: string,
    value: string,
    onPress: () => void,
    disabled = false
  ) => (
    <TouchableOpacity
      style={[
        styles.field,
        disabled
          ? styles.fieldDisabled
          : null,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
    >
      <Text
        style={
          styles.fieldLabel
        }
      >
        {label}
      </Text>

      <Text
        style={[
          styles.fieldValue,
          !value
            ? styles.fieldPlaceholder
            : null,
        ]}
      >
        {value ||
          'Select'}
      </Text>

      <Text
        style={
          styles.fieldArrow
        }
      >
        ›
      </Text>
    </TouchableOpacity>
  )

  /*
   * --------------------------------------------------
   * RENDER
   * --------------------------------------------------
   */

  return (
    <SafeAreaView
      style={styles.container}
    >
      <View
        style={styles.header}
      >
        <TouchableOpacity
          style={
            styles.backButton
          }
          onPress={() =>
            navigation.goBack()
          }
          activeOpacity={0.8}
        >
          <Text
            style={
              styles.backText
            }
          >
            ‹
          </Text>
        </TouchableOpacity>

        <View
          style={
            styles.headerCenter
          }
        >
          <Text
            style={
              styles.headerEyebrow
            }
          >
            BOOKING
          </Text>

          <Text
            style={
              styles.headerTitle
            }
          >
            Configure your booking
          </Text>
        </View>

        <View
          style={
            styles.headerSpacer
          }
        />
      </View>

      <ScrollView
        style={
          styles.scroll
        }
        contentContainerStyle={
          styles.content
        }
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={
          false
        }
      >
        {/* SERVICE */}

        <View
          style={
            styles.serviceBanner
          }
        >
          <View
            style={
              styles.serviceBadge
            }
          >
            <Text
              style={
                styles.serviceBadgeText
              }
            >
              {selectedService
                ?.charAt(0)
                .toUpperCase() ||
                'S'}
            </Text>
          </View>

          <View
            style={
              styles.serviceBannerContent
            }
          >
            <Text
              style={
                styles.smallLabel
              }
            >
              SELECTED SERVICE
            </Text>

            <Text
              style={
                styles.serviceBannerTitle
              }
              numberOfLines={2}
            >
              {selectedService ||
                'No service selected'}
            </Text>
          </View>

          <TouchableOpacity
            onPress={() =>
              navigation.goBack()
            }
            activeOpacity={0.8}
          >
            <Text
              style={
                styles.changeText
              }
            >
              Change
            </Text>
          </TouchableOpacity>
        </View>

        {/* BOOKING TYPE */}

        <View
          style={
            styles.section
          }
        >
          <Text
            style={
              styles.sectionTitle
            }
          >
            Booking type
          </Text>

          <Text
            style={
              styles.sectionHint
            }
          >
            Choose how you want the
            staff service scheduled.
          </Text>

          <View
            style={
              styles.modeContainer
            }
          >
            {renderMode(
              'Instant',
              'Instant',
              'As soon as available'
            )}

            {renderMode(
              'Scheduled',
              'Scheduled',
              'Choose a date & time'
            )}

            {renderMode(
              'Recurring',
              'Recurring',
              'Repeat on selected days'
            )}
          </View>
        </View>

        {/* SERVICE OPTION */}

        <View
          style={
            styles.section
          }
        >
          <Text
            style={
              styles.sectionTitle
            }
          >
            Service option
          </Text>

          <Text
            style={
              styles.sectionHint
            }
          >
            Select the available staff
            service option.
          </Text>

          {hourlyVariants.length ===
          0 ? (
            <View
              style={
                styles.infoCard
              }
            >
              <Text
                style={
                  styles.infoText
                }
              >
                No service options are
                currently available.
              </Text>
            </View>
          ) : (
            <View
              style={
                styles.variantList
              }
            >
              {hourlyVariants.map(
                variant => {
                  const selected =
                    variant.id ===
                    variantId

                  return (
                    <Pressable
                      key={
                        variant.id
                      }
                      onPress={() => {
                        setVariantId(
                          variant.id
                        )

                        setSelectedVariantId(
                          variant.id
                        )
                      }}
                      style={[
                        styles.variantCard,
                        selected
                          ? styles.variantCardSelected
                          : null,
                      ]}
                    >
                      <View
                        style={
                          styles.radioOuter
                        }
                      >
                        {selected ? (
                          <View
                            style={
                              styles.radioInner
                            }
                          />
                        ) : null}
                      </View>

                      <View
                        style={
                          styles.variantContent
                        }
                      >
                        <Text
                          style={
                            styles.variantName
                          }
                        >
                          {
                            variant.name
                          }
                        </Text>

                        {variant.description ? (
                          <Text
                            style={
                              styles.variantDescription
                            }
                          >
                            {
                              variant.description
                            }
                          </Text>
                        ) : null}
                      </View>
                    </Pressable>
                  )
                }
              )}
            </View>
          )}
        </View>

        {/* SCHEDULED / INSTANT */}

        {(
          currentMode ===
            'Instant' ||
          currentMode ===
            'Scheduled'
        ) && (
          <View
            style={
              styles.section
            }
          >
            <Text
              style={
                styles.sectionTitle
              }
            >
              {currentMode ===
              'Instant'
                ? 'Service timing'
                : 'Date & time'}
            </Text>

            <Text
              style={
                styles.sectionHint
              }
            >
              {currentMode ===
              'Instant'
                ? 'Choose the service duration and preferred start time.'
                : 'Select when the staff service should begin and end.'}
            </Text>

            {currentMode ===
              'Scheduled' &&
              renderField(
                'DATE',
                formatDateLong(
                  scheduledDate
                ),
                () =>
                  openPicker(
                    'date'
                  )
              )}

            <View
              style={
                styles.timeRow
              }
            >
              <View
                style={
                  styles.timeColumn
                }
              >
                {renderField(
                  'START TIME',
                  formatTime(
                    startTime
                  ),
                  () =>
                    openPicker(
                      'startTime'
                    )
                )}
              </View>

              <View
                style={
                  styles.timeColumn
                }
              >
                {renderField(
                  'END TIME',
                  formatTime(
                    endTime
                  ),
                  () =>
                    openPicker(
                      'endTime'
                    )
                )}
              </View>
            </View>

            <View
              style={
                styles.durationCard
              }
            >
              <View>
                <Text
                  style={
                    styles.fieldLabel
                  }
                >
                  DURATION
                </Text>

                <Text
                  style={
                    styles.durationValue
                  }
                >
                  {durationHours}{' '}
                  {durationHours ===
                  1
                    ? 'hour'
                    : 'hours'}
                </Text>
              </View>

              <View
                style={
                  styles.stepper
                }
              >
                <TouchableOpacity
                  style={
                    styles.stepperButton
                  }
                  onPress={() =>
                    changeDuration(
                      -1
                    )
                  }
                  disabled={
                    durationHours <=
                    MIN_HOURS
                  }
                >
                  <Text
                    style={
                      styles.stepperText
                    }
                  >
                    −
                  </Text>
                </TouchableOpacity>

                <Text
                  style={
                    styles.stepperValue
                  }
                >
                  {durationHours}
                </Text>

                <TouchableOpacity
                  style={
                    styles.stepperButton
                  }
                  onPress={() =>
                    changeDuration(
                      1
                    )
                  }
                  disabled={
                    durationHours >=
                    MAX_HOURS
                  }
                >
                  <Text
                    style={
                      styles.stepperText
                    }
                  >
                    +
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {currentMode ===
              'Scheduled' && (
              <View
                style={
                  styles.slotsCard
                }
              >
                <View
                  style={
                    styles.slotsHeader
                  }
                >
                  <View>
                    <Text
                      style={
                        styles.slotsTitle
                      }
                    >
                      Available slots
                    </Text>

                    <Text
                      style={
                        styles.slotsHint
                      }
                    >
                      Backend-confirmed
                      availability
                    </Text>
                  </View>

                  {slotsLoading ? (
                    <ActivityIndicator
                      size="small"
                      color={
                        COLORS.orange
                      }
                    />
                  ) : null}
                </View>

                {slotsError ? (
                  <Text
                    style={
                      styles.errorText
                    }
                  >
                    {slotsError}
                  </Text>
                ) : slots.length ===
                  0 ? (
                  <Text
                    style={
                      styles.emptyText
                    }
                  >
                    No scheduled slots are
                    currently available for
                    this service and
                    location.
                  </Text>
                ) : (
                  <View
                    style={
                      styles.slotList
                    }
                  >
                    {slots.map(
                      (slot, index) => (
                        <TouchableOpacity
                          key={`${slot.start}-${slot.end}-${index}`}
                          style={
                            styles.slotChip
                          }
                          onPress={() => {
                            const start =
                              new Date(
                                slot.start
                              )

                            const end =
                              new Date(
                                slot.end
                              )

                            setStartTime(
                              start
                            )

                            setEndTime(
                              end
                            )

                            const hours =
                              calculateHours(
                                start,
                                end
                              )

                            if (
                              hours >
                              0
                            ) {
                              setDurationHours(
                                Math.max(
                                  MIN_HOURS,
                                  Math.min(
                                    MAX_HOURS,
                                    hours
                                  )
                                )
                              )
                            }
                          }}
                          activeOpacity={
                            0.8
                          }
                        >
                          <Text
                            style={
                              styles.slotText
                            }
                          >
                            {slot.label ||
                              `${new Date(
                                slot.start
                              ).toLocaleTimeString(
                                'en-IN',
                                {
                                  hour:
                                    'numeric',
                                  minute:
                                    '2-digit',
                                  hour12:
                                    true,
                                }
                              )}`}
                          </Text>
                        </TouchableOpacity>
                      )
                    )}
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {/* RECURRING */}

        {currentMode ===
          'Recurring' && (
          <View
            style={
              styles.section
            }
          >
            <Text
              style={
                styles.sectionTitle
              }
            >
              Recurring schedule
            </Text>

            <Text
              style={
                styles.sectionHint
              }
            >
              Define the date range, working
              days and daily service hours.
            </Text>

            <View
              style={
                styles.timeRow
              }
            >
              <View
                style={
                  styles.timeColumn
                }
              >
                {renderField(
                  'START DATE',
                  formatDateLong(
                    scheduleStartDate
                  ),
                  () =>
                    openPicker(
                      'scheduleStartDate'
                    )
                )}
              </View>

              <View
                style={
                  styles.timeColumn
                }
              >
                {renderField(
                  'END DATE',
                  formatDateLong(
                    scheduleEndDate
                  ),
                  () =>
                    openPicker(
                      'scheduleEndDate'
                    )
                )}
              </View>
            </View>

            <Text
              style={
                styles.subsectionTitle
              }
            >
              Working days
            </Text>

            <View
              style={
                styles.weekdayRow
              }
            >
              {WEEKDAYS.map(
                day => {
                  const selected =
                    scheduleSelectedWeekdays.includes(
                      day.key
                    )

                  return (
                    <Pressable
                      key={
                        day.key
                      }
                      onPress={() =>
                        toggleWeekday(
                          day.key
                        )
                      }
                      style={[
                        styles.weekday,
                        selected
                          ? styles.weekdaySelected
                          : null,
                      ]}
                    >
                      <Text
                        style={[
                          styles.weekdayText,
                          selected
                            ? styles.weekdayTextSelected
                            : null,
                        ]}
                      >
                        {
                          day.label
                        }
                      </Text>
                    </Pressable>
                  )
                }
              )}
            </View>

            <Text
              style={
                styles.subsectionTitle
              }
            >
              Daily working hours
            </Text>

            <View
              style={
                styles.timeRow
              }
            >
              <View
                style={
                  styles.timeColumn
                }
              >
                {renderField(
                  'DAILY START',
                  scheduleDailyStartTime
                    ? formatTime(
                        new Date(
                          scheduleDailyStartTime
                        )
                      )
                    : '',
                  () =>
                    openPicker(
                      'startTime'
                    )
                )}
              </View>

              <View
                style={
                  styles.timeColumn
                }
              >
                {renderField(
                  'DAILY END',
                  scheduleDailyEndTime
                    ? formatTime(
                        new Date(
                          scheduleDailyEndTime
                        )
                      )
                    : '',
                  () =>
                    openPicker(
                      'endTime'
                    )
                )}
              </View>
            </View>

            <View
              style={
                styles.recurringSummary
              }
            >
              <Text
                style={
                  styles.recurringSummaryTitle
                }
              >
                {recurringDays.length}{' '}
                working dates
              </Text>

              <Text
                style={
                  styles.recurringSummaryText
                }
              >
                {recurringDailyHours}{' '}
                hours/day ·{' '}
                {calculatedRecurringHours}{' '}
                total hours
              </Text>
            </View>

            <Text
              style={
                styles.subsectionTitle
              }
            >
              Off dates
            </Text>

            <Text
              style={
                styles.sectionHint
              }
            >
              Exclude individual dates from the
              recurring schedule.
            </Text>

            <TouchableOpacity
              style={
                styles.addDateButton
              }
              onPress={() => {
                setPicker(
                  'scheduleEndDate'
                )

                /*
                 * The picker below is replaced by
                 * the generic date picker. The selected
                 * date is subsequently used as an
                 * off-date through this separate
                 * interaction.
                 */
                Alert.alert(
                  'Add off date',
                  'Use the date picker to choose an off date within the recurring range.',
                  [
                    {
                      text: 'Choose date',
                      onPress: () => {
                        setOffDateInput(
                          new Date()
                        )
                      },
                    },
                    {
                      text: 'Cancel',
                      style: 'cancel',
                    },
                  ]
                )
              }}
              activeOpacity={0.85}
            >
              <Text
                style={
                  styles.addDateButtonText
                }
              >
                + Add off date
              </Text>
            </TouchableOpacity>

            {scheduleOffDates.length >
              0 && (
              <View
                style={
                  styles.offDateList
                }
              >
                {scheduleOffDates
                  .slice()
                  .sort()
                  .map(
                    date => (
                      <View
                        key={
                          date
                        }
                        style={
                          styles.offDateChip
                        }
                      >
                        <Text
                          style={
                            styles.offDateText
                          }
                        >
                          {formatDateLong(
                            parseDateKey(
                              date
                            )
                          )}
                        </Text>

                        <TouchableOpacity
                          onPress={() =>
                            removeOffDate(
                              date
                            )
                          }
                        >
                          <Text
                            style={
                              styles.removeDateText
                            }
                          >
                            ×
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )
                  )}
              </View>
            )}
          </View>
        )}

        {/* LOCATION */}

        <View
          style={
            styles.section
          }
        >
          <View
            style={
              styles.sectionHeading
            }
          >
            <View
              style={
                styles.sectionHeadingText
              }
            >
              <Text
                style={
                  styles.sectionTitle
                }
              >
                Service location
              </Text>

              <Text
                style={
                  styles.sectionHint
                }
              >
                Staff availability depends on
                the service location.
              </Text>
            </View>

            {availabilityLoading ? (
              <ActivityIndicator
                size="small"
                color={
                  COLORS.orange
                }
              />
            ) : null}
          </View>

          <TouchableOpacity
            style={
              styles.locationCard
            }
            onPress={
              openLocation
            }
            activeOpacity={0.88}
          >
            <View
              style={
                styles.locationIcon
              }
            >
              <Text
                style={
                  styles.locationIconText
                }
              >
                ●
              </Text>
            </View>

            <View
              style={
                styles.locationContent
              }
            >
              <Text
                style={
                  styles.locationTitle
                }
                numberOfLines={2}
              >
                {address ||
                  'Select service location'}
              </Text>

              {coordinates ? (
                <Text
                  style={
                    styles.locationCoordinates
                  }
                >
                  {coordinates.latitude.toFixed(
                    5
                  )}
                  ,{' '}
                  {coordinates.longitude.toFixed(
                    5
                  )}
                </Text>
              ) : (
                <Text
                  style={
                    styles.locationCoordinates
                  }
                >
                  Location required
                </Text>
              )}
            </View>

            <Text
              style={
                styles.locationArrow
              }
            >
              ›
            </Text>
          </TouchableOpacity>

          {serviceAvailable ===
          true ? (
            <View
              style={
                styles.availableBanner
              }
            >
              <View
                style={
                  styles.availableDot
                }
              />

              <Text
                style={
                  styles.availableText
                }
              >
                Service available
                {availableWorkers >
                0
                  ? ` · ${availableWorkers} staff nearby`
                  : ''}
              </Text>
            </View>
          ) : serviceAvailable ===
            false ? (
            <View
              style={
                styles.unavailableBanner
              }
            >
              <Text
                style={
                  styles.unavailableText
                }
              >
                This service is not currently
                available at this location.
              </Text>
            </View>
          ) : null}
        </View>

        {/* NOTES */}

        <View
          style={
            styles.section
          }
        >
          <Text
            style={
              styles.sectionTitle
            }
          >
            Notes
          </Text>

          <Text
            style={
              styles.sectionHint
            }
          >
            Optional instructions for the booking.
          </Text>

          <TextInput
            value={notes}
            onChangeText={
              setNotes
            }
            placeholder="Add instructions..."
            placeholderTextColor={
              COLORS.gray
            }
            multiline
            textAlignVertical="top"
            style={
              styles.notesInput
            }
          />
        </View>

        {/* PRICE */}

        <View
          style={
            styles.priceCard
          }
        >
          <View>
            <Text
              style={
                styles.priceLabel
              }
            >
              ESTIMATED PRICE
            </Text>

            <Text
              style={
                styles.priceCaption
              }
            >
              Final price is calculated by
              the booking service.
            </Text>
          </View>

          {pricingLoading ||
          priceLoadingLocal ? (
            <ActivityIndicator
              size="small"
              color={
                COLORS.orange
              }
            />
          ) : (
            <Text
              style={
                styles.priceValue
              }
            >
              {pricePreview
                ? currency(
                    pricePreview.total,
                    pricePreview.currency
                  )
                : bookingPricing
                  ? currency(
                      Number(
                        bookingPricing.total_price ??
                          bookingPricing.total ??
                          0
                      ),
                      bookingPricing.currency ||
                        'INR'
                    )
                  : '--'}
            </Text>
          )}
        </View>

        {pricingError ? (
          <Text
            style={
              styles.errorText
            }
          >
            {pricingError}
          </Text>
        ) : null}

        <View
          style={
            styles.bottomSpace
          }
        />
      </ScrollView>

      {/* CONTINUE */}

      <View
        style={
          styles.footer
        }
      >
        <View
          style={
            styles.footerPrice
          }
        >
          <Text
            style={
              styles.footerLabel
            }
          >
            ESTIMATED TOTAL
          </Text>

          <Text
            style={
              styles.footerValue
            }
          >
            {pricePreview
              ? currency(
                  pricePreview.total,
                  pricePreview.currency
                )
              : '--'}
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.continueButton,
            !canContinue
              ? styles.continueButtonDisabled
              : null,
          ]}
          onPress={
            handleContinue
          }
          disabled={
            !canContinue
          }
          activeOpacity={0.88}
        >
          {pricingLoading ||
          priceLoadingLocal ? (
            <ActivityIndicator
              color="#FFFFFF"
            />
          ) : (
            <Text
              style={
                styles.continueText
              }
            >
              Review booking →
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* DATE/TIME PICKER */}

      {picker &&
        Platform.OS ===
          'ios' && (
          <View
            style={
              styles.iosPickerOverlay
            }
          >
            <View
              style={
                styles.iosPickerCard
              }
            >
              <View
                style={
                  styles.pickerHeader
                }
              >
                <Text
                  style={
                    styles.pickerTitle
                  }
                >
                  {picker.includes(
                    'Time'
                  )
                    ? 'Select time'
                    : 'Select date'}
                </Text>

                <TouchableOpacity
                  onPress={() =>
                    setPicker(
                      null
                    )
                  }
                >
                  <Text
                    style={
                      styles.pickerDone
                    }
                  >
                    Done
                  </Text>
                </TouchableOpacity>
              </View>

              <DateTimePicker
                value={
                  getPickerValue()
                }
                mode={
                  picker.includes(
                    'Time'
                  )
                    ? 'time'
                    : 'date'
                }
                display="spinner"
                onChange={
                  handlePickerChange
                }
              />
            </View>
          </View>
        )}

      {picker &&
        Platform.OS !==
          'ios' && (
          <DateTimePicker
            value={
              getPickerValue()
            }
            mode={
              picker.includes(
                'Time'
              )
                ? 'time'
                : 'date'
            }
            onChange={
              handlePickerChange
            }
          />
        )}

      {/* OFF-DATE PICKER */}

      {offDateInput &&
        Platform.OS ===
          'ios' && (
          <View
            style={
              styles.iosPickerOverlay
            }
          >
            <View
              style={
                styles.iosPickerCard
              }
            >
              <View
                style={
                  styles.pickerHeader
                }
              >
                <Text
                  style={
                    styles.pickerTitle
                  }
                >
                  Select off date
                </Text>

                <TouchableOpacity
                  onPress={() => {
                    addOffDate()
                  }}
                >
                  <Text
                    style={
                      styles.pickerDone
                    }
                  >
                    Add
                  </Text>
                </TouchableOpacity>
              </View>

              <DateTimePicker
                value={
                  offDateInput
                }
                mode="date"
                display="spinner"
                onChange={(
                  _event,
                  value
                ) => {
                  if (value) {
                    setOffDateInput(
                      value
                    )
                  }
                }}
              />
            </View>
          </View>
        )}

      {offDateInput &&
        Platform.OS !==
          'ios' && (
          <DateTimePicker
            value={
              offDateInput
            }
            mode="date"
            onChange={(
              _event,
              value
            ) => {
              if (value) {
                setOffDateInput(
                  value
                )
                addOffDate()
              } else {
                setOffDateInput(
                  null
                )
              }
            }}
          />
        )}
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

    header: {
      height: 70,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      backgroundColor:
        COLORS.white,
      borderBottomWidth: 1,
      borderBottomColor:
        COLORS.border,
    },

    backButton: {
      width: 42,
      height: 42,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor:
        COLORS.light,
    },

    backText: {
      color: COLORS.navy,
      fontSize: 30,
      lineHeight: 32,
      fontWeight: '400',
    },

    headerCenter: {
      flex: 1,
      marginLeft: 12,
    },

    headerEyebrow: {
      color: COLORS.teal,
      fontSize: 9,
      fontWeight: '900',
      letterSpacing: 1.2,
    },

    headerTitle: {
      color: COLORS.navy,
      fontSize: 16,
      fontWeight: '900',
      marginTop: 2,
    },

    headerSpacer: {
      width: 42,
    },

    scroll: {
      flex: 1,
    },

    content: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 20,
    },

    serviceBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor:
        COLORS.navy,
      borderRadius: 20,
      padding: 15,
      marginBottom: 20,
    },

    serviceBadge: {
      width: 46,
      height: 46,
      borderRadius: 15,
      backgroundColor:
        COLORS.orange,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },

    serviceBadgeText: {
      color: '#FFFFFF',
      fontSize: 19,
      fontWeight: '900',
    },

    serviceBannerContent: {
      flex: 1,
    },

    smallLabel: {
      color:
        'rgba(255,255,255,0.62)',
      fontSize: 8,
      fontWeight: '900',
      letterSpacing: 1,
      marginBottom: 3,
    },

    serviceBannerTitle: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '900',
    },

    changeText: {
      color: COLORS.orange,
      fontSize: 11,
      fontWeight: '900',
    },

    section: {
      marginBottom: 22,
    },

    sectionHeading: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent:
        'space-between',
    },

    sectionHeadingText: {
      flex: 1,
    },

    sectionTitle: {
      color: COLORS.navy,
      fontSize: 18,
      fontWeight: '900',
      letterSpacing: -0.3,
    },

    sectionHint: {
      color: COLORS.gray,
      fontSize: 11,
      lineHeight: 16,
      marginTop: 3,
      marginBottom: 11,
    },

    modeContainer: {
      flexDirection: 'row',
      backgroundColor:
        COLORS.white,
      borderRadius: 18,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      padding: 4,
    },

    modeItem: {
      flex: 1,
      minHeight: 68,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 4,
    },

    modeItemActive: {
      backgroundColor:
        COLORS.orange,
    },

    modeLabel: {
      color: COLORS.navy,
      fontSize: 12,
      fontWeight: '900',
    },

    modeLabelActive: {
      color: '#FFFFFF',
    },

    modeDescription: {
      color: COLORS.gray,
      fontSize: 8,
      textAlign: 'center',
      marginTop: 3,
    },

    modeDescriptionActive: {
      color:
        'rgba(255,255,255,0.85)',
    },

    variantList: {
      gap: 9,
    },

    variantCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor:
        COLORS.white,
      borderRadius: 17,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      padding: 14,
    },

    variantCardSelected: {
      borderColor:
        COLORS.orange,
      backgroundColor:
        COLORS.orangeSoft,
    },

    radioOuter: {
      width: 21,
      height: 21,
      borderRadius: 11,
      borderWidth: 2,
      borderColor:
        COLORS.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 11,
    },

    radioInner: {
      width: 11,
      height: 11,
      borderRadius: 6,
      backgroundColor:
        COLORS.orange,
    },

    variantContent: {
      flex: 1,
    },

    variantName: {
      color: COLORS.navy,
      fontSize: 13,
      fontWeight: '900',
    },

    variantDescription: {
      color: COLORS.gray,
      fontSize: 10,
      lineHeight: 15,
      marginTop: 2,
    },

    field: {
      minHeight: 62,
      backgroundColor:
        COLORS.white,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      borderRadius: 16,
      paddingHorizontal: 13,
      paddingVertical: 10,
      justifyContent: 'center',
      position: 'relative',
    },

    fieldDisabled: {
      opacity: 0.55,
    },

    fieldLabel: {
      color: COLORS.gray,
      fontSize: 8,
      fontWeight: '900',
      letterSpacing: 0.8,
    },

    fieldValue: {
      color: COLORS.navy,
      fontSize: 13,
      fontWeight: '800',
      marginTop: 4,
      paddingRight: 20,
    },

    fieldPlaceholder: {
      color: COLORS.gray,
      fontWeight: '600',
    },

    fieldArrow: {
      position: 'absolute',
      right: 11,
      top: 22,
      color: COLORS.navy,
      fontSize: 20,
    },

    timeRow: {
      flexDirection: 'row',
      gap: 9,
      marginTop: 9,
    },

    timeColumn: {
      flex: 1,
    },

    durationCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
      backgroundColor:
        COLORS.white,
      borderRadius: 17,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      padding: 14,
      marginTop: 9,
    },

    durationValue: {
      color: COLORS.navy,
      fontSize: 14,
      fontWeight: '900',
      marginTop: 3,
    },

    stepper: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },

    stepperButton: {
      width: 36,
      height: 36,
      borderRadius: 12,
      backgroundColor:
        COLORS.light,
      alignItems: 'center',
      justifyContent: 'center',
    },

    stepperText: {
      color: COLORS.navy,
      fontSize: 20,
      fontWeight: '800',
    },

    stepperValue: {
      color: COLORS.navy,
      fontSize: 15,
      fontWeight: '900',
      minWidth: 20,
      textAlign: 'center',
    },

    slotsCard: {
      backgroundColor:
        COLORS.white,
      borderRadius: 17,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      padding: 14,
      marginTop: 9,
    },

    slotsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
    },

    slotsTitle: {
      color: COLORS.navy,
      fontSize: 12,
      fontWeight: '900',
    },

    slotsHint: {
      color: COLORS.gray,
      fontSize: 9,
      marginTop: 2,
    },

    slotList: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 7,
      marginTop: 11,
    },

    slotChip: {
      borderWidth: 1,
      borderColor:
        COLORS.teal,
      borderRadius: 11,
      paddingHorizontal: 10,
      paddingVertical: 8,
      backgroundColor:
        COLORS.tealSoft,
    },

    slotText: {
      color: COLORS.teal,
      fontSize: 10,
      fontWeight: '900',
    },

    weekdayRow: {
      flexDirection: 'row',
      gap: 5,
      marginBottom: 16,
    },

    weekday: {
      flex: 1,
      height: 40,
      borderRadius: 11,
      backgroundColor:
        COLORS.white,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      alignItems: 'center',
      justifyContent: 'center',
    },

    weekdaySelected: {
      backgroundColor:
        COLORS.orange,
      borderColor:
        COLORS.orange,
    },

    weekdayText: {
      color: COLORS.gray,
      fontSize: 9,
      fontWeight: '900',
    },

    weekdayTextSelected: {
      color: '#FFFFFF',
    },

    subsectionTitle: {
      color: COLORS.navy,
      fontSize: 12,
      fontWeight: '900',
      marginBottom: 7,
      marginTop: 3,
    },

    recurringSummary: {
      backgroundColor:
        COLORS.tealSoft,
      borderRadius: 16,
      padding: 13,
      marginTop: 10,
      marginBottom: 15,
    },

    recurringSummaryTitle: {
      color: COLORS.teal,
      fontSize: 13,
      fontWeight: '900',
    },

    recurringSummaryText: {
      color: COLORS.teal,
      fontSize: 10,
      marginTop: 3,
    },

    addDateButton: {
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor:
        COLORS.orange,
      borderRadius: 14,
      paddingVertical: 11,
      alignItems: 'center',
      marginTop: 8,
    },

    addDateButtonText: {
      color: COLORS.orange,
      fontSize: 11,
      fontWeight: '900',
    },

    offDateList: {
      gap: 7,
      marginTop: 9,
    },

    offDateChip: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
      backgroundColor:
        COLORS.white,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      borderRadius: 13,
      paddingHorizontal: 12,
      paddingVertical: 9,
    },

    offDateText: {
      color: COLORS.navy,
      fontSize: 10,
      fontWeight: '800',
    },

    removeDateText: {
      color: COLORS.orange,
      fontSize: 20,
      lineHeight: 20,
      fontWeight: '700',
    },

    locationCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor:
        COLORS.white,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      borderRadius: 18,
      padding: 13,
    },

    locationIcon: {
      width: 40,
      height: 40,
      borderRadius: 13,
      backgroundColor:
        COLORS.tealSoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },

    locationIconText: {
      color: COLORS.teal,
      fontSize: 13,
    },

    locationContent: {
      flex: 1,
    },

    locationTitle: {
      color: COLORS.navy,
      fontSize: 12,
      fontWeight: '900',
    },

    locationCoordinates: {
      color: COLORS.gray,
      fontSize: 9,
      marginTop: 3,
    },

    locationArrow: {
      color: COLORS.navy,
      fontSize: 24,
      marginLeft: 7,
    },

    availableBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor:
        COLORS.tealSoft,
      borderRadius: 12,
      paddingHorizontal: 11,
      paddingVertical: 9,
      marginTop: 8,
    },

    availableDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor:
        COLORS.teal,
      marginRight: 7,
    },

    availableText: {
      color: COLORS.teal,
      fontSize: 10,
      fontWeight: '900',
    },

    unavailableBanner: {
      backgroundColor:
        COLORS.orangeSoft,
      borderRadius: 12,
      paddingHorizontal: 11,
      paddingVertical: 9,
      marginTop: 8,
    },

    unavailableText: {
      color: COLORS.orange,
      fontSize: 10,
      lineHeight: 15,
      fontWeight: '800',
    },

    notesInput: {
      minHeight: 100,
      backgroundColor:
        COLORS.white,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      borderRadius: 16,
      paddingHorizontal: 13,
      paddingTop: 12,
      paddingBottom: 12,
      color: COLORS.navy,
      fontSize: 12,
    },

    priceCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
      backgroundColor:
        COLORS.navy,
      borderRadius: 20,
      padding: 16,
      marginTop: 2,
    },

    priceLabel: {
      color:
        'rgba(255,255,255,0.62)',
      fontSize: 8,
      fontWeight: '900',
      letterSpacing: 1,
    },

    priceCaption: {
      color:
        'rgba(255,255,255,0.65)',
      fontSize: 9,
      lineHeight: 14,
      marginTop: 4,
      maxWidth: 190,
    },

    priceValue: {
      color: '#FFFFFF',
      fontSize: 20,
      fontWeight: '900',
    },

    infoCard: {
      backgroundColor:
        COLORS.white,
      borderRadius: 16,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      padding: 14,
    },

    infoText: {
      color: COLORS.gray,
      fontSize: 11,
      lineHeight: 16,
    },

    errorText: {
      color: COLORS.orange,
      fontSize: 10,
      lineHeight: 15,
      marginTop: 7,
    },

    emptyText: {
      color: COLORS.gray,
      fontSize: 10,
      lineHeight: 15,
      marginTop: 10,
    },

    bottomSpace: {
      height: 20,
    },

    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor:
        COLORS.white,
      borderTopWidth: 1,
      borderTopColor:
        COLORS.border,
      paddingHorizontal: 14,
      paddingTop: 10,
      paddingBottom:
        Platform.OS === 'ios'
          ? 18
          : 10,
      gap: 10,
    },

    footerPrice: {
      minWidth: 90,
    },

    footerLabel: {
      color: COLORS.gray,
      fontSize: 7,
      fontWeight: '900',
      letterSpacing: 0.7,
    },

    footerValue: {
      color: COLORS.navy,
      fontSize: 15,
      fontWeight: '900',
      marginTop: 2,
    },

    continueButton: {
      flex: 1,
      minHeight: 50,
      borderRadius: 16,
      backgroundColor:
        COLORS.orange,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 14,
    },

    continueButtonDisabled: {
      opacity: 0.45,
    },

    continueText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '900',
    },

    iosPickerOverlay: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      backgroundColor:
        'rgba(0,0,0,0.35)',
      justifyContent: 'flex-end',
    },

    iosPickerCard: {
      backgroundColor:
        COLORS.white,
      borderTopLeftRadius: 22,
      borderTopRightRadius: 22,
      paddingBottom: 18,
    },

    pickerHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
      paddingHorizontal: 16,
      paddingVertical: 13,
      borderBottomWidth: 1,
      borderBottomColor:
        COLORS.border,
    },

    pickerTitle: {
      color: COLORS.navy,
      fontSize: 14,
      fontWeight: '900',
    },

    pickerDone: {
      color: COLORS.orange,
      fontSize: 12,
      fontWeight: '900',
    },
  })