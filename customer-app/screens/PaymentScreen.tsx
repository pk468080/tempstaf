import { useEffect, useState } from 'react'
import {
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
  'Payment'
>

export default function PaymentScreen({
  navigation,
}: Props) {
  const {
    selectedServiceId,
    selectedService,
    selectedPackage,
    address,
    setBookingMode,
    setSelectedWorker,
  } = useBooking()

  const [checking, setChecking] = useState(true)
  const [available, setAvailable] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    checkAvailability()
  }, [])

  const checkAvailability = async () => {
    try {
      setChecking(true)
      setError('')

      if (!selectedServiceId) {
        throw new Error(
          'Selected service is missing.'
        )
      }

      if (!address) {
        throw new Error(
          'Service address is missing.'
        )
      }

      const {
        data: serviceWorkers,
        error: serviceWorkerError,
      } = await supabase
        .from('worker_services')
        .select('worker_id')
        .eq(
          'service_id',
          selectedServiceId
        )

      if (serviceWorkerError) {
        throw serviceWorkerError
      }

      const workerIds =
        (serviceWorkers ?? []).map(
          item => item.worker_id
        )

      if (workerIds.length === 0) {
        setAvailable(false)
        return
      }

      const now =
        new Date().toISOString()

      const {
        data: availabilityRows,
        error: availabilityError,
      } = await supabase
        .from('worker_availability')
        .select(
          'worker_id, available_from, available_until, is_available'
        )
        .in(
          'worker_id',
          workerIds
        )
        .eq(
          'is_available',
          true
        )
        .lte(
          'available_from',
          now
        )
        .gte(
          'available_until',
          now
        )

      if (availabilityError) {
        throw availabilityError
      }

      const currentlyAvailableIds =
        (availabilityRows ?? []).map(
          item => item.worker_id
        )

      if (
        currentlyAvailableIds.length === 0
      ) {
        setAvailable(false)
        return
      }

      const {
        data: workers,
        error: workersError,
      } = await supabase
        .from('worker_profiles')
        .select(
          'id, worker_status, is_verified, rating, service_radius_km'
        )
        .in(
          'id',
          currentlyAvailableIds
        )
        .eq(
          'is_verified',
          true
        )

      if (workersError) {
        throw workersError
      }

      const validWorkers =
        workers ?? []

      if (
        validWorkers.length === 0
      ) {
        setAvailable(false)
        return
      }

      const worker =
        validWorkers[0]

      setSelectedWorker({
        id: worker.id,
        name: 'TempStaff Worker',
        service:
          selectedService,
        rating: Number(
          worker.rating ?? 0
        ),
        jobs: 0,
        distance: 'Nearby',
      })

      setAvailable(true)
    } catch (err: any) {
      console.error(
        '[TempStaff] Availability check failed:',
        err
      )

      setError(
        err?.message ||
          'We could not check worker availability.'
      )
    } finally {
      setChecking(false)
    }
  }

  const chooseInstant = () => {
    setBookingMode('Instant')
    navigation.navigate('Checkout')
  }

  const chooseScheduled = () => {
    setBookingMode('Scheduled')
    navigation.navigate('Schedule')
  }

  return (
    <SafeAreaView
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.page}
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
            style={styles.progressTrack}
          >
            <View
              style={styles.progressFill}
            />
          </View>

          <Text
            style={styles.progressText}
          >
            STEP 4 OF 4 · BOOKING TIME
          </Text>
        </View>

        {/* Heading */}
        <View
          style={styles.heading}
        >
          <Text style={styles.title}>
            When do you need the staff?
          </Text>

          <Text
            style={styles.subtitle}
          >
            Choose an instant booking if you need
            staff now, or schedule the service for
            a future time.
          </Text>
        </View>

        {/* Booking summary */}
        <View
          style={styles.summaryCard}
        >
          <Text
            style={styles.summaryLabel}
          >
            YOUR BOOKING
          </Text>

          <Text
            style={styles.summaryService}
          >
            {selectedService ||
              'Staff service'}
          </Text>

          <Text
            style={styles.summaryPackage}
          >
            {selectedPackage?.name ||
              'Staffing package'}
          </Text>

          <View
            style={styles.summaryDivider}
          />

          <Text
            style={styles.addressLabel}
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

        {checking ? (
          <View
            style={styles.checkingCard}
          >
            <View
              style={styles.loaderCircle}
            >
              <ActivityIndicator
                size="small"
                color={COLORS.teal}
              />
            </View>

            <View
              style={styles.checkingContent}
            >
              <Text
                style={
                  styles.checkingTitle
                }
              >
                Checking availability
              </Text>

              <Text
                style={
                  styles.checkingText
                }
              >
                We're checking for verified
                TempStaff workers available
                for your service.
              </Text>
            </View>
          </View>
        ) : error ? (
          <View
            style={styles.errorCard}
          >
            <View
              style={styles.errorIcon}
            >
              <Text
                style={
                  styles.errorIconText
                }
              >
                !
              </Text>
            </View>

            <Text
              style={styles.errorTitle}
            >
              Availability check failed
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
                checkAvailability
              }
              activeOpacity={0.85}
            >
              <Text
                style={styles.retryText}
              >
                Try Again
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Instant */}
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

              {available ? (
                <View
                  style={
                    styles.availableBadge
                  }
                >
                  <View
                    style={
                      styles.availableDot
                    }
                  />

                  <Text
                    style={
                      styles.availableText
                    }
                  >
                    STAFF AVAILABLE
                  </Text>
                </View>
              ) : null}
            </View>

            <TouchableOpacity
              style={[
                styles.optionCard,
                available &&
                  styles.optionCardRecommended,
              ]}
              onPress={
                available
                  ? chooseInstant
                  : undefined
              }
              disabled={!available}
              activeOpacity={0.88}
            >
              <View
                style={[
                  styles.optionIcon,
                  available &&
                    styles.optionIconRecommended,
                ]}
              >
                <Text
                  style={styles.optionEmoji}
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
                    style={[
                      styles.optionTitle,
                      available &&
                        styles.optionTitleRecommended,
                    ]}
                  >
                    Instant
                  </Text>

                  {available ? (
                    <View
                      style={
                        styles.recommendedBadge
                      }
                    >
                      <Text
                        style={
                          styles.recommendedText
                        }
                      >
                        AVAILABLE NOW
                      </Text>
                    </View>
                  ) : null}
                </View>

                <Text
                  style={
                    styles.optionDescription
                  }
                >
                  {available
                    ? 'Book now and TempStaff will assign an available worker.'
                    : 'No suitable worker is currently available for instant booking.'}
                </Text>

                {available ? (
                  <Text
                    style={
                      styles.optionAction
                    }
                  >
                    Continue with Instant →
                  </Text>
                ) : null}
              </View>
            </TouchableOpacity>

            {/* Scheduled */}
            <TouchableOpacity
              style={styles.optionCard}
              onPress={
                chooseScheduled
              }
              activeOpacity={0.88}
            >
              <View
                style={styles.optionIcon}
              >
                <Text
                  style={styles.optionEmoji}
                >
                  📅
                </Text>
              </View>

              <View
                style={
                  styles.optionContent
                }
              >
                <Text
                  style={styles.optionTitle}
                >
                  Schedule
                </Text>

                <Text
                  style={
                    styles.optionDescription
                  }
                >
                  Choose a future date and time.
                  TempStaff will arrange the worker
                  for your booking.
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
            <View
              style={
                styles.recurringCard
              }
            >
              <View
                style={
                  styles.recurringTop
                }
              >
                <View
                  style={
                    styles.recurringIcon
                  }
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
                  style={
                    styles.recurringContent
                  }
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
                      Recurring
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
                    Set up regular staffing for
                    repeated dates. This feature will
                    be enabled in a later release.
                  </Text>
                </View>
              </View>
            </View>
          </>
        )}

        {/* Assignment note */}
        <View
          style={styles.infoCard}
        >
          <View
            style={styles.infoIcon}
          >
            <Text
              style={styles.infoIconText}
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
              TempStaff assigns the worker
            </Text>

            <Text
              style={styles.infoText}
            >
              Customers don't select individual
              workers. Our system handles worker
              assignment based on availability.
            </Text>
          </View>
        </View>

        {/* Payment placeholder */}
        <View
          style={styles.paymentNotice}
        >
          <Text
            style={styles.paymentNoticeTitle}
          >
            Payment
          </Text>

          <Text
            style={styles.paymentNoticeText}
          >
            Real payment processing is not enabled
            yet. The checkout step is currently kept
            separate so it can be connected when
            payment integration is ready.
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
    backgroundColor: COLORS.navy,
    borderRadius: 20,
    padding: 17,
    marginBottom: 16,
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

  summaryPackage: {
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
    marginVertical: 13,
  },

  addressLabel: {
    color: '#B9C9D8',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.8,
  },

  address: {
    color: COLORS.white,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 4,
  },

  checkingCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },

  loaderCircle: {
    width: 45,
    height: 45,
    borderRadius: 23,
    backgroundColor: '#E8F6F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  checkingContent: {
    flex: 1,
  },

  checkingTitle: {
    color: COLORS.navy,
    fontSize: 14,
    fontWeight: '800',
  },

  checkingText: {
    color: COLORS.gray,
    fontSize: 10.5,
    lineHeight: 16,
    marginTop: 3,
  },

  errorCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#F0D4D4',
    borderRadius: 18,
    padding: 19,
    alignItems: 'center',
  },

  errorIcon: {
    width: 45,
    height: 45,
    borderRadius: 23,
    backgroundColor: '#FDECEC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 11,
  },

  errorIconText: {
    color: '#D64545',
    fontSize: 21,
    fontWeight: '900',
  },

  errorTitle: {
    color: COLORS.navy,
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },

  errorText: {
    color: COLORS.gray,
    fontSize: 11,
    lineHeight: 17,
    textAlign: 'center',
    marginTop: 5,
  },

  retryButton: {
    backgroundColor: COLORS.orange,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginTop: 14,
  },

  retryText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '800',
  },

  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 11,
  },

  optionSectionTitle: {
    color: COLORS.navy,
    fontSize: 19,
    lineHeight: 25,
    fontWeight: '800',
  },

  availableBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E7F8EF',
    borderRadius: 15,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },

  availableDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.teal,
    marginRight: 5,
  },

  availableText: {
    color: COLORS.teal,
    fontSize: 7,
    fontWeight: '900',
  },

  optionCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 11,
  },

  optionCardRecommended: {
    borderColor: COLORS.orange,
    borderWidth: 1.5,
  },

  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: '#F2F6F8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },

  optionIconRecommended: {
    backgroundColor: '#FFF1DD',
  },

  optionEmoji: {
    fontSize: 24,
  },

  optionContent: {
    flex: 1,
  },

  optionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },

  optionTitle: {
    color: COLORS.navy,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '900',
  },

  optionTitleRecommended: {
    color: COLORS.orange,
  },

  recommendedBadge: {
    backgroundColor: '#FFF1DD',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 4,
    marginLeft: 7,
  },

  recommendedText: {
    color: COLORS.orange,
    fontSize: 6.5,
    fontWeight: '900',
  },

  optionDescription: {
    color: COLORS.gray,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 4,
  },

  optionAction: {
    color: COLORS.teal,
    fontSize: 10.5,
    lineHeight: 16,
    fontWeight: '800',
    marginTop: 7,
  },

  recurringCard: {
    backgroundColor: '#F5F7F9',
    borderWidth: 1,
    borderColor: '#E2E7EC',
    borderRadius: 18,
    padding: 14,
    marginBottom: 11,
  },

  recurringTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  recurringIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: '#E8EDF1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },

  recurringEmoji: {
    fontSize: 22,
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
    fontSize: 16,
    fontWeight: '900',
  },

  comingBadge: {
    backgroundColor: '#E3E7EB',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 4,
    marginLeft: 7,
  },

  comingText: {
    color: COLORS.gray,
    fontSize: 6.5,
    fontWeight: '900',
  },

  recurringText: {
    color: COLORS.gray,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 4,
  },

  infoCard: {
    backgroundColor: '#E8F6F6',
    borderRadius: 17,
    padding: 14,
    marginTop: 5,
    flexDirection: 'row',
    alignItems: 'flex-start',
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
    fontWeight: '800',
  },

  infoText: {
    color: COLORS.gray,
    fontSize: 10.5,
    lineHeight: 16,
    marginTop: 3,
  },

  paymentNotice: {
    backgroundColor: '#FFF7EA',
    borderRadius: 17,
    padding: 14,
    marginTop: 12,
  },

  paymentNoticeTitle: {
    color: COLORS.orange,
    fontSize: 12,
    fontWeight: '900',
  },

  paymentNoticeText: {
    color: COLORS.gray,
    fontSize: 10.5,
    lineHeight: 16,
    marginTop: 3,
  },
})