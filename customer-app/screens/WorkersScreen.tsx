import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
} from 'react-native'
import { useEffect, useState } from 'react'
import { NativeStackScreenProps } from '@react-navigation/native-stack'

import { COLORS } from '../constants/theme'
import { RootStackParamList } from '../types'
import { useBooking } from '../context/BookingContext'
import Header from '../components/Header'
import WorkerCard from '../components/WorkerCard'
import {
  AppWorker,
  getWorkersByService,
} from '../services/workers'

type Props = NativeStackScreenProps<
  RootStackParamList,
  'Workers'
>

export default function WorkersScreen({
  navigation,
}: Props) {
  const {
    selectedService,
    address,
    setSelectedWorker,
  } = useBooking()

  const [workers, setWorkers] = useState<AppWorker[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    async function loadWorkers() {
      if (!selectedService) {
        setWorkers([])
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        const result =
          await getWorkersByService(selectedService)

        if (mounted) {
          setWorkers(result)
        }
      } catch (err) {
        console.error('Worker loading error:', err)

        if (mounted) {
          setError(
            'We could not load staff right now. Please try again.'
          )
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    loadWorkers()

    return () => {
      mounted = false
    }
  }, [selectedService])

  const handleWorkerSelect = (worker: AppWorker) => {
    setSelectedWorker(worker as any)

    navigation.navigate('Summary')
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.page}
        showsVerticalScrollIndicator={false}
      >
        <Header
          onBack={() => navigation.goBack()}
        />

        <Text style={styles.title}>
          Available Staff
        </Text>

        <Text style={styles.subtitle}>
          Verified {selectedService || 'staff'} workers
          near your location.
        </Text>

        <View style={styles.info}>
          <Text style={styles.pin}>📍</Text>

          <View style={{ flex: 1 }}>
            <Text style={styles.infoTitle}>
              Staff near you
            </Text>

            <Text style={styles.infoText}>
              {address === 'Current location'
                ? 'Using your current location'
                : address || 'Your selected service location'}
            </Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator
              size="large"
              color={COLORS.orange}
            />

            <Text style={styles.loadingText}>
              Finding available staff...
            </Text>
          </View>
        ) : error ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>
              Something went wrong
            </Text>

            <Text style={styles.emptyText}>
              {error}
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.count}>
              {workers.length} staff available
            </Text>

            {workers.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>
                  No staff available
                </Text>

                <Text style={styles.emptyText}>
                  No verified {selectedService} workers
                  are currently available.
                </Text>
              </View>
            ) : (
              workers.map(worker => (
                <WorkerCard
                  key={worker.id}
                  worker={worker as any}
                  onSelect={() =>
                    handleWorkerSelect(worker)
                  }
                />
              ))
            )}
          </>
        )}
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
    padding: 22,
    paddingBottom: 45,
  },

  title: {
    color: COLORS.navy,
    fontSize: 31,
    fontWeight: '800',
    marginBottom: 7,
  },

  subtitle: {
    color: COLORS.gray,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 22,
  },

  info: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    padding: 16,
    marginBottom: 20,
  },

  pin: {
    fontSize: 20,
    marginRight: 14,
  },

  infoTitle: {
    color: COLORS.navy,
    fontSize: 16,
    fontWeight: '800',
  },

  infoText: {
    color: COLORS.gray,
    fontSize: 13,
    marginTop: 4,
  },

  count: {
    color: COLORS.navy,
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 12,
  },

  center: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },

  loadingText: {
    color: COLORS.gray,
    fontSize: 14,
    marginTop: 12,
  },

  empty: {
    backgroundColor: 'white',
    borderRadius: 18,
    padding: 25,
    alignItems: 'center',
  },

  emptyTitle: {
    color: COLORS.navy,
    fontSize: 18,
    fontWeight: '800',
  },

  emptyText: {
    color: COLORS.gray,
    marginTop: 7,
    textAlign: 'center',
    lineHeight: 20,
  },
})