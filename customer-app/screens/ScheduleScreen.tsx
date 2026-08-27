import { useMemo, useState } from 'react'
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
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

type DateOption = {
  value: string
  weekday: string
  date: string
  month: string
}

export default function ScheduleScreen({
  navigation,
}: Props) {
  const {
    selectedService,
    selectedPackage,
    setBookingMode,
    setScheduledDate,
  } = useBooking()

  const [selectedDate, setSelectedDate] =
    useState('')
  const [selectedTime, setSelectedTime] =
    useState('')

  const dates = useMemo<DateOption[]>(() => {
    const result: DateOption[] = []
    const now = new Date()

    for (let i = 1; i <= 14; i++) {
      const date = new Date(now)
      date.setHours(0, 0, 0, 0)
      date.setDate(now.getDate() + i)

      const value = [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, '0'),
        String(date.getDate()).padStart(2, '0'),
      ].join('-')

      result.push({
        value,
        weekday: date.toLocaleDateString(
          'en-IN',
          {
            weekday: 'short',
          }
        ),
        date: date.toLocaleDateString(
          'en-IN',
          {
            day: 'numeric',
          }
        ),
        month: date.toLocaleDateString(
          'en-IN',
          {
            month: 'short',
          }
        ),
      })
    }

    return result
  }, [])

  const timeSlots = [
    {
      value: '08:00 AM',
      label: '8:00 AM',
    },
    {
      value: '09:00 AM',
      label: '9:00 AM',
    },
    {
      value: '10:00 AM',
      label: '10:00 AM',
    },
    {
      value: '11:00 AM',
      label: '11:00 AM',
    },
    {
      value: '12:00 PM',
      label: '12:00 PM',
    },
    {
      value: '01:00 PM',
      label: '1:00 PM',
    },
    {
      value: '02:00 PM',
      label: '2:00 PM',
    },
    {
      value: '03:00 PM',
      label: '3:00 PM',
    },
    {
      value: '04:00 PM',
      label: '4:00 PM',
    },
    {
      value: '05:00 PM',
      label: '5:00 PM',
    },
    {
      value: '06:00 PM',
      label: '6:00 PM',
    },
    {
      value: '07:00 PM',
      label: '7:00 PM',
    },
  ]

  const selectedDateObject = dates.find(
    date => date.value === selectedDate
  )

  const canContinue =
    selectedDate.length > 0 &&
    selectedTime.length > 0

  const continueToCheckout = () => {
    if (!canContinue) {
      Alert.alert(
        'Select date and time',
        'Please choose both a date and a time for your booking.'
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
        contentContainerStyle={styles.page}
        showsVerticalScrollIndicator={false}
      >
        <Header
          onBack={() => navigation.goBack()}
        />

        {/* Progress */}
        <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
            <View style={styles.progressFill} />
          </View>

          <Text style={styles.progressText}>
            SCHEDULE · DATE & TIME
          </Text>
        </View>

        {/* Heading */}
        <View style={styles.heading}>
          <Text style={styles.title}>
            Schedule your service
          </Text>

          <Text style={styles.subtitle}>
            Choose when you need the TempStaff worker.
            You can select a date up to 14 days ahead.
          </Text>
        </View>

        {/* Booking summary */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryIcon}>
            <Text style={styles.summaryEmoji}>
              📅
            </Text>
          </View>

          <View style={styles.summaryContent}>
            <Text style={styles.summaryLabel}>
              SCHEDULED BOOKING
            </Text>

            <Text
              style={styles.serviceName}
              numberOfLines={2}
            >
              {selectedService ||
                'Staff service'}
            </Text>

            <Text
              style={styles.packageName}
              numberOfLines={2}
            >
              {selectedPackage?.name ||
                'Staffing package'}
            </Text>
          </View>
        </View>

        {/* Date */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>
              Select date
            </Text>

            <Text style={styles.sectionSubtitle}>
              Choose the day you need staff
            </Text>
          </View>

          {selectedDateObject ? (
            <View style={styles.selectedBadge}>
              <Text style={styles.selectedBadgeText}>
                SELECTED
              </Text>
            </View>
          ) : null}
        </View>

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
                  active &&
                    styles.dateCardActive,
                ]}
                onPress={() =>
                  setSelectedDate(date.value)
                }
                activeOpacity={0.85}
              >
                <Text
                  style={[
                    styles.dateWeekday,
                    active &&
                      styles.activeText,
                  ]}
                >
                  {date.weekday}
                </Text>

                <Text
                  style={[
                    styles.dateNumber,
                    active &&
                      styles.activeText,
                  ]}
                >
                  {date.date}
                </Text>

                <Text
                  style={[
                    styles.dateMonth,
                    active &&
                      styles.activeText,
                  ]}
                >
                  {date.month}
                </Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>

        {/* Time */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>
              Select time
            </Text>

            <Text style={styles.sectionSubtitle}>
              Available one-hour booking slots
            </Text>
          </View>
        </View>

        <View style={styles.timeGrid}>
          {timeSlots.map(time => {
            const active =
              selectedTime === time.value

            return (
              <TouchableOpacity
                key={time.value}
                style={[
                  styles.timeCard,
                  active &&
                    styles.timeCardActive,
                ]}
                onPress={() =>
                  setSelectedTime(
                    time.value
                  )
                }
                activeOpacity={0.85}
              >
                <View
                  style={[
                    styles.timeRadio,
                    active &&
                      styles.timeRadioActive,
                  ]}
                >
                  {active ? (
                    <View
                      style={
                        styles.timeRadioDot
                      }
                    />
                  ) : null}
                </View>

                <Text
                  style={[
                    styles.timeText,
                    active &&
                      styles.activeTimeText,
                  ]}
                >
                  {time.label}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>

        {/* Selection preview */}
        <View style={styles.previewCard}>
          <View style={styles.previewIcon}>
            <Text style={styles.previewEmoji}>
              🕐
            </Text>
          </View>

          <View style={styles.previewContent}>
            <Text style={styles.previewLabel}>
              YOUR SCHEDULE
            </Text>

            {canContinue ? (
              <>
                <Text
                  style={styles.previewValue}
                >
                  {selectedDateObject?.weekday},{' '}
                  {selectedDateObject?.date}{' '}
                  {selectedDateObject?.month}
                </Text>

                <Text
                  style={styles.previewTime}
                >
                  {selectedTime}
                </Text>
              </>
            ) : (
              <Text
                style={styles.previewEmpty}
              >
                Select a date and time
              </Text>
            )}
          </View>
        </View>

        {/* Worker assignment */}
        <View style={styles.infoCard}>
          <View style={styles.infoIcon}>
            <Text style={styles.infoIconText}>
              ✓
            </Text>
          </View>

          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>
              TempStaff handles worker assignment
            </Text>

            <Text style={styles.infoText}>
              Once your booking is confirmed, we
              will assign an appropriate available
              worker for your selected time.
            </Text>
          </View>
        </View>

        {/* Recurring placeholder */}
        <View style={styles.recurringCard}>
          <View style={styles.recurringIcon}>
            <Text style={styles.recurringEmoji}>
              🔁
            </Text>
          </View>

          <View style={styles.recurringContent}>
            <View style={styles.recurringTitleRow}>
              <Text style={styles.recurringTitle}>
                Need staff regularly?
              </Text>

              <View style={styles.comingBadge}>
                <Text style={styles.comingText}>
                  COMING SOON
                </Text>
              </View>
            </View>

            <Text style={styles.recurringText}>
              Recurring bookings will let you arrange
              regular staffing without creating each
              booking separately.
            </Text>
          </View>
        </View>

        {/* Continue */}
        <View style={styles.bottom}>
          <PrimaryButton
            title="Continue to Payment"
            onPress={continueToCheckout}
            disabled={!canContinue}
          />

          <Text style={styles.bottomNote}>
            Payment integration will be connected
            separately.
          </Text>
        </View>
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
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 45,
  },

  progressContainer: {
    marginTop: 5,
    marginBottom: 20,
  },

  progressTrack: {
    height: 4,
    width: '100%',
    backgroundColor: '#DDE3E9',
    borderRadius: 3,
    overflow: 'hidden',
  },

  progressFill: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.teal,
    borderRadius: 3,
  },

  progressText: {
    color: COLORS.gray,
    fontSize: 9,
    lineHeight: 14,
    fontWeight: '800',
    letterSpacing: 0.7,
    marginTop: 7,
  },

  heading: {
    marginBottom: 19,
  },

  title: {
    color: COLORS.navy,
    fontSize: 28,
    lineHeight: 35,
    fontWeight: '900',
  },

  subtitle: {
    color: COLORS.gray,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 7,
  },

  summaryCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 19,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 23,
  },

  summaryIcon: {
    width: 51,
    height: 51,
    borderRadius: 15,
    backgroundColor: '#E8F6F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  summaryEmoji: {
    fontSize: 25,
  },

  summaryContent: {
    flex: 1,
  },

  summaryLabel: {
    color: COLORS.gray,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.8,
  },

  serviceName: {
    color: COLORS.navy,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '900',
    marginTop: 3,
  },

  packageName: {
    color: COLORS.teal,
    fontSize: 11.5,
    lineHeight: 16,
    fontWeight: '800',
    marginTop: 2,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 11,
  },

  sectionTitle: {
    color: COLORS.navy,
    fontSize: 19,
    lineHeight: 25,
    fontWeight: '900',
  },

  sectionSubtitle: {
    color: COLORS.gray,
    fontSize: 10.5,
    lineHeight: 16,
    marginTop: 2,
  },

  selectedBadge: {
    backgroundColor: '#E8F6F6',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },

  selectedBadgeText: {
    color: COLORS.teal,
    fontSize: 7,
    fontWeight: '900',
  },

  dateList: {
    paddingBottom: 24,
    gap: 9,
  },

  dateCard: {
    width: 78,
    height: 91,
    borderRadius: 17,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  dateCardActive: {
    backgroundColor: COLORS.teal,
    borderColor: COLORS.teal,
  },

  dateWeekday: {
    color: COLORS.gray,
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 4,
  },

  dateNumber: {
    color: COLORS.navy,
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '900',
  },

  dateMonth: {
    color: COLORS.gray,
    fontSize: 10,
    fontWeight: '700',
    marginTop: 1,
  },

  activeText: {
    color: COLORS.white,
  },

  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 18,
  },

  timeCard: {
    width: '31.5%',
    height: 50,
    borderRadius: 13,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    marginBottom: 9,
  },

  timeCardActive: {
    backgroundColor: COLORS.teal,
    borderColor: COLORS.teal,
  },

  timeRadio: {
    width: 15,
    height: 15,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#C7D0D7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },

  timeRadioActive: {
    borderColor: COLORS.white,
  },

  timeRadioDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.white,
  },

  timeText: {
    color: COLORS.navy,
    fontSize: 10.5,
    fontWeight: '800',
  },

  activeTimeText: {
    color: COLORS.white,
  },

  previewCard: {
    backgroundColor: COLORS.navy,
    borderRadius: 19,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },

  previewIcon: {
    width: 45,
    height: 45,
    borderRadius: 14,
    backgroundColor:
      'rgba(255,255,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },

  previewEmoji: {
    fontSize: 22,
  },

  previewContent: {
    flex: 1,
  },

  previewLabel: {
    color: '#B8C8D7',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.8,
  },

  previewValue: {
    color: COLORS.white,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '900',
    marginTop: 3,
  },

  previewTime: {
    color: '#9FE0DE',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '800',
    marginTop: 1,
  },

  previewEmpty: {
    color: '#B8C8D7',
    fontSize: 12,
    marginTop: 4,
  },

  infoCard: {
    backgroundColor: '#E8F6F6',
    borderRadius: 17,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },

  infoIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: COLORS.teal,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  infoIconText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '900',
  },

  infoContent: {
    flex: 1,
  },

  infoTitle: {
    color: COLORS.navy,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '900',
  },

  infoText: {
    color: COLORS.gray,
    fontSize: 10.5,
    lineHeight: 16,
    marginTop: 3,
  },

  recurringCard: {
    backgroundColor: '#F5F7F9',
    borderWidth: 1,
    borderColor: '#E2E7EC',
    borderRadius: 17,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },

  recurringIcon: {
    width: 43,
    height: 43,
    borderRadius: 13,
    backgroundColor: '#E6EBEF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  recurringEmoji: {
    fontSize: 20,
  },

  recurringContent: {
    flex: 1,
  },

  recurringTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },

  recurringTitle: {
    color: COLORS.navy,
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: '900',
  },

  comingBadge: {
    backgroundColor: '#E1E6EA',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 3,
    marginLeft: 6,
  },

  comingText: {
    color: COLORS.gray,
    fontSize: 6,
    fontWeight: '900',
  },

  recurringText: {
    color: COLORS.gray,
    fontSize: 10,
    lineHeight: 15,
    marginTop: 3,
  },

  bottom: {
    marginTop: 1,
  },

  bottomNote: {
    color: COLORS.gray,
    fontSize: 10,
    lineHeight: 15,
    textAlign: 'center',
    marginTop: 9,
  },
})