import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import * as Location from 'expo-location'

import { ScreenContainer } from '../../components/layout/ScreenContainer'
import { getHomeServices } from '../../services/services/services.service'
import type { HomeService } from '../../types/service'

type HomeLocation = {
  latitude: number
  longitude: number
}

type HomeScreenProps = {
  location: HomeLocation | null
  onServicePress?: (service: HomeService) => void
}

export default function HomeScreen({
  location,
  onServicePress,
}: HomeScreenProps) {
  const [services, setServices] = useState<HomeService[]>([])
  const [address, setAddress] = useState('Current location')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  async function loadServices() {
    try {
      setError('')

      const result = await getHomeServices()

      setServices(result)
    } catch (err) {
      console.error('Home services error:', err)

      setError(
        'Unable to load services. Please try again.',
      )
    }
  }

  async function loadAddress() {
    if (!location) {
      return
    }

    try {
      const results =
        await Location.reverseGeocodeAsync({
          latitude: location.latitude,
          longitude: location.longitude,
        })

      const first = results[0]

      if (!first) {
        return
      }

      const parts = [
        first.name,
        first.street,
        first.district,
        first.city,
        first.region,
      ].filter(Boolean)

      if (parts.length > 0) {
        setAddress(parts.join(', '))
      }
    } catch (err) {
      console.error('Reverse geocoding error:', err)
    }
  }

  async function loadHome() {
    setLoading(true)

    await Promise.all([
      loadServices(),
      loadAddress(),
    ])

    setLoading(false)
  }

  async function refreshHome() {
    setRefreshing(true)

    await Promise.all([
      loadServices(),
      loadAddress(),
    ])

    setRefreshing(false)
  }

  useEffect(() => {
    void loadHome()
  }, [])

  if (loading) {
    return (
      <ScreenContainer>
        <View style={styles.loading}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>
            Loading services...
          </Text>
        </View>
      </ScreenContainer>
    )
  }

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refreshHome}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.locationSection}>
          <Text style={styles.locationLabel}>
            Current location
          </Text>

          <Text
            style={styles.location}
            numberOfLines={2}
          >
            {address}
          </Text>
        </View>

        <View style={styles.banner}>
          <Text style={styles.bannerTitle}>
            Services available in your area
          </Text>

          <Text style={styles.bannerText}>
            Choose a service to continue with your
            booking.
          </Text>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Services
          </Text>

          <Text style={styles.sectionSubtitle}>
            1-hour pricing
          </Text>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>
              {error}
            </Text>
          </View>
        ) : null}

        {services.length === 0 && !error ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>
              No services available
            </Text>

            <Text style={styles.emptyText}>
              There are currently no active hourly
              services available.
            </Text>
          </View>
        ) : (
          <FlatList
            data={services}
            scrollEnabled={false}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <ServiceCard
                service={item}
                onPress={() =>
                  onServicePress?.(item)
                }
              />
            )}
          />
        )}
      </ScrollView>
    </ScreenContainer>
  )
}

function ServiceCard({
  service,
  onPress,
}: {
  service: HomeService
  onPress: () => void
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardContent}>
        <Text style={styles.serviceName}>
          {service.name}
        </Text>

        {service.description ? (
          <Text
            style={styles.description}
            numberOfLines={2}
          >
            {service.description}
          </Text>
        ) : null}

        <Text style={styles.price}>
  Hourly pricing
</Text>
      </View>

      <Text
        style={styles.book}
        onPress={onPress}
      >
        Book
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    paddingBottom: 32,
  },
  locationSection: {
    marginBottom: 18,
  },
  locationLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  location: {
    marginTop: 4,
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
  },
  banner: {
    minHeight: 130,
    borderRadius: 18,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    marginBottom: 28,
  },
  bannerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  bannerText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    color: '#6B7280',
  },
  sectionHeader: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 23,
    fontWeight: '700',
    color: '#111827',
  },
  sectionSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: '#6B7280',
  },
  card: {
    minHeight: 145,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardContent: {
    flex: 1,
    paddingRight: 12,
  },
  serviceName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  description: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    color: '#6B7280',
  },
  price: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  perHour: {
    fontSize: 13,
    fontWeight: '400',
    color: '#6B7280',
  },
  book: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    padding: 8,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  errorBox: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 14,
  },
  empty: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
  },
  emptyText: {
    marginTop: 6,
    textAlign: 'center',
    color: '#6B7280',
  },
})