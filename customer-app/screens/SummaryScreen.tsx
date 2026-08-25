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
  'Summary'
>

export default function SummaryScreen({
  navigation,
}: Props) {
  const {
    selectedService,
    selectedDuration,
    selectedPackage,
    total,
  } = useBooking()

  const continueToAddress = () => {
    navigation.navigate('Location')
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
          Your booking
        </Text>

        <Text style={styles.subtitle}>
          Review your selected service before
          continuing.
        </Text>

        <View style={styles.card}>
          <View style={styles.iconBox}>
            <Text style={styles.icon}>
              👷
            </Text>
          </View>

          <View style={styles.cardContent}>
            <Text style={styles.cardLabel}>
              SERVICE
            </Text>

            <Text style={styles.serviceName}>
              {selectedService || 'Staff service'}
            </Text>

            <Text style={styles.package}>
              {selectedPackage?.name ||
                selectedDuration ||
                'Staffing package'}
            </Text>
          </View>
        </View>

        {selectedPackage && (
          <View style={styles.detailsCard}>
            <Text style={styles.detailsTitle}>
              Package details
            </Text>

            <View style={styles.row}>
              <Text style={styles.rowLabel}>
                Staffing period
              </Text>

              <Text style={styles.rowValue}>
                {selectedPackage.name}
              </Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.rowLabel}>
                Duration
              </Text>

              <Text style={styles.rowValue}>
                {selectedPackage.duration_value}{' '}
                {selectedPackage.duration_unit}
              </Text>
            </View>

            {selectedPackage.description ? (
              <View style={styles.descriptionBox}>
                <Text style={styles.description}>
                  {selectedPackage.description}
                </Text>
              </View>
            ) : null}
          </View>
        )}

        <View style={styles.priceCard}>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>
              Service
            </Text>

            <Text style={styles.priceValue}>
              ₹{total.toLocaleString('en-IN')}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.priceRow}>
            <Text style={styles.totalLabel}>
              Total
            </Text>

            <Text style={styles.totalValue}>
              ₹{total.toLocaleString('en-IN')}
            </Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>
            What happens next?
          </Text>

          <Text style={styles.infoText}>
            First, we'll ask for the service address.
            Then TempStaff will check whether a worker
            is available for your requested service.
          </Text>

          <Text style={styles.infoText}>
            You will never need to choose a worker.
            TempStaff will handle worker assignment.
          </Text>
        </View>

        <PrimaryButton
          title="Continue to Address"
          disabled={!selectedPackage}
          onPress={continueToAddress}
        />
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

  card: {
    backgroundColor: 'white',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },

  iconBox: {
    width: 62,
    height: 62,
    borderRadius: 18,
    backgroundColor: '#FFF1DD',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },

  icon: {
    fontSize: 30,
  },

  cardContent: {
    flex: 1,
  },

  cardLabel: {
    color: COLORS.gray,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 4,
  },

  serviceName: {
    color: COLORS.navy,
    fontSize: 20,
    fontWeight: '900',
  },

  package: {
    color: COLORS.teal,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
  },

  detailsCard: {
    backgroundColor: 'white',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
    marginBottom: 14,
  },

  detailsTitle: {
    color: COLORS.navy,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 15,
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },

  rowLabel: {
    color: COLORS.gray,
    fontSize: 13,
  },

  rowValue: {
    color: COLORS.navy,
    fontSize: 14,
    fontWeight: '800',
    maxWidth: '55%',
    textAlign: 'right',
  },

  descriptionBox: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginTop: 8,
    paddingTop: 12,
  },

  description: {
    color: COLORS.gray,
    fontSize: 13,
    lineHeight: 19,
  },

  priceCard: {
    backgroundColor: COLORS.navy,
    borderRadius: 20,
    padding: 20,
    marginBottom: 14,
  },

  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  priceLabel: {
    color: '#D8E4EF',
    fontSize: 14,
  },

  priceValue: {
    color: 'white',
    fontSize: 16,
    fontWeight: '800',
  },

  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginVertical: 15,
  },

  totalLabel: {
    color: 'white',
    fontSize: 16,
    fontWeight: '800',
  },

  totalValue: {
    color: COLORS.orange,
    fontSize: 25,
    fontWeight: '900',
  },

  infoCard: {
    backgroundColor: '#FFF7EA',
    borderRadius: 18,
    padding: 17,
    marginBottom: 20,
  },

  infoTitle: {
    color: COLORS.navy,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 8,
  },

  infoText: {
    color: COLORS.gray,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 8,
  },
})