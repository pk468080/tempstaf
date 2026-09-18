import { useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import MapView, { Marker, Region } from 'react-native-maps'
import * as Location from 'expo-location'
import { NativeStackScreenProps } from '@react-navigation/native-stack'

import { COLORS } from '../constants/theme'
import { RootStackParamList } from '../types'
import { useBooking } from '../context/BookingContext'
import {
  calculateBookingPrice,
  calculateRecurringOccurrencePrice,
  getNearTermScheduledSlots,
} from '../services/booking'
import { supabase } from '../lib/supabase'
import { checkServiceAvailability } from '../services/availability'
import PrimaryButton from '../components/PrimaryButton'
import Header from '../components/Header'

type Props = NativeStackScreenProps<
  RootStackParamList,
  'Booking'
>

type BookingMode = 'Instant' | 'Scheduled' | 'Recurring'

const DEFAULT_LOCATION = {
  latitude: 28.6139,
  longitude: 77.209,
}

const DURATIONS = [1, 2, 3, 4, 5, 6, 8, 10, 12]

const TIMES = [
  '08:00',
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
  '18:00',
  '19:00',
  '20:00',
]

const WEEKDAYS = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 0, label: 'Sun' },
]

function pad(value: number) {
  return String(value).padStart(2, '0')
}

function formatDate(date: Date) {
  return `${date.getFullYear()}-${pad(
    date.getMonth() + 1
  )}-${pad(date.getDate())}`
}

function addDays(date: Date, amount: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + amount)
  return next
}

function timeToMinutes(value: string) {
  const [hour, minute] = value.split(':').map(Number)
  return hour * 60 + minute
}

function hoursBetween(start: string, end: string) {
  const minutes =
    timeToMinutes(end) - timeToMinutes(start)

  return minutes > 0 ? minutes / 60 : 0
}

function combineDateAndTime(
  date: string,
  time: string
) {
  if (!date || !time) {
    return ''
  }

  return `${date}T${time}:00`
}

function getEndTime(
  start: string,
  hours: number
) {
  if (!start || !hours) {
    return ''
  }

  const total =
    timeToMinutes(start) + hours * 60

  const hour = Math.floor(total / 60)
  const minute = total % 60

  if (hour >= 24) {
    return ''
  }

  return `${pad(hour)}:${pad(minute)}`
}

