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

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>

const iconForService = (service: string): string => {
  const normalized = service.trim().toLowerCase()

  if (normalized.includes('housekeeping')) return '🧹'
  if (normalized.includes('pantry')) return '🍽️'
  if (normalized.includes('office')) return '💼'
  if (normalized.includes('helper')) return '👷'

  return '👤'
}

export default function HomeScreen({ navigation }: Props) {
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

  const requestLocationPermission = async () => {
    try {
      const permission =
        await Location.requestForegroundPermissionsAsync()

      if (permission.status === 'granted') {
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

  const handleServicePress = (service: string) => {
    resetBooking()
    setSelectedService(service)
    navigation.navigate('Services')
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.top}>
          <Image
            source={LOGO}
            style={styles.logo}
            resizeMode="contain"
          />

          <View style={styles.greeting}>
            <Text style={styles.small}>
              Hello 👋
            </Text>

            <Text style={styles.name}>
              Need staff today?
            </Text>
          </View>

          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() =>
              navigation.navigate('MyBookings')
            }
            activeOpacity={0.85}
          >
            <Text style={styles.settingsIcon}>
              ☰
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.hero}>
          <Text style={styles.heroTitle}>
            Reliable staff, when you need them.
          </Text>

          <Text style={styles.heroText}>
            Book temporary staff for home or office work.
          </Text>

          <TouchableOpacity
            style={styles.heroButton}
            onPress={() => {
              resetBooking()
              navigation.navigate('Services')
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.buttonText}>
              Find Staff
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.bookingsButton}
          onPress={() =>
            navigation.navigate('MyBookings')
          }
          activeOpacity={0.85}
        >
          <View>
            <Text style={styles.bookingsTitle}>
              My Bookings
            </Text>

            <Text style={styles.bookingsSubtitle}>
              View your current and past bookings
            </Text>
          </View>

          <Text style={styles.arrow}>
            →
          </Text>
        </TouchableOpacity>

        <Text style={styles.section}>
          Popular services
        </Text>

        {catalogueLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator
              size="small"
              color={COLORS.orange}
            />

            <Text style={styles.loadingText}>
              Loading services...
            </Text>
          </View>
        ) : catalogueError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>
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
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>
              No services are currently available.
            </Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {services.map(service => (
              <TouchableOpacity
                key={service.id}
                style={styles.card}
                onPress={() =>
                  handleServicePress(service.name)
                }
                activeOpacity={0.85}
              >
                <Text style={styles.icon}>
                  {iconForService(service.name)}
                </Text>

                <Text style={styles.cardText}>
                  {service.name}
                </Text>

                {service.description ? (
                  <Text
                    style={styles.cardDescription}
                    numberOfLines={2}
                  >
                    {service.description}
                  </Text>
                ) : null}
              </TouchableOpacity>
            ))}
          </View>
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

  content: {
    padding: 22,
    paddingBottom: 45,
  },

  top: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 22,
  },

  logo: {
    width: 64,
    height: 64,
    marginRight: 14,
  },

  greeting: {
    flex: 1,
  },

  small: {
    color: COLORS.gray,
    fontSize: 13,
  },

  name: {
    color: COLORS.navy,
    fontSize: 22,
    fontWeight: '800',
  },

  settingsButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E7E7E7',
    alignItems: 'center',
    justifyContent: 'center',
  },

  settingsIcon: {
    fontSize: 22,
    color: COLORS.navy,
    fontWeight: '800',
  },

  hero: {
    backgroundColor: COLORS.navy,
    borderRadius: 24,
    padding: 22,
    marginBottom: 18,
  },

  heroTitle: {
    color: 'white',
    fontSize: 25,
    lineHeight: 31,
    fontWeight: '800',
  },

  heroText: {
    color: '#D8E4EF',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
    marginBottom: 18,
  },

  heroButton: {
    backgroundColor: COLORS.orange,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },

  buttonText: {
    color: 'white',
    fontSize: 17,
    fontWeight: '800',
  },

  bookingsButton: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    padding: 18,
    marginBottom: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  bookingsTitle: {
    color: COLORS.navy,
    fontSize: 18,
    fontWeight: '800',
  },

  bookingsSubtitle: {
    color: COLORS.gray,
    fontSize: 13,
    marginTop: 4,
  },

  arrow: {
    color: COLORS.navy,
    fontSize: 25,
    fontWeight: '800',
  },

  section: {
    color: COLORS.navy,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 14,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  card: {
    width: '48%',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
  },

  icon: {
    fontSize: 27,
    marginBottom: 7,
  },

  cardText: {
    color: COLORS.navy,
    fontSize: 14,
    fontWeight: '800',
  },

  cardDescription: {
    color: COLORS.gray,
    fontSize: 11,
    lineHeight: 15,
    marginTop: 5,
  },

  loadingBox: {
    minHeight: 110,
    backgroundColor: 'white',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    color: COLORS.gray,
    fontSize: 13,
    marginTop: 9,
  },

  errorBox: {
    backgroundColor: 'white',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
  },

  errorText: {
    color: COLORS.navy,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
  },

  retryButton: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.orange,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
  },

  retryText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '800',
  },

  emptyBox: {
    backgroundColor: 'white',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
  },

  emptyText: {
    color: COLORS.gray,
    fontSize: 13,
    lineHeight: 19,
  },
})