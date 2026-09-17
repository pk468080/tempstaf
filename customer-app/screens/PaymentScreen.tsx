import {
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

type Props = NativeStackScreenProps<
  RootStackParamList,
  'Payment'
>

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

    if (
      typeof name === 'string'
    ) {
      return name
    }
  }

  return 'Hourly service'
}

export default function PaymentScreen({
  navigation,
}: Props) {
  const {
    selectedService,
    selectedVariant,
    address,
    setBookingMode,
  } = useBooking()

  /*
   * ---------------------------------------------------------------------------
   * All three booking methods now use the same scheduling flow.
   *
   * PaymentScreen is only the booking-method selection step.
   * It does NOT create a booking and does NOT open Razorpay.
   *
   * The actual booking/payment boundary is CheckoutScreen.
   * ---------------------------------------------------------------------------
   */

  const chooseInstant = () => {
    setBookingMode('Instant')
    navigation.navigate('Schedule')
  }

  const chooseScheduled = () => {
    setBookingMode('Scheduled')
    navigation.navigate('Schedule')
  }

  const chooseRecurring = () => {
    setBookingMode('Recurring')
    navigation.navigate('Schedule')
  }

  const variantName =
    getVariantName(
      selectedVariant
    )

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

        {/* Progress */}

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
            STEP 4 OF 4 · BOOKING TIME
          </Text>
        </View>

        {/* Heading */}

        <View
          style={styles.heading}
        >
          <Text
            style={styles.title}
          >
            When do you need the staff?
          </Text>

          <Text
            style={styles.subtitle}
          >
            Choose how you want to schedule your
            staffing service. TempStaff handles worker
            availability and assignment.
          </Text>
        </View>

        {/* Booking summary */}

        <View
          style={
            styles.summaryCard
          }
        >
          <Text
            style={
              styles.summaryLabel
            }
          >
            YOUR BOOKING
          </Text>

          <Text
            style={
              styles.summaryService
            }
          >
            {selectedService ||
              'Staff service'}
          </Text>

          <Text
            style={
              styles.summaryVariant
            }
          >
            {variantName}
          </Text>

          <View
            style={
              styles.summaryDivider
            }
          />

          <Text
            style={
              styles.addressLabel
            }
          >
            SERVICE LOCATION
          </Text>

          <Text
            style={styles.address}
            numberOfLines={3}
          >
            {address ||
              'Service address'}
          </Text>
        </View>

        {/* Booking options */}

        <View
          style={
            styles.optionHeader
          }
        >
          <Text
            style={
              styles.optionSectionTitle
            }
          >
            Booking options
          </Text>
        </View>

        {/* Instant */}

        <TouchableOpacity
          style={
            styles.optionCard
          }
          onPress={
            chooseInstant
          }
          activeOpacity={0.88}
        >
          <View
            style={
              styles.optionIcon
            }
          >
            <Text
              style={
                styles.optionEmoji
              }
            >
              ⚡
            </Text>
          </View>

          <View
            style={
              styles.optionContent
            }
          >
            <View
              style={
                styles.optionTitleRow
              }
            >
              <Text
                style={
                  styles.optionTitle
                }
              >
                Instant
              </Text>

              <View
                style={
                  styles.availableBadge
                }
              >
                <Text
                  style={
                    styles.availableText
                  }
                >
                  AVAILABLE
                </Text>
              </View>
            </View>

            <Text
              style={
                styles.optionDescription
              }
            >
              Request staff for a time starting today.
              TempStaff checks nearby live worker
              availability when you submit the booking.
            </Text>

            <Text
              style={
                styles.optionAction
              }
            >
              Choose time →
            </Text>
          </View>
        </TouchableOpacity>

        {/* Scheduled */}

        <TouchableOpacity
          style={
            styles.optionCard
          }
          onPress={
            chooseScheduled
          }
          activeOpacity={0.88}
        >
          <View
            style={
              styles.optionIcon
            }
          >
            <Text
              style={
                styles.optionEmoji
              }
            >
              📅
            </Text>
          </View>

          <View
            style={
              styles.optionContent
            }
          >
            <View
              style={
                styles.optionTitleRow
              }
            >
              <Text
                style={
                  styles.optionTitle
                }
              >
                Scheduled
              </Text>

              <View
                style={
                  styles.availableBadge
                }
              >
                <Text
                  style={
                    styles.availableText
                  }
                >
                  AVAILABLE
                </Text>
              </View>
            </View>

            <Text
              style={
                styles.optionDescription
              }
            >
              Choose a future date and time. For near-term
              dates, available worker schedule slots can
              be used.
            </Text>

            <Text
              style={
                styles.optionAction
              }
            >
              Choose date & time →
            </Text>
          </View>
        </TouchableOpacity>

        {/* Recurring */}

        <TouchableOpacity
          style={
            styles.optionCard
          }
          onPress={
            chooseRecurring
          }
          activeOpacity={0.88}
        >
          <View
            style={
              styles.optionIcon
            }
          >
            <Text
              style={
                styles.optionEmoji
              }
            >
              🔁
            </Text>
          </View>

          <View
            style={
              styles.optionContent
            }
          >
            <View
              style={
                styles.optionTitleRow
              }
            >
              <Text
                style={
                  styles.optionTitle
                }
              >
                Recurring
              </Text>

              <View
                style={
                  styles.availableBadge
                }
              >
                <Text
                  style={
                    styles.availableText
                  }
                >
                  AVAILABLE
                </Text>
              </View>
            </View>

            <Text
              style={
                styles.optionDescription
              }
            >
              Choose one or more weekdays, a date range,
              and exclusions for individual dates.
            </Text>

            <Text
              style={
                styles.optionAction
              }
            >
              Set recurring schedule →
            </Text>
          </View>
        </TouchableOpacity>

        {/* Assignment explanation */}

        <View
          style={
            styles.infoCard
          }
        >
          <View
            style={
              styles.infoIcon
            }
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
            style={
              styles.infoContent
            }
          >
            <Text
              style={
                styles.infoTitle
              }
            >
              TempStaff assigns the worker
            </Text>

            <Text
              style={
                styles.infoText
              }
            >
              You choose the service, location, time,
              and booking method. Worker assignment is
              handled by the TempStaff system according
              to availability and booking rules.
            </Text>
          </View>
        </View>

        {/* Pricing explanation */}

        <View
          style={
            styles.pricingCard
          }
        >
          <Text
            style={
              styles.pricingTitle
            }
          >
            Hourly pricing
          </Text>

          <Text
            style={
              styles.pricingText
            }
          >
            Your final amount is calculated by the
            TempStaff backend from the selected service,
            working hours, and applicable admin-configured
            discounts.
          </Text>
        </View>
      </ScrollView>
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
      backgroundColor:
        '#DDE3E9',
      borderRadius: 3,
      overflow: 'hidden',
    },

    progressFill: {
      width: '100%',
      height: '100%',
      backgroundColor:
        COLORS.teal,
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
      marginBottom: 18,
    },

    title: {
      color: COLORS.navy,
      fontSize: 28,
      lineHeight: 35,
      fontWeight: '800',
    },

    subtitle: {
      color: COLORS.gray,
      fontSize: 14,
      lineHeight: 21,
      marginTop: 7,
    },

    summaryCard: {
      backgroundColor:
        COLORS.navy,
      borderRadius: 20,
      padding: 17,
      marginBottom: 20,
    },

    summaryLabel: {
      color: '#B9C9D8',
      fontSize: 9,
      fontWeight: '900',
      letterSpacing: 0.8,
    },

    summaryService: {
      color: COLORS.white,
      fontSize: 19,
      lineHeight: 25,
      fontWeight: '900',
      marginTop: 5,
    },

    summaryVariant: {
      color: '#9FE0DE',
      fontSize: 12,
      lineHeight: 17,
      fontWeight: '700',
      marginTop: 2,
    },

    summaryDivider: {
      height: 1,
      backgroundColor:
        'rgba(255,255,255,0.14)',
      marginVertical: 14,
    },

    addressLabel: {
      color: '#B9C9D8',
      fontSize: 9,
      fontWeight: '900',
      letterSpacing: 0.8,
    },

    address: {
      color: COLORS.white,
      fontSize: 13,
      lineHeight: 19,
      marginTop: 5,
    },

    optionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
      marginBottom: 10,
    },

    optionSectionTitle: {
      color: COLORS.navy,
      fontSize: 17,
      fontWeight: '900',
    },

    optionCard: {
      flexDirection: 'row',
      backgroundColor:
        COLORS.white,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      borderRadius: 20,
      padding: 16,
      marginBottom: 12,
    },

    optionIcon: {
      width: 48,
      height: 48,
      borderRadius: 16,
      backgroundColor:
        '#E4F6F5',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 13,
    },

    optionEmoji: {
      fontSize: 22,
    },

    optionContent: {
      flex: 1,
    },

    optionTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 8,
    },

    optionTitle: {
      color: COLORS.navy,
      fontSize: 17,
      fontWeight: '900',
    },

    availableBadge: {
      backgroundColor:
        '#E4F6F5',
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },

    availableText: {
      color: COLORS.teal,
      fontSize: 8,
      fontWeight: '900',
      letterSpacing: 0.5,
    },

    optionDescription: {
      color: COLORS.gray,
      fontSize: 13,
      lineHeight: 19,
      marginTop: 6,
    },

    optionAction: {
      color: COLORS.teal,
      fontSize: 12,
      fontWeight: '900',
      marginTop: 10,
    },

    infoCard: {
      flexDirection: 'row',
      backgroundColor:
        '#EAF6F5',
      borderRadius: 18,
      padding: 15,
      marginTop: 4,
    },

    infoIcon: {
      width: 34,
      height: 34,
      borderRadius: 12,
      backgroundColor:
        COLORS.teal,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 11,
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
      fontSize: 13,
      fontWeight: '900',
    },

    infoText: {
      color: COLORS.gray,
      fontSize: 12,
      lineHeight: 18,
      marginTop: 4,
    },

    pricingCard: {
      backgroundColor:
        COLORS.white,
      borderRadius: 18,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      padding: 15,
      marginTop: 12,
    },

    pricingTitle: {
      color: COLORS.navy,
      fontSize: 13,
      fontWeight: '900',
    },

    pricingText: {
      color: COLORS.gray,
      fontSize: 12,
      lineHeight: 18,
      marginTop: 5,
    },
  })