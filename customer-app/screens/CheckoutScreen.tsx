import React, {
  useMemo,
  useState,
} from 'react'

import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'

import RazorpayCheckout from 'react-native-razorpay'

import { COLORS } from '../constants/theme'
import { useBooking } from '../context/BookingContext'

import {
  createHourlyBooking,
  createRecurringBooking,
} from '../services/booking'

import {
  createRazorpayOrder,
  verifyRazorpayPayment,
} from '../services/payment'

import Header from '../components/Header'
import PrimaryButton from '../components/PrimaryButton'

/*
 * =============================================================================
 * HELPERS
 * =============================================================================
 */

function normalizeBookingMode(
  value: unknown
) {
  const normalized =
    String(value ?? '')
      .trim()
      .toLowerCase()

  if (normalized === 'instant') {
    return 'instant' as const
  }

  if (normalized === 'recurring') {
    return 'recurring' as const
  }

  return 'scheduled' as const
}

function getVariantId(
  value: unknown
): string {
  if (
    typeof value === 'string'
  ) {
    return value
  }

  if (
    value &&
    typeof value === 'object' &&
    'id' in value
  ) {
    const id =
      (value as {
        id?: unknown
      }).id

    return typeof id === 'string'
      ? id
      : ''
  }

  return ''
}

function getVariantName(
  value: unknown
): string {
  if (
    typeof value === 'string'
  ) {
    return value
  }

  if (
    value &&
    typeof value === 'object' &&
    'name' in value
  ) {
    const name =
      (value as {
        name?: unknown
      }).name

    return typeof name === 'string'
      ? name
      : 'Hourly service'
  }

  return 'Hourly service'
}

function getServiceName(
  value: unknown
): string {
  if (
    typeof value === 'string'
  ) {
    return value
  }

  if (
    value &&
    typeof value === 'object' &&
    'name' in value
  ) {
    const name =
      (value as {
        name?: unknown
      }).name

    return typeof name === 'string'
      ? name
      : 'Selected service'
  }

  return 'Selected service'
}

function formatDate(
  value?: string | null
) {
  if (!value) {
    return '—'
  }

  const date =
    new Date(
      `${value}T00:00:00`
    )

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value
  }

  return date.toLocaleDateString(
    undefined,
    {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }
  )
}

function formatTime(
  value?: string | null
) {
  if (!value) {
    return '—'
  }

  const match =
    value.match(
      /^(\d{1,2}):(\d{2})/
    )

  if (!match) {
    return value
  }

  const hours =
    Number(match[1])

  const minutes =
    Number(match[2])

  const suffix =
    hours >= 12
      ? 'PM'
      : 'AM'

  const displayHour =
    hours % 12 || 12

  return `${displayHour}:${String(
    minutes
  ).padStart(2, '0')} ${suffix}`
}

function formatCurrency(
  amount?: number | null,
  currency = 'INR'
) {
  if (
    amount === undefined ||
    amount === null ||
    !Number.isFinite(amount)
  ) {
    return 'Calculated at checkout'
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
    return `${currency} ${amount.toFixed(2)}`
  }
}

function normalizeTime(
  value?: string | null
) {
  if (!value) {
    return null
  }

  const match =
    value.match(
      /^(\d{1,2}):(\d{2})(?::\d{2})?$/
    )

  if (!match) {
    return value
  }

  return `${String(
    Number(match[1])
  ).padStart(2, '0')}:${match[2]}`
}

function combineDateAndTime(
  date?: string | null,
  time?: string | null
) {
  if (!date || !time) {
    return null
  }

  const normalizedTime =
    normalizeTime(time)

  if (!normalizedTime) {
    return null
  }

  return `${date}T${normalizedTime}:00`
}

function getWeekdayLabel(
  weekday: number
) {
  const labels = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ]

  return (
    labels[weekday] ??
    `Day ${weekday}`
  )
}

/*
 * =============================================================================
 * SCREEN
 * =============================================================================
 */

