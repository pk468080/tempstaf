import React, {
  useMemo,
  useState,
} from 'react'

import {
  ActivityIndicator,
  Alert,
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

import {
  createHourlyBooking,
  createInstantBooking,
  createInstantFallbackScheduledBooking,
  createMultiOccurrenceBooking,
  createRecurringBooking,
  createScheduledBooking,
} from '../services/booking'

import {
  createRazorpayOrder,
  verifyRazorpayPayment,
} from '../services/payment'

type Props =
  NativeStackScreenProps<
    RootStackParamList,
    'Payment'
  >

export default function PaymentScreen({
  navigation,
}: Props) {
  const {
    selectedService,
    selectedVariantId,
    selectedVariant,

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
    addressId,

    coordinates,

    bookingPricing,

    setBookingId,
    setPaymentDone,
  } = useBooking()

  const [
    processing,
    setProcessing,
  ] = useState(false)

  const [
    paymentStep,
    setPaymentStep,
  ] = useState<
    | 'idle'
    | 'creating_booking'
    | 'creating_order'
    | 'payment'
    | 'verifying'
  >('idle')

  const [
    errorMessage,
    setErrorMessage,
  ] = useState<string | null>(
    null
  )

  /*
   * --------------------------------------------------
   * PRICE
   * --------------------------------------------------
   */

  const pricing =
    bookingPricing as
      | Record<
          string,
          any
        >
      | null
      | undefined

  const totalAmount =
    Number(
      pricing?.total_price ??
        pricing?.total ??
        pricing?.amount ??
        pricing?.grand_total ??
        0
    )

  const currency =
    pricing?.currency ||
    'INR'

  const formattedAmount =
    useMemo(() => {
      if (
        !Number.isFinite(
          totalAmount
        ) ||
        totalAmount <= 0
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
        ).format(
          totalAmount
        )
      } catch {
        return `₹${totalAmount.toFixed(
          2
        )}`
      }
    }, [
      totalAmount,
      currency,
    ])

  /*
   * --------------------------------------------------
   * VALIDATION
   * --------------------------------------------------
   */

  const validateBooking =
    () => {
      if (
        !selectedService
      ) {
        return 'Service information is missing.'
      }

      if (
        !selectedVariantId
      ) {
        return 'Service option is missing.'
      }

      if (
        !addressId
      ) {
        return 'Service location is missing.'
      }

      if (
        !address
      ) {
        return 'Service address is missing.'
      }

      if (
        !Number.isFinite(
          totalAmount
        ) ||
        totalAmount <= 0
      ) {
        return 'A valid booking amount could not be calculated.'
      }

      if (
        bookingMode ===
        'Scheduled' &&
        !scheduledDate
      ) {
        return 'Scheduled date is missing.'
      }

      if (
        bookingMode ===
        'Recurring'
      ) {
        if (
          !scheduleStartDate ||
          !scheduleEndDate
        ) {
          return 'Recurring date range is missing.'
        }

        if (
          !scheduleDailyStartTime ||
          !scheduleDailyEndTime
        ) {
          return 'Recurring daily time is missing.'
        }

        if (
          scheduleSelectedWeekdays.length ===
          0
        ) {
          return 'Recurring working days are missing.'
        }

        if (
          Number(
            scheduleTotalWorkingHours
          ) <= 0
        ) {
          return 'Recurring working hours are missing.'
        }
      }

      return null
    }

  /*
   * --------------------------------------------------
   * RAZORPAY
   * --------------------------------------------------
   */

  const openRazorpay =
    async (
      order: any,
      bookingId: string
    ) => {
      setPaymentStep(
        'payment'
      )

      /*
       * react-native-razorpay is optional at import
       * time so the app can still compile on platforms
       * where the native module is unavailable.
       */
      let RazorpayCheckout: any

      try {
        const module =
          require(
            'react-native-razorpay'
          )

        RazorpayCheckout =
          module.default ||
          module
      } catch {
        throw new Error(
          'Razorpay is not available in this build.'
        )
      }

      const options = {
        key:
          order.key ||
          order.key_id ||
          order.razorpay_key,

        amount:
          order.amount ??
          Math.round(
            totalAmount * 100
          ),

        currency:
          order.currency ||
          currency,

        name:
          'TempStaff',

        description:
          selectedService ||
          'TempStaff booking',

        order_id:
          order.id ||
          order.order_id,

        prefill:
          order.prefill ||
          {},

        notes: {
          booking_id:
            bookingId,
        },

        theme: {
          color:
            COLORS.orange,
        },
      }

      if (
        !options.key
      ) {
        throw new Error(
          'Razorpay key is missing.'
        )
      }

      if (
        !options.order_id
      ) {
        throw new Error(
          'Razorpay order ID is missing.'
        )
      }

      return RazorpayCheckout.open(
        options
      )
    }

  /*
   * --------------------------------------------------
   * CREATE BOOKING
   * --------------------------------------------------
   */

  const createBooking =
    async () => {
      if (
        !selectedVariantId ||
        !addressId
      ) {
        throw new Error(
          'Booking information is incomplete.'
        )
      }

      /*
       * IMPORTANT:
       * These calls use the existing backend service
       * functions. No backend changes are required.
       */

      if (
        bookingMode ===
        'Recurring'
      ) {
        /*
         * Recurring bookings use the existing
         * recurring booking service.
         */
        const result =
          await createRecurringBooking(
            {
              serviceVariantId:
                selectedVariantId,

              addressId,

              startDate:
                scheduleStartDate,

              endDate:
                scheduleEndDate,

              dailyStartTime:
                scheduleDailyStartTime,

              dailyEndTime:
                scheduleDailyEndTime,

              selectedWeekdays:
                scheduleSelectedWeekdays,

              offDates:
                scheduleOffDates,

              totalWorkingHours:
                scheduleTotalWorkingHours,
            } as any
          )

        return result
      }

      if (
        bookingMode ===
        'Scheduled'
      ) {
        /*
         * Prefer the existing scheduled booking
         * service when the selected date/time exists.
         */
        if (
          scheduledDate
        ) {
          try {
            const result =
              await createScheduledBooking(
                {
                  serviceVariantId:
                    selectedVariantId,

                  addressId,

                  scheduledStart:
                    scheduledDate,

                  scheduledEnd:
                    scheduledDate,
                } as any
              )

            return result
          } catch (
            scheduledError
          ) {
            /*
             * Some backend versions expect the
             * complete scheduled payload. Try the
             * existing multi-occurrence/hourly path
             * before surfacing the error.
             */
            console.warn(
              '[TempStaff] Scheduled booking attempt failed:',
              scheduledError
            )

            const result =
              await createHourlyBooking(
                {
                  serviceVariantId:
                    selectedVariantId,

                  addressId,

                  bookingType:
                    'scheduled',

                  scheduledStart:
                    scheduledDate,

                  scheduledEnd:
                    scheduledDate,
                } as any
              )

            return result
          }
        }
      }

      /*
       * Instant booking.
       */
      try {
        const result =
          await createInstantBooking(
            {
              serviceVariantId:
                selectedVariantId,

              addressId,
            } as any
          )

        return result
      } catch (
        instantError
      ) {
        /*
         * Existing backend supports a fallback
         * scheduled path for instant fulfillment.
         */
        console.warn(
          '[TempStaff] Instant booking failed, trying fallback:',
          instantError
        )

        const result =
          await createInstantFallbackScheduledBooking(
            {
              serviceVariantId:
                selectedVariantId,

              addressId,
            } as any
          )

        return result
      }
    }

  /*
   * --------------------------------------------------
   * EXTRACT BOOKING ID
   * --------------------------------------------------
   */

  const extractBookingId =
    (
      result: any
    ): string | null => {
      if (
        typeof result ===
        'string'
      ) {
        return result
      }

      return (
        result?.bookingId ||
        result?.booking_id ||
        result?.id ||
        result?.booking?.id ||
        null
      )
    }

  /*
   * --------------------------------------------------
   * EXTRACT ORDER
   * --------------------------------------------------
   */

  const extractOrder =
    (
      result: any
    ) => {
      return (
        result?.order ||
        result?.data ||
        result
      )
    }

  /*
   * --------------------------------------------------
   * MAIN PAYMENT FLOW
   * --------------------------------------------------
   */

  const handlePayment =
    async () => {
      if (processing) {
        return
      }

      const validationError =
        validateBooking()

      if (
        validationError
      ) {
        Alert.alert(
          'Payment unavailable',
          validationError
        )

        return
      }

      setProcessing(
        true
      )

      setErrorMessage(
        null
      )

      try {
        /*
         * STEP 1
         * Create booking.
         */
        setPaymentStep(
          'creating_booking'
        )

        const bookingResult =
          await createBooking()

        const bookingId =
          extractBookingId(
            bookingResult
          )

        if (
          !bookingId
        ) {
          throw new Error(
            'Booking was created but no booking ID was returned.'
          )
        }

        setBookingId(
          bookingId
        )

        /*
         * STEP 2
         * Create Razorpay order.
         */
        setPaymentStep(
          'creating_order'
        )

        const orderResult =
          await createRazorpayOrder(
            {
              bookingId,
              amount:
                totalAmount,
              currency,
            } as any
          )

        const order =
          extractOrder(
            orderResult
          )

        /*
         * STEP 3
         * Open Razorpay.
         */
        const paymentResult =
          await openRazorpay(
            order,
            bookingId
          )

        if (
          !paymentResult
        ) {
          throw new Error(
            'Payment was not completed.'
          )
        }

        /*
         * STEP 4
         * Verify payment with backend.
         */
        setPaymentStep(
          'verifying'
        )

        const razorpayPaymentId =
          paymentResult.razorpay_payment_id

        const razorpayOrderId =
          paymentResult.razorpay_order_id

        const razorpaySignature =
          paymentResult.razorpay_signature

        if (
          !razorpayPaymentId ||
          !razorpayOrderId ||
          !razorpaySignature
        ) {
          throw new Error(
            'Payment response is incomplete.'
          )
        }

        const verification =
          await verifyRazorpayPayment(
            {
              bookingId,

              razorpayOrderId,

              razorpayPaymentId,

              razorpaySignature,
            } as any
          )

        /*
         * Do not mark payment complete unless
         * backend verification succeeds.
         */
        const verified =
          verification?.verified ??
          verification?.success ??
          verification?.payment_verified ??
          false

        if (
          verified !== true
        ) {
          throw new Error(
            'Payment could not be verified.'
          )
        }

        setPaymentDone(
          true
        )

        /*
         * STEP 5
         * Final screen.
         */
        navigation.replace(
          'BookingConfirmed'
        )
      } catch (
        error: any
      ) {
        console.error(
          '[TempStaff] Payment flow failed:',
          error
        )

        const message =
          error?.message ||
          'Payment could not be completed.'

        setErrorMessage(
          message
        )

        Alert.alert(
          'Payment failed',
          message
        )
      } finally {
        setProcessing(
          false
        )

        setPaymentStep(
          'idle'
        )
      }
    }

  /*
   * --------------------------------------------------
   * STATUS TEXT
   * --------------------------------------------------
   */

  const statusText =
    () => {
      switch (
        paymentStep
      ) {
        case 'creating_booking':
          return 'Creating booking...'

        case 'creating_order':
          return 'Preparing payment...'

        case 'payment':
          return 'Complete payment in Razorpay...'

        case 'verifying':
          return 'Verifying payment...'

        default:
          return 'Secure payment'
      }
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
          onPress={() => {
            if (
              !processing
            ) {
              navigation.goBack()
            }
          }}
          disabled={
            processing
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
            PAYMENT
          </Text>

          <Text
            style={
              styles.headerTitle
            }
          >
            Secure checkout
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
        {/* PAYMENT INTRO */}

        <View
          style={
            styles.intro
          }
        >
          <View
            style={
              styles.secureIcon
            }
          >
            <Text
              style={
                styles.secureIconText
              }
            >
              ✓
            </Text>
          </View>

          <View
            style={
              styles.introContent
            }
          >
            <Text
              style={
                styles.introTitle
              }
            >
              Secure payment
            </Text>

            <Text
              style={
                styles.introText
              }
            >
              Your payment is processed securely
              through Razorpay.
            </Text>
          </View>
        </View>

        {/* BOOKING */}

        <View
          style={
            styles.card
          }
        >
          <Text
            style={
              styles.cardEyebrow
            }
          >
            BOOKING
          </Text>

          <Text
            style={
              styles.serviceName
            }
          >
            {selectedService ||
              'TempStaff service'}
          </Text>

          {selectedVariant ? (
            <Text
              style={
                styles.variantName
              }
            >
              {
                selectedVariant.name
              }
            </Text>
          ) : null}

          <View
            style={
              styles.divider
            }
          />

          <View
            style={
              styles.detailRow
            }
          >
            <Text
              style={
                styles.detailLabel
              }
            >
              BOOKING TYPE
            </Text>

            <Text
              style={
                styles.detailValue
              }
            >
              {bookingMode ||
                'Instant'}
            </Text>
          </View>

          <View
            style={
              styles.detailRow
            }
          >
            <Text
              style={
                styles.detailLabel
              }
            >
              LOCATION
            </Text>

            <Text
              style={
                styles.detailValueRight
              }
              numberOfLines={3}
            >
              {address ||
                'Selected service location'}
            </Text>
          </View>

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

        {/* AMOUNT */}

        <View
          style={
            styles.amountCard
          }
        >
          <View>
            <Text
              style={
                styles.amountLabel
              }
            >
              AMOUNT TO PAY
            </Text>

            <Text
              style={
                styles.amountDescription
              }
            >
              Final amount from the booking
              pricing service.
            </Text>
          </View>

          <Text
            style={
              styles.amount
            }
          >
            {formattedAmount}
          </Text>
        </View>

        {/* PAYMENT METHODS */}

        <View
          style={
            styles.card
          }
        >
          <Text
            style={
              styles.cardTitle
            }
          >
            Payment method
          </Text>

          <Text
            style={
              styles.cardSubtitle
            }
          >
            Razorpay supports the payment methods
            available for your account and region.
          </Text>

          <View
            style={
              styles.methodCard
            }
          >
            <View
              style={
                styles.methodIcon
              }
            >
              <Text
                style={
                  styles.methodIconText
                }
              >
                ₹
              </Text>
            </View>

            <View
              style={
                styles.methodContent
              }
            >
              <Text
                style={
                  styles.methodTitle
                }
              >
                Razorpay
              </Text>

              <Text
                style={
                  styles.methodDescription
                }
              >
                UPI, cards, net banking and supported
                payment methods.
              </Text>
            </View>

            <View
              style={
                styles.selectedIndicator
              }
            >
              <Text
                style={
                  styles.selectedIndicatorText
                }
              >
                ✓
              </Text>
            </View>
          </View>
        </View>

        {/* SECURITY */}

        <View
          style={
            styles.securityCard
          }
        >
          <Text
            style={
              styles.securityIcon
            }
          >
            🔒
          </Text>

          <View
            style={
              styles.securityContent
            }
          >
            <Text
              style={
                styles.securityTitle
              }
            >
              Secure transaction
            </Text>

            <Text
              style={
                styles.securityText
              }
            >
              Payment verification is completed by
              the backend before your booking is
              marked as paid.
            </Text>
          </View>
        </View>

        {errorMessage ? (
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
              Payment could not be completed
            </Text>

            <Text
              style={
                styles.errorText
              }
            >
              {errorMessage}
            </Text>
          </View>
        ) : null}

        <View
          style={
            styles.bottomSpace
          }
        />
      </ScrollView>

      {/* FOOTER */}

      <View
        style={
          styles.footer
        }
      >
        <View
          style={
            styles.footerAmount
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
            {formattedAmount}
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.payButton,
            processing
              ? styles.payButtonDisabled
              : null,
          ]}
          onPress={
            handlePayment
          }
          disabled={
            processing
          }
          activeOpacity={0.88}
        >
          {processing ? (
            <>
              <ActivityIndicator
                color="#FFFFFF"
                size="small"
              />

              <Text
                style={
                  styles.processingText
                }
              >
                {statusText()}
              </Text>
            </>
          ) : (
            <Text
              style={
                styles.payButtonText
              }
            >
              Pay {formattedAmount}
            </Text>
          )}
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
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor:
        COLORS.tealSoft,
      borderRadius: 19,
      padding: 14,
      marginBottom: 13,
    },

    secureIcon: {
      width: 43,
      height: 43,
      borderRadius: 14,
      backgroundColor:
        COLORS.teal,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 11,
    },

    secureIconText: {
      color: '#FFFFFF',
      fontSize: 18,
      fontWeight: '900',
    },

    introContent: {
      flex: 1,
    },

    introTitle: {
      color: COLORS.teal,
      fontSize: 13,
      fontWeight: '900',
    },

    introText: {
      color: COLORS.teal,
      fontSize: 10,
      lineHeight: 15,
      marginTop: 2,
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

    cardEyebrow: {
      color: COLORS.gray,
      fontSize: 8,
      fontWeight: '900',
      letterSpacing: 1,
    },

    serviceName: {
      color: COLORS.navy,
      fontSize: 17,
      fontWeight: '900',
      marginTop: 4,
    },

    variantName: {
      color: COLORS.gray,
      fontSize: 10,
      marginTop: 3,
    },

    divider: {
      height: 1,
      backgroundColor:
        COLORS.border,
      marginVertical: 13,
    },

    detailRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent:
        'space-between',
      marginBottom: 10,
      gap: 14,
    },

    detailLabel: {
      color: COLORS.gray,
      fontSize: 8,
      fontWeight: '900',
      letterSpacing: 0.7,
      flex: 0.8,
    },

    detailValue: {
      color: COLORS.navy,
      fontSize: 11,
      fontWeight: '900',
      textAlign: 'right',
      flex: 1,
    },

    detailValueRight: {
      color: COLORS.navy,
      fontSize: 11,
      fontWeight: '800',
      textAlign: 'right',
      lineHeight: 16,
      flex: 1.5,
    },

    coordinates: {
      color: COLORS.gray,
      fontSize: 8,
      textAlign: 'right',
      marginTop: -4,
    },

    amountCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
      backgroundColor:
        COLORS.navy,
      borderRadius: 20,
      padding: 17,
      marginBottom: 12,
    },

    amountLabel: {
      color:
        'rgba(255,255,255,0.65)',
      fontSize: 8,
      fontWeight: '900',
      letterSpacing: 1,
    },

    amountDescription: {
      color:
        'rgba(255,255,255,0.65)',
      fontSize: 9,
      lineHeight: 14,
      marginTop: 4,
      maxWidth: 190,
    },

    amount: {
      color: '#FFFFFF',
      fontSize: 21,
      fontWeight: '900',
    },

    cardTitle: {
      color: COLORS.navy,
      fontSize: 14,
      fontWeight: '900',
    },

    cardSubtitle: {
      color: COLORS.gray,
      fontSize: 10,
      lineHeight: 15,
      marginTop: 3,
      marginBottom: 12,
    },

    methodCard: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor:
        COLORS.teal,
      backgroundColor:
        COLORS.tealSoft,
      borderRadius: 16,
      padding: 12,
    },

    methodIcon: {
      width: 39,
      height: 39,
      borderRadius: 12,
      backgroundColor:
        COLORS.teal,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },

    methodIconText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '900',
    },

    methodContent: {
      flex: 1,
    },

    methodTitle: {
      color: COLORS.navy,
      fontSize: 12,
      fontWeight: '900',
    },

    methodDescription: {
      color: COLORS.gray,
      fontSize: 9,
      lineHeight: 14,
      marginTop: 2,
    },

    selectedIndicator: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor:
        COLORS.teal,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 7,
    },

    selectedIndicatorText: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: '900',
    },

    securityCard: {
      flexDirection: 'row',
      backgroundColor:
        COLORS.white,
      borderRadius: 17,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      padding: 13,
      marginBottom: 12,
    },

    securityIcon: {
      fontSize: 17,
      marginRight: 10,
    },

    securityContent: {
      flex: 1,
    },

    securityTitle: {
      color: COLORS.navy,
      fontSize: 11,
      fontWeight: '900',
    },

    securityText: {
      color: COLORS.gray,
      fontSize: 9,
      lineHeight: 14,
      marginTop: 3,
    },

    errorCard: {
      backgroundColor:
        COLORS.orangeSoft,
      borderRadius: 16,
      padding: 13,
      marginBottom: 12,
    },

    errorTitle: {
      color: COLORS.orange,
      fontSize: 11,
      fontWeight: '900',
    },

    errorText: {
      color: COLORS.orange,
      fontSize: 9,
      lineHeight: 14,
      marginTop: 3,
    },

    bottomSpace: {
      height: 15,
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

    footerAmount: {
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

    payButton: {
      flex: 1,
      minHeight: 50,
      borderRadius: 16,
      backgroundColor:
        COLORS.orange,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 12,
      gap: 8,
    },

    payButtonDisabled: {
      opacity: 0.7,
    },

    payButtonText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '900',
    },

    processingText: {
      color: '#FFFFFF',
      fontSize: 10,
      fontWeight: '900',
    },
  })