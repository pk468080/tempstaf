import React from 'react'
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  FlatList,
} from 'react-native'

const ORANGE = '#FF9F2F'
const NAVY = '#082B4C'
const TEAL = '#08A6A6'
const LIGHT = '#F7F9FB'
const GRAY = '#6B7280'

type Worker = {
  id: string
  name: string
  service: string
  rating: number
  completedJobs: number
  distance: number
  verified: boolean
  available: boolean
}

const workers: Worker[] = [
  {
    id: '1',
    name: 'Raj Kumar',
    service: 'Office Boy',
    rating: 4.8,
    completedJobs: 126,
    distance: 1.2,
    verified: true,
    available: true,
  },
  {
    id: '2',
    name: 'Amit Sharma',
    service: 'Office Boy',
    rating: 4.7,
    completedJobs: 94,
    distance: 2.4,
    verified: true,
    available: true,
  },
  {
    id: '3',
    name: 'Vikas Singh',
    service: 'Office Boy',
    rating: 4.6,
    completedJobs: 78,
    distance: 3.1,
    verified: true,
    available: true,
  },
]

type Props = {
  navigation: any
  route: {
    params?: {
      service?: string
      duration?: string
      address?: string
      latitude?: number
      longitude?: number
    }
  }
}

export default function WorkerResultsScreen({
  navigation,
  route,
}: Props) {
  const service = route.params?.service || 'Office Boy'
  const duration = route.params?.duration || '1 Week'

  const handleWorkerPress = (worker: Worker) => {
    navigation.navigate('WorkerProfile', {
      worker,
      service,
      duration,
    })
  }

  const renderWorker = ({ item }: { item: Worker }) => (
    <TouchableOpacity
      activeOpacity={0.85}
      style={styles.workerCard}
      onPress={() => handleWorkerPress(item)}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {item.name.charAt(0)}
        </Text>
      </View>

      <View style={styles.workerInfo}>
        <View style={styles.nameRow}>
          <Text style={styles.workerName}>{item.name}</Text>

          {item.verified && (
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedText}>✓</Text>
            </View>
          )}
        </View>

        <Text style={styles.serviceText}>{item.service}</Text>

        <View style={styles.statsRow}>
          <Text style={styles.rating}>
            ★ {item.rating.toFixed(1)}
          </Text>

          <Text style={styles.completed}>
            {item.completedJobs} jobs
          </Text>

          <Text style={styles.distance}>
            {item.distance.toFixed(1)} km
          </Text>
        </View>
      </View>

      <View
        style={[
          styles.statusDot,
          {
            backgroundColor: item.available
              ? TEAL
              : '#9CA3AF',
          },
        ]}
      />
    </TouchableOpacity>
  )

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>

        <View>
          <Text style={styles.headerTitle}>
            Available Staff
          </Text>

          <Text style={styles.headerSubtitle}>
            {service} · {duration}
          </Text>
        </View>
      </View>

      <View style={styles.summaryCard}>
        <View>
          <Text style={styles.summaryLabel}>
            Staff required
          </Text>

          <Text style={styles.summaryValue}>
            {service}
          </Text>
        </View>

        <View style={styles.summaryRight}>
          <Text style={styles.summaryLabel}>
            Duration
          </Text>

          <Text style={styles.summaryValue}>
            {duration}
          </Text>
        </View>
      </View>

      <Text style={styles.resultsTitle}>
        Nearby workers
      </Text>

      <Text style={styles.resultsSubtitle}>
        Verified staff available for your booking
      </Text>

      <FlatList
        data={workers}
        keyExtractor={(item) => item.id}
        renderItem={renderWorker}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: LIGHT,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 20,
  },

  backButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },

  backText: {
    color: NAVY,
    fontSize: 36,
    lineHeight: 40,
    marginTop: -4,
  },

  headerTitle: {
    color: NAVY,
    fontSize: 26,
    fontWeight: '800',
  },

  headerSubtitle: {
    color: GRAY,
    fontSize: 14,
    marginTop: 3,
  },

  summaryCard: {
    marginHorizontal: 24,
    padding: 20,
    borderRadius: 18,
    backgroundColor: NAVY,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  summaryRight: {
    alignItems: 'flex-end',
  },

  summaryLabel: {
    color: '#C8D3DE',
    fontSize: 13,
    marginBottom: 5,
  },

  summaryValue: {
    color: 'white',
    fontSize: 16,
    fontWeight: '800',
  },

  resultsTitle: {
    color: NAVY,
    fontSize: 22,
    fontWeight: '800',
    marginHorizontal: 24,
    marginTop: 28,
  },

  resultsSubtitle: {
    color: GRAY,
    fontSize: 14,
    marginHorizontal: 24,
    marginTop: 5,
    marginBottom: 12,
  },

  list: {
    paddingHorizontal: 24,
    paddingBottom: 30,
  },

  workerCard: {
    backgroundColor: 'white',
    borderRadius: 18,
    padding: 18,
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E5EA',
  },

  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: NAVY,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },

  avatarText: {
    color: 'white',
    fontSize: 23,
    fontWeight: '800',
  },

  workerInfo: {
    flex: 1,
  },

  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  workerName: {
    color: NAVY,
    fontSize: 17,
    fontWeight: '800',
  },

  verifiedBadge: {
    width: 19,
    height: 19,
    borderRadius: 10,
    backgroundColor: TEAL,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 7,
  },

  verifiedText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '900',
  },

  serviceText: {
    color: GRAY,
    fontSize: 13,
    marginTop: 3,
  },

  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },

  rating: {
    color: ORANGE,
    fontSize: 13,
    fontWeight: '800',
    marginRight: 12,
  },

  completed: {
    color: GRAY,
    fontSize: 12,
    marginRight: 12,
  },

  distance: {
    color: GRAY,
    fontSize: 12,
  },

  statusDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    marginLeft: 8,
  },
})