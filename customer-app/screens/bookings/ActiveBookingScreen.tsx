import { useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import MapView, {
  Marker,
  PROVIDER_GOOGLE,
  type Region,
} from 'react-native-maps'

import { ScreenContainer } from '../../components/layout/ScreenContainer'

import {
  getCustomerBooking,
  getLatestWorkerLocation,
  getWorkerLocationAgeSeconds,
  getWorkerLocationFreshness,
  requestBookingOtp,
  type BookingStatus,
  type CustomerBooking,
  type WorkerLocation,
  type WorkerLocationFreshness,
} from '../../services/booking/bookingTracking.service'

import { supabase } from '../../lib/supabase'

type ActiveBookingScreenProps = {
  bookingId: string
}

function formatStatus(status: BookingStatus) {
  return status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, value => value.toUpperCase())
}

function formatMoney(amount: number | null) {
  if (amount === null) return '—'
  return amount.toFixed(2)
}

function formatDateTime(value: string | null) {
  if (!value) return 'Not set'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

function elapsedSince(startedAt: string, completedAt: string | null) {
  const end = completedAt ? Date.parse(completedAt) : Date.now()
  const start = Date.parse(startedAt)

  if (!Number.isFinite(start)) return '00:00:00'

  const seconds = Math.max(0, Math.floor((end - start) / 1000))
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainder = seconds % 60

  return [hours, minutes, remainder]
    .map(value => String(value).padStart(2, '0'))
    .join(':')
}

function isTerminalStatus(status: BookingStatus) {
  return (
    status === 'completed' ||
    status === 'cancelled' ||
    status === 'expired'
  )
}

function isTrackingStatus(status: BookingStatus) {
  return (
    status === 'on_the_way' ||
    status === 'arrived' ||
    status === 'in_progress'
  )
}

function getStateTitle(booking: CustomerBooking) {
  switch (booking.status) {
    case 'paid':
      return 'Payment confirmed'
    case 'searching_worker':
      return 'Finding your worker'
    case 'assigned':
      return 'Worker assigned'
    case 'on_the_way':
      return 'Worker is on the way'
    case 'arrived':
      return 'Worker has arrived'
    case 'in_progress':
      return 'Service in progress'
    case 'completed':
      return 'Booking completed'
    case 'cancelled':
      return 'Booking cancelled'
    case 'expired':
      return 'Booking expired'
    case 'payment_failed':
      return 'Payment failed'
    case 'pending_payment':
      return 'Payment pending'
    default:
      return formatStatus(booking.status)
  }
}

function getStateMessage(booking: CustomerBooking) {
  switch (booking.status) {
    case 'paid':
      return 'Your payment was confirmed. We are completing worker assignment.'
    case 'searching_worker':
      return 'Your payment is confirmed. We are finding an eligible worker.'
    case 'assigned':
      return 'Your booking is confirmed. Your worker will start the journey when travelling to you.'
    case 'on_the_way':
      return 'Your assigned worker is travelling to the booking location.'
    case 'arrived':
      return 'Your worker has arrived. Provide the start OTP when requested.'
    case 'in_progress':
      return 'Your service is currently in progress.'
    case 'completed':
      return 'This booking has been completed.'
    case 'cancelled':
      return 'This booking has been cancelled.'
    case 'expired':
      return 'This booking has expired.'
    case 'payment_failed':
      return 'Payment was not completed for this booking.'
    case 'pending_payment':
      return 'Payment is required before this booking can be confirmed.'
    default:
      return 'Booking status updated.'
  }
}

function getTrackingLabel(freshness: WorkerLocationFreshness) {
  switch (freshness) {
    case 'fresh':
      return 'Live location available'
    case 'stale':
      return 'Location temporarily unavailable'
    case 'unavailable':
      return 'Waiting for worker location'
  }
}

function toMapRegion(location: WorkerLocation): Region {
  return {
    latitude: location.latitude,
    longitude: location.longitude,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  }
}

export default function ActiveBookingScreen({
  bookingId,
}: ActiveBookingScreenProps) {
  const [booking, setBooking] = useState<CustomerBooking | null>(null)
  const [location, setLocation] = useState<WorkerLocation | null>(null)
  const [locationNow, setLocationNow] = useState(Date.now())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [otp, setOtp] = useState<string | null>(null)
  const [timer, setTimer] = useState('00:00:00')
  const [mapRegion, setMapRegion] = useState<Region | null>(null)

  const locationFreshness = useMemo(
    () => getWorkerLocationFreshness(location, locationNow),
    [location, locationNow],
  )

  const locationAgeSeconds = useMemo(
    () => getWorkerLocationAgeSeconds(location, locationNow),
    [location, locationNow],
  )

  async function refresh() {
    try {
      const nextBooking = await getCustomerBooking(bookingId)
      setBooking(nextBooking)

      if (nextBooking.worker_id) {
        const nextLocation = await getLatestWorkerLocation(bookingId)
        setLocation(nextLocation)

        if (
          nextLocation &&
          getWorkerLocationFreshness(nextLocation) === 'fresh'
        ) {
          setMapRegion(toMapRegion(nextLocation))
        }
      } else {
        setLocation(null)
        setMapRegion(null)
      }

      setLocationNow(Date.now())
      setError(null)
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : 'Unable to load booking.',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()

    const refreshInterval = setInterval(() => void refresh(), 15000)
    const clockInterval = setInterval(() => setLocationNow(Date.now()), 1000)

    const channel = supabase
      .channel(`customer-booking-${bookingId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bookings',
          filter: `id=eq.${bookingId}`,
        },
        () => void refresh(),
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'worker_locations',
          filter: `booking_id=eq.${bookingId}`,
        },
        payload => {
          const nextLocation = payload.new as WorkerLocation
          setLocation(nextLocation)
          setLocationNow(Date.now())

          if (getWorkerLocationFreshness(nextLocation) === 'fresh') {
            setMapRegion(toMapRegion(nextLocation))
          }
        },
      )
      .subscribe()

    return () => {
      clearInterval(refreshInterval)
      clearInterval(clockInterval)
      void supabase.removeChannel(channel)
    }
  }, [bookingId])

  useEffect(() => {
    if (!booking?.started_at) {
      setTimer('00:00:00')
      return
    }

    const update = () => {
      setTimer(
        elapsedSince(
          booking.started_at!,
          booking.completed_at,
        ),
      )
    }

    update()
    const interval = setInterval(update, 1000)

    return () => clearInterval(interval)
  }, [booking?.started_at, booking?.completed_at])

  async function showOtp(type: 'start' | 'end') {
    if (!booking) return

    if (type === 'start' && booking.status !== 'arrived') {
      setError('The start OTP is available after the worker arrives.')
      return
    }

    if (type === 'end' && booking.status !== 'in_progress') {
      setError('The end OTP is available while the service is in progress.')
      return
    }

    try {
      const result = await requestBookingOtp(bookingId, type)

      setOtp(result.otp ?? 'OTP sent to your registered contact.')
      setError(null)
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : 'Unable to generate the booking OTP.',
      )
    }
  }

  if (loading) {
    return (
      <ScreenContainer>
        <View style={styles.loading}>
          <ActivityIndicator color="#00A7A7" />
          <Text style={styles.loadingText}>Loading booking...</Text>
        </View>
      </ScreenContainer>
    )
  }

  if (!booking) {
    return (
      <ScreenContainer>
        <View style={styles.container}>
          <BrandHeader />
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Booking unavailable</Text>
            <Text style={styles.error}>
              {error ?? 'Booking could not be loaded.'}
            </Text>
          </View>
        </View>
      </ScreenContainer>
    )
  }

  const workerAssigned = booking.worker_id !== null
  const terminal = isTerminalStatus(booking.status)
  const tracking = isTrackingStatus(booking.status)
  const showLiveMap =
    tracking &&
    locationFreshness === 'fresh' &&
    location !== null

  return (
    <ScreenContainer>
      <View style={styles.container}>
        <BrandHeader />

        <View style={styles.pageHeader}>
          <View>
            <Text style={styles.eyebrow}>
              {tracking ? 'LIVE BOOKING' : 'BOOKING'}
            </Text>
            <Text style={styles.title}>
              {tracking ? 'Booking tracking' : 'Booking confirmation'}
            </Text>
          </View>

          <View style={styles.statusPill}>
            <Text style={styles.statusPillText}>
              {formatStatus(booking.status)}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.stateCard,
            booking.status === 'searching_worker' && styles.searchingCard,
            booking.status === 'on_the_way' && styles.trackingCard,
            booking.status === 'in_progress' && styles.progressCard,
          ]}
        >
          <View style={styles.stateIcon}>
            <Text style={styles.stateIconText}>
              {booking.status === 'completed'
                ? '✓'
                : booking.status === 'cancelled'
                  ? '!'
                  : '•'}
            </Text>
          </View>

          <View style={styles.stateCopy}>
            <Text style={styles.stateTitle}>
              {getStateTitle(booking)}
            </Text>
            <Text style={styles.stateMessage}>
              {getStateMessage(booking)}
            </Text>
          </View>
        </View>

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Update</Text>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {tracking && workerAssigned ? (
          <View style={styles.mapCard}>
            <View style={styles.mapHeader}>
              <View>
                <Text style={styles.sectionEyebrow}>WORKER</Text>
                <Text style={styles.mapTitle}>Worker location</Text>
              </View>

              <Text
                style={[
                  styles.freshness,
                  locationFreshness === 'fresh' && styles.freshText,
                  locationFreshness === 'stale' && styles.staleText,
                ]}
              >
                {getTrackingLabel(locationFreshness)}
              </Text>
            </View>

            {showLiveMap ? (
              <MapView
                provider={PROVIDER_GOOGLE}
                style={styles.map}
                region={mapRegion ?? toMapRegion(location)}
                showsUserLocation={false}
                showsMyLocationButton={false}
                showsCompass
                toolbarEnabled={false}
                scrollEnabled
                zoomEnabled
                rotateEnabled={false}
                pitchEnabled={false}
              >
                <Marker
                  coordinate={{
                    latitude: location.latitude,
                    longitude: location.longitude,
                  }}
                  title="Worker"
                  description="Current worker location"
                />
              </MapView>
            ) : (
              <View style={styles.mapUnavailable}>
                <Text style={styles.mapUnavailableTitle}>
                  {locationFreshness === 'stale'
                    ? 'Live location unavailable'
                    : 'Waiting for worker location'}
                </Text>
                <Text style={styles.mapUnavailableMessage}>
                  {locationFreshness === 'stale'
                    ? 'The last location update is too old to display as the worker’s current position.'
                    : 'The worker has not sent a location update yet.'}
                </Text>
              </View>
            )}

            {showLiveMap ? (
              <Text style={styles.locationAge}>
                Updated {locationAgeSeconds ?? 0} seconds ago
              </Text>
            ) : null}
          </View>
        ) : null}

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.sectionEyebrow}>SUMMARY</Text>
              <Text style={styles.sectionTitle}>Booking details</Text>
            </View>
          </View>

          <Row
            label="Service"
            value={booking.service_name ?? 'Service'}
          />
          <Row
            label="Booking ID"
            value={booking.id}
          />
          <Row
            label="Start"
            value={formatDateTime(booking.scheduled_start)}
          />
          <Row
            label="End"
            value={formatDateTime(booking.scheduled_end)}
          />
          <Row
            label="Working hours"
            value={
              booking.total_working_hours === null
                ? '—'
                : String(booking.total_working_hours)
            }
          />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total amount</Text>
            <Text style={styles.totalValue}>
              {formatMoney(booking.total_amount)}
            </Text>
          </View>
        </View>

        {!terminal &&
        booking.status !== 'pending_payment' &&
        booking.status !== 'payment_failed' ? (
          <View style={styles.card}>
            <Text style={styles.sectionEyebrow}>ASSIGNMENT</Text>
            <Text style={styles.sectionTitle}>Worker</Text>

            {workerAssigned ? (
              <>
                <Text style={styles.worker}>Worker assigned</Text>
                <Text style={styles.workerId}>
                  Worker ID: {booking.worker_id}
                </Text>

                {tracking ? (
                  <View style={styles.trackingPanel}>
                    <Text style={styles.trackingTitle}>
                      Tracking status
                    </Text>

                    <Text
                      style={[
                        styles.freshness,
                        locationFreshness === 'fresh' && styles.freshText,
                        locationFreshness === 'stale' && styles.staleText,
                      ]}
                    >
                      {getTrackingLabel(locationFreshness)}
                    </Text>

                    {location && locationFreshness === 'fresh' ? (
                      <>
                        <Text style={styles.location}>
                          Current position: {location.latitude.toFixed(5)},{' '}
                          {location.longitude.toFixed(5)}
                        </Text>
                        <Text style={styles.locationAge}>
                          Updated {locationAgeSeconds ?? 0} seconds ago
                        </Text>
                      </>
                    ) : locationFreshness === 'stale' ? (
                      <Text style={styles.staleMessage}>
                        The last known location is too old to be presented as
                        live. We will continue checking for a fresh update.
                      </Text>
                    ) : (
                      <Text style={styles.staleMessage}>
                        Waiting for the worker's first location update.
                      </Text>
                    )}
                  </View>
                ) : null}
              </>
            ) : (
              <View style={styles.searchingRow}>
                <ActivityIndicator color="#00A7A7" />
                <Text style={styles.worker}>
                  Searching for a worker...
                </Text>
              </View>
            )}
          </View>
        ) : null}

        {booking.status === 'in_progress' && booking.started_at ? (
          <View style={styles.timerCard}>
            <Text style={styles.sectionEyebrow}>SERVICE</Text>
            <Text style={styles.timerLabel}>Service duration</Text>
            <Text style={styles.timer}>{timer}</Text>
          </View>
        ) : null}

        {booking.status === 'arrived' ? (
          <Pressable
            style={styles.button}
            onPress={() => void showOtp('start')}
          >
            <Text style={styles.buttonText}>Show start OTP</Text>
          </Pressable>
        ) : null}

        {booking.status === 'in_progress' ? (
          <Pressable
            style={styles.button}
            onPress={() => void showOtp('end')}
          >
            <Text style={styles.buttonText}>Show end OTP</Text>
          </Pressable>
        ) : null}

        {otp ? (
          <View style={styles.otpCard}>
            <Text style={styles.sectionEyebrow}>SECURE CODE</Text>
            <Text style={styles.otpLabel}>Booking OTP</Text>
            <Text style={styles.otp}>{otp}</Text>
          </View>
        ) : null}

        {booking.status === 'searching_worker' ? (
          <Text style={styles.refreshHint}>
            We will continue checking for an eligible worker automatically.
          </Text>
        ) : null}

        {booking.status === 'completed' ? (
          <View style={styles.completedCard}>
            <Text style={styles.completedTitle}>Service completed</Text>
            <Text style={styles.completedMessage}>
              Service completed at {formatDateTime(booking.completed_at)}.
            </Text>
          </View>
        ) : null}
      </View>
    </ScreenContainer>
  )
}

function BrandHeader() {
  return (
    <View style={styles.brandRow}>
      <Image
        source={require('../../assets/branding/tempstuff-logo.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <View style={styles.brandCopy}>
        <Text style={styles.brandName}>TempStaff</Text>
        <Text style={styles.brandSubtitle}>Booking & worker updates</Text>
      </View>
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
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },

  loadingText: {
    color: '#61798A',
  },

  container: {
    padding: 20,
    paddingBottom: 28,
    backgroundColor: '#F5FAFD',
  },

  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 18,
  },

  logo: {
    width: 54,
    height: 42,
  },

  brandCopy: {
    marginLeft: 10,
  },

  brandName: {
    fontSize: 18,
    fontWeight: '900',
    color: '#062F52',
  },

  brandSubtitle: {
    marginTop: 2,
    fontSize: 11,
    color: '#708493',
  },

  pageHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 14,
  },

  eyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: '#00A7A7',
  },

  title: {
    marginTop: 3,
    fontSize: 27,
    fontWeight: '900',
    color: '#062F52',
  },

  statusPill: {
    maxWidth: '42%',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 14,
    backgroundColor: '#E5F6F5',
  },

  statusPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#007D7D',
    textAlign: 'center',
  },

  stateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderRadius: 20,
    backgroundColor: '#062F52',
    marginBottom: 14,
  },

  searchingCard: {
    backgroundColor: '#0A426B',
  },

  trackingCard: {
    backgroundColor: '#075F70',
  },

  progressCard: {
    backgroundColor: '#0A5260',
  },

  stateIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00A7A7',
  },

  stateIconText: {
    fontSize: 23,
    fontWeight: '900',
    color: '#FFFFFF',
  },

  stateCopy: {
    flex: 1,
    marginLeft: 13,
  },

  stateTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: '#FFFFFF',
  },

  stateMessage: {
    marginTop: 5,
    lineHeight: 18,
    fontSize: 12,
    color: '#DCEEF5',
  },

  errorCard: {
    marginBottom: 14,
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#FFF4F2',
    borderWidth: 1,
    borderColor: '#F2C8C1',
  },

  errorTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#A33A2B',
  },

  errorText: {
    marginTop: 3,
    color: '#7E4038',
    lineHeight: 18,
  },

  mapCard: {
    marginBottom: 14,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DCEAF2',
  },

  mapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },

  sectionEyebrow: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.1,
    color: '#00A7A7',
  },

  mapTitle: {
    marginTop: 3,
    fontSize: 17,
    fontWeight: '900',
    color: '#062F52',
  },

  map: {
    width: '100%',
    height: 270,
  },

  mapUnavailable: {
    height: 270,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#EEF5F8',
  },

  mapUnavailableTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#062F52',
    textAlign: 'center',
  },

  mapUnavailableMessage: {
    marginTop: 8,
    color: '#61798A',
    lineHeight: 20,
    textAlign: 'center',
  },

  locationAge: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#708493',
    fontSize: 11,
  },

  card: {
    padding: 18,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DCEAF2',
    marginBottom: 14,
  },

  cardHeader: {
    marginBottom: 8,
  },

  sectionTitle: {
    marginTop: 3,
    marginBottom: 10,
    fontSize: 18,
    fontWeight: '900',
    color: '#062F52',
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF3F6',
  },

  label: {
    color: '#708493',
    fontSize: 13,
  },

  value: {
    flex: 1,
    maxWidth: '65%',
    color: '#173B52',
    fontWeight: '700',
    textAlign: 'right',
    fontSize: 13,
  },

  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#DCEAF2',
  },

  totalLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#062F52',
  },

  totalValue: {
    fontSize: 21,
    fontWeight: '900',
    color: '#00A7A7',
  },

  worker: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: '800',
    color: '#062F52',
  },

  workerId: {
    marginTop: 5,
    color: '#708493',
    fontSize: 11,
  },

  searchingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  trackingPanel: {
    marginTop: 15,
    padding: 15,
    borderRadius: 16,
    backgroundColor: '#F5FAFD',
    borderWidth: 1,
    borderColor: '#DCEAF2',
  },

  trackingTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#062F52',
  },

  freshness: {
    marginTop: 7,
    fontSize: 12,
    fontWeight: '800',
  },

  freshText: {
    color: '#008A88',
  },

  staleText: {
    color: '#A56A19',
  },

  location: {
    marginTop: 11,
    color: '#395A6C',
    lineHeight: 20,
  },

  staleMessage: {
    marginTop: 11,
    color: '#61798A',
    lineHeight: 20,
  },

  timerCard: {
    padding: 18,
    borderRadius: 20,
    backgroundColor: '#062F52',
    marginBottom: 14,
    alignItems: 'center',
  },

  timerLabel: {
    marginTop: 5,
    color: '#D9EAF3',
  },

  timer: {
    marginTop: 7,
    fontSize: 36,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
  },

  button: {
    minHeight: 52,
    marginBottom: 12,
    borderRadius: 15,
    backgroundColor: '#00A7A7',
    alignItems: 'center',
    justifyContent: 'center',
  },

  buttonText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 15,
  },

  otpCard: {
    marginBottom: 14,
    padding: 20,
    borderRadius: 20,
    backgroundColor: '#EAF8F7',
    borderWidth: 1,
    borderColor: '#C7E9E6',
    alignItems: 'center',
  },

  otpLabel: {
    marginTop: 5,
    color: '#355E68',
    fontWeight: '700',
  },

  otp: {
    marginTop: 8,
    fontSize: 30,
    fontWeight: '900',
    color: '#062F52',
    letterSpacing: 5,
  },

  refreshHint: {
    marginTop: 2,
    marginBottom: 14,
    color: '#61798A',
    textAlign: 'center',
    lineHeight: 20,
  },

  completedCard: {
    padding: 18,
    borderRadius: 20,
    backgroundColor: '#EAF8F7',
    borderWidth: 1,
    borderColor: '#C7E9E6',
  },

  completedTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#062F52',
  },

  completedMessage: {
    marginTop: 5,
    color: '#355E68',
    lineHeight: 20,
  },

  emptyCard: {
    padding: 20,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DCEAF2',
  },

  emptyTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#062F52',
    marginBottom: 8,
  },
})
