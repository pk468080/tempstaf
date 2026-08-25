import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  SafeAreaView,
  StyleSheet,
  Text,
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
    coordinates,
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

      /*
       * Check workers who are connected to the
       * selected service.
       */
      const {
        data: serviceWorkers,
        error: serviceWorkerError,
      } = await supabase
        .from('worker_services')
        .select('worker_id')
        .eq('service_id', selectedServiceId)

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

      /*
       * Check workers who are currently marked
       * as available.
       */
      const now = new Date().toISOString()

      const {
        data: availabilityRows,
        error: availabilityError,
      } = await supabase
        .from('worker_availability')
        .select(
          'worker_id, available_from, available_until, is_available'
        )
        .in('worker_id', workerIds)
        .eq('is_available', true)
        .lte('available_from', now)
        .gte('available_until', now)

      if (availabilityError) {
        throw availabilityError
      }

      const currentlyAvailableIds =
        (availabilityRows ?? []).map(
          item => item.worker_id
        )

      if (currentlyAvailableIds.length === 0) {
        setAvailable(false)
        return
      }

      /*
       * Check the worker profiles.
       *
       * We intentionally do NOT show the worker to
       * the customer. The admin/system will handle
       * assignment later.
       */
      const {
        data: workers,
        error: workersError,
      } = await supabase
        .from('worker_profiles')
        .select(
          'id, worker_status, is_verified, rating, service_radius_km'
        )
        .in('id', currentlyAvailableIds)
        .eq('is_verified', true)

      if (workersError) {
        throw workersError
      }

      const validWorkers = workers ?? []

      if (validWorkers.length === 0) {
        setAvailable(false)
        return
      }

      /*
       * For now we use the database's availability
       * system as the availability decision.
       *
       * Distance/radius matching will be added next
       * once the booking availability path is working.
       */
      const worker = validWorkers[0]

      setSelectedWorker({
        id: worker.id,
        name: 'TempStaff Worker',
        service: selectedService,
        rating: Number(worker.rating ?? 0),
        jobs: 0,
        distance: 'Nearby',
      })

      setBookingMode('Instant')
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

  const continueToPayment = () => {
    /*
     * Payment will be connected properly in the
     * next step. For now we move to the existing
     * confirmation route so we can continue building
     * the flow one screen at a time.
     */
    navigation.navigate('BookingConfirmed')
  }

  const scheduleBooking = () => {
    setBookingMode('Scheduled')

    /*
     * The next step will replace this route with
     * the real scheduling screen.
     */
    navigation.navigate('BookingConfirmed')
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.page}>
        <Header
          onBack={() => navigation.goBack()}
        />

        <View style={styles.content}>
          {checking ? (
            <>
              <View style={styles.loaderCircle}>
                <ActivityIndicator
                  size="large"
                  color={COLORS.teal}
                />
              </View>

              <Text style={styles.title}>
                Checking availability
              </Text>

              <Text style={styles.subtitle}>
                We're checking TempStaff workers available
                for your service.
              </Text>

              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>
                  SERVICE
                </Text>

                <Text style={styles.summaryService}>
                  {selectedService}
                </Text>

                <Text style={styles.summaryPackage}>
                  {selectedPackage?.name}
                </Text>
              </View>
            </>
          ) : error ? (
            <>
              <View style={styles.errorCircle}>
                <Text style={styles.errorIcon}>
                  !
                </Text>
              </View>

              <Text style={styles.title}>
                Unable to check
              </Text>

              <Text style={styles.subtitle}>
                {error}
              </Text>

              <PrimaryButton
                title="Try Again"
                onPress={checkAvailability}
              />
            </>
          ) : available ? (
            <>
              <View style={styles.successCircle}>
                <Text style={styles.successIcon}>
                  ✓
                </Text>
              </View>

              <Text style={styles.title}>
                Staff available
              </Text>

              <Text style={styles.subtitle}>
                A TempStaff worker is available for your
                selected service right now.
              </Text>

              <View style={styles.instantCard}>
                <Text style={styles.instantTitle}>
                  Instant booking available
                </Text>

                <Text style={styles.instantText}>
                  You can book this service now. TempStaff
                  will assign the worker for you.
                </Text>
              </View>

              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>
                  YOUR BOOKING
                </Text>

                <Text style={styles.summaryService}>
                  {selectedService}
                </Text>

                <Text style={styles.summaryPackage}>
                  {selectedPackage?.name}
                </Text>

                <Text style={styles.address}>
                  {address}
                </Text>
              </View>

              <PrimaryButton
                title="Continue"
                onPress={continueToPayment}
              />

              <Text style={styles.smallNote}>
                You don't choose the worker. TempStaff
                handles worker assignment.
              </Text>
            </>
          ) : (
            <>
              <View style={styles.scheduleCircle}>
                <Text style={styles.scheduleIcon}>
                  📅
                </Text>
              </View>

              <Text style={styles.title}>
                No staff available right now
              </Text>

              <Text style={styles.subtitle}>
                We couldn't find an available worker for
                this service right now.
              </Text>

              <View style={styles.scheduleCard}>
                <Text style={styles.scheduleTitle}>
                  Schedule instead
                </Text>

                <Text style={styles.scheduleText}>
                  Choose a future time and TempStaff will
                  arrange a worker for your booking.
                </Text>
              </View>

              <PrimaryButton
                title="Schedule Service"
                onPress={scheduleBooking}
              />

              <Text style={styles.smallNote}>
                Worker assignment will be handled by
                TempStaff.
              </Text>
            </>
          )}
        </View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.light,
  },

  page: {
    flex: 1,
    padding: 22,
  },

  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
    maxWidth: 340,
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

  scheduleCard: {
    width: '100%',
    backgroundColor: '#FFF7EA',
    borderRadius: 18,
    padding: 17,
    marginBottom: 20,
  },

  scheduleTitle: {
    color: COLORS.navy,
    fontSize: 17,
    fontWeight: '900',
    marginBottom: 6,
  },

  scheduleText: {
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
  },
})