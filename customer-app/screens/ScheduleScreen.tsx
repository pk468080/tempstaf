import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  ActivityIndicator,
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
import { supabase } from '../lib/supabase'
import Header from '../components/Header'
import PrimaryButton from '../components/PrimaryButton'

type Props = NativeStackScreenProps<
  RootStackParamList,
  'Schedule'
>

type AvailabilitySlot = {
  slot_start: string
  slot_end: string
}

type DateOption = {
  value: string
  weekday: string
  date: string
  month: string
}

type TimeOption = {
  value: string
  label: string
  slotStart: string
  slotEnd: string
}

function toDateKey(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

function formatTime(
  value: string,
) {
  const date = new Date(value)

  return date.toLocaleTimeString(
    'en-IN',
    {
      hour: 'numeric',
      minute: '2-digit',
    },
  )
}

function formatDateParts(
  value: string,
): DateOption {
  const date = new Date(`${value}T00:00:00`)

  return {
    value,
    weekday: date.toLocaleDateString(
      'en-IN',
      {
        weekday: 'short',
      },
    ),
    date: date.toLocaleDateString(
      'en-IN',
      {
        day: 'numeric',
      },
    ),
    month: date.toLocaleDateString(
      'en-IN',
      {
        month: 'short',
      },
    ),
  }
}

export default function ScheduleScreen({
  navigation,
}: Props) {
  const {
    selectedService,
    selectedPackageId,
    selectedPackage,
    addressId,
    setBookingMode,
    setScheduledDate,
  } = useBooking()

  const [availability, setAvailability] =
    useState<AvailabilitySlot[]>([])

  const [selectedDate, setSelectedDate] =
    useState('')

  const [selectedTime, setSelectedTime] =
    useState('')

  const [loading, setLoading] =
    useState(false)

  const [error, setError] =
    useState('')

  const loadAvailability =
    async () => {
      if (
        !selectedPackageId ||
        !addressId
      ) {
        setAvailability([])
        setSelectedDate('')
        setSelectedTime('')
        return
      }

      setLoading(true)
      setError('')
      setSelectedDate('')
      setSelectedTime('')

      try {
        const today = new Date()

        const startDate =
          toDateKey(today)

        const end = new Date(today)

        end.setDate(
          end.getDate() + 30,
        )

        const endDate =
          toDateKey(end)

        const {
          data,
          error: rpcError,
        } = await supabase.rpc(
          'get_customer_scheduled_slots',
          {
            p_service_variant_id:
              selectedPackageId,
            p_address_id:
              addressId,
            p_start_date:
              startDate,
            p_end_date:
              endDate,
          },
        )

        if (rpcError) {
          throw rpcError
        }

        const slots =
          (data ?? []) as AvailabilitySlot[]

        setAvailability(slots)
      } catch (rpcError) {
        console.error(
          '[TempStaff] SCHEDULE AVAILABILITY ERROR:',
          JSON.stringify(
            rpcError,
            null,
            2,
          ),
        )

        setAvailability([])

        setError(
          'Unable to load available schedule times right now.',
        )
      } finally {
        setLoading(false)
      }
    }

  useEffect(() => {
    loadAvailability()
  }, [
    selectedPackageId,
    addressId,
  ])

  const dates = useMemo<
    DateOption[]
  >(() => {
    const uniqueDates =
      Array.from(
        new Set(
          availability.map(
            slot =>
              slot.slot_start.slice(
                0,
                10,
              ),
          ),
        ),
      )

    return uniqueDates.map(
      formatDateParts,
    )
  }, [availability])

  const timeSlots = useMemo<
    TimeOption[]
  >(() => {
    if (!selectedDate) {
      return []
    }

    const seen =
      new Set<string>()

    return availability
      .filter(slot =>
        slot.slot_start.startsWith(
          selectedDate,
        ),
      )
      .filter(slot => {
        const key =
          `${slot.slot_start}|${slot.slot_end}`

        if (seen.has(key)) {
          return false
        }

        seen.add(key)

        return true
      })
      .map(slot => ({
        value: slot.slot_start,
        label: formatTime(
          slot.slot_start,
        ),
        slotStart:
          slot.slot_start,
        slotEnd:
          slot.slot_end,
      }))
  }, [
    availability,
    selectedDate,
  ])

  const selectedDateObject =
    dates.find(
      date =>
        date.value === selectedDate,
    )

  const selectedTimeObject =
    timeSlots.find(
      time =>
        time.value === selectedTime,
    )

  const canContinue =
    Boolean(
      selectedDate &&
      selectedTime &&
      selectedTimeObject,
    )

  const continueToCheckout =
    () => {
      if (
        !canContinue ||
        !selectedTimeObject
      ) {
        Alert.alert(
          'Select date and time',
          'Please choose an available date and time for your booking.',
        )

        return
      }

      setBookingMode('Scheduled')

      setScheduledDate(
        selectedTimeObject.slotStart,
      )

      navigation.navigate(
        'Checkout',
      )
    }

  return (
    <SafeAreaView
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={
          styles.page
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

        <View
          style={
            styles.progressContainer
          }
        >
          <View
            style={
              styles.progressTrack
            }
          >
            <View
              style={
                styles.progressFill
              }
            />
          </View>

          <Text
            style={
              styles.progressText
            }
          >
            SCHEDULE · DATE & TIME
          </Text>
        </View>

        <View
          style={styles.heading}
        >
          <Text
            style={styles.title}
          >
            Schedule your service
          </Text>

          <Text
            style={styles.subtitle}
          >
            Choose an available date
            and time for your
            TempStaff worker.
          </Text>
        </View>

        <View
          style={styles.summaryCard}
        >
          <View
            style={styles.summaryIcon}
          >
            <Text
              style={
                styles.summaryEmoji
              }
            >
              📅
            </Text>
          </View>

          <View
            style={styles.summaryContent}
          >
            <Text
              style={
                styles.summaryLabel
              }
            >
              SCHEDULED BOOKING
            </Text>

            <Text
              style={
                styles.serviceName
              }
              numberOfLines={2}
            >
              {selectedService ||
                'Staff service'}
            </Text>

            <Text
              style={
                styles.packageName
              }
              numberOfLines={2}
            >
              {selectedPackage?.name ||
                'Staffing package'}
            </Text>
          </View>
        </View>

        <View
          style={styles.sectionHeader}
        >
          <View>
            <Text
              style={
                styles.sectionTitle
              }
            >
              Select date
            </Text>

            <Text
              style={
                styles.sectionSubtitle
              }
            >
              Dates are based on worker
              availability.
            </Text>
          </View>

          {selectedDateObject ? (
            <View
              style={
                styles.selectedBadge
              }
            >
              <Text
                style={
                  styles.selectedBadgeText
                }
              >
                SELECTED
              </Text>
            </View>
          ) : null}
        </View>

        {loading ? (
          <View
            style={styles.loadingCard}
          >
            <ActivityIndicator
              size="small"
              color={COLORS.teal}
            />

            <Text
              style={
                styles.loadingText
              }
            >
              Checking available
              schedules...
            </Text>
          </View>
        ) : error ? (
          <View
            style={styles.errorCard}
          >
            <Text
              style={
                styles.errorTitle
              }
            >
              Schedule unavailable
            </Text>

            <Text
              style={styles.errorText}
            >
              {error}
            </Text>

            <TouchableOpacity
              style={
                styles.retryButton
              }
              onPress={
                loadAvailability
              }
              activeOpacity={0.85}
            >
              <Text
                style={
                  styles.retryText
                }
              >
                Try again
              </Text>
            </TouchableOpacity>
          </View>
        ) : dates.length === 0 ? (
          <View
            style={styles.emptyCard}
          >
            <Text
              style={
                styles.emptyTitle
              }
            >
              No dates available
            </Text>

            <Text
              style={
                styles.emptyText
              }
            >
              There are currently no
              matching worker schedules
              for this service and
              location.
            </Text>
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={
              false
            }
            contentContainerStyle={
              styles.dateList
            }
          >
            {dates.map(date => {
              const active =
                selectedDate ===
                date.value

              return (
                <TouchableOpacity
                  key={date.value}
                  style={[
                    styles.dateCard,
                    active &&
                      styles.dateCardActive,
                  ]}
                  onPress={() => {
                    setSelectedDate(
                      date.value,
                    )
                    setSelectedTime('')
                  }}
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
        )}

        <View
          style={styles.sectionHeader}
        >
          <View>
            <Text
              style={
                styles.sectionTitle
              }
            >
              Select time
            </Text>

            <Text
              style={
                styles.sectionSubtitle
              }
            >
              Times are generated from
              worker schedules.
            </Text>
          </View>
        </View>

        {selectedDate ? (
          timeSlots.length > 0 ? (
            <View
              style={styles.timeGrid}
            >
              {timeSlots.map(time => {
                const active =
                  selectedTime ===
                  time.value

                return (
                  <TouchableOpacity
                    key={
                      `${time.slotStart}-${time.slotEnd}`
                    }
                    style={[
                      styles.timeCard,
                      active &&
                        styles.timeCardActive,
                    ]}
                    onPress={() =>
                      setSelectedTime(
                        time.value,
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
          ) : (
            <View
              style={styles.emptyCard}
            >
              <Text
                style={
                  styles.emptyTitle
                }
              >
                No times available
              </Text>

              <Text
                style={styles.emptyText}
              >
                No worker schedule matches
                the selected date.
              </Text>
            </View>
          )
        ) : (
          <View
            style={styles.emptyCard}
          >
            <Text
              style={styles.emptyText}
            >
              Select an available date
              to see its times.
            </Text>
          </View>
        )}

        <View
          style={styles.previewCard}
        >
          <View
            style={styles.previewIcon}
          >
            <Text
              style={
                styles.previewEmoji
              }
            >
              🕐
            </Text>
          </View>

          <View
            style={styles.previewContent}
          >
            <Text
              style={
                styles.previewLabel
              }
            >
              YOUR SCHEDULE
            </Text>

            {canContinue ? (
              <>
                <Text
                  style={
                    styles.previewValue
                  }
                >
                  {selectedDateObject?.weekday},{' '}
                  {selectedDateObject?.date}{' '}
                  {selectedDateObject?.month}
                </Text>

                <Text
                  style={
                    styles.previewTime
                  }
                >
                  {formatTime(
                    selectedTimeObject!.slotStart,
                  )}
                </Text>
              </>
            ) : (
              <Text
                style={
                  styles.previewEmpty
                }
              >
                Select an available date
                and time
              </Text>
            )}
          </View>
        </View>

        <View
          style={styles.infoCard}
        >
          <View
            style={styles.infoIcon}
          >
            <Text
              style={
                styles.infoIconText
              }
            >
              ✓
            </Text>
          </View>

          <View
            style={styles.infoContent}
          >
            <Text
              style={styles.infoTitle}
            >
              TempStaff handles worker
              assignment
            </Text>

            <Text
              style={styles.infoText}
            >
              Your selected schedule is
              checked against eligible
              worker schedules before
              booking.
            </Text>
          </View>
        </View>

        <View
          style={styles.recurringCard}
        >
          <View
            style={styles.recurringIcon}
          >
            <Text
              style={
                styles.recurringEmoji
              }
            >
              🔁
            </Text>
          </View>

          <View
            style={styles.recurringContent}
          >
            <View
              style={
                styles.recurringTitleRow
              }
            >
              <Text
                style={
                  styles.recurringTitle
                }
              >
                Need staff regularly?
              </Text>

              <View
                style={
                  styles.comingBadge
                }
              >
                <Text
                  style={
                    styles.comingText
                  }
                >
                  COMING SOON
                </Text>
              </View>
            </View>

            <Text
              style={
                styles.recurringText
              }
            >
              Recurring bookings will let
              you arrange regular staffing
              without creating each booking
              separately.
            </Text>
          </View>
        </View>

        <View
          style={styles.bottom}
        >
          <PrimaryButton
            title="Continue to Payment"
            onPress={
              continueToCheckout
            }
            disabled={!canContinue}
          />

          <Text
            style={styles.bottomNote}
          >
            Payment integration will be
            connected separately.
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

  loadingCard: {
    minHeight: 100,
    borderRadius: 17,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },

  loadingText: {
    color: COLORS.gray,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 9,
  },

  errorCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 17,
    padding: 16,
    marginBottom: 22,
  },

  errorTitle: {
    color: COLORS.navy,
    fontSize: 14,
    fontWeight: '900',
  },

  errorText: {
    color: COLORS.gray,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 5,
  },

  retryButton: {
    alignSelf: 'flex-start',
    marginTop: 12,
    backgroundColor: COLORS.teal,
    borderRadius: 11,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },

  retryText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '900',
  },

  emptyCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 17,
    padding: 17,
    marginBottom: 22,
  },

  emptyTitle: {
    color: COLORS.navy,
    fontSize: 13,
    fontWeight: '900',
  },

  emptyText: {
    color: COLORS.gray,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 5,
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