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

type Props = NativeStackScreenProps<
  RootStackParamList,
  'WorkerProfile'
>

export default function WorkerProfileScreen({
  navigation,
  route,
}: Props) {
  const { worker, service, duration } = route.params
  const { setSelectedWorker, setSelectedService, setSelectedDuration } = useBooking()

  const handleSelectWorker = () => {
    setSelectedWorker(worker)
    if (service) {
      setSelectedService(service)
    }
    if (duration) {
      setSelectedDuration(duration)
    }
    navigation.navigate('Summary')
  }

  const renderStar = (count: number) => {
    return '★'.repeat(Math.floor(count)) + (count % 1 >= 0.5 ? '✕' : '')
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>

          <Text style={styles.headerTitle}>
            Worker Profile
          </Text>

          <View style={styles.headerPlaceholder} />
        </View>

        {/* Worker Avatar & Name */}
        <View style={styles.profileCard}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarText}>
              {worker.name?.charAt(0).toUpperCase()}
            </Text>
          </View>

          <Text style={styles.workerName}>
            {worker.name}
          </Text>

          {worker.verified && (
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedText}>
                ✓ Verified
              </Text>
            </View>
          )}
        </View>

        {/* Rating Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Performance
          </Text>

          <View style={styles.ratingCard}>
            <View style={styles.ratingRow}>
              <Text style={styles.ratingLabel}>
                Rating
              </Text>
              <View style={styles.ratingStars}>
                <Text style={styles.stars}>
                  {renderStar(worker.rating || 0)}
                </Text>
                <Text style={styles.ratingValue}>
                  {(worker.rating || 0).toFixed(1)}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.ratingRow}>
              <Text style={styles.ratingLabel}>
                Completed Jobs
              </Text>
              <Text style={styles.ratingValue}>
                {worker.completedJobs || worker.jobs || 0}
              </Text>
            </View>
          </View>
        </View>

        {/* Service Section */}
        {service && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Service
            </Text>

            <View style={styles.serviceCard}>
              <Text style={styles.serviceName}>
                {service}
              </Text>

              {duration && (
                <Text style={styles.duration}>
                  {duration}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Availability */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Status
          </Text>

          <View style={styles.statusCard}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>
              {worker.available ? 'Available Now' : 'Currently Busy'}
            </Text>
          </View>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            About
          </Text>

          <View style={styles.aboutCard}>
            <Text style={styles.aboutText}>
              Professional with {worker.completedJobs || 0} completed jobs.
              Highly rated by customers for reliability and quality work.
            </Text>
          </View>
        </View>

        {/* Distance */}
        {worker.distance && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Distance
            </Text>

            <View style={styles.infoCard}>
              <Text style={styles.infoText}>
                📍 {worker.distance} away
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Footer Action */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.selectButton}
          onPress={handleSelectWorker}
        >
          <Text style={styles.selectButtonText}>
            Select This Worker
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.light,
  },

  content: {
    paddingBottom: 100,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  backButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },

  backText: {
    fontSize: 28,
    color: COLORS.navy,
    fontWeight: '300',
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.navy,
  },

  headerPlaceholder: {
    width: 36,
  },

  profileCard: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 18,
  },

  avatarLarge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.orange,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },

  avatarText: {
    fontSize: 48,
    fontWeight: '800',
    color: 'white',
  },

  workerName: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.navy,
    marginBottom: 12,
  },

  verifiedBadge: {
    backgroundColor: COLORS.teal,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },

  verifiedText: {
    fontSize: 12,
    fontWeight: '700',
    color: 'white',
  },

  section: {
    paddingHorizontal: 16,
    marginTop: 20,
  },

  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.gray,
    marginBottom: 12,
    textTransform: 'uppercase',
  },

  ratingCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },

  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },

  ratingLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.navy,
  },

  ratingStars: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  stars: {
    fontSize: 16,
    color: COLORS.orange,
  },

  ratingValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.navy,
  },

  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 8,
  },

  serviceCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },

  serviceName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.navy,
  },

  duration: {
    fontSize: 13,
    color: COLORS.gray,
    marginTop: 6,
  },

  statusCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },

  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.teal,
    marginRight: 12,
  },

  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.navy,
  },

  aboutCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },

  aboutText: {
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.gray,
  },

  infoCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },

  infoText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.navy,
  },

  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 20,
  },

  selectButton: {
    backgroundColor: COLORS.orange,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },

  selectButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
})
