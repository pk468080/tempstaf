import { useEffect } from 'react'
import {
  ActivityIndicator,
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import * as Location from 'expo-location'
import { NativeStackScreenProps } from '@react-navigation/native-stack'

import { COLORS, LOGO } from '../constants/theme'
import { RootStackParamList } from '../types'
import { useBooking } from '../context/BookingContext'

type Props = NativeStackScreenProps<
  RootStackParamList,
  'Home'
>

const iconForService = (service: string): string => {
  const normalized = service
    .trim()
    .toLowerCase()

  if (
    normalized.includes('housekeeping') ||
    normalized.includes('clean')
  ) {
    return '🧹'
  }

  if (
    normalized.includes('pantry') ||
    normalized.includes('kitchen')
  ) {
    return '🍽️'
  }

  if (
    normalized.includes('office') ||
    normalized.includes('admin')
  ) {
    return '💼'
  }

  if (
    normalized.includes('helper') ||
    normalized.includes('support')
  ) {
    return '👷'
  }

  if (
    normalized.includes('security') ||
    normalized.includes('guard')
  ) {
    return '🛡️'
  }

  if (
    normalized.includes('driver') ||
    normalized.includes('delivery')
  ) {
    return '🚗'
  }

  return '👤'
}

export default function HomeScreen({
  navigation,
}: Props) {
  const {
    resetBooking,
    setSelectedService,
    services,
    catalogueLoading,
    catalogueError,
    refreshCatalogue,
  } = useBooking()

  useEffect(() => {
    requestLocationPermission()
  }, [])

  const requestLocationPermission =
    async () => {
      try {
        const permission =
          await Location.requestForegroundPermissionsAsync()

        if (
          permission.status ===
          'granted'
        ) {
          console.log(
            '[TempStaff] Location permission granted'
          )

          return
        }

        console.log(
          '[TempStaff] Location permission denied'
        )
      } catch (error) {
        console.error(
          '[TempStaff] Location permission error:',
          error
        )
      }
    }

  const startBooking = () => {
    resetBooking()
    navigation.navigate('Services')
  }

  const handleServicePress = (
    serviceName: string
  ) => {
    resetBooking()
    setSelectedService(serviceName)
    navigation.navigate('Services')
  }

  const openBookings = () => {
    navigation.navigate('Profile')
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <Image
              source={LOGO}
              style={styles.logo}
              resizeMode="contain"
            />

            <View style={styles.greeting}>
              <Text style={styles.eyebrow}>
                WELCOME TO TEMPSTAFF
              </Text>

              <Text style={styles.greetingTitle}>
                Need staff today?
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.menuButton}
            onPress={openBookings}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Open my bookings"
          >
            <View style={styles.menuLine} />
            <View style={styles.menuLine} />
            <View style={styles.menuLine} />
          </TouchableOpacity>
        </View>

        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroBadge}>
            <View style={styles.liveDot} />

            <Text style={styles.heroBadgeText}>
              STAFF ON DEMAND
            </Text>
          </View>

          <Text style={styles.heroTitle}>
            Reliable staff,
            {'\n'}
            when you need them.
          </Text>

          <Text style={styles.heroDescription}>
            Find trained temporary staff for your
            home, office, or business.
          </Text>

          <TouchableOpacity
            style={styles.heroButton}
            onPress={startBooking}
            activeOpacity={0.88}
          >
            <Text style={styles.heroButtonText}>
              Find Staff
            </Text>

            <Text style={styles.heroArrow}>
              →
            </Text>
          </TouchableOpacity>
        </View>

        {/* Quick actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={startBooking}
            activeOpacity={0.85}
          >
            <View style={styles.quickIcon}>
              <Text style={styles.quickIconText}>
                +
              </Text>
            </View>

            <View style={styles.quickText}>
              <Text style={styles.quickTitle}>
                New Booking
              </Text>

              <Text style={styles.quickSubtitle}>
                Book staff now
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickAction}
            onPress={openBookings}
            activeOpacity={0.85}
          >
            <View style={styles.quickIcon}>
              <Text style={styles.quickIconText}>
                ≡
              </Text>
            </View>

            <View style={styles.quickText}>
              <Text style={styles.quickTitle}>
                My Bookings
              </Text>

              <Text style={styles.quickSubtitle}>
                View your bookings
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Services */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>
              Our services
            </Text>

            <Text style={styles.sectionSubtitle}>
              Choose the staff you need
            </Text>
          </View>
        </View>

        {catalogueLoading ? (
          <View style={styles.stateCard}>
            <ActivityIndicator
              size="small"
              color={COLORS.orange}
            />

            <Text style={styles.stateText}>
              Loading available services...
            </Text>
          </View>
        ) : catalogueError ? (
          <View style={styles.stateCard}>
            <View style={styles.stateIcon}>
              <Text style={styles.stateIconText}>
                !
              </Text>
            </View>

            <Text style={styles.stateTitle}>
              Services unavailable
            </Text>

            <Text style={styles.stateText}>
              {catalogueError}
            </Text>

            <TouchableOpacity
              style={styles.retryButton}
              onPress={refreshCatalogue}
              activeOpacity={0.85}
            >
              <Text style={styles.retryText}>
                Try Again
              </Text>
            </TouchableOpacity>
          </View>
        ) : services.length === 0 ? (
          <View style={styles.stateCard}>
            <View style={styles.stateIcon}>
              <Text style={styles.stateIconText}>
                i
              </Text>
            </View>

            <Text style={styles.stateTitle}>
              No services available
            </Text>

            <Text style={styles.stateText}>
              There are currently no active services.
              Please check again later.
            </Text>
          </View>
        ) : (
          <View style={styles.serviceGrid}>
            {services.map(service => (
              <TouchableOpacity
                key={service.id}
                style={styles.serviceCard}
                onPress={() =>
                  handleServicePress(
                    service.name
                  )
                }
                activeOpacity={0.86}
              >
                <View style={styles.serviceIcon}>
                  <Text style={styles.serviceEmoji}>
                    {iconForService(
                      service.name
                    )}
                  </Text>
                </View>

                <Text
                  style={styles.serviceName}
                  numberOfLines={2}
                >
                  {service.name}
                </Text>

                {service.description ? (
                  <Text
                    style={styles.serviceDescription}
                    numberOfLines={2}
                  >
                    {service.description}
                  </Text>
                ) : (
                  <Text
                    style={styles.serviceAction}
                  >
                    Book now →
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Trust section */}
        <View style={styles.trustCard}>
          <View style={styles.trustHeader}>
            <View style={styles.trustIcon}>
              <Text style={styles.trustIconText}>
                ✓
              </Text>
            </View>

            <View style={styles.trustHeaderText}>
              <Text style={styles.trustTitle}>
                TempStaff promise
              </Text>

              <Text style={styles.trustSubtitle}>
                Simple, reliable staffing
              </Text>
            </View>
          </View>

          <View style={styles.trustItems}>
            <View style={styles.trustItem}>
              <View style={styles.checkCircle}>
                <Text style={styles.checkText}>
                  ✓
                </Text>
              </View>

              <Text style={styles.trustItemText}>
                Flexible booking
              </Text>
            </View>

            <View style={styles.trustItem}>
              <View style={styles.checkCircle}>
                <Text style={styles.checkText}>
                  ✓
                </Text>
              </View>

              <Text style={styles.trustItemText}>
                Track your booking
              </Text>
            </View>

            <View style={styles.trustItem}>
              <View style={styles.checkCircle}>
                <Text style={styles.checkText}>
                  ✓
                </Text>
              </View>

              <Text style={styles.trustItemText}>
                Easy management
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.footer}>
          TempStaff · Staff when you need them.
        </Text>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.light,
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 17,
    paddingBottom: 40,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },

  brandRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },

  logo: {
    width: 54,
    height: 54,
    marginRight: 11,
  },

  greeting: {
    flex: 1,
  },

  eyebrow: {
    color: COLORS.gray,
    fontSize: 9,
    lineHeight: 14,
    fontWeight: '800',
    letterSpacing: 0.8,
  },

  greetingTitle: {
    color: COLORS.navy,
    fontSize: 21,
    lineHeight: 27,
    fontWeight: '800',
    marginTop: 1,
  },

  menuButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  menuLine: {
    width: 18,
    height: 2,
    borderRadius: 1,
    backgroundColor: COLORS.navy,
    marginVertical: 2,
  },

  hero: {
    backgroundColor: COLORS.navy,
    borderRadius: 25,
    padding: 22,
    marginBottom: 15,
    overflow: 'hidden',
  },

  heroBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.10)',
    marginBottom: 15,
  },

  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.teal,
    marginRight: 7,
  },

  heroBadgeText: {
    color: '#D8E4EF',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },

  heroTitle: {
    color: COLORS.white,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    letterSpacing: -0.3,
  },

  heroDescription: {
    color: '#D8E4EF',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 9,
    maxWidth: 310,
  },

  heroButton: {
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.orange,
    marginTop: 20,
    paddingHorizontal: 19,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  heroButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '800',
  },

  heroArrow: {
    color: COLORS.white,
    fontSize: 24,
    lineHeight: 26,
    fontWeight: '800',
  },

  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 29,
  },

  quickAction: {
    width: '48.3%',
    minHeight: 83,
    backgroundColor: COLORS.white,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 13,
    flexDirection: 'row',
    alignItems: 'center',
  },

  quickIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#E8F6F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },

  quickIconText: {
    color: COLORS.teal,
    fontSize: 23,
    lineHeight: 26,
    fontWeight: '700',
  },

  quickText: {
    flex: 1,
  },

  quickTitle: {
    color: COLORS.navy,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '800',
  },

  quickSubtitle: {
    color: COLORS.gray,
    fontSize: 10,
    lineHeight: 14,
    marginTop: 2,
  },

  sectionHeader: {
    marginBottom: 15,
  },

  sectionTitle: {
    color: COLORS.navy,
    fontSize: 21,
    lineHeight: 27,
    fontWeight: '800',
  },

  sectionSubtitle: {
    color: COLORS.gray,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 2,
  },

  serviceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  serviceCard: {
    width: '48.2%',
    minHeight: 155,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 19,
    padding: 15,
    marginBottom: 12,
  },

  serviceIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: '#F2F6F8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },

  serviceEmoji: {
    fontSize: 25,
  },

  serviceName: {
    color: COLORS.navy,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '800',
  },

  serviceDescription: {
    color: COLORS.gray,
    fontSize: 10.5,
    lineHeight: 15,
    marginTop: 5,
  },

  serviceAction: {
    color: COLORS.teal,
    fontSize: 10.5,
    lineHeight: 15,
    fontWeight: '800',
    marginTop: 6,
  },

  stateCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    padding: 22,
    alignItems: 'center',
    marginBottom: 15,
  },

  stateIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFF4E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },

  stateIconText: {
    color: COLORS.orange,
    fontSize: 18,
    fontWeight: '800',
  },

  stateTitle: {
    color: COLORS.navy,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800',
    textAlign: 'center',
  },

  stateText: {
    color: COLORS.gray,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 5,
    maxWidth: 290,
  },

  retryButton: {
    backgroundColor: COLORS.orange,
    paddingHorizontal: 19,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 14,
  },

  retryText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '800',
  },

  trustCard: {
    backgroundColor: '#E8F6F6',
    borderRadius: 20,
    padding: 17,
    marginTop: 9,
  },

  trustHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  trustIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: COLORS.teal,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  trustIconText: {
    color: COLORS.white,
    fontSize: 19,
    fontWeight: '900',
  },

  trustHeaderText: {
    flex: 1,
  },

  trustTitle: {
    color: COLORS.navy,
    fontSize: 14,
    fontWeight: '800',
  },

  trustSubtitle: {
    color: COLORS.gray,
    fontSize: 10.5,
    marginTop: 2,
  },

  trustItems: {
    marginTop: 14,
    gap: 9,
  },

  trustItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  checkCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },

  checkText: {
    color: COLORS.teal,
    fontSize: 11,
    fontWeight: '900',
  },

  trustItemText: {
    color: COLORS.navy,
    fontSize: 11,
    fontWeight: '600',
  },

  footer: {
    color: COLORS.gray,
    fontSize: 10,
    lineHeight: 16,
    textAlign: 'center',
    marginTop: 25,
  },
})