export default function BookingScreen({
  navigation,
}: Props) {
  const {
    selectedService,
    selectedServiceId,
    selectedVariantId,
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

    setScheduleTotalWorkingHours,
    setScheduleOccurrences,

    hourlyStartTime,
    hourlyEndTime,
    hourlyTotalHours,
    setHourlyStartTime,
    setHourlyEndTime,
    setHourlyTotalHours,

    address,
    addressId,
    coordinates,
    setAddress,
    setAddressId,
    setCoordinates,

    setBookingPricing,
    setPricingLoading,
    pricingLoading,
    pricingError,
  } = useBooking()

  const [variantId, setVariantId] =
    useState(selectedVariantId)

  const [duration, setDuration] =
    useState(
      hourlyTotalHours > 0
        ? hourlyTotalHours
        : 1
    )

  const [startTime, setStartTime] =
    useState(
      hourlyStartTime || '09:00'
    )

  const [recurringStart, setRecurringStart] =
    useState(
      scheduleStartDate ||
        formatDate(new Date())
    )

  const [recurringEnd, setRecurringEnd] =
    useState(
      scheduleEndDate ||
        formatDate(addDays(new Date(), 6))
    )

  const [dailyStart, setDailyStart] =
    useState(
      scheduleDailyStartTime || '09:00'
    )

  const [dailyEnd, setDailyEnd] =
    useState(
      scheduleDailyEndTime || '17:00'
    )

  const [selectedDays, setSelectedDays] =
    useState<number[]>(
      scheduleSelectedWeekdays.length
        ? scheduleSelectedWeekdays
        : [1, 2, 3, 4, 5]
    )

  const [latitude, setLatitude] =
    useState<number | null>(null)

  const [longitude, setLongitude] =
    useState<number | null>(null)

  const [house, setHouse] = useState('')
  const [street, setStreet] = useState('')
  const [area, setArea] = useState('')
  const [city, setCity] = useState('')
  const [pincode, setPincode] = useState('')

  const [savingLocation, setSavingLocation] =
    useState(false)

  const [loadingLocation, setLoadingLocation] =
    useState(false)

  const [slots, setSlots] = useState<
    Array<{
      slotStart: string
      slotEnd: string
    }>
  >([])

  const [loadingSlots, setLoadingSlots] =
    useState(false)

  const activeVariant = useMemo(() => {
    return (
      hourlyVariants.find(
        item => item.id === variantId
      ) ||
      selectedVariant
    )
  }, [
    hourlyVariants,
    variantId,
    selectedVariant,
  ])

  /*
   * Select the first valid variant when the
   * customer enters this screen.
   */
  useEffect(() => {
    if (
      !variantId &&
      hourlyVariants.length > 0
    ) {
      const serviceVariant =
        hourlyVariants.find(
          item =>
            item.service_id ===
            selectedServiceId
        )

      if (serviceVariant) {
        setVariantId(serviceVariant.id)
      }
    }
  }, [
    variantId,
    hourlyVariants,
    selectedServiceId,
  ])

  /*
   * Keep context in sync.
   */
  useEffect(() => {
    if (variantId) {
      // The context setter is intentionally called
      // through the existing booking model.
    }
  }, [variantId])

  useEffect(() => {
    if (
      coordinates &&
      coordinates.includes(',')
    ) {
      const [lat, lng] =
        coordinates
          .split(',')
          .map(Number)

      if (
        Number.isFinite(lat) &&
        Number.isFinite(lng)
      ) {
        setLatitude(lat)
        setLongitude(lng)
      }
    }
  }, [coordinates])

  const loadLocation = async () => {
    try {
      setLoadingLocation(true)

      const permission =
        await Location.requestForegroundPermissionsAsync()

      if (permission.status !== 'granted') {
        Alert.alert(
          'Location permission required',
          'Allow location access or enter the service address manually.'
        )
        return
      }

      const current =
        await Location.getCurrentPositionAsync({
          accuracy:
            Location.Accuracy.Balanced,
        })

      const nextLat =
        current.coords.latitude

      const nextLng =
        current.coords.longitude

      setLatitude(nextLat)
      setLongitude(nextLng)

      setCoordinates(
        `${nextLat},${nextLng}`
      )

      try {
        const result =
          await Location.reverseGeocodeAsync({
            latitude: nextLat,
            longitude: nextLng,
          })

        const place = result[0]

        if (place) {
          setHouse(
            place.name ||
              place.streetNumber ||
              ''
          )

          setStreet(
            place.street || ''
          )

          setArea(
            place.district ||
              place.subregion ||
              ''
          )

          setCity(
            place.city ||
              place.subregion ||
              place.region ||
              ''
          )

          setPincode(
            place.postalCode
              ?.replace(/\D/g, '')
              .slice(0, 6) || ''
          )
        }
      } catch {
        // Coordinates remain usable even if
        // reverse geocoding fails.
      }
    } catch {
      Alert.alert(
        'Location unavailable',
        'We could not detect your location.'
      )
    } finally {
      setLoadingLocation(false)
    }
  }

  useEffect(() => {
    loadLocation()
  }, [])

  const mapRegion: Region = {
    latitude:
      latitude ??
      DEFAULT_LOCATION.latitude,
    longitude:
      longitude ??
      DEFAULT_LOCATION.longitude,
    latitudeDelta: 0.015,
    longitudeDelta: 0.015,
  }

  const buildAddress = () =>
    [
      house.trim(),
      street.trim(),
      area.trim(),
      city.trim(),
      pincode.trim(),
    ]
      .filter(Boolean)
      .join(', ')

  const saveLocation = async () => {
    if (
      latitude === null ||
      longitude === null
    ) {
      Alert.alert(
        'Location required',
        'Select your service location on the map.'
      )
      return false
    }

    const addressLine = buildAddress()

    if (!addressLine) {
      Alert.alert(
        'Address required',
        'Enter the service address.'
      )
      return false
    }

    try {
      setSavingLocation(true)

      const {
        data: { user },
        error: userError,
      } =
        await supabase.auth.getUser()

      if (userError) {
        throw userError
      }

      if (!user) {
        throw new Error(
          'Customer is not authenticated.'
        )
      }

      const availability =
        await checkServiceAvailability(
          selectedServiceId,
          latitude,
          longitude
        )

      if (
        !availability.service_area_covered
      ) {
        Alert.alert(
          'Service unavailable',
          `${selectedService || 'This service'} is not available at this location.`
        )
        return false
      }

      let savedAddressId =
        addressId

      if (savedAddressId) {
        const { error } =
          await supabase
            .from('addresses')
            .update({
              address_line: addressLine,
              latitude,
              longitude,
            })
            .eq('id', savedAddressId)
            .eq('user_id', user.id)

        if (error) {
          throw error
        }
      } else {
        const { data, error } =
          await supabase
            .from('addresses')
            .insert({
              user_id: user.id,
              label: 'Service Address',
              address_line: addressLine,
              latitude,
              longitude,
            })
            .select(
              'id, address_line, latitude, longitude'
            )
            .single()

        if (error) {
          throw error
        }

        savedAddressId = data.id
        setAddressId(data.id)
      }

      setAddress(addressLine)

      setCoordinates(
        `${latitude},${longitude}`
      )

      return Boolean(savedAddressId)
    } catch (error: any) {
      Alert.alert(
        'Unable to save location',
        error?.message ||
          'Please try again.'
      )

      return false
    } finally {
      setSavingLocation(false)
    }
  }

  /*
   * Backend-provided near-term slots.
   */
  const loadSlots = async () => {
    if (
      !variantId ||
      !addressId
    ) {
      return
    }

    try {
      setLoadingSlots(true)

      const result =
        await getNearTermScheduledSlots(
          variantId,
          addressId
        )

      setSlots(result)
    } catch {
      setSlots([])
    } finally {
      setLoadingSlots(false)
    }
  }

  useEffect(() => {
    if (
      bookingMode === 'Scheduled' &&
      addressId &&
      variantId
    ) {
      loadSlots()
    }
  }, [
    bookingMode,
    addressId,
    variantId,
  ])

  const selectMode = (
    mode: BookingMode
  ) => {
    setBookingMode(mode)

    if (mode === 'Instant') {
      const now = new Date()

      const roundedMinutes =
        Math.ceil(
          now.getMinutes() / 15
        ) * 15

      if (roundedMinutes >= 60) {
        now.setHours(
          now.getHours() + 1
        )
      }

      now.setMinutes(
        roundedMinutes % 60
      )

      const start =
        `${pad(now.getHours())}:${pad(
          now.getMinutes()
        )}`

      setStartTime(start)
    }
  }

  const calculatedEnd =
    bookingMode === 'Instant'
      ? getEndTime(
          startTime,
          duration
        )
      : bookingMode === 'Scheduled'
        ? getEndTime(
            startTime,
            duration
          )
        : dailyEnd

  const currentDate =
    formatDate(new Date())

  const instantDate = currentDate

  const calculateQuote = async () => {
    if (!variantId) {
      throw new Error(
        'Please select a service type.'
      )
    }

    const hours =
      bookingMode === 'Recurring'
        ? hoursBetween(
            dailyStart,
            dailyEnd
          )
        : duration

    if (hours < 1) {
      throw new Error(
        'Booking duration must be at least 1 hour.'
      )
    }

    setPricingLoading(true)

    try {
      const price =
        bookingMode === 'Recurring'
          ? await calculateRecurringOccurrencePrice(
              {
                serviceVariantId:
                  variantId,
                occurrenceHours:
                  hours,
                commitmentDays:
                  Math.max(
                    1,
                    Math.round(
                      (
                        new Date(
                          recurringEnd
                        ).getTime() -
                        new Date(
                          recurringStart
                        ).getTime()
                      ) /
                        86400000 +
                        1
                    )
                  ),
              }
            )
          : await calculateBookingPrice({
              serviceVariantId:
                variantId,
              totalWorkingHours:
                hours,
            })

      setBookingPricing({
        grossAmount:
          price.grossAmount,
        discountPercent: 0,
        discountAmount:
          price.discountAmount,
        finalAmount:
          price.finalAmount,
        hourlyPrice:
          hours > 0
            ? price.grossAmount / hours
            : 0,
        currency:
          price.currency,
        pricingVersion: null,
      })

      return price
    } finally {
      setPricingLoading(false)
    }
  }

  const continueToSummary = async () => {
    try {
      if (!variantId) {
        throw new Error(
          'Please select a service type.'
        )
      }

      const locationSaved =
        await saveLocation()

      if (!locationSaved) {
        return
      }

      if (
        bookingMode === 'Scheduled'
      ) {
        if (!scheduledDate) {
          throw new Error(
            'Please select a date.'
          )
        }

        if (!startTime) {
          throw new Error(
            'Please select a time.'
          )
        }

        setScheduledDate(
          scheduledDate
        )

        setScheduleStartDate(
          scheduledDate
        )

        setScheduleEndDate(
          scheduledDate
        )

        setScheduleDailyStartTime(
          startTime
        )

        setScheduleDailyEndTime(
          calculatedEnd
        )
      }

      if (
        bookingMode === 'Instant'
      ) {
        if (!startTime || !calculatedEnd) {
          throw new Error(
            'Please select a valid instant booking time.'
          )
        }

        setHourlyStartTime(
          combineDateAndTime(
            instantDate,
            startTime
          )
        )

        setHourlyEndTime(
          combineDateAndTime(
            instantDate,
            calculatedEnd
          )
        )

        setHourlyTotalHours(
          duration
        )
      }

      if (
        bookingMode === 'Recurring'
      ) {
        if (
          !recurringStart ||
          !recurringEnd
        ) {
          throw new Error(
            'Please select the recurring date range.'
          )
        }

        if (
          selectedDays.length === 0
        ) {
          throw new Error(
            'Select at least one working day.'
          )
        }

        if (
          hoursBetween(
            dailyStart,
            dailyEnd
          ) < 1
        ) {
          throw new Error(
            'Recurring duration must be at least 1 hour.'
          )
        }

        setScheduleStartDate(
          recurringStart
        )

        setScheduleEndDate(
          recurringEnd
        )

        setScheduleDailyStartTime(
          dailyStart
        )

        setScheduleDailyEndTime(
          dailyEnd
        )

        setScheduleSelectedWeekdays(
          selectedDays
        )

        setScheduleTotalWorkingHours(
          hoursBetween(
            dailyStart,
            dailyEnd
          )
        )

        setScheduleOccurrences([])
      }

      await calculateQuote()

      navigation.navigate(
        'Summary'
      )
    } catch (error: any) {
      Alert.alert(
        'Booking incomplete',
        error?.message ||
          'Please complete the booking details.'
      )
    }
  }

  const toggleDay = (day: number) => {
    setSelectedDays(current =>
      current.includes(day)
        ? current.filter(
            item => item !== day
          )
        : [...current, day]
    )
  }

  const selectSlot = (
    slotStart: string,
    slotEnd: string
  ) => {
    const start =
      slotStart.includes('T')
        ? slotStart.split('T')[1].slice(0, 5)
        : slotStart.slice(0, 5)

    const end =
      slotEnd.includes('T')
        ? slotEnd.split('T')[1].slice(0, 5)
        : slotEnd.slice(0, 5)

    setStartTime(start)

    const slotHours =
      hoursBetween(start, end)

    if (slotHours >= 1) {
      setDuration(slotHours)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }
      >
        <ScrollView
          contentContainerStyle={styles.page}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Header
            onBack={() =>
              navigation.goBack()
            }
          />

          <Text style={styles.eyebrow}>
            BOOKING
          </Text>

          <Text style={styles.title}>
            {selectedService ||
              'Book staff'}
          </Text>

          <Text style={styles.subtitle}>
            Choose everything in one place.
          </Text>

          {/* SERVICE TYPE */}

          {hourlyVariants.filter(
            item =>
              item.service_id ===
              selectedServiceId
          ).length > 1 ? (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>
                Service type
              </Text>

              {hourlyVariants
                .filter(
                  item =>
                    item.service_id ===
                    selectedServiceId
                )
                .map(item => (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.variant,
                      variantId === item.id &&
                        styles.variantSelected,
                    ]}
                    onPress={() =>
                      setVariantId(item.id)
                    }
                  >
                    <Text
                      style={
                        styles.variantTitle
                      }
                    >
                      {item.name}
                    </Text>

                    {item.description ? (
                      <Text
                        style={
                          styles.variantDescription
                        }
                      >
                        {item.description}
                      </Text>
                    ) : null}
                  </TouchableOpacity>
                ))}
            </View>
          ) : null}

          {/* BOOKING TYPE SLIDER */}

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>
              Booking type
            </Text>

            <View style={styles.slider}>
              {(
                [
                  'Instant',
                  'Scheduled',
                  'Recurring',
                ] as BookingMode[]
              ).map(mode => (
                <TouchableOpacity
                  key={mode}
                  style={[
                    styles.sliderItem,
                    bookingMode === mode &&
                      styles.sliderItemActive,
                  ]}
                  onPress={() =>
                    selectMode(mode)
                  }
                  activeOpacity={0.85}
                >
                  <Text
                    style={[
                      styles.sliderText,
                      bookingMode === mode &&
                        styles.sliderTextActive,
                    ]}
                  >
                    {mode}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* INSTANT */}

          {bookingMode === 'Instant' ? (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>
                Start time
              </Text>

              <Text style={styles.helper}>
                The booking starts as soon as
                possible.
              </Text>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={
                  false
                }
                contentContainerStyle={
                  styles.horizontal
                }
              >
                {TIMES.map(time => (
                  <TouchableOpacity
                    key={time}
                    style={[
                      styles.chip,
                      startTime === time &&
                        styles.chipActive,
                    ]}
                    onPress={() =>
                      setStartTime(time)
                    }
                  >
                    <Text
                      style={[
                        styles.chipText,
                        startTime === time &&
                          styles.chipTextActive,
                      ]}
                    >
                      {time}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          ) : null}

          {/* SCHEDULED */}

          {bookingMode === 'Scheduled' ? (
            <>
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>
                  Date
                </Text>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={
                    false
                  }
                  contentContainerStyle={
                    styles.horizontal
                  }
                >
                  {Array.from(
                    { length: 14 },
                    (_, index) =>
                      addDays(
                        new Date(),
                        index
                      )
                  ).map(date => {
                    const value =
                      formatDate(date)

                    return (
                      <TouchableOpacity
                        key={value}
                        style={[
                          styles.dateChip,
                          scheduledDate ===
                            value &&
                            styles.dateChipActive,
                        ]}
                        onPress={() =>
                          setScheduledDate(
                            value
                          )
                        }
                      >
                        <Text
                          style={
                            styles.dateDay
                          }
                        >
                          {date.toLocaleDateString(
                            undefined,
                            {
                              weekday:
                                'short',
                            }
                          )}
                        </Text>

                        <Text
                          style={
                            styles.dateNumber
                          }
                        >
                          {date.getDate()}
                        </Text>
                      </TouchableOpacity>
                    )
                  })}
                </ScrollView>
              </View>

              <View style={styles.card}>
                <Text style={styles.sectionTitle}>
                  Available slots
                </Text>

                {loadingSlots ? (
                  <ActivityIndicator
                    color={COLORS.teal}
                  />
                ) : slots.length > 0 ? (
                  <View style={styles.slotGrid}>
                    {slots.map(slot => (
                      <TouchableOpacity
                        key={`${slot.slotStart}-${slot.slotEnd}`}
                        style={styles.slot}
                        onPress={() =>
                          selectSlot(
                            slot.slotStart,
                            slot.slotEnd
                          )
                        }
                      >
                        <Text
                          style={
                            styles.slotText
                          }
                        >
                          {slot.slotStart
                            .slice(
                              11,
                              16
                            ) ||
                            slot.slotStart.slice(
                              0,
                              5
                            )}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={
                      false
                    }
                    contentContainerStyle={
                      styles.horizontal
                    }
                  >
                    {TIMES.map(time => (
                      <TouchableOpacity
                        key={time}
                        style={[
                          styles.chip,
                          startTime ===
                            time &&
                            styles.chipActive,
                        ]}
                        onPress={() =>
                          setStartTime(
                            time
                          )
                        }
                      >
                        <Text
                          style={[
                            styles.chipText,
                            startTime ===
                              time &&
                              styles.chipTextActive,
                          ]}
                        >
                          {time}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </View>
            </>
          ) : null}

          {/* DURATION */}

          {bookingMode !== 'Recurring' ? (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>
                Duration
              </Text>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={
                  false
                }
                contentContainerStyle={
                  styles.horizontal
                }
              >
                {DURATIONS.map(value => (
                  <TouchableOpacity
                    key={value}
                    style={[
                      styles.durationChip,
                      duration === value &&
                        styles.durationActive,
                    ]}
                    onPress={() =>
                      setDuration(value)
                    }
                  >
                    <Text
                      style={[
                        styles.durationText,
                        duration === value &&
                          styles.durationTextActive,
                      ]}
                    >
                      {value}h
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.preview}>
                {startTime} –{' '}
                {calculatedEnd ||
                  'Select a valid time'}
              </Text>
            </View>
          ) : null}

          {/* RECURRING */}

          {bookingMode === 'Recurring' ? (
            <>
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>
                  Date range
                </Text>

                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.input}
                    value={recurringStart}
                    onChangeText={
                      setRecurringStart
                    }
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={
                      COLORS.gray
                    }
                  />

                  <Text style={styles.to}>
                    to
                  </Text>

                  <TextInput
                    style={styles.input}
                    value={recurringEnd}
                    onChangeText={
                      setRecurringEnd
                    }
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={
                      COLORS.gray
                    }
                  />
                </View>
              </View>

              <View style={styles.card}>
                <Text style={styles.sectionTitle}>
                  Working days
                </Text>

                <View style={styles.weekGrid}>
                  {WEEKDAYS.map(day => (
                    <TouchableOpacity
                      key={day.value}
                      style={[
                        styles.weekday,
                        selectedDays.includes(
                          day.value
                        ) &&
                          styles.weekdayActive,
                      ]}
                      onPress={() =>
                        toggleDay(
                          day.value
                        )
                      }
                    >
                      <Text
                        style={[
                          styles.weekdayText,
                          selectedDays.includes(
                            day.value
                          ) &&
                            styles.weekdayTextActive,
                        ]}
                      >
                        {day.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.card}>
                <Text style={styles.sectionTitle}>
                  Daily working hours
                </Text>

                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.input}
                    value={dailyStart}
                    onChangeText={
                      setDailyStart
                    }
                    placeholder="09:00"
                    placeholderTextColor={
                      COLORS.gray
                    }
                  />

                  <Text style={styles.to}>
                    to
                  </Text>

                  <TextInput
                    style={styles.input}
                    value={dailyEnd}
                    onChangeText={
                      setDailyEnd
                    }
                    placeholder="17:00"
                    placeholderTextColor={
                      COLORS.gray
                    }
                  />
                </View>

                <Text style={styles.preview}>
                  {hoursBetween(
                    dailyStart,
                    dailyEnd
                  )}{' '}
                  working hours per day
                </Text>
              </View>
            </>
          ) : null}

          {/* LOCATION */}

          <View style={styles.card}>
            <View style={styles.locationHeader}>
              <View>
                <Text style={styles.sectionTitle}>
                  Service location
                </Text>

                <Text style={styles.helper}>
                  Where should the staff report?
                </Text>
              </View>

              <TouchableOpacity
                onPress={loadLocation}
                disabled={loadingLocation}
              >
                <Text
                  style={styles.locationAction}
                >
                  {loadingLocation
                    ? 'Locating...'
                    : 'Use my location'}
                </Text>
              </TouchableOpacity>
            </View>

            <MapView
              style={styles.map}
              region={mapRegion}
              onPress={event => {
                const {
                  latitude: nextLat,
                  longitude: nextLng,
                } =
                  event.nativeEvent.coordinate

                setLatitude(nextLat)
                setLongitude(nextLng)

                setCoordinates(
                  `${nextLat},${nextLng}`
                )
              }}
            >
              {latitude !== null &&
              longitude !== null ? (
                <Marker
                  coordinate={{
                    latitude,
                    longitude,
                  }}
                />
              ) : null}
            </MapView>

            <TextInput
              style={styles.addressInput}
              value={house}
              onChangeText={setHouse}
              placeholder="House / office number"
              placeholderTextColor={
                COLORS.gray
              }
            />

            <TextInput
              style={styles.addressInput}
              value={street}
              onChangeText={setStreet}
              placeholder="Street"
              placeholderTextColor={
                COLORS.gray
              }
            />

            <TextInput
              style={styles.addressInput}
              value={area}
              onChangeText={setArea}
              placeholder="Area"
              placeholderTextColor={
                COLORS.gray
              }
            />

            <View style={styles.inputRow}>
              <TextInput
                style={[
                  styles.input,
                  { flex: 1 },
                ]}
                value={city}
                onChangeText={setCity}
                placeholder="City"
                placeholderTextColor={
                  COLORS.gray
                }
              />

              <TextInput
                style={[
                  styles.input,
                  { flex: 1 },
                ]}
                value={pincode}
                onChangeText={value =>
                  setPincode(
                    value
                      .replace(/\D/g, '')
                      .slice(0, 6)
                  )
                }
                keyboardType="number-pad"
                placeholder="PIN"
                placeholderTextColor={
                  COLORS.gray
                }
              />
            </View>

            {address ? (
              <Text style={styles.savedAddress}>
                Saved: {address}
              </Text>
            ) : null}
          </View>

          {pricingError ? (
            <View style={styles.error}>
              <Text style={styles.errorText}>
                {pricingError}
              </Text>
            </View>
          ) : null}

          {/* CONTINUE */}

          <View style={styles.bottom}>
            <PrimaryButton
              title={
                pricingLoading ||
                savingLocation
                  ? 'Preparing...'
                  : 'Review booking'
              }
              disabled={
                pricingLoading ||
                savingLocation
              }
              onPress={
                continueToSummary
              }
            />

            <Text style={styles.bottomText}>
              Final availability and pricing are
              validated by TempStaff when the booking
              is created.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
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

  eyebrow: {
    color: COLORS.teal,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
    marginTop: 5,
  },

  title: {
    color: COLORS.navy,
    fontSize: 29,
    lineHeight: 35,
    fontWeight: '900',
    marginTop: 4,
  },

  subtitle: {
    color: COLORS.gray,
    fontSize: 13,
    marginTop: 5,
    marginBottom: 17,
  },

  card: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 13,
  },

  sectionTitle: {
    color: COLORS.navy,
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 8,
  },

  helper: {
    color: COLORS.gray,
    fontSize: 11,
    lineHeight: 17,
    marginBottom: 10,
  },

  variant: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 13,
    marginTop: 8,
  },

  variantSelected: {
    borderColor: COLORS.teal,
    backgroundColor: COLORS.tealSoft,
  },

  variantTitle: {
    color: COLORS.navy,
    fontSize: 13,
    fontWeight: '800',
  },

  variantDescription: {
    color: COLORS.gray,
    fontSize: 11,
    marginTop: 3,
  },

  slider: {
    flexDirection: 'row',
    backgroundColor: '#EEF2F5',
    borderRadius: 14,
    padding: 4,
  },

  sliderItem: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 11,
    alignItems: 'center',
  },

  sliderItemActive: {
    backgroundColor: COLORS.navy,
  },

  sliderText: {
    color: COLORS.gray,
    fontSize: 11,
    fontWeight: '800',
  },

  sliderTextActive: {
    color: COLORS.white,
  },

  horizontal: {
    gap: 8,
  },

  chip: {
    paddingHorizontal: 15,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: '#F1F5F7',
  },

  chipActive: {
    backgroundColor: COLORS.teal,
  },

  chipText: {
    color: COLORS.navy,
    fontSize: 11,
    fontWeight: '800',
  },

  chipTextActive: {
    color: COLORS.white,
  },

  dateChip: {
    width: 58,
    paddingVertical: 9,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: '#F1F5F7',
  },

  dateChipActive: {
    backgroundColor: COLORS.teal,
  },

  dateDay: {
    color: COLORS.gray,
    fontSize: 9,
    fontWeight: '800',
  },

  dateNumber: {
    color: COLORS.navy,
    fontSize: 17,
    fontWeight: '900',
    marginTop: 2,
  },

  durationChip: {
    paddingHorizontal: 17,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: '#F1F5F7',
  },

  durationActive: {
    backgroundColor: COLORS.orange,
  },

  durationText: {
    color: COLORS.navy,
    fontSize: 11,
    fontWeight: '900',
  },

  durationTextActive: {
    color: COLORS.white,
  },

  preview: {
    color: COLORS.teal,
    fontSize: 12,
    fontWeight: '900',
    marginTop: 13,
  },

  slotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  slot: {
    width: '30%',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: COLORS.tealSoft,
    alignItems: 'center',
  },

  slotText: {
    color: COLORS.teal,
    fontSize: 11,
    fontWeight: '900',
  },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },

  input: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    color: COLORS.navy,
    backgroundColor: COLORS.white,
  },

  to: {
    color: COLORS.gray,
    fontSize: 12,
  },

  weekGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },

  weekday: {
    paddingHorizontal: 11,
    paddingVertical: 10,
    borderRadius: 11,
    backgroundColor: '#F1F5F7',
  },

  weekdayActive: {
    backgroundColor: COLORS.teal,
  },

  weekdayText: {
    color: COLORS.gray,
    fontSize: 10,
    fontWeight: '800',
  },

  weekdayTextActive: {
    color: COLORS.white,
  },

  locationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },

  locationAction: {
    color: COLORS.teal,
    fontSize: 10,
    fontWeight: '900',
  },

  map: {
    height: 190,
    borderRadius: 16,
    marginBottom: 12,
  },

  addressInput: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    color: COLORS.navy,
    marginTop: 8,
  },

  savedAddress: {
    color: COLORS.gray,
    fontSize: 10,
    lineHeight: 15,
    marginTop: 9,
  },

  error: {
    backgroundColor: '#FFF1F0',
    borderRadius: 14,
    padding: 13,
    marginBottom: 13,
  },

  errorText: {
    color: '#B42318',
    fontSize: 11,
  },

  bottom: {
    marginTop: 5,
  },

  bottomText: {
    color: COLORS.gray,
    textAlign: 'center',
    fontSize: 10,
    lineHeight: 16,
    marginTop: 10,
  },
})