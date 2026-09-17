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
import PrimaryButton from '../components/PrimaryButton'

type Props = NativeStackScreenProps<
  RootStackParamList,
  'Summary'
>

const iconForService = (service: string) => {
  const name = service.toLowerCase()

  if (
    name.includes('clean') ||
    name.includes('housekeeping')
  ) {
    return '🧹'
  }

  if (
    name.includes('pantry') ||
    name.includes('kitchen')
  ) {
    return '🍽️'
  }

  if (
    name.includes('security') ||
    name.includes('guard')
  ) {
    return '🛡️'
  }

  if (
    name.includes('driver') ||
    name.includes('delivery')
  ) {
    return '🚗'
  }

  if (
    name.includes('office') ||
    name.includes('admin')
  ) {
    return '💼'
  }

  return '👷'
}

const formatHours = (hours: number) => {
  if (!Number.isFinite(hours) || hours <= 0) {
    return 'Not selected'
  }

  if (Number.isInteger(hours)) {
    return `${hours} ${hours === 1 ? 'hour' : 'hours'}`
  }

  return `${hours.toFixed(2)} hours`
}

export default function SummaryScreen({
  navigation,
}: Props) {
  const {
    selectedService,
    selectedVariant,
    hourlyStartTime,
    hourlyEndTime,
    hourlyTotalHours,
  } = useBooking()

  const serviceName =
    selectedService || 'Staff service'

  const variantName =
    selectedVariant?.name || 'Hourly staffing'

  const hasHourlySchedule =
    Boolean(hourlyStartTime && hourlyEndTime) &&
    Number.isFinite(hourlyTotalHours) &&
    hourlyTotalHours > 0

  const continueToAddress = () => {
    if (!selectedVariant) {
      return
    }

    navigation.navigate('Location')
  }

  const editSelection = () => {
    navigation.goBack()
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
            STEP 2 OF 4 · REVIEW
          </Text>
        </View>

        {/* Heading */}
        <View style={styles.heading}>
          <Text style={styles.title}>
            Review your service
          </Text>

          <Text style={styles.subtitle}>
            Confirm the service you want before adding
            the location where staff will be required.
          </Text>
        </View>

        {/* Main service card */}
        <View style={styles.bookingCard}>
          <View style={styles.bookingHeader}>
            <View style={styles.serviceIcon}>
              <Text style={styles.serviceEmoji}>
                {iconForService(serviceName)}
              </Text>
            </View>

            <View style={styles.serviceContent}>
              <Text style={styles.smallLabel}>
                STAFF SERVICE
              </Text>

              <Text
                style={styles.serviceName}
                numberOfLines={2}
              >
                {serviceName}
              </Text>

              <Text
                style={styles.variantName}
                numberOfLines={2}
              >
                {variantName}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.editButton}
              onPress={editSelection}
              activeOpacity={0.8}
            >
              <Text style={styles.editText}>
                Edit
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailGrid}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>
                Service type
              </Text>

              <Text
                style={styles.detailValue}
                numberOfLines={2}
              >
                Hourly
              </Text>
            </View>

            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>
                Duration
              </Text>

              <Text style={styles.detailValue}>
                {hasHourlySchedule
                  ? formatHours(hourlyTotalHours)
                  : 'To be selected'}
              </Text>
            </View>
          </View>

          {hasHourlySchedule ? (
            <>
              <View style={styles.divider} />

              <View style={styles.scheduleRow}>
                <View style={styles.scheduleItem}>
                  <Text style={styles.detailLabel}>
                    Start
                  </Text>

                  <Text style={styles.detailValue}>
                    {hourlyStartTime}
                  </Text>
                </View>

                <View style={styles.scheduleItem}>
                  <Text style={styles.detailLabel}>
                    End
                  </Text>

                  <Text style={styles.detailValue}>
                    {hourlyEndTime}
                  </Text>
                </View>
              </View>
            </>
          ) : null}
        </View>

        {/* Pricing state */}
        <View style={styles.priceCard}>
          <Text style={styles.priceHeading}>
            BOOKING PRICE
          </Text>

          <Text style={styles.priceTitle}>
            Calculated from your selected hours
          </Text>

          <Text style={styles.priceText}>
            TempStaff uses the configured hourly rate
            and applicable admin-controlled discounts.
            The final booking amount is calculated by
            the backend.
          </Text>

          <View style={styles.priceNotice}>
            <View style={styles.noticeDot} />

            <Text style={styles.priceNoticeText}>
              No fixed package price is used.
            </Text>
          </View>
        </View>

        {/* Booking process */}
        <View style={styles.processCard}>
          <Text style={styles.processTitle}>
            What happens next?
          </Text>

          <View style={styles.processStep}>
            <View style={styles.stepCircle}>
              <Text style={styles.stepNumber}>
                1
              </Text>
            </View>

            <View style={styles.processContent}>
              <Text style={styles.processStepTitle}>
                Add service location
              </Text>

              <Text style={styles.processText}>
                Tell us where the staff is needed.
              </Text>
            </View>
          </View>

          <View style={styles.processLine} />

          <View style={styles.processStep}>
            <View style={styles.stepCircle}>
              <Text style={styles.stepNumber}>
                2
              </Text>
            </View>

            <View style={styles.processContent}>
              <Text style={styles.processStepTitle}>
                Choose your booking schedule
              </Text>

              <Text style={styles.processText}>
                Select Instant, Scheduled, or Recurring
                based on the available booking flow.
              </Text>
            </View>
          </View>

          <View style={styles.processLine} />

          <View style={styles.processStep}>
            <View style={styles.stepCircle}>
              <Text style={styles.stepNumber}>
                3
              </Text>
            </View>

            <View style={styles.processContent}>
              <Text style={styles.processStepTitle}>
                TempStaff handles worker assignment
              </Text>

              <Text style={styles.processText}>
                Worker selection and availability are
                handled by the platform.
              </Text>
            </View>
          </View>
        </View>

        {/* Important information */}
        <View style={styles.infoCard}>
          <View style={styles.infoIcon}>
            <Text style={styles.infoIconText}>
              ✓
            </Text>
          </View>

          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>
              You don't need to choose a worker
            </Text>

            <Text style={styles.infoText}>
              TempStaff determines worker availability,
              service-area coverage, and assignment on
              the backend.
            </Text>
          </View>
        </View>

        {/* Continue */}
        <View style={styles.bottom}>
          <PrimaryButton
            title="Continue to Address"
            disabled={!selectedVariant}
            onPress={continueToAddress}
          />

          <Text style={styles.bottomText}>
            Next, you'll add the location where the
            staff is required.
          </Text>
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
    marginBottom: 21,
  },

  progressTrack: {
    height: 4,
    width: '100%',
    backgroundColor: '#DDE3E9',
    borderRadius: 3,
    overflow: 'hidden',
  },

  progressFill: {
    width: '50%',
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
    marginBottom: 21,
  },

  title: {
    color: COLORS.navy,
    fontSize: 29,
    lineHeight: 35,
    fontWeight: '800',
  },

  subtitle: {
    color: COLORS.gray,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 7,
  },

  bookingCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    padding: 17,
  },

  bookingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  serviceIcon: {
    width: 58,
    height: 58,
    borderRadius: 17,
    backgroundColor: '#FFF1DD',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  serviceEmoji: {
    fontSize: 29,
  },

  serviceContent: {
    flex: 1,
    paddingRight: 6,
  },

  smallLabel: {
    color: COLORS.gray,
    fontSize: 8,
    lineHeight: 13,
    fontWeight: '900',
    letterSpacing: 0.8,
  },

  serviceName: {
    color: COLORS.navy,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '900',
    marginTop: 2,
  },

  variantName: {
    color: COLORS.teal,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
    marginTop: 3,
  },

  editButton: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 15,
    backgroundColor: '#E8F6F6',
  },

  editText: {
    color: COLORS.teal,
    fontSize: 10,
    fontWeight: '900',
  },

  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 15,
  },

  detailGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  detailItem: {
    width: '48%',
  },

  detailLabel: {
    color: COLORS.gray,
    fontSize: 10,
    lineHeight: 15,
  },

  detailValue: {
    color: COLORS.navy,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
    marginTop: 3,
  },

  scheduleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  scheduleItem: {
    width: '48%',
  },

  priceCard: {
    backgroundColor: COLORS.navy,
    borderRadius: 20,
    padding: 18,
    marginTop: 14,
  },

  priceHeading: {
    color: '#D8E4EF',
    fontSize: 10,
    lineHeight: 15,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 10,
  },

  priceTitle: {
    color: COLORS.white,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '800',
  },

  priceText: {
    color: '#D8E4EF',
    fontSize: 11,
    lineHeight: 17,
    marginTop: 7,
  },

  priceNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
  },

  noticeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.orange,
    marginRight: 7,
  },

  priceNoticeText: {
    color: COLORS.orange,
    fontSize: 10,
    lineHeight: 15,
    fontWeight: '800',
  },

  processCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    padding: 17,
    marginTop: 14,
  },

  processTitle: {
    color: COLORS.navy,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '800',
    marginBottom: 16,
  },

  processStep: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  stepCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#E8F6F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },

  stepNumber: {
    color: COLORS.teal,
    fontSize: 12,
    fontWeight: '900',
  },

  processContent: {
    flex: 1,
  },

  processStepTitle: {
    color: COLORS.navy,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '800',
  },

  processText: {
    color: COLORS.gray,
    fontSize: 10.5,
    lineHeight: 16,
    marginTop: 2,
  },

  processLine: {
    width: 1,
    height: 17,
    backgroundColor: '#DCE3E8',
    marginLeft: 14.5,
    marginVertical: 3,
  },

  infoCard: {
    backgroundColor: '#E8F6F6',
    borderRadius: 17,
    padding: 14,
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  infoIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: COLORS.teal,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
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
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '800',
  },

  infoText: {
    color: COLORS.gray,
    fontSize: 10.5,
    lineHeight: 16,
    marginTop: 3,
  },

  bottom: {
    marginTop: 20,
  },

  bottomText: {
    color: COLORS.gray,
    fontSize: 10.5,
    lineHeight: 16,
    textAlign: 'center',
    marginTop: 10,
    paddingHorizontal: 15,
  },
})