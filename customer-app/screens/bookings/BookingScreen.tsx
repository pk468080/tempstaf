import { useMemo, useState } from 'react'
import {
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker'

import { ScreenContainer } from '../../components/layout/ScreenContainer'
import type { HomeService } from '../../types/service'

type BookingType =
  | 'instant'
  | 'scheduled'
  | 'recurring'

type PickerMode =
  | 'startDate'
  | 'endDate'
  | 'startTime'
  | 'endTime'
  | 'excludeDate'

type BookingScreenProps = {
  service: HomeService
  location: {
    latitude: number
    longitude: number
    address: string
  } | null
  onContinue?: () => void
}

const BOOKING_TYPES: {
  value: BookingType
  label: string
  description: string
}[] = [
  {
    value: 'instant',
    label: 'Instant',
    description:
      'Start when a suitable worker is available.',
  },
  {
    value: 'scheduled',
    label: 'Scheduled',
    description:
      'Choose a future date and time range.',
  },
  {
    value: 'recurring',
    label: 'Recurring',
    description:
      'Choose repeating dates and time range.',
  },
]

const WEEKDAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]

function startOfToday() {
  const date = new Date()

  date.setHours(0, 0, 0, 0)

  return date
}

function addDays(date: Date, days: number) {
  const result = new Date(date)

  result.setDate(result.getDate() + days)

  return result
}

function formatDate(date: Date | null) {
  if (!date) {
    return 'Select date'
  }

  return date.toLocaleDateString(
    undefined,
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    },
  )
}

function formatTime(date: Date) {
  return date.toLocaleTimeString(
    undefined,
    {
      hour: '2-digit',
      minute: '2-digit',
    },
  )
}

function dateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(
    date.getMonth() + 1,
  ).padStart(2, '0')
  const day = String(
    date.getDate(),
  ).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function formatDateTimeForSummary(
  date: Date | null,
) {
  if (!date) {
    return 'Not selected'
  }

  return `${formatDate(date)} ${formatTime(date)}`
}

