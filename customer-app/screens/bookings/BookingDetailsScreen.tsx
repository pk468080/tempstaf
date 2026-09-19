import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { useEffect, useState } from 'react'

import { ScreenContainer } from '../../components/layout/ScreenContainer'
import {
  calculateMultiOccurrenceBookingPrice,
  type BookingPriceResult,
} from '../../services/booking/bookingPricing.service'
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

const WEEKDAY_INDEX: Record<string, number> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
}

function formatDate(date: Date | null) {
  if (!date) {
    return 'Not selected'
  }

  return date.toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatTime(date: Date) {
  return date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function toDateString(date: Date) {
  const year = date.getFullYear()
  const month = String(
    date.getMonth() + 1,
  ).padStart(2, '0')
  const day = String(
    date.getDate(),
  ).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function toTimeString(date: Date) {
  const hours = String(
    date.getHours(),
  ).padStart(2, '0')

  const minutes = String(
    date.getMinutes(),
  ).padStart(2, '0')

  const seconds = String(
    date.getSeconds(),
  ).padStart(2, '0')

  return `${hours}:${minutes}:${seconds}`
}

function formatMoney(
  amount: number | undefined,
  currency: string | undefined,
) {
  if (
    amount === undefined ||
    !Number.isFinite(amount)
  ) {
    return '—'
  }

  return `${currency ?? ''} ${amount.toFixed(2)}`.trim()
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
  const [
    pricing,
    setPricing,
  ] = useState<BookingPriceResult | null>(null)

  const [
    pricingError,
    setPricingError,
  ] = useState<string | null>(null)

  const [
    pricingLoading,
    setPricingLoading,
  ] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadPrice() {
      setPricing(null)
      setPricingError(null)

      if (
        bookingType !== 'recurring'
      ) {
        return
      }

      if (!startDate || !endDate) {
        setPricingError(
          'Booking dates are required.',
        )
        return
      }

      if (
        selectedWeekdays.length === 0
      ) {
        setPricingError(
          'Select at least one weekday.',
        )
        return
      }

      setPricingLoading(true)

      try {
        const weekdayIndexes =
          selectedWeekdays
            .map(
              day =>
                WEEKDAY_INDEX[day],
            )
            .filter(
              value =>
                value !== undefined,
            )

        const result =
          await calculateMultiOccurrenceBookingPrice(
            {
              serviceVariantId:
                service.serviceVariantId,

              startDate:
                toDateString(
                  startDate,
                ),

              endDate:
                toDateString(
                  endDate,
                ),

              startTime:
                toTimeString(
                  startTime,
                ),

              endTime:
                toTimeString(
                  endTime,
                ),

              selectedWeekdays:
                weekdayIndexes,

              excludedDates,

              bookingType:
                'recurring',
            },
          )

        if (cancelled) {
          return
        }

        if (!result.success) {
          setPricingError(
            'The backend could not calculate this booking price.',
          )
          return
        }

        setPricing(result)
      } catch (error) {
        if (cancelled) {
          return
        }

        setPricingError(
          error instanceof Error
            ? error.message
            : 'Unable to calculate booking price.',
        )
      } finally {
        if (!cancelled) {
          setPricingLoading(false)
        }
      }
    }

    void loadPrice()

    return () => {
      cancelled = true
    }
  }, [
    bookingType,
    service.serviceVariantId,
    startDate,
    endDate,
    startTime,
    endTime,
    selectedWeekdays,
    excludedDates,
  ])

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
          {pricingLoading ? (
            <View
              style={
                styles.loadingContainer
              }
            >
              <ActivityIndicator />

              <Text
                style={
                  styles.loadingText
                }
              >
                Calculating price…
              </Text>
            </View>
          ) : pricingError ? (
            <View
              style={
                styles.errorContainer
              }
            >
              <Text
                style={
                  styles.errorTitle
                }
              >
                Price unavailable
              </Text>

              <Text
                style={
                  styles.errorText
                }
              >
                {pricingError}
              </Text>
            </View>
          ) : pricing ? (
            <>
              <Row
                label="Working hours"
                value={`${pricing.total_working_hours ?? 0}`}
              />

              <Row
                label="Occurrences"
                value={`${pricing.occurrence_count ?? 0}`}
              />

              <Row
                label="Gross amount"
                value={formatMoney(
                  pricing.gross_amount,
                  pricing.currency,
                )}
              />

              {pricing.discount_amount !==
              undefined ? (
                <Row
                  label="Discount"
                  value={formatMoney(
                    pricing.discount_amount,
                    pricing.currency,
                  )}
                />
              ) : null}

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
                  Final price
                </Text>

                <Text
                  style={
                    styles.totalValue
                  }
                >
                  {formatMoney(
                    pricing.final_amount,
                    pricing.currency,
                  )}
                </Text>
              </View>

              <Text
                style={
                  styles.backendNote
                }
              >
                Price calculated by the
                backend pricing engine.
              </Text>
            </>
          ) : bookingType ===
            'scheduled' ? (
            <View
              style={
                styles.errorContainer
              }
            >
              <Text
                style={
                  styles.errorTitle
                }
              >
                Price calculation pending
              </Text>

              <Text
                style={
                  styles.errorText
                }
              >
                Scheduled date-range pricing
                will be calculated by the
                backend booking flow.
              </Text>
            </View>
          ) : (
            <Text
              style={
                styles.loadingText
              }
            >
              Price will be calculated by
              the backend.
            </Text>
          )}
        </Section>

        <TouchableOpacity
          style={[
            styles.continueButton,
            pricingLoading &&
              styles.disabledButton,
            pricingError &&
              styles.disabledButton,
          ]}
          disabled={
            pricingLoading ||
            Boolean(pricingError)
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
    <View style={styles.row}>
      <Text
        style={styles.label}
      >
        {label}
      </Text>

      <Text
        style={styles.value}
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

  loadingContainer: {
    minHeight: 80,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },

  loadingText: {
    color: '#6B7280',
    lineHeight: 20,
  },

  errorContainer: {
    paddingVertical: 8,
  },

  errorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#B91C1C',
  },

  errorText: {
    marginTop: 6,
    color: '#6B7280',
    lineHeight: 20,
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
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },

  totalValue: {
    fontSize: 18,
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

  disabledButton: {
    opacity: 0.45,
  },

  continueText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
})