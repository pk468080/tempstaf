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

type Props = NativeStackScreenProps<RootStackParamList, 'Summary'>

const SERVICE_IDS: Record<string, string> = {
  'Pantry Staff':
    '61b18f3a-f1a9-4418-913f-2de444841066',
}

function getDurationDetails(duration: string) {
  switch (duration) {
    case '1 Day':
      return { value: 1, unit: 'day' as const }

    case '2 Days':
      return { value: 2, unit: 'day' as const }

    case '1 Week':
      return { value: 1, unit: 'week' as const }

    case '1 Month':
      return { value: 1, unit: 'month' as const }

    default:
      throw new Error(`Unsupported duration: ${duration}`)
  }
}

function getSchedule(duration: string) {
  const start = new Date()

  const durationDetails = getDurationDetails(duration)

  const end = new Date(start)

  if (durationDetails.unit === 'day') {
    end.setDate(end.getDate() + durationDetails.value)
  }

  if (durationDetails.unit === 'week') {
    end.setDate(end.getDate() + durationDetails.value * 7)
  }

  if (durationDetails.unit === 'month') {
    end.setMonth(end.getMonth() + durationDetails.value)
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

    if (!selectedDuration) {
      Alert.alert(
        'Duration required',
        'Please select a duration.'
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
        'Real Scheduled and Recurring booking dates will be connected after we add the proper date/time picker.'
      )
      return
    }

    const serviceId = SERVICE_IDS[selectedService]

    if (!serviceId) {
      Alert.alert(
        'Service unavailable',
        `The service "${selectedService}" is not connected to the database yet.`
      )
      return
    }

    const duration = getDurationDetails(
      selectedDuration
    )

    const schedule = getSchedule(
      selectedDuration
    )

    let latitude = 0
    let longitude = 0

    if (address === 'Current location') {
      const parsed = parseCoordinates(coordinates)

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
      const addressRow = await createAddress({
        label: 'Booking location',
        addressLine:
          address === 'Current location'
            ? coordinates
            : address,
        latitude,
        longitude,
      })

      const booking = await createBooking({
        workerId: selectedWorker.id,
        serviceId,
        addressId: addressRow.id,
        durationValue: duration.value,
        durationUnit: duration.unit,
        scheduledStart: schedule.scheduledStart,
        scheduledEnd: schedule.scheduledEnd,
        baseAmount: total,
        platformFee: 0,
        taxAmount: 0,
        totalAmount: total,
        notes: `Booking mode: ${bookingMode}`,
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
      <ScrollView contentContainerStyle={styles.page}>
        <Header onBack={() => navigation.goBack()} />

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
            Duration
          </Text>

          <Text style={styles.value}>
            {selectedDuration}
          </Text>

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
            Payment is required before the booking is
            confirmed.
          </Text>
        </View>

        <PrimaryButton
          title={
            creating
              ? 'Creating booking...'
              : 'Continue to Payment'
          }
          disabled={creating}
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