const CheckoutScreen = ({
  navigation,
}: {
  navigation: any
}) => {
  const {
    selectedService,
    selectedVariant,

    address,
    addressId,

    bookingMode,

    hourlyStartTime,
    hourlyEndTime,

    scheduleStartDate,
    scheduleEndDate,
    scheduleDailyStartTime,
    scheduleDailyEndTime,
    scheduleSelectedWeekdays,
    scheduleOffDates,

    bookingPricing,

    setBookingId,
    setPaymentDone,
  } = useBooking()

  const [
    isPaying,
    setIsPaying,
  ] = useState(false)

  const [
    paymentError,
    setPaymentError,
  ] = useState<string | null>(
    null
  )

  /*
   * ---------------------------------------------------------------------------
   * Normalize frontend state.
   *
   * The existing BookingContext has evolved during the migration and
   * selectedVariant may currently be represented as either its ID or its
   * catalogue object. Keep this screen compatible with both forms.
   * ---------------------------------------------------------------------------
   */

  const variantId =
    getVariantId(
      selectedVariant
    )

  const serviceName =
    getServiceName(
      selectedService
    )

  const variantName =
    getVariantName(
      selectedVariant
    )

  const method =
    normalizeBookingMode(
      bookingMode
    )

  const currency =
    String(
      bookingPricing?.currency ??
        'INR'
    )

  const displayAmount =
    bookingPricing?.finalAmount ??
    null

  const selectedWeekdays =
    Array.isArray(
      scheduleSelectedWeekdays
    )
      ? scheduleSelectedWeekdays
      : []

  const offDates =
    Array.isArray(
      scheduleOffDates
    )
      ? scheduleOffDates
      : []

  const recurringStartDate =
    scheduleStartDate

  const recurringEndDate =
    scheduleEndDate ||
    scheduleStartDate

  /*
   * ---------------------------------------------------------------------------
   * Booking summary
   * ---------------------------------------------------------------------------
   */

  const bookingSummary =
    useMemo(() => {
      if (
        method === 'instant'
      ) {
        return {
          title:
            'Instant booking',

          detail:
            hourlyStartTime &&
            hourlyEndTime
              ? `${formatTime(
                  hourlyStartTime
                )} – ${formatTime(
                  hourlyEndTime
                )}`
              : 'Requested time',
        }
      }

      if (
        method === 'recurring'
      ) {
        const weekdays =
          selectedWeekdays
            .slice()
            .sort(
              (a, b) =>
                a - b
            )
            .map(
              getWeekdayLabel
            )
            .join(', ')

        return {
          title:
            'Recurring booking',

          detail:
            weekdays ||
            'Selected weekdays',
        }
      }

      return {
        title:
          'Scheduled booking',

        detail:
          scheduleStartDate &&
          scheduleDailyStartTime &&
          scheduleDailyEndTime
            ? `${formatDate(
                scheduleStartDate
              )}, ${formatTime(
                scheduleDailyStartTime
              )} – ${formatTime(
                scheduleDailyEndTime
              )}`
            : 'Selected schedule',
      }
    }, [
      method,
      hourlyStartTime,
      hourlyEndTime,
      scheduleStartDate,
      scheduleDailyStartTime,
      scheduleDailyEndTime,
      selectedWeekdays,
    ])

  /*
   * =============================================================================
   * VALIDATION
   * =============================================================================
   */

  const validateCheckout =
    () => {
      if (!selectedService) {
        return 'Please select a service.'
      }

      if (!variantId) {
        return 'Please select an hourly service.'
      }

      if (!addressId) {
        return 'Please select a booking location.'
      }

      if (!address) {
        return 'Please select a booking location.'
      }

      if (
        method === 'instant'
      ) {
        if (
          !hourlyStartTime ||
          !hourlyEndTime
        ) {
          return 'Please select the instant booking start and end time.'
        }

        return null
      }

      if (
        method === 'scheduled'
      ) {
        if (
          !scheduleStartDate ||
          !scheduleDailyStartTime ||
          !scheduleDailyEndTime
        ) {
          return 'Please select the scheduled date and time.'
        }

        return null
      }

      if (
        !recurringStartDate ||
        !recurringEndDate
      ) {
        return 'Please select the recurring date range.'
      }

      if (
        !scheduleDailyStartTime ||
        !scheduleDailyEndTime
      ) {
        return 'Please select the recurring start and end time.'
      }

      if (
        selectedWeekdays.length === 0
      ) {
        return 'Please select at least one recurring weekday.'
      }

      return null
    }

  /*
   * =============================================================================
   * CREATE BOOKING
   * =============================================================================
   */

  const createBookingForCheckout =
    async () => {
      if (!variantId) {
        throw new Error(
          'Service variant is missing.'
        )
      }

      if (!addressId) {
        throw new Error(
          'Booking address is missing.'
        )
      }

      /*
       * -------------------------------------------------------------------------
       * INSTANT
       * -------------------------------------------------------------------------
       *
       * Backend decides whether a nearby live worker is actually available.
       */

      if (
        method === 'instant'
      ) {
        if (
          !hourlyStartTime ||
          !hourlyEndTime
        ) {
          throw new Error(
            'Instant booking time is missing.'
          )
        }

        return createHourlyBooking({
          serviceVariantId:
            variantId,

          addressId,

          bookingType:
            'instant',

          scheduledStart:
            hourlyStartTime,

          scheduledEnd:
            hourlyEndTime,
        })
      }

      /*
       * -------------------------------------------------------------------------
       * SCHEDULED
       * -------------------------------------------------------------------------
       *
       * Scheduled hourly bookings use the existing backend hourly booking
       * ingress. The backend performs the authoritative schedule/availability
       * validation.
       */

      if (
        method === 'scheduled'
      ) {
        if (
          !scheduleStartDate ||
          !scheduleDailyStartTime ||
          !scheduleDailyEndTime
        ) {
          throw new Error(
            'Scheduled booking time is missing.'
          )
        }

        const scheduledStart =
          combineDateAndTime(
            scheduleStartDate,
            scheduleDailyStartTime
          )

        const scheduledEnd =
          combineDateAndTime(
            scheduleStartDate,
            scheduleDailyEndTime
          )

        if (
          !scheduledStart ||
          !scheduledEnd
        ) {
          throw new Error(
            'Invalid scheduled booking date or time.'
          )
        }

        return createHourlyBooking({
          serviceVariantId:
            variantId,

          addressId,

          bookingType:
            'scheduled',

          scheduledStart,

          scheduledEnd,
        })
      }

      /*
       * -------------------------------------------------------------------------
       * RECURRING
       * -------------------------------------------------------------------------
       *
       * Backend generates the individual occurrences and applies the
       * configured recurring pricing.
       */

      if (
        !recurringStartDate ||
        !recurringEndDate ||
        !scheduleDailyStartTime ||
        !scheduleDailyEndTime
      ) {
        throw new Error(
          'Recurring booking schedule is incomplete.'
        )
      }

      if (
        selectedWeekdays.length === 0
      ) {
        throw new Error(
          'At least one recurring weekday is required.'
        )
      }

      return createRecurringBooking({
        serviceVariantId:
          variantId,

        addressId,

        scheduleStartDate:
          recurringStartDate,

        scheduleEndDate:
          recurringEndDate,

        dailyStartTime:
          scheduleDailyStartTime,

        dailyEndTime:
          scheduleDailyEndTime,

        selectedWeekdays,

        offDates,
      })
    }

  /*
   * =============================================================================
   * PAYMENT
   * =============================================================================
   */

  const payNow =
    async () => {
      if (isPaying) {
        return
      }

      setPaymentError(
        null
      )

      const validationError =
        validateCheckout()

      if (validationError) {
        Alert.alert(
          'Checkout incomplete',
          validationError
        )

        return
      }

      setIsPaying(true)

      try {
        /*
         * -----------------------------------------------------------------------
         * 1. Create the booking on the backend.
         *
         * The backend remains authoritative for:
         * - area availability
         * - worker availability
         * - scheduling
         * - worker conflicts
         * - duration
         * - operating hours
         * - pricing
         * - booking state
         */

        const booking =
          await createBookingForCheckout()

        /*
         * Instant booking can legitimately return a fallback response when
         * there is no currently available nearby worker.
         */

        if (
          method === 'instant' &&
          booking.instantAvailable === false &&
          booking.fallbackToScheduled
        ) {
          setIsPaying(false)

          Alert.alert(
            'No worker available now',
            booking.message ||
              'No nearby worker is currently available for this time. Please choose a scheduled booking.',
            [
              {
                text:
                  'Choose scheduled',

                onPress:
                  () =>
                    navigation.navigate(
                      'Schedule'
                    ),
              },
              {
                text:
                  'Cancel',

                style:
                  'cancel',
              },
            ]
          )

          return
        }

        if (
          booking.success === false &&
          !booking.id
        ) {
          throw new Error(
            booking.message ||
              'The booking could not be created.'
          )
        }

        const currentBookingId =
          booking.id ||
          booking.bookingId

        if (!currentBookingId) {
          throw new Error(
            'The server did not return a booking ID.'
          )
        }

        setBookingId(
          currentBookingId
        )

        /*
         * -----------------------------------------------------------------------
         * 2. Create Razorpay order.
         *
         * The server derives the payment amount from the booking/payment
         * records. The customer app does not send a calculated amount.
         */

        const order =
          await createRazorpayOrder(
            currentBookingId
          )

        /*
         * -----------------------------------------------------------------------
         * 3. Open Razorpay.
         * -----------------------------------------------------------------------
         */

        const payment =
          await RazorpayCheckout.open({
            key:
              order.keyId,

            amount:
              order.amount,

            currency:
              order.currency,

            name:
              'TempStaff',

            description:
              `${serviceName} · ${variantName}`,

            order_id:
              order.orderId,

            prefill: {
              name: '',
              email: '',
              contact: '',
            },

            theme: {
              color:
                COLORS.orange,
            },
          })

        /*
         * -----------------------------------------------------------------------
         * 4. Server-side payment verification.
         * -----------------------------------------------------------------------
         */

        const verification =
          await verifyRazorpayPayment(
            currentBookingId,

            String(
              payment.razorpay_order_id ||
                order.orderId
            ),

            String(
              payment.razorpay_payment_id ||
                ''
            ),

            String(
              payment.razorpay_signature ||
                ''
            )
          )

        if (
          !verification?.success
        ) {
          throw new Error(
            verification?.error ||
              'Payment verification failed.'
          )
        }

        setPaymentDone(
          true
        )

        navigation.navigate(
          'BookingConfirmed'
        )
      } catch (error: any) {
        const message =
          String(
            error?.description ||
              error?.message ||
              ''
          )

        const lowerMessage =
          message.toLowerCase()

        const isUserCancelled =
          lowerMessage.includes(
            'cancel'
          ) ||
          lowerMessage.includes(
            'dismiss'
          )

        if (
          !isUserCancelled
        ) {
          console.error(
            '[TempStaff] Checkout/payment failed:',
            error
          )

          setPaymentError(
            message ||
              'Unable to complete payment.'
          )

          Alert.alert(
            'Payment not completed',
            message ||
              'Unable to complete payment. Please try again.'
          )
        }
      } finally {
        setIsPaying(false)
      }
    }

  /*
   * =============================================================================
   * UI
   * =============================================================================
   */

  return (
    <SafeAreaView
      style={styles.safeArea}
    >
      <Header
        onBack={() =>
          navigation.goBack()
        }
      />

      <ScrollView
        contentContainerStyle={
          styles.content
        }
        showsVerticalScrollIndicator={
          false
        }
      >
        <Text
          style={styles.pageTitle}
        >
          Checkout
        </Text>

        <View
          style={styles.section}
        >
          <Text
            style={
              styles.sectionTitle
            }
          >
            Booking summary
          </Text>

          <View
            style={styles.card}
          >
            <Text
              style={
                styles.serviceName
              }
            >
              {serviceName}
            </Text>

            <Text
              style={
                styles.variantName
              }
            >
              {variantName}
            </Text>

            <View
              style={
                styles.divider
              }
            />

            <SummaryRow
              label="Booking type"
              value={
                bookingSummary.title
              }
            />

            <SummaryRow
              label="Time"
              value={
                bookingSummary.detail
              }
            />

            {method ===
              'recurring' && (
              <>
                <SummaryRow
                  label="Date range"
                  value={`${formatDate(
                    recurringStartDate
                  )} – ${formatDate(
                    recurringEndDate
                  )}`}
                />

                <SummaryRow
                  label="Weekdays"
                  value={
                    selectedWeekdays
                      .slice()
                      .sort(
                        (a, b) =>
                          a - b
                      )
                      .map(
                        getWeekdayLabel
                      )
                      .join(', ')
                  }
                />

                {offDates.length >
                  0 && (
                  <SummaryRow
                    label="Excluded dates"
                    value={`${offDates.length} date${
                      offDates.length ===
                      1
                        ? ''
                        : 's'
                    }`}
                  />
                )}
              </>
            )}
          </View>
        </View>

        <View
          style={styles.section}
        >
          <Text
            style={
              styles.sectionTitle
            }
          >
            Service location
          </Text>

          <View
            style={styles.card}
          >
            <Text
              style={
                styles.addressLabel
              }
            >
              Booking location
            </Text>

            <Text
              style={
                styles.addressText
              }
            >
              {address ||
                'Selected address'}
            </Text>
          </View>
        </View>

        <View
          style={styles.section}
        >
          <Text
            style={
              styles.sectionTitle
            }
          >
            Payment
          </Text>

          <View
            style={
              styles.paymentCard
            }
          >
            <View
              style={
                styles.amountRow
              }
            >
              <Text
                style={
                  styles.amountLabel
                }
              >
                Payable amount
              </Text>

              <Text
                style={
                  styles.amountValue
                }
              >
                {formatCurrency(
                  displayAmount,
                  currency
                )}
              </Text>
            </View>

            <Text
              style={
                styles.amountNote
              }
            >
              Final pricing is determined by
              the TempStaff backend using the
              current admin-configured pricing
              rules.
            </Text>
          </View>
        </View>

        {paymentError && (
          <View
            style={
              styles.errorCard
            }
          >
            <Text
              style={
                styles.errorTitle
              }
            >
              Payment issue
            </Text>

            <Text
              style={
                styles.errorText
              }
            >
              {paymentError}
            </Text>
          </View>
        )}

        <View
          style={
            styles.securityCard
          }
        >
          <Text
            style={
              styles.securityTitle
            }
          >
            Secure payment
          </Text>

          <Text
            style={
              styles.securityText
            }
          >
            Payment is processed through Razorpay.
            TempStaff verifies the payment on the
            server before treating the booking as paid.
          </Text>
        </View>

        <View
          style={
            styles.buttonContainer
          }
        >
          <PrimaryButton
            title={
              isPaying
                ? 'Processing...'
                : 'Pay securely'
            }
            onPress={
              payNow
            }
            disabled={
              isPaying
            }
          />
        </View>

        <Text
          style={
            styles.footerText
          }
        >
          By continuing, you confirm the selected
          service, location, schedule, and booking
          details.
        </Text>
      </ScrollView>
    </SafeAreaView>
  )
}

