import { useMemo, useState } from 'react'
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'

import { ScreenContainer } from '../../components/layout/ScreenContainer'
import type { HomeService } from '../../types/service'

type BookingType =
  | 'instant'
  | 'scheduled'
  | 'recurring'

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
    description: 'Start as soon as a suitable worker is available.',
  },
  {
    value: 'scheduled',
    label: 'Scheduled',
    description: 'Choose a date and time range.',
  },
  {
    value: 'recurring',
    label: 'Recurring',
    description: 'Book repeating dates and time ranges.',
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

export default function BookingScreen({
  service,
  location,
  onContinue,
}: BookingScreenProps) {
  const [bookingType, setBookingType] =
    useState<BookingType>('instant')

  const [startTime, setStartTime] =
    useState('10:00')

  const [endTime, setEndTime] =
    useState('18:00')

  const [startDate, setStartDate] =
    useState('')

  const [endDate, setEndDate] =
    useState('')

  const [selectedWeekdays, setSelectedWeekdays] =
    useState<string[]>([])

  const [excludedDates, setExcludedDates] =
    useState<string[]>([])

  const durationLabel = useMemo(() => {
    if (!startTime || !endTime) {
      return 'Select a time range'
    }

    return `${startTime} – ${endTime}`
  }, [startTime, endTime])

  function toggleWeekday(day: string) {
    setSelectedWeekdays(current =>
      current.includes(day)
        ? current.filter(item => item !== day)
        : [...current, day],
    )
  }

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>
          Book {service.name}
        </Text>

        <Text style={styles.location}>
          {location?.address || 'Select a service location'}
        </Text>

        <View style={styles.typeContainer}>
          {BOOKING_TYPES.map(type => {
            const selected =
              bookingType === type.value

            return (
              <TouchableOpacity
                key={type.value}
                style={[
                  styles.typeCard,
                  selected && styles.typeCardSelected,
                ]}
                onPress={() =>
                  setBookingType(type.value)
                }
              >
                <Text
                  style={[
                    styles.typeLabel,
                    selected && styles.typeLabelSelected,
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

        {bookingType === 'instant' ? (
          <InstantSection
            startTime={startTime}
            endTime={endTime}
            onStartTimeChange={setStartTime}
            onEndTimeChange={setEndTime}
          />
        ) : null}

        {bookingType === 'scheduled' ? (
          <ScheduledSection
            startDate={startDate}
            endDate={endDate}
            startTime={startTime}
            endTime={endTime}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
            onStartTimeChange={setStartTime}
            onEndTimeChange={setEndTime}
          />
        ) : null}

        {bookingType === 'recurring' ? (
          <RecurringSection
            startDate={startDate}
            endDate={endDate}
            startTime={startTime}
            endTime={endTime}
            selectedWeekdays={selectedWeekdays}
            excludedDates={excludedDates}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
            onStartTimeChange={setStartTime}
            onEndTimeChange={setEndTime}
            onToggleWeekday={toggleWeekday}
          />
        ) : null}

        <View style={styles.summary}>
          <Text style={styles.summaryTitle}>
            Booking summary
          </Text>

          <SummaryRow
            label="Service"
            value={service.name}
          />

          <SummaryRow
            label="Booking type"
            value={
              bookingType.charAt(0).toUpperCase() +
              bookingType.slice(1)
            }
          />

          <SummaryRow
            label="Time"
            value={durationLabel}
          />

          <SummaryRow
            label="Hourly price"
            value={
              service.hourlyPrice === null
                ? 'Pricing unavailable'
                : `${service.currency ?? ''} ${service.hourlyPrice}/hour`
            }
          />

          <Text style={styles.backendNote}>
            Final availability and pricing will be
            validated against the backend before
            payment.
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.continueButton,
            service.hourlyPrice === null &&
              styles.disabledButton,
          ]}
          disabled={service.hourlyPrice === null}
          onPress={onContinue}
        >
          <Text style={styles.continueText}>
            Continue
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenContainer>
  )
}

function InstantSection({
  startTime,
  endTime,
  onStartTimeChange,
  onEndTimeChange,
}: {
  startTime: string
  endTime: string
  onStartTimeChange: (value: string) => void
  onEndTimeChange: (value: string) => void
}) {
  return (
    <Section title="Instant booking">
      <Text style={styles.helperText}>
        Select the time range you need. Worker
        availability will be checked before the
        booking is confirmed.
      </Text>

      <TimeRange
        startTime={startTime}
        endTime={endTime}
        onStartTimeChange={onStartTimeChange}
        onEndTimeChange={onEndTimeChange}
      />
    </Section>
  )
}

function ScheduledSection({
  startDate,
  endDate,
  startTime,
  endTime,
  onStartDateChange,
  onEndDateChange,
  onStartTimeChange,
  onEndTimeChange,
}: {
  startDate: string
  endDate: string
  startTime: string
  endTime: string
  onStartDateChange: (value: string) => void
  onEndDateChange: (value: string) => void
  onStartTimeChange: (value: string) => void
  onEndTimeChange: (value: string) => void
}) {
  return (
    <Section title="Scheduled booking">
      <Text style={styles.helperText}>
        Select the requested date range and time
        range. Availability will be checked against
        the selected dates.
      </Text>

      <Field
        label="Start date"
        value={startDate}
        placeholder="YYYY-MM-DD"
        onChangeText={onStartDateChange}
      />

      <Field
        label="End date"
        value={endDate}
        placeholder="YYYY-MM-DD"
        onChangeText={onEndDateChange}
      />

      <TimeRange
        startTime={startTime}
        endTime={endTime}
        onStartTimeChange={onStartTimeChange}
        onEndTimeChange={onEndTimeChange}
      />
    </Section>
  )
}

function RecurringSection({
  startDate,
  endDate,
  startTime,
  endTime,
  selectedWeekdays,
  excludedDates,
  onStartDateChange,
  onEndDateChange,
  onStartTimeChange,
  onEndTimeChange,
  onToggleWeekday,
}: {
  startDate: string
  endDate: string
  startTime: string
  endTime: string
  selectedWeekdays: string[]
  excludedDates: string[]
  onStartDateChange: (value: string) => void
  onEndDateChange: (value: string) => void
  onStartTimeChange: (value: string) => void
  onEndTimeChange: (value: string) => void
  onToggleWeekday: (day: string) => void
}) {
  return (
    <Section title="Recurring booking">
      <Text style={styles.helperText}>
        Select the recurring period, weekdays and
        time range. Individual dates can be excluded
        before availability is validated.
      </Text>

      <Field
        label="Period start"
        value={startDate}
        placeholder="YYYY-MM-DD"
        onChangeText={onStartDateChange}
      />

      <Field
        label="Period end"
        value={endDate}
        placeholder="YYYY-MM-DD"
        onChangeText={onEndDateChange}
      />

      <Text style={styles.fieldLabel}>
        Weekdays
      </Text>

      <View style={styles.weekdayGrid}>
        {WEEKDAYS.map(day => {
          const selected =
            selectedWeekdays.includes(day)

          return (
            <TouchableOpacity
              key={day}
              style={[
                styles.weekday,
                selected && styles.weekdaySelected,
              ]}
              onPress={() =>
                onToggleWeekday(day)
              }
            >
              <Text
                style={[
                  styles.weekdayText,
                  selected &&
                    styles.weekdayTextSelected,
                ]}
              >
                {day.slice(0, 3)}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>

      <TimeRange
        startTime={startTime}
        endTime={endTime}
        onStartTimeChange={onStartTimeChange}
        onEndTimeChange={onEndTimeChange}
      />

      <Text style={styles.fieldLabel}>
        Excluded dates
      </Text>

      <Text style={styles.excludedText}>
        {excludedDates.length === 0
          ? 'No dates excluded'
          : excludedDates.join(', ')}
      </Text>
    </Section>
  )
}

function TimeRange({
  startTime,
  endTime,
  onStartTimeChange,
  onEndTimeChange,
}: {
  startTime: string
  endTime: string
  onStartTimeChange: (value: string) => void
  onEndTimeChange: (value: string) => void
}) {
  return (
    <View>
      <Text style={styles.fieldLabel}>
        Time range
      </Text>

      <View style={styles.row}>
        <Field
          label="Start"
          value={startTime}
          placeholder="10:00"
          onChangeText={onStartTimeChange}
        />

        <View style={styles.rowSpacer} />

        <Field
          label="End"
          value={endTime}
          placeholder="18:00"
          onChangeText={onEndTimeChange}
        />
      </View>
    </View>
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
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>
        {title}
      </Text>

      {children}
    </View>
  )
}

function Field({
  label,
  value,
  placeholder,
  onChangeText,
}: {
  label: string
  value: string
  placeholder: string
  onChangeText: (value: string) => void
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>
        {label}
      </Text>

      <View style={styles.input}>
        <Text
          style={[
            styles.inputText,
            !value && styles.placeholder,
          ]}
          onPress={() => onChangeText(value)}
        >
          {value || placeholder}
        </Text>
      </View>
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
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>
        {label}
      </Text>

      <Text style={styles.summaryValue}>
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
    flex: 1,
    marginTop: 16,
  },

  fieldLabel: {
    marginBottom: 7,
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },

  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    justifyContent: 'center',
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
  },

  inputText: {
    fontSize: 15,
    color: '#111827',
  },

  placeholder: {
    color: '#9CA3AF',
  },

  row: {
    flexDirection: 'row',
  },

  rowSpacer: {
    width: 12,
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

  excludedText: {
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
})