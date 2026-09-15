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
import Header from '../components/Header'

type Props = NativeStackScreenProps<
  RootStackParamList,
  'Payment'
>

export default function PaymentScreen({
  navigation,
}: Props) {
  const {
    selectedService,
    selectedPackage,
    address,
    setBookingMode,
  } = useBooking()

  const chooseInstant = () => {
    setBookingMode('Instant')
    navigation.navigate('Checkout')
  }

  const chooseScheduled = () => {
    setBookingMode('Scheduled')
    navigation.navigate('Schedule')
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

        {/* Progress */}
        <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
            <View style={styles.progressFill} />
          </View>

          <Text style={styles.progressText}>
            STEP 4 OF 4 · BOOKING TIME
          </Text>
        </View>

        {/* Heading */}
        <View style={styles.heading}>
          <Text style={styles.title}>
            When do you need the staff?
          </Text>

          <Text style={styles.subtitle}>
            Choose when you need the service. TempStaff
            handles worker assignment automatically.
          </Text>
        </View>

        {/* Booking summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>
            YOUR BOOKING
          </Text>

          <Text style={styles.summaryService}>
            {selectedService || 'Staff service'}
          </Text>

          <Text style={styles.summaryPackage}>
            {selectedPackage?.name || 'Staffing package'}
          </Text>

          <View style={styles.summaryDivider} />

          <Text style={styles.addressLabel}>
            SERVICE LOCATION
          </Text>

          <Text
            style={styles.address}
            numberOfLines={3}
          >
            {address || 'Service address'}
          </Text>
        </View>

        {/* Booking options */}
        <View style={styles.optionHeader}>
          <Text style={styles.optionSectionTitle}>
            Booking options
          </Text>
        </View>

        {/* Instant */}
        <TouchableOpacity
          style={styles.optionCardDisabled}
          disabled
          activeOpacity={0.88}
        >
          <View style={styles.optionIconDisabled}>
            <Text style={styles.optionEmoji}>
              ⚡
            </Text>
          </View>

          <View style={styles.optionContent}>
            <View style={styles.optionTitleRow}>
              <Text style={styles.optionTitleDisabled}>
                Instant
              </Text>

              <View style={styles.comingBadge}>
                <Text style={styles.comingText}>
                  COMING SOON
                </Text>
              </View>
            </View>

            <Text style={styles.optionDescription}>
              Instant staffing will be available in a
              future release. For now, choose a
              scheduled booking.
            </Text>
          </View>
        </TouchableOpacity>

        {/* Scheduled */}
        <TouchableOpacity
          style={styles.optionCardRecommended}
          onPress={chooseScheduled}
          activeOpacity={0.88}
        >
          <View style={styles.optionIconRecommended}>
            <Text style={styles.optionEmoji}>
              📅
            </Text>
          </View>

          <View style={styles.optionContent}>
            <View style={styles.optionTitleRow}>
              <Text style={styles.optionTitleRecommended}>
                Schedule
              </Text>

              <View style={styles.availableBadge}>
                <Text style={styles.availableText}>
                  AVAILABLE
                </Text>
              </View>
            </View>

            <Text style={styles.optionDescription}>
              Choose a future date and time. TempStaff
              will arrange the worker for your booking.
            </Text>

            <Text style={styles.optionAction}>
              Choose date & time →
            </Text>
          </View>
        </TouchableOpacity>

        {/* Recurring */}
        <View style={styles.recurringCard}>
          <View style={styles.recurringTop}>
            <View style={styles.recurringIcon}>
              <Text style={styles.recurringEmoji}>
                🔁
              </Text>
            </View>

            <View style={styles.recurringContent}>
              <View style={styles.recurringTitleRow}>
                <Text style={styles.recurringTitle}>
                  Recurring
                </Text>

                <View style={styles.comingBadge}>
                  <Text style={styles.comingText}>
                    COMING SOON
                  </Text>
                </View>
              </View>

              <Text style={styles.recurringText}>
                Set up regular staffing for repeated
                dates. This feature will be enabled
                in a later release.
              </Text>
            </View>
          </View>
        </View>

        {/* Assignment explanation */}
        <View style={styles.infoCard}>
          <View style={styles.infoIcon}>
            <Text style={styles.infoIconText}>
              ✓
            </Text>
          </View>

          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>
              TempStaff assigns the worker
            </Text>

            <Text style={styles.infoText}>
              Customers don't select individual
              workers. Worker assignment is handled
              by the TempStaff system after payment.
            </Text>
          </View>
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
    marginBottom: 20,
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
    marginVertical: 14,
  },

  addressLabel: {
    color: '#B9C9D8',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
  },

  address: {
    color: COLORS.white,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 5,
  },

  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },

  optionSectionTitle: {
    color: COLORS.navy,
    fontSize: 17,
    fontWeight: '900',
  },

  optionCardDisabled: {
    flexDirection: 'row',
    backgroundColor: '#F0F2F4',
    borderWidth: 1,
    borderColor: '#E0E4E8',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    opacity: 0.72,
  },

  optionCardRecommended: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.teal,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
  },

  optionIconDisabled: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#E2E5E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },

  optionIconRecommended: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#E4F6F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },

  optionEmoji: {
    fontSize: 22,
  },

  optionContent: {
    flex: 1,
  },

  optionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },

  optionTitleDisabled: {
    color: COLORS.gray,
    fontSize: 17,
    fontWeight: '900',
  },

  optionTitleRecommended: {
    color: COLORS.navy,
    fontSize: 17,
    fontWeight: '900',
  },

  optionDescription: {
    color: COLORS.gray,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
  },

  optionAction: {
    color: COLORS.teal,
    fontSize: 12,
    fontWeight: '900',
    marginTop: 10,
  },

  availableBadge: {
    backgroundColor: '#E4F6F5',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },

  availableText: {
    color: COLORS.teal,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  comingBadge: {
    backgroundColor: '#E6E9EC',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },

  comingText: {
    color: COLORS.gray,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  recurringCard: {
    backgroundColor: '#F7F8F9',
    borderWidth: 1,
    borderColor: '#E3E6E9',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
  },

  recurringTop: {
    flexDirection: 'row',
  },

  recurringIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#ECEFF1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },

  recurringEmoji: {
    fontSize: 21,
  },

  recurringContent: {
    flex: 1,
  },

  recurringTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },

  recurringTitle: {
    color: COLORS.navy,
    fontSize: 17,
    fontWeight: '900',
  },

  recurringText: {
    color: COLORS.gray,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
  },

  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#EAF6F5',
    borderRadius: 18,
    padding: 15,
    marginTop: 2,
  },

  infoIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: COLORS.teal,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
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
    fontSize: 13,
    fontWeight: '900',
  },

  infoText: {
    color: COLORS.gray,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
})