export default function BookingScreen({
  service,
  location,
  onContinue,
}: BookingScreenProps) {
  const today = useMemo(
    () => startOfToday(),
    [],
  )

  const [bookingType, setBookingType] =
    useState<BookingType>('instant')

  const [startTime, setStartTime] =
    useState(() => {
      const date = new Date()

      date.setHours(10, 0, 0, 0)

      return date
    })

  const [endTime, setEndTime] =
    useState(() => {
      const date = new Date()

      date.setHours(18, 0, 0, 0)

      return date
    })

  const [startDate, setStartDate] =
    useState<Date | null>(null)

  const [endDate, setEndDate] =
    useState<Date | null>(null)

  const [selectedWeekdays, setSelectedWeekdays] =
    useState<string[]>([])

  const [excludedDates, setExcludedDates] =
    useState<string[]>([])

  const [pickerMode, setPickerMode] =
    useState<PickerMode | null>(null)

  const [excludeDateValue, setExcludeDateValue] =
    useState<Date>(today)

  function openPicker(
    mode: PickerMode,
  ) {
    if (
      mode === 'excludeDate'
    ) {
      setExcludeDateValue(today)
    }

    setPickerMode(mode)
  }

  function closePicker() {
    setPickerMode(null)
  }

  function handlePickerChange(
    event: DateTimePickerEvent,
    selectedDate?: Date,
  ) {
    if (
      event.type === 'dismissed' ||
      !selectedDate
    ) {
      if (Platform.OS === 'android') {
        closePicker()
      }

      return
    }

    switch (pickerMode) {
      case 'startDate':
        setStartDate(selectedDate)

        if (
          endDate &&
          endDate < selectedDate
        ) {
          setEndDate(selectedDate)
        }

        break

      case 'endDate':
        if (
          startDate &&
          selectedDate < startDate
        ) {
          setEndDate(startDate)
        } else {
          setEndDate(selectedDate)
        }

        break

      case 'startTime':
        setStartTime(selectedDate)

        if (
          selectedDate >= endTime
        ) {
          const nextEnd =
            new Date(selectedDate)

          nextEnd.setHours(
            selectedDate.getHours() + 1,
            selectedDate.getMinutes(),
            0,
            0,
          )

          setEndTime(nextEnd)
        }

        break

      case 'endTime':
        setEndTime(selectedDate)
        break

      case 'excludeDate': {
        const key =
          dateKey(selectedDate)

        setExcludedDates(current =>
          current.includes(key)
            ? current
            : [
                ...current,
                key,
              ].sort(),
        )

        break
      }
    }

    if (Platform.OS === 'android') {
      closePicker()
    }
  }

  function toggleWeekday(
    day: string,
  ) {
    setSelectedWeekdays(current =>
      current.includes(day)
        ? current.filter(
            item => item !== day,
          )
        : [
            ...current,
            day,
          ],
    )
  }

  const durationLabel =
    `${formatTime(startTime)} – ${formatTime(endTime)}`

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={
          styles.content
        }
        showsVerticalScrollIndicator={
          false
        }
      >
        <Text style={styles.title}>
          Book {service.name}
        </Text>

        <Text style={styles.location}>
          {location?.address ||
            'Select a service location'}
        </Text>

        <View
          style={
            styles.typeContainer
          }
        >
          {BOOKING_TYPES.map(type => {
            const selected =
              bookingType ===
              type.value

            return (
              <TouchableOpacity
                key={type.value}
                style={[
                  styles.typeCard,
                  selected &&
                    styles.typeCardSelected,
                ]}
                activeOpacity={0.8}
                onPress={() =>
                  setBookingType(
                    type.value,
                  )
                }
              >
                <Text
                  style={[
                    styles.typeLabel,
                    selected &&
                      styles.typeLabelSelected,
                  ]}
                >
                  {type.label}
                </Text>

                <Text
                  style={[
                    styles.typeDescription,
                    selected &&
                      styles.typeDescriptionSelected,
                  ]}
                >
                  {type.description}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>

        {bookingType ===
        'instant' ? (
          <Section title="Instant booking">
            <Text style={styles.helperText}>
              Select the time range you
              need. Worker availability
              will be checked before
              confirmation.
            </Text>

            <TimeButton
              label="Start time"
              value={formatTime(
                startTime,
              )}
              onPress={() =>
                openPicker(
                  'startTime',
                )
              }
            />

            <TimeButton
              label="End time"
              value={formatTime(
                endTime,
              )}
              onPress={() =>
                openPicker(
                  'endTime',
                )
              }
            />
          </Section>
        ) : null}

        {bookingType ===
        'scheduled' ? (
          <Section title="Scheduled booking">
            <Text style={styles.helperText}>
              Select the requested date
              range and time range.
            </Text>

            <DateButton
              label="Start date"
              value={formatDate(
                startDate,
              )}
              onPress={() =>
                openPicker(
                  'startDate',
                )
              }
            />

            <DateButton
              label="End date"
              value={formatDate(
                endDate,
              )}
              onPress={() =>
                openPicker(
                  'endDate',
                )
              }
            />

            <TimeButton
              label="Start time"
              value={formatTime(
                startTime,
              )}
              onPress={() =>
                openPicker(
                  'startTime',
                )
              }
            />

            <TimeButton
              label="End time"
              value={formatTime(
                endTime,
              )}
              onPress={() =>
                openPicker(
                  'endTime',
                )
              }
            />
          </Section>
        ) : null}

        {bookingType ===
        'recurring' ? (
          <Section title="Recurring booking">
            <Text style={styles.helperText}>
              Select the recurring period,
              weekdays, exclusions and
              time range.
            </Text>

            <DateButton
              label="Period start"
              value={formatDate(
                startDate,
              )}
              onPress={() =>
                openPicker(
                  'startDate',
                )
              }
            />

            <DateButton
              label="Period end"
              value={formatDate(
                endDate,
              )}
              onPress={() =>
                openPicker(
                  'endDate',
                )
              }
            />

            <Text
              style={
                styles.fieldLabel
              }
            >
              Weekdays
            </Text>

            <View
              style={
                styles.weekdayGrid
              }
            >
              {WEEKDAYS.map(day => {
                const selected =
                  selectedWeekdays.includes(
                    day,
                  )

                return (
                  <TouchableOpacity
                    key={day}
                    style={[
                      styles.weekday,
                      selected &&
                        styles.weekdaySelected,
                    ]}
                    onPress={() =>
                      toggleWeekday(
                        day,
                      )
                    }
                  >
                    <Text
                      style={[
                        styles.weekdayText,
                        selected &&
                          styles.weekdayTextSelected,
                      ]}
                    >
                      {day.slice(
                        0,
                        3,
                      )}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>

            <TimeButton
              label="Start time"
              value={formatTime(
                startTime,
              )}
              onPress={() =>
                openPicker(
                  'startTime',
                )
              }
            />

            <TimeButton
              label="End time"
              value={formatTime(
                endTime,
              )}
              onPress={() =>
                openPicker(
                  'endTime',
                )
              }
            />

            <Text
              style={
                styles.fieldLabel
              }
            >
              Excluded dates
            </Text>

            <TouchableOpacity
              style={
                styles.secondaryButton
              }
              onPress={() =>
                openPicker(
                  'excludeDate',
                )
              }
            >
              <Text
                style={
                  styles.secondaryButtonText
                }
              >
                Add excluded date
              </Text>
            </TouchableOpacity>

            {excludedDates.length >
            0 ? (
              <View
                style={
                  styles.excludedList
                }
              >
                {excludedDates.map(
                  date => (
                    <View
                      key={date}
                      style={
                        styles.excludedRow
                      }
                    >
                      <Text
                        style={
                          styles.excludedText
                        }
                      >
                        {date}
                      </Text>

                      <TouchableOpacity
                        onPress={() =>
                          setExcludedDates(
                            current =>
                              current.filter(
                                item =>
                                  item !==
                                  date,
                              ),
                          )
                        }
                      >
                        <Text
                          style={
                            styles.removeText
                          }
                        >
                          Remove
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ),
                )}
              </View>
            ) : (
              <Text
                style={
                  styles.noExcludedText
                }
              >
                No dates excluded
              </Text>
            )}
          </Section>
        ) : null}

        <View
          style={styles.summary}
        >
          <Text
            style={
              styles.summaryTitle
            }
          >
            Booking summary
          </Text>

          <SummaryRow
            label="Service"
            value={service.name}
          />

          <SummaryRow
            label="Booking type"
            value={
              bookingType
                .charAt(0)
                .toUpperCase() +
              bookingType.slice(1)
            }
          />

          <SummaryRow
            label="Time"
            value={
              durationLabel
            }
          />

          {bookingType !==
          'instant' ? (
            <>
              <SummaryRow
                label="Start"
                value={
                  formatDate(
                    startDate,
                  )
                }
              />

              <SummaryRow
                label="End"
                value={
                  formatDate(
                    endDate,
                  )
                }
              />
            </>
          ) : null}

          {bookingType ===
          'recurring' ? (
            <>
              <SummaryRow
                label="Weekdays"
                value={
                  selectedWeekdays.length >
                  0
                    ? selectedWeekdays.join(
                        ', ',
                      )
                    : 'None selected'
                }
              />

              <SummaryRow
                label="Excluded dates"
                value={
                  excludedDates.length >
                  0
                    ? excludedDates.join(
                        ', ',
                      )
                    : 'None'
                }
              />
            </>
          ) : null}

          <SummaryRow
            label="Hourly price"
            value={
              service.hourlyPrice ===
              null
                ? 'Pricing unavailable'
                : `${service.currency ?? ''} ${service.hourlyPrice}/hour`
            }
          />

          <Text
            style={
              styles.backendNote
            }
          >
            Final availability and
            pricing will be validated
            against the backend before
            payment.
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.continueButton,
            service.hourlyPrice ===
              null &&
              styles.disabledButton,
          ]}
          disabled={
            service.hourlyPrice ===
            null
          }
          onPress={
            onContinue
          }
        >
          <Text
            style={
              styles.continueText
            }
          >
            Continue
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {pickerMode ? (
        <PickerModal
          mode={pickerMode}
          startDate={startDate}
          endDate={endDate}
          startTime={startTime}
          endTime={endTime}
          excludeDateValue={
            excludeDateValue
          }
          today={today}
          onChange={
            handlePickerChange
          }
          onClose={
            closePicker
          }
        />
      ) : null}
    </ScreenContainer>
  )
}

function PickerModal({
  mode,
  startDate,
  endDate,
  startTime,
  endTime,
  excludeDateValue,
  today,
  onChange,
  onClose,
}: {
  mode: PickerMode
  startDate: Date | null
  endDate: Date | null
  startTime: Date
  endTime: Date
  excludeDateValue: Date
  today: Date
  onChange: (
    event: DateTimePickerEvent,
    date?: Date,
  ) => void
  onClose: () => void
}) {
  const isDate =
    mode === 'startDate' ||
    mode === 'endDate' ||
    mode === 'excludeDate'

  const value =
    mode === 'startDate'
      ? startDate ?? today
      : mode === 'endDate'
        ? endDate ??
          startDate ??
          today
        : mode === 'startTime'
          ? startTime
          : mode === 'endTime'
            ? endTime
            : excludeDateValue

  const minimumDate =
    mode === 'startDate' ||
    mode === 'excludeDate'
      ? today
      : mode === 'endDate'
        ? startDate ??
          today
        : undefined

  return (
    <Modal
      visible
      transparent
      animationType="slide"
      onRequestClose={
        onClose
      }
    >
      <View
        style={
          styles.modalOverlay
        }
      >
        <View
          style={
            styles.pickerContainer
          }
        >
          <View
            style={
              styles.modalHeader
            }
          >
            <Text
              style={
                styles.modalTitle
              }
            >
              {isDate
                ? 'Select date'
                : 'Select time'}
            </Text>

            <TouchableOpacity
              onPress={
                onClose
              }
            >
              <Text
                style={
                  styles.closeText
                }
              >
                Close
              </Text>
            </TouchableOpacity>
          </View>

          <DateTimePicker
            value={value}
            mode={
              isDate
                ? 'date'
                : 'time'
            }
            display={
              Platform.OS ===
              'ios'
                ? 'spinner'
                : 'default'
            }
            minimumDate={
              minimumDate
            }
            is24Hour
            onChange={
              onChange
            }
          />

          {Platform.OS ===
          'ios' ? (
            <TouchableOpacity
              style={
                styles.doneButton
              }
              onPress={
                onClose
              }
            >
              <Text
                style={
                  styles.doneButtonText
                }
              >
                Done
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </Modal>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <View
      style={styles.section}
    >
      <Text
        style={
          styles.sectionTitle
        }
      >
        {title}
      </Text>

      {children}
    </View>
  )
}

function DateButton({
  label,
  value,
  onPress,
}: {
  label: string
  value: string
  onPress: () => void
}) {
  return (
    <View style={styles.field}>
      <Text
        style={
          styles.fieldLabel
        }
      >
        {label}
      </Text>

      <TouchableOpacity
        style={styles.input}
        onPress={onPress}
      >
        <Text
          style={
            styles.inputText
          }
        >
          {value}
        </Text>
      </TouchableOpacity>
    </View>
  )
}

function TimeButton({
  label,
  value,
  onPress,
}: {
  label: string
  value: string
  onPress: () => void
}) {
  return (
    <View style={styles.field}>
      <Text
        style={
          styles.fieldLabel
        }
      >
        {label}
      </Text>

      <TouchableOpacity
        style={styles.input}
        onPress={onPress}
      >
        <Text
          style={
            styles.inputText
          }
        >
          {value}
        </Text>
      </TouchableOpacity>
    </View>
  )
}

function SummaryRow({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <View
      style={
        styles.summaryRow
      }
    >
      <Text
        style={
          styles.summaryLabel
        }
      >
        {label}
      </Text>

      <Text
        style={
          styles.summaryValue
        }
      >
        {value}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    paddingBottom: 40,
  },

  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },

  location: {
    marginTop: 6,
    color: '#6B7280',
    lineHeight: 20,
  },

  typeContainer: {
    marginTop: 22,
    gap: 10,
  },

  typeCard: {
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
  },

  typeCardSelected: {
    borderColor: '#111827',
    backgroundColor: '#F3F4F6',
  },

  typeLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },

  typeLabelSelected: {
    fontWeight: '800',
  },

  typeDescription: {
    marginTop: 5,
    color: '#6B7280',
    lineHeight: 20,
  },

  typeDescriptionSelected: {
    color: '#374151',
  },

  section: {
    marginTop: 24,
    padding: 18,
    borderRadius: 16,
    backgroundColor: '#F9FAFB',
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },

  helperText: {
    marginTop: 8,
    color: '#6B7280',
    lineHeight: 20,
  },

  field: {
    marginTop: 16,
  },

  fieldLabel: {
    marginBottom: 7,
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },

  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    justifyContent: 'center',
    paddingHorizontal: 14,
    backgroundColor: '#FFFFFF',
  },

  inputText: {
    fontSize: 15,
    color: '#111827',
  },

  weekdayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  weekday: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
  },

  weekdaySelected: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },

  weekdayText: {
    fontWeight: '600',
    color: '#374151',
  },

  weekdayTextSelected: {
    color: '#FFFFFF',
  },

  secondaryButton: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },

  secondaryButtonText: {
    fontWeight: '700',
    color: '#111827',
  },

  excludedList: {
    marginTop: 10,
    gap: 8,
  },

  excludedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },

  excludedText: {
    color: '#374151',
  },

  removeText: {
    fontWeight: '700',
    color: '#DC2626',
  },

  noExcludedText: {
    marginTop: 10,
    color: '#6B7280',
  },

  summary: {
    marginTop: 24,
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  summaryTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },

  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    paddingVertical: 7,
  },

  summaryLabel: {
    color: '#6B7280',
  },

  summaryValue: {
    flex: 1,
    textAlign: 'right',
    fontWeight: '600',
    color: '#111827',
  },

  backendNote: {
    marginTop: 12,
    fontSize: 12,
    lineHeight: 18,
    color: '#6B7280',
  },

  continueButton: {
    marginTop: 20,
    minHeight: 54,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111827',
  },

  disabledButton: {
    opacity: 0.45,
  },

  continueText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor:
      'rgba(0, 0, 0, 0.35)',
  },

  pickerContainer: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    paddingBottom: 32,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
  },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },

  closeText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#007AFF',
  },

  doneButton: {
    marginTop: 18,
    minHeight: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111827',
  },

  doneButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
})