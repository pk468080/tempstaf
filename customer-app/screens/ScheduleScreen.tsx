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
import { NativeStackScreenProps } from '@react-navigation/native-stack'

import { COLORS } from '../constants/theme'
import { RootStackParamList } from '../types'
import { useBooking } from '../context/BookingContext'
import Header from '../components/Header'
import PrimaryButton from '../components/PrimaryButton'

type Props = NativeStackScreenProps<
  RootStackParamList,
  'Schedule'
>

export default function ScheduleScreen({
  navigation,
}: Props) {
  const {
    selectedService,
    selectedPackage,
    setBookingMode,
    setScheduledDate,
  } = useBooking()

  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')

  const dates = useMemo(() => {
    const result: {
      value: string
      label: string
      day: string
    }[] = []

    const now = new Date()

    for (let i = 1; i <= 7; i++) {
      const date = new Date(now)
      date.setDate(now.getDate() + i)

      const value = [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, '0'),
        String(date.getDate()).padStart(2, '0'),
      ].join('-')

      result.push({
        value,
        label: date.toLocaleDateString('en-IN', {
          weekday: 'short',
        }),
        day: date.toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
        }),
      })
    }

    return result
  }, [])

  const times = [
    '08:00 AM',
    '09:00 AM',
    '10:00 AM',
    '11:00 AM',
    '12:00 PM',
    '01:00 PM',
    '02:00 PM',
    '03:00 PM',
    '04:00 PM',
    '05:00 PM',
    '06:00 PM',
    '07:00 PM',
  ]

  const canContinue =
    selectedDate.length > 0 &&
    selectedTime.length > 0

  const continueToCheckout = () => {
    if (!canContinue) {
      Alert.alert(
        'Select date and time',
        'Please choose when you need the TempStaff worker.'
      )
      return
    }

    setBookingMode('Scheduled')

    setScheduledDate(
      `${selectedDate} ${selectedTime}`
    )

    navigation.navigate('Checkout')
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Header
          onBack={() => navigation.goBack()}
        />

        <Text style={styles.title}>
          Schedule your service
        </Text>

        <Text style={styles.subtitle}>
          Choose the date and time when you need the
          TempStaff worker.
        </Text>

        <View style={styles.serviceCard}>
          <Text style={styles.label}>
            SERVICE
          </Text>

          <Text style={styles.service}>
            {selectedService}
          </Text>

          <Text style={styles.package}>
            {selectedPackage?.name}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>
          Select date
        </Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dateList}
        >
          {dates.map(date => {
            const active =
              selectedDate === date.value

            return (
              <TouchableOpacity
                key={date.value}
                style={[
                  styles.dateCard,
                  active && styles.dateCardActive,
                ]}
                onPress={() =>
                  setSelectedDate(date.value)
                }
              >
                <Text
                  style={[
                    styles.dateDay,
                    active && styles.activeText,
                  ]}
                >
                  {date.label}
                </Text>

                <Text
                  style={[
                    styles.dateNumber,
                    active && styles.activeText,
                  ]}
                >
                  {date.day}
                </Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>

        <Text style={styles.sectionTitle}>
          Select time
        </Text>

        <View style={styles.timeGrid}>
          {times.map(time => {
            const active =
              selectedTime === time

            return (
              <TouchableOpacity
                key={time}
                style={[
                  styles.timeCard,
                  active && styles.timeCardActive,
                ]}
                onPress={() =>
                  setSelectedTime(time)
                }
              >
                <Text
                  style={[
                    styles.timeText,
                    active && styles.activeText,
                  ]}
                >
                  {time}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>
            Worker assignment
          </Text>

          <Text style={styles.infoText}>
            You don't choose the worker. TempStaff will
            assign an appropriate worker for your
            scheduled service.
          </Text>
        </View>

        <PrimaryButton
          title="Continue to Payment"
          onPress={continueToCheckout}
          disabled={!canContinue}
        />

        <Text style={styles.note}>
          Your selected date and time will be used for
          worker assignment.
        </Text>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.light,
  },

  content: {
    padding: 22,
    paddingBottom: 45,
  },

  title: {
    color: COLORS.navy,
    fontSize: 30,
    fontWeight: '900',
    marginTop: 18,
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
    borderColor: COLORS.border,
    borderRadius: 18,
    padding: 18,
    marginBottom: 25,
  },

  label: {
    color: COLORS.gray,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 7,
  },

  service: {
    color: COLORS.navy,
    fontSize: 21,
    fontWeight: '900',
  },

  package: {
    color: COLORS.teal,
    fontSize: 14,
    fontWeight: '800',
    marginTop: 5,
  },

  sectionTitle: {
    color: COLORS.navy,
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 12,
  },

  dateList: {
    paddingBottom: 25,
    gap: 10,
  },

  dateCard: {
    width: 92,
    height: 82,
    borderRadius: 16,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  dateCardActive: {
    backgroundColor: COLORS.teal,
    borderColor: COLORS.teal,
  },

  dateDay: {
    color: COLORS.gray,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 5,
  },

  dateNumber: {
    color: COLORS.navy,
    fontSize: 16,
    fontWeight: '900',
  },

  activeText: {
    color: 'white',
  },

  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 25,
  },

  timeCard: {
    width: '31%',
    minHeight: 48,
    borderRadius: 13,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  timeCardActive: {
    backgroundColor: COLORS.teal,
    borderColor: COLORS.teal,
  },

  timeText: {
    color: COLORS.navy,
    fontSize: 13,
    fontWeight: '800',
  },

  infoCard: {
    backgroundColor: '#FFF7EA',
    borderRadius: 17,
    padding: 17,
    marginBottom: 22,
  },

  infoTitle: {
    color: COLORS.navy,
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 6,
  },

  infoText: {
    color: COLORS.gray,
    fontSize: 13,
    lineHeight: 19,
  },

  note: {
    color: COLORS.gray,
    fontSize: 11,
    lineHeight: 17,
    textAlign: 'center',
    marginTop: 13,
  },
})