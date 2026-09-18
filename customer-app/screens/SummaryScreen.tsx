import React, {
  useMemo,
} from 'react'

import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'

import {
  NativeStackScreenProps,
} from '@react-navigation/native-stack'

import {
  COLORS,
} from '../constants/theme'

import {
  RootStackParamList,
} from '../types'

import {
  useBooking,
} from '../context/BookingContext'

type Props =
  NativeStackScreenProps<
    RootStackParamList,
    'Summary'
  >

const pad = (
  value: number
) =>
  String(value).padStart(
    2,
    '0'
  )

const formatDate = (
  value: Date | string | null | undefined
) => {
  if (!value) {
    return '--'
  }

  const date =
    value instanceof Date
      ? value
      : new Date(value)

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return '--'
  }

  return date.toLocaleDateString(
    'en-IN',
    {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }
  )
}

const formatTime = (
  value: Date | string | null | undefined
) => {
  if (!value) {
    return '--'
  }

  const date =
    value instanceof Date
      ? value
      : new Date(value)

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return '--'
  }

  return date.toLocaleTimeString(
    'en-IN',
    {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }
  )
}

const formatCurrency = (
  value:
    | number
    | string
    | null
    | undefined,
  currency = 'INR'
) => {
  const amount =
    Number(value)

  if (
    !Number.isFinite(
      amount
    )
  ) {
    return '--'
  }

  try {
    return new Intl.NumberFormat(
      'en-IN',
      {
        style: 'currency',
        currency,
        maximumFractionDigits: 2,
      }
    ).format(amount)
  } catch {
    return `₹${amount.toFixed(
      2
    )}`
  }
}

const formatWeekdays = (
  weekdays: number[]
) => {
  const labels = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ]

  return weekdays
    .slice()
    .sort(
      (a, b) =>
        a - b
    )
    .map(
      day =>
        labels[day] ||
        String(day)
    )
    .join(', ')
}

const calculateHours = (
  start:
    | Date
    | string
    | null
    | undefined,
  end:
    | Date
    | string
    | null
    | undefined
) => {
  if (
    !start ||
    !end
  ) {
    return 0
  }

  const startDate =
    start instanceof Date
      ? start
      : new Date(start)

  const endDate =
    end instanceof Date
      ? end
      : new Date(end)

  const minutes =
    (endDate.getTime() -
      startDate.getTime()) /
    60000

  if (
    minutes <= 0
  ) {
    return 0
  }

  return minutes / 60
}

