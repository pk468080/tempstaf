import { useEffect, useState } from 'react'
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

type AvailableSlot = {
  slot_start: string
  slot_end: string
  worker_count: number
}

export default function PaymentScreen({
  navigation,
}: Props) {
  const {
    selectedServiceId,
    selectedService,
    selectedPackage,
    address,
    addressId,
    setBookingMode,
    setScheduledDate,
    setSelectedWorker,
  } = useBooking()

  const [checking, setChecking] = useState(true)
  const [availableNow, setAvailableNow] = useState(false)
  const [slots, setSlots] = useState<AvailableSlot[]>([])
  const [selectedSlot, setSelectedSlot] =
    useState<AvailableSlot | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    checkAvailability()
  }, [
    selectedServiceId,
    selectedPackage?.id,
    addressId,
  ])

  function getDurationMinutes() {
    const value = Number(
      selectedPackage?.duration_value ?? 1
    )

    switch (
      String(
        selectedPackage?.duration_unit ?? 'hour'
      ).toLowerCase()
    ) {
      case 'minute':
      case 'minutes':
        return Math.max(value, 30)

      case 'day':
      case 'days':
        return Math.max(value * 8 * 60, 30)

      case 'week':
      case 'weeks':
        return Math.max(value * 5 * 8 * 60, 30)

      case 'month':
      case 'months':
        return Math.max(value * 22 * 8 * 60, 30)

      case 'hour':
      case 'hours':
      default:
        return Math.max(value * 60, 30)
    }
  }

  async function checkAvailability() {
    try {
      setChecking(true)
      setError('')
      setAvailableNow(false)
      setSlots([])
      setSelectedSlot(null)
      setSelectedWorker(null)

      if (!selectedServiceId) {
        throw new Error(
          'Selected service is missing.'
        )
      }

      if (!addressId) {
        throw new Error(
          'Service address is missing.'
        )
      }

      if (!selectedPackage) {
        throw new Error(
          'Selected service package is missing.'
        )
      }

      /*
       * Pre-booking availability check.
       *
       * The current database RPC
       * get_eligible_workers() requires a booking ID,
       * so it cannot be called before a booking exists.
       *
       * We therefore check service + current worker
       * availability here, then use the database slot
       * function for fallback scheduling.
       */

      const now = new Date()
      const nowIso = now.toISOString()

      const serviceWorkersResult =
        await supabase
          .from('worker_services')
          .select('worker_id')
          .eq(
            'service_id',
            selectedServiceId
          )

      if (serviceWorkersResult.error) {
        throw serviceWorkersResult.error
      }

      const workerIds =
        (serviceWorkersResult.data ?? []).map(
          row => row.worker_id
        )

      if (workerIds.length === 0) {
        await loadNextAvailableSlots()
        return
      }

      const durationMinutes =
        getDurationMinutes()

      const requiredEnd = new Date(
        now.getTime() +
          durationMinutes * 60 * 1000
      ).toISOString()

      const availabilityResult =
        await supabase
          .from('worker_availability')
          .select(
            `
              worker_id,
              available_from,
              available_until,
              is_available
            `
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
            nowIso
          )
          .gte(
            'available_until',
            requiredEnd
          )

      if (availabilityResult.error) {
        throw availabilityResult.error
      }

      const availableIds =
        (
          availabilityResult.data ?? []
        ).map(
          row => row.worker_id
        )

      if (availableIds.length === 0) {
        await loadNextAvailableSlots()
        return
      }

      const workerProfileResult =
        await supabase
          .from('worker_profiles')
          .select(
            `
              id,
              worker_status,
              is_verified,
              rating
            `
          )
          .in(
            'id',
            availableIds
          )
          .eq(
            'is_verified',
            true
          )
          .eq(
            'worker_status',
            'available'
          )

      if (workerProfileResult.error) {
        throw workerProfileResult.error
      }

      const validWorkers =
        workerProfileResult.data ?? []

      if (validWorkers.length === 0) {
        await loadNextAvailableSlots()
        return
      }

      /*
       * A worker is available now.
       *
       * Customer does not select the worker.
       * We only carry the system decision forward.
       */
      const worker =
        validWorkers[0]

      setSelectedWorker({
        id: worker.id,
        name: 'TempStaff Worker',
        service: selectedService,
        rating: Number(
          worker.rating ?? 0
        ),
        jobs: 0,
        distance: 'Nearby',
      })

      setBookingMode('Instant')
      setAvailableNow(true)
    } catch (err: any) {
      console.error(
        '[TempStaff] Availability check failed:',
        err
      )

      setError(
        err?.message ??
          'We could not check worker availability.'
      )
    } finally {
      setChecking(false)
    }
  }

  async function loadNextAvailableSlots() {
    if (!selectedServiceId) {
      return
    }

    if (!addressId) {
      return
    }

    const durationMinutes =
      getDurationMinutes()

    const {
      data,
      error: rpcError,
    } = await supabase.rpc(
      'get_next_available_worker_slots',
      {
        p_service_id:
          selectedServiceId,
        p_address_id:
          addressId,
        p_duration_minutes:
          durationMinutes,
        p_from:
          new Date().toISOString(),
        p_days: 3,
      }
    )

    if (rpcError) {
      throw rpcError
    }

    setAvailableNow(false)
    setSlots(
      (data ?? []) as AvailableSlot[]
    )
  }

  function continueInstant() {
    setBookingMode('Instant')
    setScheduledDate(
      new Date().toISOString()
    )

    navigation.navigate('Checkout')
  }

  function chooseSlot(
    slot: AvailableSlot
  ) {
    setSelectedSlot(slot)
  }

  function continueScheduled() {
    if (!selectedSlot) {
      Alert.alert(
        'Select a time',
        'Please choose an available time before continuing.'
      )

      return
    }

    setBookingMode('Scheduled')
    setScheduledDate(
      selectedSlot.slot_start
    )

    navigation.navigate('Checkout')
  }

  function formatDate(
    value: string
  ) {
    const date = new Date(value)

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return 'Available'
    }

    return date.toLocaleDateString(
      'en-IN',
      {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      }
    )
  }

  function formatTime(
    value: string
  ) {
    const date = new Date(value)

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return ''
    }

    return date.toLocaleTimeString(
      'en-IN',
      {
        hour: 'numeric',
        minute: '2-digit',
      }
    )
  }

  return (
    <SafeAreaView
      style={styles.container}
    >
      <View style={styles.page}>
        <Header
          onBack={() =>
            navigation.goBack()
          }
        />

        <ScrollView
          contentContainerStyle={
            styles.scrollContent
          }
          showsVerticalScrollIndicator={
            false
          }
        >
          {checking ? (
            <View style={styles.content}>
              <View
                style={
                  styles.loaderCircle
                }
              >
                <ActivityIndicator
                  size="large"
                  color={
                    COLORS.teal
                  }
                />
              </View>

              <Text
                style={
                  styles.title
                }
              >
                Checking availability
              </Text>

              <Text
                style={
                  styles.subtitle
                }
              >
                We're checking whether TempStaff
                can fulfil your request right now.
              </Text>

              <SummaryCard
                service={
                  selectedService
                }
                packageName={
                  selectedPackage?.name
                }
                address={
                  address
                }
              />
            </View>
          ) : error ? (
            <View style={styles.content}>
              <View
                style={
                  styles.errorCircle
                }
              >
                <Text
                  style={
                    styles.errorIcon
                  }
                >
                  !
                </Text>
              </View>

              <Text
                style={
                  styles.title
                }
              >
                Unable to check
              </Text>

              <Text
                style={
                  styles.subtitle
                }
              >
                {error}
              </Text>

              <PrimaryButton
                title="Try Again"
                onPress={
                  checkAvailability
                }
              />
            </View>
          ) : availableNow ? (
            <View style={styles.content}>
              <View
                style={
                  styles.successCircle
                }
              >
                <Text
                  style={
                    styles.successIcon
                  }
                >
                  ✓
                </Text>
              </View>

              <Text
                style={
                  styles.title
                }
              >
                Staff available now
              </Text>

              <Text
                style={
                  styles.subtitle
                }
              >
                A verified TempStaff worker is
                available for this service now.
              </Text>

              <View
                style={
                  styles.instantCard
                }
              >
                <Text
                  style={
                    styles.instantTitle
                  }
                >
                  Instant booking
                </Text>

                <Text
                  style={
                    styles.instantText
                  }
                >
                  Continue to checkout. TempStaff
                  will handle the worker assignment.
                </Text>
              </View>

              <SummaryCard
                service={
                  selectedService
                }
                packageName={
                  selectedPackage?.name
                }
                address={
                  address
                }
              />

              <PrimaryButton
                title="Continue"
                onPress={
                  continueInstant
                }
              />

              <Text
                style={
                  styles.smallNote
                }
              >
                You do not choose the worker.
                TempStaff assigns the worker.
              </Text>
            </View>
          ) : (
            <View style={styles.content}>
              <View
                style={
                  styles.scheduleCircle
                }
              >
                <Text
                  style={
                    styles.scheduleIcon
                  }
                >
                  📅
                </Text>
              </View>

              <Text
                style={
                  styles.title
                }
              >
                No worker available now
              </Text>

              <Text
                style={
                  styles.subtitle
                }
              >
                Choose the next available time and
                we'll create a scheduled booking.
              </Text>

              <SummaryCard
                service={
                  selectedService
                }
                packageName={
                  selectedPackage?.name
                }
                address={
                  address
                }
              />

              {slots.length > 0 ? (
                <View
                  style={
                    styles.slotsContainer
                  }
                >
                  <Text
                    style={
                      styles.slotsTitle
                    }
                  >
                    Next available times
                  </Text>

                  {slots.map(
                    (slot) => {
                      const isSelected =
                        selectedSlot?.slot_start ===
                        slot.slot_start

                      return (
                        <TouchableOpacity
                          key={
                            slot.slot_start
                          }
                          activeOpacity={
                            0.8
                          }
                          onPress={() =>
                            chooseSlot(
                              slot
                            )
                          }
                          style={[
                            styles.slotCard,
                            isSelected &&
                              styles.slotCardSelected,
                          ]}
                        >
                          <View
                            style={
                              styles.slotInfo
                            }
                          >
                            <Text
                              style={
                                styles.slotDate
                              }
                            >
                              {formatDate(
                                slot.slot_start
                              )}
                            </Text>

                            <Text
                              style={
                                styles.slotTime
                              }
                            >
                              {formatTime(
                                slot.slot_start
                              )}
                            </Text>
                          </View>

                          <View
                            style={
                              styles.slotRight
                            }
                          >
                            <Text
                              style={
                                styles.workerCount
                              }
                            >
                              {slot.worker_count}{' '}
                              {slot.worker_count ===
                              1
                                ? 'worker'
                                : 'workers'}
                            </Text>

                            <View
                              style={[
                                styles.radio,
                                isSelected &&
                                  styles.radioSelected,
                              ]}
                            >
                              {isSelected && (
                                <View
                                  style={
                                    styles.radioDot
                                  }
                                />
                              )}
                            </View>
                          </View>
                        </TouchableOpacity>
                      )
                    }
                  )}
                </View>
              ) : (
                <View
                  style={
                    styles.noSlotsCard
                  }
                >
                  <Text
                    style={
                      styles.noSlotsTitle
                    }
                  >
                    No upcoming slots found
                  </Text>

                  <Text
                    style={
                      styles.noSlotsText
                    }
                  >
                    No matching worker availability
                    was found in the next three days.
                  </Text>
                </View>
              )}

              {selectedSlot && (
                <PrimaryButton
                  title="Continue with selected time"
                  onPress={
                    continueScheduled
                  }
                />
              )}

              <Text
                style={
                  styles.smallNote
                }
              >
                Future bookings go to the TempStaff
                admin team for worker assignment.
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  )
}

function SummaryCard({
  service,
  packageName,
  address,
}: {
  service: string
  packageName?: string
  address?: string
}) {
  return (
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
        {service}
      </Text>

      {packageName ? (
        <Text
          style={
            styles.summaryPackage
          }
        >
          {packageName}
        </Text>
      ) : null}

      {address ? (
        <Text
          style={
            styles.address
          }
        >
          {address}
        </Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.light,
  },

  page: {
    flex: 1,
    paddingHorizontal: 22,
  },

  scrollContent: {
    paddingBottom: 40,
  },

  content: {
    alignItems: 'center',
    paddingTop: 35,
    paddingBottom: 30,
  },

  loaderCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#E8F8F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 25,
  },

  successCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#E7F8EF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 25,
  },

  errorCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#FDECEC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 25,
  },

  scheduleCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#FFF1DD',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 25,
  },

  successIcon: {
    color: COLORS.teal,
    fontSize: 45,
    fontWeight: '900',
  },

  errorIcon: {
    color: '#D64545',
    fontSize: 45,
    fontWeight: '900',
  },

  scheduleIcon: {
    fontSize: 38,
  },

  title: {
    color: COLORS.navy,
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 10,
  },

  subtitle: {
    color: COLORS.gray,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 350,
    marginBottom: 24,
  },

  summaryCard: {
    width: '100%',
    backgroundColor: 'white',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
    marginBottom: 16,
  },

  summaryLabel: {
    color: COLORS.gray,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 7,
  },

  summaryService: {
    color: COLORS.navy,
    fontSize: 20,
    fontWeight: '900',
  },

  summaryPackage: {
    color: COLORS.teal,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
  },

  address: {
    color: COLORS.gray,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 10,
  },

  instantCard: {
    width: '100%',
    backgroundColor: '#E8F8F7',
    borderRadius: 18,
    padding: 17,
    marginBottom: 15,
  },

  instantTitle: {
    color: COLORS.teal,
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 6,
  },

  instantText: {
    color: COLORS.navy,
    fontSize: 13,
    lineHeight: 19,
  },

  slotsContainer: {
    width: '100%',
    marginBottom: 18,
  },

  slotsTitle: {
    color: COLORS.navy,
    fontSize: 17,
    fontWeight: '900',
    marginBottom: 10,
  },

  slotCard: {
    width: '100%',
    backgroundColor: 'white',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  slotCardSelected: {
    borderColor: COLORS.teal,
    borderWidth: 2,
  },

  slotInfo: {
    flex: 1,
  },

  slotDate: {
    color: COLORS.navy,
    fontSize: 15,
    fontWeight: '800',
  },

  slotTime: {
    color: COLORS.teal,
    fontSize: 18,
    fontWeight: '900',
    marginTop: 3,
  },

  slotRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  workerCount: {
    color: COLORS.gray,
    fontSize: 11,
    marginRight: 10,
  },

  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  radioSelected: {
    borderColor: COLORS.teal,
  },

  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.teal,
  },

  noSlotsCard: {
    width: '100%',
    backgroundColor: '#FFF7EA',
    borderRadius: 18,
    padding: 18,
    marginBottom: 20,
  },

  noSlotsTitle: {
    color: COLORS.navy,
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 6,
  },

  noSlotsText: {
    color: COLORS.gray,
    fontSize: 13,
    lineHeight: 19,
  },

  smallNote: {
    color: COLORS.gray,
    fontSize: 11,
    lineHeight: 17,
    textAlign: 'center',
    marginTop: 14,
    marginBottom: 10,
  },
})