/*
 * =============================================================================
 * SUMMARY ROW
 * =============================================================================
 */

function SummaryRow({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <View
      style={styles.row}
    >
      <Text
        style={styles.rowLabel}
      >
        {label}
      </Text>

      <Text
        style={styles.rowValue}
      >
        {value}
      </Text>
    </View>
  )
}

/*
 * =============================================================================
 * STYLES
 * =============================================================================
 */

const styles =
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor:
        COLORS.light,
    },

    content: {
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 40,
    },

    pageTitle: {
      fontSize: 24,
      fontWeight: '800',
      color: COLORS.navy,
      marginBottom: 18,
    },

    section: {
      marginBottom: 22,
    },

    sectionTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: COLORS.navy,
      marginBottom: 10,
    },

    card: {
      backgroundColor:
        COLORS.white,
      borderRadius: 16,
      padding: 18,
      borderWidth: 1,
      borderColor:
        COLORS.border,
    },

    serviceName: {
      fontSize: 19,
      fontWeight: '700',
      color: COLORS.navy,
      marginBottom: 5,
    },

    variantName: {
      fontSize: 14,
      color: COLORS.gray,
    },

    divider: {
      height: 1,
      backgroundColor:
        COLORS.border,
      marginVertical: 15,
    },

    row: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent:
        'space-between',
      marginBottom: 12,
      gap: 16,
    },

    rowLabel: {
      flex: 1,
      fontSize: 14,
      color: COLORS.gray,
    },

    rowValue: {
      flex: 1.5,
      fontSize: 14,
      fontWeight: '600',
      color: COLORS.navy,
      textAlign: 'right',
    },

    addressLabel: {
      fontSize: 15,
      fontWeight: '700',
      color: COLORS.navy,
      marginBottom: 7,
    },

    addressText: {
      fontSize: 14,
      lineHeight: 21,
      color: COLORS.gray,
    },

    paymentCard: {
      backgroundColor:
        COLORS.white,
      borderRadius: 16,
      padding: 18,
      borderWidth: 1,
      borderColor:
        COLORS.border,
    },

    amountRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
      gap: 15,
    },

    amountLabel: {
      flex: 1,
      fontSize: 15,
      fontWeight: '600',
      color: COLORS.navy,
    },

    amountValue: {
      fontSize: 20,
      fontWeight: '800',
      color: COLORS.orange,
    },

    amountNote: {
      marginTop: 12,
      fontSize: 12,
      lineHeight: 18,
      color: COLORS.gray,
    },

    securityCard: {
      backgroundColor:
        COLORS.white,
      borderRadius: 16,
      padding: 17,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      marginBottom: 20,
    },

    securityTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: COLORS.navy,
      marginBottom: 6,
    },

    securityText: {
      fontSize: 12,
      lineHeight: 18,
      color: COLORS.gray,
    },

    errorCard: {
      backgroundColor:
        COLORS.white,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor:
        COLORS.orange,
      marginBottom: 20,
    },

    errorTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: COLORS.orange,
      marginBottom: 5,
    },

    errorText: {
      fontSize: 13,
      lineHeight: 19,
      color: COLORS.gray,
    },

    buttonContainer: {
      marginTop: 4,
    },

    footerText: {
      textAlign: 'center',
      fontSize: 11,
      lineHeight: 17,
      color: COLORS.gray,
      marginTop: 14,
      paddingHorizontal: 15,
    },
  })

export default CheckoutScreen