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

import { COLORS } from '../constants/colors'
import {
  RootStackParamList,
} from '../navigation/types'
import {
  useBooking,
} from '../context/BookingContext'

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

function toNumber(
  value: unknown
) {
  const number =
    Number(value)

  return Number.isFinite(
    number
  )
    ? number
    : 0
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

    bookingId,
    setBookingId,
    setPaymentDone,
  } = useBooking()

  const [
    isPaying,
    setIsPaying,
  ] = useState(false)

  const [
    createdBookingId,
    setCreatedBookingId,
  ] = useState<string | null>(
    bookingId ?? null
  )

  const [
    paymentError,
    setPaymentError,
  ] = useState<string | null>(
    null
  )

  const method =
    normalizeBookingMode(
      bookingMode
    )

  /*
   * ---------------------------------------------------------------------------
   * Derived booking data
   * ---------------------------------------------------------------------------
   */

  const serviceName =
    selectedService?.name ??
    'Selected service'

  const variantName =
    selectedVariant?.name ??
    'Hourly service'

  const currency =
    String(
      bookingPricing?.currency ??
        'INR'
    )

  const displayAmount =
    bookingPricing?.finalAmount ??
    null

  const instantStart =
    hourlyStartTime

  const instantEnd =
    hourlyEndTime

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

  const recurringStartDate =
    scheduleStartDate

  const recurringEndDate =
    scheduleEndDate ||
    scheduleStartDate

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

  /*
   * ---------------------------------------------------------------------------
   * Summary text
   * ---------------------------------------------------------------------------
   */

  const bookingSummary =
    useMemo(() => {
      if (method === 'instant') {
        return {
          title: 'Instant booking',
          detail:
            instantStart &&
            instantEnd
              ? `${formatTime(
                  instantStart
                )} – ${formatTime(
                  instantEnd
                )}`
              : 'Requested time',
        }
      }

      if (method === 'recurring') {
        const weekdays =
          selectedWeekdays
            .slice()
            .sort(
              (a, b) => a - b
            )
            .map(
              getWeekdayLabel
            )
            .join(', ')

        return {
          title: 'Recurring booking',
          detail:
            weekdays ||
            'Selected weekdays',
        }
      }

      return {
        title: 'Scheduled booking',
        detail:
          scheduledStart &&
          scheduledEnd
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
      instantStart,
      instantEnd,
      scheduledStart,
      scheduledEnd,
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
      if (!selectedService?.id) {
        return 'Please select a service.'
      }

      if (!selectedVariant?.id) {
        return 'Please select an hourly service.'
      }

      if (!addressId) {
        return 'Please select a booking location.'
      }

      if (!address) {
        return 'Please select a booking location.'
      }

      if (method === 'instant') {
        if (
          !instantStart ||
          !instantEnd
        ) {
          return 'Please select the instant booking start and end time.'
        }

        return null
      }

      if (method === 'scheduled') {
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
      if (
        method === 'instant'
      ) {
        if (
          !instantStart ||
          !instantEnd
        ) {
          throw new Error(
            'Instant booking time is missing.'
          )
        }

        return createHourlyBooking({
          serviceVariantId:
            selectedVariant!.id,

          addressId,

          bookingType:
            'instant',

          scheduledStart:
            instantStart,

          scheduledEnd:
            instantEnd,
        })
      }

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

        /*
         * A scheduled booking for one selected date is represented
         * through the same authoritative multi-occurrence backend.
         *
         * The selected date's weekday is supplied as the sole working
         * weekday, so the backend creates exactly that occurrence.
         */

        const date =
          new Date(
            `${scheduleStartDate}T00:00:00`
          )

        if (
          Number.isNaN(
            date.getTime()
          )
        ) {
          throw new Error(
            'Invalid scheduled booking date.'
          )
        }

        const weekday =
          date.getDay()

        return createHourlyBooking({
          serviceVariantId:
            selectedVariant!.id,

          addressId,

          bookingType:
            'scheduled',

          scheduledStart:
            combineDateAndTime(
              scheduleStartDate,
              scheduleDailyStartTime
            )!,

          scheduledEnd:
            combineDateAndTime(
              scheduleStartDate,
              scheduleDailyEndTime
            )!,
        })
      }

      return createRecurringBooking({
        serviceVariantId:
          selectedVariant!.id,

        addressId,

        scheduleStartDate:
          recurringStartDate!,

        scheduleEndDate:
          recurringEndDate!,

        dailyStartTime:
          scheduleDailyStartTime!,

        dailyEndTime:
          scheduleDailyEndTime!,

        selectedWeekdays,

        offDates,

        notes: undefined,
      })
    }

  /*
   * =============================================================================
   * RAZORPAY PAYMENT
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
         * Step 1: Create the booking through the authoritative backend.
         * -----------------------------------------------------------------------
         *
         * This is intentionally done immediately before payment.
         *
         * The backend performs the final:
         * - availability check
         * - worker matching
         * - area validation
         * - schedule validation
         * - pricing
         * - booking snapshot
         */

        const booking =
          await createBookingForCheckout()

        /*
         * Instant has a special business response:
         *
         * success=false,
         * instant_available=false,
         * fallback_to_scheduled=true
         *
         * That is not a technical error.
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
              'No nearby worker is currently available for your selected time. Please choose a scheduled booking.',
            [
              {
                text: 'Choose scheduled',
                onPress: () =>
                  navigation.navigate(
                    'Schedule'
                  ),
              },
              {
                text: 'Cancel',
                style: 'cancel',
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

        setCreatedBookingId(
          currentBookingId
        )

        setBookingId(
          currentBookingId
        )

        /*
         * -----------------------------------------------------------------------
         * Step 2: Ask the server to create the Razorpay order.
         * -----------------------------------------------------------------------
         *
         * The Razorpay order amount comes from the backend booking/payment
         * ledger. The app does not send a customer-calculated amount.
         */

        const order =
          await createRazorpayOrder(
            currentBookingId
          )

        /*
         * -----------------------------------------------------------------------
         * Step 3: Open Razorpay.
         * -----------------------------------------------------------------------
         */

        const razorpayOptions = {
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
              COLORS.primary,
          },
        }

        const payment =
          await RazorpayCheckout.open(
            razorpayOptions
          )

        /*
         * -----------------------------------------------------------------------
         * Step 4: Verify the Razorpay payment server-side.
         * -----------------------------------------------------------------------
         *
         * Never mark the booking paid merely because Razorpay's client SDK
         * returned success.
         */

        const verification =
          await verifyRazorpayPayment(
            currentBookingId,

            String(
              payment.razorpay_order_id ??
                order.orderId
            ),

            String(
              payment.razorpay_payment_id ??
                ''
            ),

            String(
              payment.razorpay_signature ??
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
        /*
         * Razorpay cancellation is expected user behaviour and should not
         * be presented as a backend crash.
         */

        const message =
          String(
            error?.description ||
              error?.message ||
              ''
          )

        const isUserCancelled =
          message
            .toLowerCase()
            .includes(
              'cancel'
            ) ||
          message
            .toLowerCase()
            .includes(
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
        title="Checkout"
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
        <View
          style={styles.section}
        >
          <Text
            style={styles.sectionTitle}
          >
            Booking summary
          </Text>

          <View
            style={styles.card}
          >
            <Text
              style={styles.serviceName}
            >
              {serviceName}
            </Text>

            <Text
              style={styles.variantName}
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
            style={styles.sectionTitle}
          >
            Service location
          </Text>

          <View
            style={styles.card}
          >
            <Text
              style={styles.addressLabel}
            >
              {address?.label ||
                'Booking location'}
            </Text>

            <Text
              style={
                styles.addressText
              }
            >
              {address?.address_line ||
                'Selected address'}
            </Text>
          </View>
        </View>

        <View
          style={styles.section}
        >
          <Text
            style={styles.sectionTitle}
          >
            Payment
          </Text>

          <View
            style={styles.paymentCard}
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
              Final pricing is calculated by TempStaff's
              server using the current admin-configured
              hourly and recurring pricing rules.
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
            Your payment is processed through Razorpay.
            TempStaff verifies the payment on the server
            before treating the booking as paid.
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
        COLORS.background,
    },

    content: {
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 40,
    },

    section: {
      marginBottom: 22,
    },

    sectionTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: COLORS.text,
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
      color: COLORS.text,
      marginBottom: 5,
    },

    variantName: {
      fontSize: 14,
      color:
        COLORS.textSecondary,
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
      color:
        COLORS.textSecondary,
    },

    rowValue: {
      flex: 1.5,
      fontSize: 14,
      fontWeight: '600',
      color: COLORS.text,
      textAlign: 'right',
    },

    addressLabel: {
      fontSize: 15,
      fontWeight: '700',
      color: COLORS.text,
      marginBottom: 7,
    },

    addressText: {
      fontSize: 14,
      lineHeight: 21,
      color:
        COLORS.textSecondary,
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
      color: COLORS.text,
    },

    amountValue: {
      fontSize: 20,
      fontWeight: '800',
      color: COLORS.primary,
    },

    amountNote: {
      marginTop: 12,
      fontSize: 12,
      lineHeight: 18,
      color:
        COLORS.textSecondary,
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
      color: COLORS.text,
      marginBottom: 6,
    },

    securityText: {
      fontSize: 12,
      lineHeight: 18,
      color:
        COLORS.textSecondary,
    },

    errorCard: {
      backgroundColor:
        COLORS.white,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor:
        COLORS.error,
      marginBottom: 20,
    },

    errorTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: COLORS.error,
      marginBottom: 5,
    },

    errorText: {
      fontSize: 13,
      lineHeight: 19,
      color:
        COLORS.textSecondary,
    },

    buttonContainer: {
      marginTop: 4,
    },

    footerText: {
      textAlign: 'center',
      fontSize: 11,
      lineHeight: 17,
      color:
        COLORS.textSecondary,
      marginTop: 14,
      paddingHorizontal: 15,
    },
  })

export default CheckoutScreen