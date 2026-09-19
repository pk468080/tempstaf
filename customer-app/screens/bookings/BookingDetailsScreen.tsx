import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'

import { ScreenContainer } from '../../components/layout/ScreenContainer'
import type { HomeService } from '../../types/service'

type BookingDetailsScreenProps = {
  service: HomeService
  bookingType:
    | 'instant'
    | 'scheduled'
    | 'recurring'
  location: {
    latitude: number
    longitude: number
    address: string
  } | null
  startDate: Date | null
  endDate: Date | null
  startTime: Date
  endTime: Date
  selectedWeekdays: string[]
  excludedDates: string[]
  onContinue?: () => void
}

function formatDate(
  date: Date | null,
) {
  if (!date) {
    return 'Not selected'
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

function calculateDurationHours(
  startTime: Date,
  endTime: Date,
) {
  const milliseconds =
    endTime.getTime() -
    startTime.getTime()

  return milliseconds /
    (1000 * 60 * 60)
}

export default function BookingDetailsScreen({
  service,
  bookingType,
  location,
  startDate,
  endDate,
  startTime,
  endTime,
  selectedWeekdays,
  excludedDates,
  onContinue,
}: BookingDetailsScreenProps) {
  const durationHours =
    calculateDurationHours(
      startTime,
      endTime,
    )

  const hourlyPrice =
    service.hourlyPrice ?? 0

  const subtotal =
    durationHours *
    hourlyPrice

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
          Booking details
        </Text>

        <Section title="Service">
          <Row
            label="Service"
            value={service.name}
          />

          <Row
            label="Booking type"
            value={
              bookingType
                .charAt(0)
                .toUpperCase() +
              bookingType.slice(1)
            }
          />

          <Row
            label="Hourly rate"
            value={`${service.currency ?? ''} ${hourlyPrice}/hour`}
          />
        </Section>

        <Section title="Location">
          <Text style={styles.address}>
            {location?.address ??
              'No location selected'}
          </Text>
        </Section>

        <Section title="Schedule">
          <Row
            label="Start time"
            value={formatTime(
              startTime,
            )}
          />

          <Row
            label="End time"
            value={formatTime(
              endTime,
            )}
          />

          <Row
            label="Duration"
            value={`${durationHours} hour${durationHours === 1 ? '' : 's'}`}
          />

          {bookingType !==
          'instant' ? (
            <>
              <Row
                label="Start date"
                value={formatDate(
                  startDate,
                )}
              />

              <Row
                label="End date"
                value={formatDate(
                  endDate,
                )}
              />
            </>
          ) : null}

          {bookingType ===
          'recurring' ? (
            <>
              <Row
                label="Weekdays"
                value={
                  selectedWeekdays.length
                    ? selectedWeekdays.join(
                        ', ',
                      )
                    : 'None'
                }
              />

              <Row
                label="Excluded dates"
                value={
                  excludedDates.length
                    ? excludedDates.join(
                        ', ',
                      )
                    : 'None'
                }
              />
            </>
          ) : null}
        </Section>

        <Section title="Price">
          <Row
            label="Hourly rate"
            value={`${service.currency ?? ''} ${hourlyPrice}`}
          />

          <Row
            label="Duration"
            value={`${durationHours} hour${durationHours === 1 ? '' : 's'}`}
          />

          <View
            style={
              styles.totalRow
            }
          >
            <Text
              style={
                styles.totalLabel
              }
            >
              Subtotal
            </Text>

            <Text
              style={
                styles.totalValue
              }
            >
              {service.currency ?? ''}{' '}
              {subtotal.toFixed(2)}
            </Text>
          </View>

          <Text
            style={
              styles.backendNote
            }
          >
            Final fees, taxes and other
            applicable charges will be
            calculated from backend
            pricing rules before payment.
          </Text>
        </Section>

        <TouchableOpacity
          style={
            styles.continueButton
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
            Continue to Payment
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenContainer>
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

function Row({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <View
      style={
        styles.row
      }
    >
      <Text
        style={
          styles.label
        }
      >
        {label}
      </Text>

      <Text
        style={
          styles.value
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
    marginBottom: 20,
  },

  section: {
    marginBottom: 16,
    padding: 18,
    borderRadius: 16,
    backgroundColor: '#F9FAFB',
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 10,
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    paddingVertical: 7,
  },

  label: {
    color: '#6B7280',
  },

  value: {
    flex: 1,
    textAlign: 'right',
    fontWeight: '600',
    color: '#111827',
  },

  address: {
    color: '#374151',
    lineHeight: 21,
  },

  totalRow: {
    marginTop: 10,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  totalLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },

  totalValue: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
  },

  backendNote: {
    marginTop: 12,
    fontSize: 12,
    lineHeight: 18,
    color: '#6B7280',
  },

  continueButton: {
    minHeight: 54,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111827',
  },

  continueText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
})