import { useState } from 'react'
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'

import { COLORS } from '../constants/theme'
import { RootStackParamList } from '../types'
import { useBooking } from '../context/BookingContext'
import { createAddress, createBooking } from '../services/booking'
import Header from '../components/Header'
import PrimaryButton from '../components/PrimaryButton'

type Props = NativeStackScreenProps<
  RootStackParamList,
  'Summary'
>

function getBookingDuration(
  durationValue: number | null,
  durationUnit: string | null
) {
  if (!durationValue || !durationUnit) {
    throw new Error(
      'The selected staffing package has no valid duration.'
    )
  }

  /*
   * The service_variants table supports hour/day/etc.
   * but bookings.duration_unit currently supports only:
   * day | week | month
   *
   * Therefore hourly packages are stored as a 1-day booking
   * while the original package remains visible in the notes.
   */

  if (durationUnit === 'hour') {
    return {
      value: 1,
      unit: 'day' as const,
    }
  }

  if (durationUnit === 'day') {
    if (durationValue === 6) {
      return {
        value: 1,
        unit: 'week' as const,
      }
    }

    if (durationValue >= 26) {
      return {
        value: 1,
        unit: 'month' as const,
      }
    }

    return {
      value: durationValue,
      unit: 'day' as const,
    }
  }

  if (durationUnit === 'week') {
    return {
      value: durationValue,
      unit: 'week' as const,
    }
  }

  if (durationUnit === 'month') {
    return {
      value: durationValue,
      unit: 'month' as const,
    }
  }

  throw new Error(
    `Unsupported package duration unit: ${durationUnit}`
  )
}

function getSchedule(
  durationValue: number | null,
  durationUnit: string | null,
  scheduledDate: string
) {
  /*
   * The current app stores the date/time as text.
   *
   * If the customer has entered a valid date, use it.
   * Otherwise use the current time.
   */

  const parsedStart = scheduledDate
    ? new Date(scheduledDate)
    : new Date()

  const start = Number.isNaN(
    parsedStart.getTime()
  )
    ? new Date()
    : parsedStart

  const end = new Date(start)

  if (!durationValue || !durationUnit) {
    return {
      scheduledStart: start.toISOString(),
      scheduledEnd: end.toISOString(),
    }
  }

  if (durationUnit === 'hour') {
    end.setHours(
      end.getHours() + durationValue
    )
  }

  if (durationUnit === 'day') {
    end.setDate(
      end.getDate() + durationValue
    )
  }

  if (durationUnit === 'week') {
    end.setDate(
      end.getDate() + durationValue * 7
    )
  }

  if (durationUnit === 'month') {
    end.setMonth(
      end.getMonth() + durationValue
    )
  }

  return {
    scheduledStart: start.toISOString(),
    scheduledEnd: end.toISOString(),
  }
}

function parseCoordinates(value: string) {
  const match = value.match(
    /^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/
  )

  if (!match) {
    return null
  }

  const latitude = Number(match[1])
  const longitude = Number(match[2])

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    return null
  }

  return {
    latitude,
    longitude,
  }
}

