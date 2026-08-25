import {
  ActivityIndicator,
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
  'Services'
>

const iconForService = (service: string) => {
  const normalized = service.toLowerCase()

  if (normalized.includes('housekeeping')) return '🧹'
  if (normalized.includes('pantry')) return '🍽️'
  if (normalized.includes('office')) return '💼'
  if (normalized.includes('helper')) return '👷'

  return '👤'
}

const formatPrice = (price: number) => {
  return `₹${price.toLocaleString('en-IN')}`
}

export default function ServicesScreen({
  navigation,
}: Props) {
  const {
    selectedService,
    selectedDuration,

    services,
    packages,

    catalogueLoading,
    catalogueError,

    setSelectedService,
    setSelectedDuration,

    refreshCatalogue,
  } = useBooking()

  const selectedServiceRecord = services.find(
    service => service.name === selectedService
  )

  const servicePackages = packages
    .filter(
      item =>
        item.service_id === selectedServiceRecord?.id &&
        item.is_active
    )
    .sort((a, b) => a.sort_order - b.sort_order)

  const selectedPackage = servicePackages.find(
    item => item.name === selectedDuration
  )

  const handleServiceSelect = (serviceName: string) => {
    setSelectedService(serviceName)

    // Reset the package whenever the customer changes service.
    setSelectedDuration('')
  }

  const handleContinue = () => {
  if (!selectedService || !selectedPackage) {
    return
  }

  navigation.navigate('Summary')
}

  const disabled =
    !selectedService ||
    !selectedPackage

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
          What do you need?
        </Text>

        <Text style={styles.subtitle}>
          Choose the type of temporary staff you need.
        </Text>

        <Text style={styles.section}>
          Staff type
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
            {services.map(service => {
              const isSelected =
                selectedService === service.name

              return (
                <TouchableOpacity
                  key={service.id}
                  activeOpacity={0.85}
                  style={[
                    styles.service,
                    isSelected &&
                      styles.selectedService,
                  ]}
                  onPress={() =>
                    handleServiceSelect(
                      service.name
                    )
                  }
                >
                  <Text style={styles.icon}>
                    {iconForService(service.name)}
                  </Text>

                  <Text
                    style={[
                      styles.serviceName,
                      isSelected &&
                        styles.selectedText,
                    ]}
                  >
                    {service.name}
                  </Text>

                  {service.description ? (
                    <Text
                      style={[
                        styles.description,
                        isSelected &&
                          styles.selectedDescription,
                      ]}
                      numberOfLines={2}
                    >
                      {service.description}
                    </Text>
                  ) : null}
                </TouchableOpacity>
              )
            })}
          </View>
        )}

        {selectedService && !catalogueLoading && (
          <>
            <Text style={styles.section}>
              Choose staffing period
            </Text>

            <Text style={styles.helper}>
              Select how long you need the staff.
            </Text>

            {servicePackages.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>
                  No packages are currently available
                  for {selectedService}.
                </Text>
              </View>
            ) : (
              <View style={styles.packageList}>
                {servicePackages.map(pkg => {
                  const isSelected =
                    selectedDuration === pkg.name

                  return (
                    <TouchableOpacity
                      key={pkg.id}
                      activeOpacity={0.85}
                      style={[
                        styles.package,
                        isSelected &&
                          styles.selectedPackage,
                      ]}
                      onPress={() =>
                        setSelectedDuration(
                          pkg.name
                        )
                      }
                    >
                      <View style={styles.packageLeft}>
                        <Text
                          style={[
                            styles.packageTitle,
                            isSelected &&
                              styles.selectedText,
                          ]}
                        >
                          {pkg.name}
                        </Text>

                        <Text
                          style={[
                            styles.packageDescription,
                            isSelected &&
                              styles.selectedDescription,
                          ]}
                        >
                          {pkg.description ||
                            'Temporary staffing package'}
                        </Text>
                      </View>

                      <Text
                        style={[
                          styles.price,
                          isSelected &&
                            styles.selectedText,
                        ]}
                      >
                        {formatPrice(pkg.price)}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
            )}
          </>
        )}

        {selectedService && selectedPackage && (
          <View style={styles.summary}>
            <Text style={styles.summaryTitle}>
              Your selection
            </Text>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>
                Staff
              </Text>

              <Text style={styles.summaryValue}>
                {selectedService}
              </Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>
                Period
              </Text>

              <Text style={styles.summaryValue}>
                {selectedPackage.name}
              </Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>
                Price
              </Text>

              <Text style={styles.summaryPrice}>
                {formatPrice(
                  selectedPackage.price
                )}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>
            No worker selection
          </Text>

          <Text style={styles.infoText}>
            You choose the service and staffing period.
            TempStaff will handle worker assignment for
            you.
          </Text>
        </View>

        <PrimaryButton
          title="Continue"
          disabled={disabled}
          onPress={handleContinue}
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
    fontSize: 30,
    fontWeight: '800',
    marginBottom: 7,
  },

  subtitle: {
    color: COLORS.gray,
    fontSize: 15,
    lineHeight: 22,
  },

  section: {
    color: COLORS.navy,
    fontSize: 20,
    fontWeight: '800',
    marginTop: 24,
    marginBottom: 12,
  },

  helper: {
    color: COLORS.gray,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  service: {
    width: '48%',
    minHeight: 112,
    borderRadius: 18,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    paddingHorizontal: 10,
    paddingVertical: 14,
  },

  selectedService: {
    backgroundColor: COLORS.orange,
    borderColor: COLORS.orange,
  },

  icon: {
    fontSize: 27,
    marginBottom: 7,
  },

  serviceName: {
    color: COLORS.navy,
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },

  selectedText: {
    color: 'white',
  },

  description: {
    color: COLORS.gray,
    fontSize: 11,
    lineHeight: 15,
    textAlign: 'center',
    marginTop: 5,
  },

  selectedDescription: {
    color: 'rgba(255,255,255,0.88)',
  },

  packageList: {
    gap: 10,
  },

  package: {
    minHeight: 78,
    width: '100%',
    borderRadius: 16,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  selectedPackage: {
    backgroundColor: COLORS.orange,
    borderColor: COLORS.orange,
  },

  packageLeft: {
    flex: 1,
    paddingRight: 12,
  },

  packageTitle: {
    color: COLORS.navy,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },

  packageDescription: {
    color: COLORS.gray,
    fontSize: 12,
    lineHeight: 17,
  },

  price: {
    color: COLORS.navy,
    fontSize: 17,
    fontWeight: '900',
  },

  summary: {
    backgroundColor: COLORS.navy,
    borderRadius: 18,
    padding: 18,
    marginTop: 24,
  },

  summaryTitle: {
    color: 'white',
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 14,
  },

  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },

  summaryLabel: {
    color: '#D8E4EF',
    fontSize: 13,
  },

  summaryValue: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
    maxWidth: '65%',
    textAlign: 'right',
  },

  summaryPrice: {
    color: COLORS.orange,
    fontSize: 17,
    fontWeight: '900',
  },

  infoBox: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 16,
    marginTop: 18,
    marginBottom: 20,
  },

  infoTitle: {
    color: COLORS.navy,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 6,
  },

  infoText: {
    color: COLORS.gray,
    fontSize: 13,
    lineHeight: 19,
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