export default function SummaryScreen({
  navigation,
}: Props) {
  const {
    selectedService,
    selectedVariant,
    hourlyVariants,
    selectedVariantId,

    bookingMode,

    scheduledDate,

    scheduleStartDate,
    scheduleEndDate,
    scheduleDailyStartTime,
    scheduleDailyEndTime,
    scheduleSelectedWeekdays,
    scheduleOffDates,
    scheduleTotalWorkingHours,

    address,
    coordinates,

    bookingPricing,
  } = useBooking()

  /*
   * Resolve the selected variant from either
   * context's selectedVariant or the catalogue.
   */
  const resolvedVariant =
    useMemo(() => {
      if (
        selectedVariant
      ) {
        return selectedVariant
      }

      if (
        selectedVariantId
      ) {
        return hourlyVariants.find(
          item =>
            item.id ===
            selectedVariantId
        )
      }

      return undefined
    }, [
      selectedVariant,
      selectedVariantId,
      hourlyVariants,
    ])

  const pricing =
    bookingPricing as
      | Record<
          string,
          any
        >
      | null
      | undefined

  const totalPrice =
    pricing?.total_price ??
    pricing?.total ??
    pricing?.amount ??
    pricing?.grand_total ??
    null

  const currency =
    pricing?.currency ||
    'INR'

  const mode =
    bookingMode ||
    'Instant'

  const scheduledStart =
    scheduledDate

  const scheduledHours =
    mode === 'Scheduled'
      ? calculateHours(
          scheduledDate,
          scheduledDate
        )
      : 0

  const recurringHours =
    Number(
      scheduleTotalWorkingHours ||
        0
    )

  const dailyRecurringHours =
    calculateHours(
      scheduleDailyStartTime
        ? new Date(
            scheduleDailyStartTime
          )
        : null,
      scheduleDailyEndTime
        ? new Date(
            scheduleDailyEndTime
          )
        : null
    )

  /*
   * --------------------------------------------------
   * SUMMARY ROW
   * --------------------------------------------------
   */

  const SummaryRow = ({
    label,
    value,
    multiline = false,
  }: {
    label: string
    value: string
    multiline?: boolean
  }) => (
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
        style={[
          styles.summaryValue,
          multiline
            ? styles.summaryValueMultiline
            : null,
        ]}
      >
        {value}
      </Text>
    </View>
  )

  /*
   * --------------------------------------------------
   * DATE / TIME SECTION
   * --------------------------------------------------
   */

  const renderTiming =
    () => {
      if (
        mode === 'Recurring'
      ) {
        return (
          <View
            style={
              styles.card
            }
          >
            <View
              style={
                styles.cardHeader
              }
            >
              <View
                style={
                  styles.cardIcon
                }
              >
                <Text
                  style={
                    styles.cardIconText
                  }
                >
                  ↻
                </Text>
              </View>

              <View
                style={
                  styles.cardHeaderContent
                }
              >
                <Text
                  style={
                    styles.cardTitle
                  }
                >
                  Recurring schedule
                </Text>

                <Text
                  style={
                    styles.cardSubtitle
                  }
                >
                  Repeated service
                  schedule
                </Text>
              </View>
            </View>

            <View
              style={
                styles.divider
              }
            />

            <SummaryRow
              label="DATE RANGE"
              value={`${formatDate(
                scheduleStartDate
              )} – ${formatDate(
                scheduleEndDate
              )}`}
            />

            <SummaryRow
              label="WORKING DAYS"
              value={
                scheduleSelectedWeekdays
                  .length
                  ? formatWeekdays(
                      scheduleSelectedWeekdays
                    )
                  : '--'
              }
              multiline
            />

            <SummaryRow
              label="DAILY HOURS"
              value={`${formatTime(
                scheduleDailyStartTime
              )} – ${formatTime(
                scheduleDailyEndTime
              )}`}
            />

            <SummaryRow
              label="DAILY DURATION"
              value={`${dailyRecurringHours} ${
                dailyRecurringHours ===
                1
                  ? 'hour'
                  : 'hours'
              }`}
            />

            <SummaryRow
              label="WORKING DATES"
              value={`${scheduleTotalWorkingHours && dailyRecurringHours
                ? Math.round(
                    recurringHours /
                      dailyRecurringHours
                  )
                : 0} dates`}
            />

            <SummaryRow
              label="TOTAL HOURS"
              value={`${recurringHours} ${
                recurringHours ===
                1
                  ? 'hour'
                  : 'hours'
              }`}
            />

            <SummaryRow
              label="OFF DATES"
              value={
                scheduleOffDates.length
                  ? scheduleOffDates
                      .slice()
                      .sort()
                      .map(
                        value =>
                          formatDate(
                            new Date(
                              `${value}T00:00:00`
                            )
                          )
                      )
                      .join(', ')
                  : 'None'
              }
              multiline
            />
          </View>
        )
      }

      return (
        <View
          style={
            styles.card
          }
        >
          <View
            style={
              styles.cardHeader
            }
          >
            <View
              style={
                styles.cardIcon
              }
            >
              <Text
                style={
                  styles.cardIconText
                }
              >
                ◷
              </Text>
            </View>

            <View
              style={
                styles.cardHeaderContent
              }
            >
              <Text
                style={
                  styles.cardTitle
                }
              >
                {mode ===
                'Instant'
                  ? 'Instant service'
                  : 'Scheduled service'}
              </Text>

              <Text
                style={
                  styles.cardSubtitle
                }
              >
                {mode ===
                'Instant'
                  ? 'As soon as staff is available'
                  : 'Scheduled appointment'}
              </Text>
            </View>
          </View>

          <View
            style={
              styles.divider
            }
          />

          {mode ===
            'Scheduled' && (
            <SummaryRow
              label="DATE"
              value={formatDate(
                scheduledDate
              )}
            />
          )}

          {mode ===
            'Instant' && (
            <SummaryRow
              label="DATE"
              value={formatDate(
                scheduledDate
              )}
            />
          )}

          <SummaryRow
            label="START"
            value={formatTime(
              scheduledStart
            )}
          />

          <SummaryRow
            label="DURATION"
            value="Configured in booking"
          />

          {mode ===
            'Scheduled' &&
            scheduledHours >
              0 && (
              <SummaryRow
                label="CALCULATED HOURS"
                value={`${scheduledHours} ${
                  scheduledHours ===
                  1
                    ? 'hour'
                    : 'hours'
                }`}
              />
            )}
        </View>
      )
    }

  /*
   * --------------------------------------------------
   * CONTINUE
   * --------------------------------------------------
   */

  const handleContinue =
    () => {
      navigation.navigate(
        'Payment'
      )
    }

  /*
   * --------------------------------------------------
   * RENDER
   * --------------------------------------------------
   */

  return (
    <SafeAreaView
      style={styles.container}
    >
      <View
        style={styles.header}
      >
        <TouchableOpacity
          style={
            styles.backButton
          }
          onPress={() =>
            navigation.goBack()
          }
          activeOpacity={0.8}
        >
          <Text
            style={
              styles.backText
            }
          >
            ‹
          </Text>
        </TouchableOpacity>

        <View
          style={
            styles.headerCenter
          }
        >
          <Text
            style={
              styles.headerEyebrow
            }
          >
            REVIEW
          </Text>

          <Text
            style={
              styles.headerTitle
            }
          >
            Review your booking
          </Text>
        </View>

        <View
          style={
            styles.headerSpacer
          }
        />
      </View>

      <ScrollView
        style={
          styles.scroll
        }
        contentContainerStyle={
          styles.content
        }
        showsVerticalScrollIndicator={
          false
        }
      >
        {/* INTRO */}

        <View
          style={
            styles.intro
          }
        >
          <Text
            style={
              styles.introTitle
            }
          >
            Almost there
          </Text>

          <Text
            style={
              styles.introText
            }
          >
            Check your booking details before
            continuing to payment.
          </Text>
        </View>

        {/* SERVICE */}

        <View
          style={
            styles.card
          }
        >
          <View
            style={
              styles.cardHeader
            }
          >
            <View
              style={
                styles.serviceIcon
              }
            >
              <Text
                style={
                  styles.serviceIconText
                }
              >
                {selectedService
                  ?.charAt(
                    0
                  )
                  .toUpperCase() ||
                  'S'}
              </Text>
            </View>

            <View
              style={
                styles.cardHeaderContent
              }
            >
              <Text
                style={
                  styles.smallLabel
                }
              >
                SERVICE
              </Text>

              <Text
                style={
                  styles.serviceTitle
                }
              >
                {selectedService ||
                  'No service selected'}
              </Text>

              {resolvedVariant ? (
                <Text
                  style={
                    styles.serviceVariant
                  }
                >
                  {
                    resolvedVariant.name
                  }
                </Text>
              ) : null}
            </View>

            <TouchableOpacity
              onPress={() =>
                navigation.goBack()
              }
              activeOpacity={0.8}
            >
              <Text
                style={
                  styles.editText
                }
              >
                Edit
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* BOOKING TYPE */}

        <View
          style={
            styles.card
          }
        >
          <View
            style={
              styles.cardHeader
            }
          >
            <View
              style={
                styles.cardIcon
              }
            >
              <Text
                style={
                  styles.cardIconText
                }
              >
                #
              </Text>
            </View>

            <View
              style={
                styles.cardHeaderContent
              }
            >
              <Text
                style={
                  styles.cardTitle
                }
              >
                Booking type
              </Text>

              <Text
                style={
                  styles.cardSubtitle
                }
              >
                Selected scheduling method
              </Text>
            </View>
          </View>

          <View
            style={
              styles.divider
            }
          />

          <SummaryRow
            label="TYPE"
            value={mode}
          />
        </View>

        {/* TIMING */}

        {renderTiming()}

        {/* LOCATION */}

        <View
          style={
            styles.card
          }
        >
          <View
            style={
              styles.cardHeader
            }
          >
            <View
              style={
                styles.cardIcon
              }
            >
              <Text
                style={
                  styles.cardIconText
                }
              >
                ●
              </Text>
            </View>

            <View
              style={
                styles.cardHeaderContent
              }
            >
              <Text
                style={
                  styles.cardTitle
                }
              >
                Service location
              </Text>

              <Text
                style={
                  styles.cardSubtitle
                }
              >
                Where staff will provide the
                service
              </Text>
            </View>

            <TouchableOpacity
              onPress={() =>
                navigation.goBack()
              }
              activeOpacity={0.8}
            >
              <Text
                style={
                  styles.editText
                }
              >
                Edit
              </Text>
            </TouchableOpacity>
          </View>

          <View
            style={
              styles.divider
            }
          />

          <Text
            style={
              styles.address
            }
          >
            {address ||
              'No location selected'}
          </Text>

          {coordinates ? (
            <Text
              style={
                styles.coordinates
              }
            >
              {coordinates.latitude.toFixed(
                5
              )}
              ,{' '}
              {coordinates.longitude.toFixed(
                5
              )}
            </Text>
          ) : null}
        </View>

        {/* PRICE */}

        <View
          style={
            styles.priceCard
          }
        >
          <View>
            <Text
              style={
                styles.priceLabel
              }
            >
              TOTAL
            </Text>

            <Text
              style={
                styles.priceCaption
              }
            >
              Final amount calculated by the
              booking service.
            </Text>
          </View>

          <Text
            style={
              styles.priceValue
            }
          >
            {formatCurrency(
              totalPrice,
              currency
            )}
          </Text>
        </View>

        <View
          style={
            styles.bottomNote
          }
        >
          <Text
            style={
              styles.bottomNoteText
            }
          >
            Your booking is not created until
            the payment process is completed.
          </Text>
        </View>
      </ScrollView>

      {/* FOOTER */}

      <View
        style={
          styles.footer
        }
      >
        <View
          style={
            styles.footerPrice
          }
        >
          <Text
            style={
              styles.footerLabel
            }
          >
            PAYABLE
          </Text>

          <Text
            style={
              styles.footerValue
            }
          >
            {formatCurrency(
              totalPrice,
              currency
            )}
          </Text>
        </View>

        <TouchableOpacity
          style={
            styles.continueButton
          }
          onPress={
            handleContinue
          }
          activeOpacity={0.88}
        >
          <Text
            style={
              styles.continueText
            }
          >
            Continue to payment →
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor:
        COLORS.light,
    },

    header: {
      height: 70,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      backgroundColor:
        COLORS.white,
      borderBottomWidth: 1,
      borderBottomColor:
        COLORS.border,
    },

    backButton: {
      width: 42,
      height: 42,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor:
        COLORS.light,
    },

    backText: {
      color: COLORS.navy,
      fontSize: 30,
      lineHeight: 32,
      fontWeight: '400',
    },

    headerCenter: {
      flex: 1,
      marginLeft: 12,
    },

    headerEyebrow: {
      color: COLORS.teal,
      fontSize: 9,
      fontWeight: '900',
      letterSpacing: 1.2,
    },

    headerTitle: {
      color: COLORS.navy,
      fontSize: 16,
      fontWeight: '900',
      marginTop: 2,
    },

    headerSpacer: {
      width: 42,
    },

    scroll: {
      flex: 1,
    },

    content: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 25,
    },

    intro: {
      marginBottom: 15,
    },

    introTitle: {
      color: COLORS.navy,
      fontSize: 21,
      fontWeight: '900',
      letterSpacing: -0.5,
    },

    introText: {
      color: COLORS.gray,
      fontSize: 11,
      lineHeight: 17,
      marginTop: 4,
    },

    card: {
      backgroundColor:
        COLORS.white,
      borderRadius: 20,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      padding: 15,
      marginBottom: 12,
    },

    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
    },

    cardHeaderContent: {
      flex: 1,
      marginLeft: 11,
    },

    cardIcon: {
      width: 40,
      height: 40,
      borderRadius: 13,
      backgroundColor:
        COLORS.tealSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },

    cardIconText: {
      color: COLORS.teal,
      fontSize: 16,
      fontWeight: '900',
    },

    serviceIcon: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor:
        COLORS.navy,
      alignItems: 'center',
      justifyContent: 'center',
    },

    serviceIconText: {
      color: '#FFFFFF',
      fontSize: 17,
      fontWeight: '900',
    },

    smallLabel: {
      color: COLORS.gray,
      fontSize: 8,
      fontWeight: '900',
      letterSpacing: 0.9,
      marginBottom: 2,
    },

    serviceTitle: {
      color: COLORS.navy,
      fontSize: 15,
      fontWeight: '900',
    },

    serviceVariant: {
      color: COLORS.gray,
      fontSize: 10,
      marginTop: 3,
    },

    editText: {
      color: COLORS.orange,
      fontSize: 10,
      fontWeight: '900',
    },

    cardTitle: {
      color: COLORS.navy,
      fontSize: 13,
      fontWeight: '900',
    },

    cardSubtitle: {
      color: COLORS.gray,
      fontSize: 9,
      lineHeight: 14,
      marginTop: 2,
    },

    divider: {
      height: 1,
      backgroundColor:
        COLORS.border,
      marginVertical: 13,
    },

    summaryRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent:
        'space-between',
      marginBottom: 10,
      gap: 15,
    },

    summaryLabel: {
      color: COLORS.gray,
      fontSize: 8,
      fontWeight: '900',
      letterSpacing: 0.6,
      flex: 0.8,
    },

    summaryValue: {
      color: COLORS.navy,
      fontSize: 11,
      fontWeight: '800',
      textAlign: 'right',
      flex: 1.6,
    },

    summaryValueMultiline: {
      lineHeight: 16,
    },

    address: {
      color: COLORS.navy,
      fontSize: 12,
      lineHeight: 18,
      fontWeight: '800',
    },

    coordinates: {
      color: COLORS.gray,
      fontSize: 9,
      marginTop: 5,
    },

    priceCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
      backgroundColor:
        COLORS.navy,
      borderRadius: 20,
      padding: 17,
      marginTop: 3,
    },

    priceLabel: {
      color:
        'rgba(255,255,255,0.65)',
      fontSize: 8,
      fontWeight: '900',
      letterSpacing: 1,
    },

    priceCaption: {
      color:
        'rgba(255,255,255,0.65)',
      fontSize: 9,
      lineHeight: 14,
      marginTop: 4,
      maxWidth: 185,
    },

    priceValue: {
      color: '#FFFFFF',
      fontSize: 20,
      fontWeight: '900',
    },

    bottomNote: {
      paddingHorizontal: 4,
      paddingVertical: 12,
    },

    bottomNoteText: {
      color: COLORS.gray,
      fontSize: 9,
      lineHeight: 14,
      textAlign: 'center',
    },

    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor:
        COLORS.white,
      borderTopWidth: 1,
      borderTopColor:
        COLORS.border,
      paddingHorizontal: 14,
      paddingTop: 10,
      paddingBottom: 10,
      gap: 10,
    },

    footerPrice: {
      minWidth: 90,
    },

    footerLabel: {
      color: COLORS.gray,
      fontSize: 7,
      fontWeight: '900',
      letterSpacing: 0.7,
    },

    footerValue: {
      color: COLORS.navy,
      fontSize: 14,
      fontWeight: '900',
      marginTop: 2,
    },

    continueButton: {
      flex: 1,
      minHeight: 50,
      borderRadius: 16,
      backgroundColor:
        COLORS.orange,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 12,
    },

    continueText: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: '900',
    },
  })