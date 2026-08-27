import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
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
  'BookingConfirmed'
>

export default function BookingConfirmedScreen({
  navigation,
}: Props) {
  const {
    bookingId,
    selectedWorker,
    selectedService,
    selectedPackage,
    address,
    bookingMode,
    scheduledDate,
    shiftStarted,
    shiftEnded,
    resetBooking,
  } = useBooking()

  const isCompleted = shiftEnded
  const isInProgress =
    shiftStarted && !shiftEnded

  const statusTitle = isCompleted
    ? 'Shift completed'
    : isInProgress
      ? 'Shift in progress'
      : selectedWorker
        ? 'Worker assigned'
        : 'Booking confirmed'

  const statusDescription = isCompleted
    ? 'Your TempStaff shift has been completed successfully.'
    : isInProgress
      ? 'Your worker is currently working on the booking.'
      : selectedWorker
        ? 'Your booking is confirmed. Your assigned worker will be notified with the booking details.'
        : 'Your booking is confirmed. TempStaff will assign an appropriate worker for the service.'

  const goHome = () => {
    resetBooking()

    navigation.reset({
      index: 0,
      routes: [{ name: 'Home' }],
    })
  }

  const viewBooking = () => {
    navigation.navigate('MyBookings')
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.page}
        showsVerticalScrollIndicator={false}
      >
        <Header />

        {/* Success */}
        <View style={styles.successCard}>
          <View style={styles.checkCircle}>
            <Text style={styles.check}>✓</Text>
          </View>

          <Text style={styles.successTitle}>
            Booking confirmed
          </Text>

          <Text style={styles.successText}>
            Your TempStaff booking has been successfully
            created.
          </Text>

          {bookingId ? (
            <View style={styles.bookingIdBox}>
              <Text style={styles.bookingIdLabel}>
                BOOKING ID
              </Text>

              <Text style={styles.bookingId}>
                {bookingId}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Booking details */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>
            BOOKING DETAILS
          </Text>

          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Text>🧑‍💼</Text>
            </View>

            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>
                SERVICE
              </Text>

              <Text style={styles.detailValue}>
                {selectedService ||
                  'TempStaff service'}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Text>📦</Text>
            </View>

            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>
                PACKAGE
              </Text>

              <Text style={styles.detailValue}>
                {selectedPackage?.name ||
                  'Selected package'}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Text>🕐</Text>
            </View>

            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>
                BOOKING TIME
              </Text>

              <Text style={styles.detailValue}>
                {bookingMode === 'Scheduled'
                  ? scheduledDate ||
                    'Scheduled'
                  : 'Instant booking'}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Text>📍</Text>
            </View>

            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>
                SERVICE LOCATION
              </Text>

              <Text
                style={styles.detailValue}
                numberOfLines={4}
              >
                {address ||
                  'Service address'}
              </Text>
            </View>
          </View>
        </View>

        {/* Worker */}
        {selectedWorker ? (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>
              ASSIGNED WORKER
            </Text>

            <View style={styles.worker}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {selectedWorker.name
                    ?.charAt(0)
                    ?.toUpperCase() || 'T'}
                </Text>
              </View>

              <View style={styles.workerInfo}>
                <Text style={styles.workerName}>
                  {selectedWorker.name}
                </Text>

                <Text style={styles.workerService}>
                  {selectedWorker.service ||
                    selectedService ||
                    'TempStaff Worker'}
                </Text>

                <Text style={styles.workerMeta}>
                  ★ {selectedWorker.rating || 0}
                  {'  ·  '}
                  {selectedWorker.distance ||
                    'Nearby'}
                </Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.assignmentCard}>
            <View style={styles.assignmentIcon}>
              <Text style={styles.assignmentEmoji}>
                👷
              </Text>
            </View>

            <View style={styles.assignmentContent}>
              <Text style={styles.assignmentTitle}>
                Worker assignment
              </Text>

              <Text style={styles.assignmentText}>
                No worker has been assigned yet. TempStaff
                will handle worker assignment based on
                availability and your booking details.
              </Text>
            </View>
          </View>
        )}

        {/* Status */}
        <View style={styles.statusCard}>
          <View style={styles.statusTop}>
            <View style={styles.statusIcon}>
              <Text style={styles.statusIconText}>
                {isCompleted
                  ? '✓'
                  : isInProgress
                    ? '●'
                    : '✓'}
              </Text>
            </View>

            <View style={styles.statusHeading}>
              <Text style={styles.statusLabel}>
                CURRENT STATUS
              </Text>

              <Text style={styles.statusTitle}>
                {statusTitle}
              </Text>
            </View>
          </View>

          <Text style={styles.statusDescription}>
            {statusDescription}
          </Text>
        </View>

        {/* Payment note */}
        <View style={styles.paymentNotice}>
          <View style={styles.paymentNoticeIcon}>
            <Text>₹</Text>
          </View>

          <View style={styles.paymentNoticeContent}>
            <Text style={styles.paymentNoticeTitle}>
              Payment
            </Text>

            <Text style={styles.paymentNoticeText}>
              Online payment integration is currently
              being finalized. This booking confirmation
              does not represent a successful real-money
              payment.
            </Text>
          </View>
        </View>

        {/* Tracking */}
        {selectedWorker && !isCompleted ? (
          <PrimaryButton
            title={
              isInProgress
                ? 'Manage Shift'
                : 'Track Worker'
            }
            onPress={() =>
              navigation.navigate(
                'Tracking',
                { bookingId }
              )
            }
          />
        ) : null}

        {/* My bookings */}
        <PrimaryButton
          title="View My Bookings"
          onPress={viewBooking}
          style={
            selectedWorker && !isCompleted
              ? styles.secondaryButton
              : undefined
          }
        />

        {/* Home */}
        <PrimaryButton
          title="Back to Home"
          onPress={goHome}
          style={styles.homeButton}
        />

        <Text style={styles.footerText}>
          You can view your booking status anytime
          from My Bookings.
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

  page: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 45,
  },

  successCard: {
    backgroundColor: '#ECFDF3',
    borderRadius: 22,
    padding: 22,
    alignItems: 'center',
    marginBottom: 14,
  },

  checkCircle: {
    width: 65,
    height: 65,
    borderRadius: 33,
    backgroundColor: COLORS.green,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },

  check: {
    color: COLORS.white,
    fontSize: 38,
    lineHeight: 43,
    fontWeight: '900',
  },

  successTitle: {
    color: COLORS.navy,
    fontSize: 23,
    lineHeight: 29,
    fontWeight: '900',
    textAlign: 'center',
  },

  successText: {
    color: COLORS.gray,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 5,
  },

  bookingIdBox: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginTop: 13,
    alignItems: 'center',
  },

  bookingIdLabel: {
    color: COLORS.gray,
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 0.8,
  },

  bookingId: {
    color: COLORS.teal,
    fontSize: 13,
    fontWeight: '900',
    marginTop: 2,
  },

  card: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 19,
    padding: 16,
    marginBottom: 13,
  },

  cardLabel: {
    color: COLORS.gray,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.9,
    marginBottom: 12,
  },

  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  detailIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F1F5F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  detailContent: {
    flex: 1,
  },

  detailLabel: {
    color: COLORS.gray,
    fontSize: 7.5,
    fontWeight: '900',
    letterSpacing: 0.6,
  },

  detailValue: {
    color: COLORS.navy,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '800',
    marginTop: 2,
  },

  divider: {
    height: 1,
    backgroundColor: '#EEF1F3',
    marginVertical: 11,
  },

  worker: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  avatar: {
    width: 55,
    height: 55,
    borderRadius: 28,
    backgroundColor: COLORS.navy,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  avatarText: {
    color: COLORS.white,
    fontSize: 21,
    fontWeight: '900',
  },

  workerInfo: {
    flex: 1,
  },

  workerName: {
    color: COLORS.navy,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '900',
  },

  workerService: {
    color: COLORS.teal,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '800',
    marginTop: 2,
  },

  workerMeta: {
    color: COLORS.gray,
    fontSize: 10.5,
    marginTop: 3,
  },

  assignmentCard: {
    backgroundColor: '#E8F6F6',
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 13,
  },

  assignmentIcon: {
    width: 43,
    height: 43,
    borderRadius: 13,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  assignmentEmoji: {
    fontSize: 21,
  },

  assignmentContent: {
    flex: 1,
  },

  assignmentTitle: {
    color: COLORS.navy,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '900',
  },

  assignmentText: {
    color: COLORS.gray,
    fontSize: 10.5,
    lineHeight: 16,
    marginTop: 3,
  },

  statusCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 19,
    padding: 16,
    marginBottom: 13,
  },

  statusTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  statusIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: '#E8F6F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  statusIconText: {
    color: COLORS.teal,
    fontSize: 17,
    fontWeight: '900',
  },

  statusHeading: {
    flex: 1,
  },

  statusLabel: {
    color: COLORS.gray,
    fontSize: 7.5,
    fontWeight: '900',
    letterSpacing: 0.7,
  },

  statusTitle: {
    color: COLORS.navy,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '900',
    marginTop: 2,
  },

  statusDescription: {
    color: COLORS.gray,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 11,
  },

  paymentNotice: {
    backgroundColor: '#FFF7EA',
    borderRadius: 17,
    padding: 13,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 15,
  },

  paymentNoticeIcon: {
    width: 35,
    height: 35,
    borderRadius: 11,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },

  paymentNoticeContent: {
    flex: 1,
  },

  paymentNoticeTitle: {
    color: COLORS.orange,
    fontSize: 12,
    fontWeight: '900',
  },

  paymentNoticeText: {
    color: COLORS.gray,
    fontSize: 9.5,
    lineHeight: 15,
    marginTop: 2,
  },

  secondaryButton: {
    marginTop: 10,
    backgroundColor: COLORS.navy,
  },

  homeButton: {
    marginTop: 10,
    backgroundColor: '#64717D',
  },

  footerText: {
    color: COLORS.gray,
    fontSize: 9.5,
    lineHeight: 15,
    textAlign: 'center',
    marginTop: 10,
    paddingHorizontal: 20,
  },
})