export default function SummaryScreen({
  navigation,
}: Props) {
  const {
    selectedWorker,
    selectedService,
    selectedDuration,
    selectedPackage,
    bookingMode,
    scheduledDate,
    address,
    coordinates,
    total,
    setBookingId,
  } = useBooking()

  const [creating, setCreating] = useState(false)

  const continueToPayment = async () => {
    if (creating) {
      return
    }

    if (!selectedWorker) {
      Alert.alert(
        'Worker required',
        'Please select a worker before continuing.'
      )
      return
    }

    if (!selectedService) {
      Alert.alert(
        'Service required',
        'Please select a service.'
      )
      return
    }

    if (!selectedPackage) {
      Alert.alert(
        'Package required',
        'Please select a staffing package.'
      )
      return
    }

    if (!address.trim()) {
      Alert.alert(
        'Location required',
        'Please select or enter a service location.'
      )
      return
    }

    if (bookingMode !== 'Instant') {
      Alert.alert(
        'Coming next',
        'Scheduled and recurring booking support will be connected after the proper date/time picker is added.'
      )
      return
    }

    if (total <= 0) {
      Alert.alert(
        'Invalid price',
        'The selected staffing package does not have a valid price.'
      )
      return
    }

    const duration = getBookingDuration(
      selectedPackage.duration_value,
      selectedPackage.duration_unit
    )

    const schedule = getSchedule(
      selectedPackage.duration_value,
      selectedPackage.duration_unit,
      scheduledDate
    )

    let latitude = 0
    let longitude = 0

    if (address === 'Current location') {
      const parsed = parseCoordinates(
        coordinates
      )

      if (!parsed) {
        Alert.alert(
          'Location error',
          'We could not read your current coordinates. Please select your location again.'
        )
        return
      }

      latitude = parsed.latitude
      longitude = parsed.longitude
    }

    setCreating(true)

    try {
      /*
       * The service ID now comes directly from
       * the selected Supabase package.
       */
      const serviceId =
        selectedPackage.service_id

      const addressRow =
        await createAddress({
          label: 'Booking location',

          addressLine:
            address === 'Current location'
              ? coordinates
              : address,

          latitude,
          longitude,
        })

      const booking =
        await createBooking({
          workerId:
            selectedWorker.id,

          serviceId,

          addressId:
            addressRow.id,

          durationValue:
            duration.value,

          durationUnit:
            duration.unit,

          scheduledStart:
            schedule.scheduledStart,

          scheduledEnd:
            schedule.scheduledEnd,

          /*
           * IMPORTANT:
           * This is the live Supabase package price.
           */
          baseAmount: total,

          platformFee: 0,

          taxAmount: 0,

          totalAmount: total,

          notes:
            `Package: ${selectedPackage.name}. ` +
            `Package duration: ${selectedPackage.duration_value} ` +
            `${selectedPackage.duration_unit}. ` +
            `Booking mode: ${bookingMode}`,
        })

      setBookingId(booking.id)

      navigation.navigate('Payment')
    } catch (error: any) {
      console.error(
        '[TempStaff] Booking creation failed:',
        error
      )

      Alert.alert(
        'Booking failed',
        error?.message ||
          'Unable to create your booking. Please try again.'
      )
    } finally {
      setCreating(false)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.page}
        showsVerticalScrollIndicator={false}
      >
        <Header
          onBack={() => navigation.goBack()}
        />

        <Text style={styles.title}>
          Review your booking
        </Text>

        {selectedWorker && (
          <View style={styles.worker}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {selectedWorker.name[0]}
              </Text>
            </View>

            <View>
              <Text style={styles.name}>
                {selectedWorker.name}
              </Text>

              <Text style={styles.service}>
                {selectedWorker.service}
              </Text>

              <Text style={styles.meta}>
                ★ {selectedWorker.rating} ·{' '}
                {selectedWorker.jobs} jobs
              </Text>
            </View>
          </View>
        )}

        <View style={styles.summary}>
          <Text style={styles.label}>
            Service
          </Text>

          <Text style={styles.value}>
            {selectedService}
          </Text>

          <Text style={styles.label}>
            Staffing package
          </Text>

          <Text style={styles.value}>
            {selectedPackage?.name ||
              selectedDuration}
          </Text>

          {selectedPackage && (
            <>
              <Text style={styles.label}>
                Package duration
              </Text>

              <Text style={styles.value}>
                {selectedPackage.duration_value}{' '}
                {selectedPackage.duration_unit}
              </Text>
            </>
          )}

          <Text style={styles.label}>
            Booking type
          </Text>

          <Text style={styles.value}>
            {bookingMode}
          </Text>

          {scheduledDate ? (
            <>
              <Text style={styles.label}>
                Schedule
              </Text>

              <Text style={styles.value}>
                {scheduledDate}
              </Text>
            </>
          ) : null}

          <Text style={styles.label}>
            Location
          </Text>

          <Text style={styles.value}>
            {address === 'Current location'
              ? coordinates
              : address}
          </Text>
        </View>

        <View style={styles.price}>
          <Text style={styles.priceLabel}>
            Total payable
          </Text>

          <Text style={styles.amount}>
            ₹{total.toLocaleString('en-IN')}
          </Text>

          <Text style={styles.note}>
            This price comes from the current
            TempStaff database package price.
          </Text>
        </View>

        <PrimaryButton
          title={
            creating
              ? 'Creating booking...'
              : 'Continue to Payment'
          }
          disabled={
            creating ||
            !selectedPackage ||
            total <= 0
          }
          onPress={continueToPayment}
        />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.light,
  },

  page: {
    padding: 22,
    paddingBottom: 45,
  },

  title: {
    color: COLORS.navy,
    fontSize: 31,
    fontWeight: '800',
    marginBottom: 18,
  },

  worker: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 18,
    borderWidth: 2,
    borderColor: COLORS.orange,
    padding: 16,
    marginBottom: 16,
  },

  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: COLORS.navy,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },

  avatarText: {
    color: 'white',
    fontSize: 21,
    fontWeight: '800',
  },

  name: {
    color: COLORS.navy,
    fontSize: 16,
    fontWeight: '800',
  },

  service: {
    color: COLORS.teal,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 3,
  },

  meta: {
    color: COLORS.gray,
    fontSize: 12,
    marginTop: 4,
  },

  summary: {
    width: '100%',
    backgroundColor: 'white',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },

  label: {
    color: COLORS.gray,
    fontSize: 12,
    marginBottom: 3,
  },

  value: {
    color: COLORS.navy,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 12,
  },

  price: {
    width: '100%',
    backgroundColor: COLORS.navy,
    borderRadius: 20,
    padding: 20,
    marginBottom: 4,
  },

  priceLabel: {
    color: '#D8E4EF',
    fontSize: 13,
  },

  amount: {
    color: 'white',
    fontSize: 31,
    fontWeight: '900',
    marginVertical: 5,
  },

  note: {
    color: '#D8E4EF',
    fontSize: 12,
    lineHeight: 18,
  },
})