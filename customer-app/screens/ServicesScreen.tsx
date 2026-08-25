import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { COLORS } from '../constants/theme'
import { RootStackParamList } from '../types'
import { useBooking } from '../context/BookingContext'
import Header from '../components/Header'
import PrimaryButton from '../components/PrimaryButton'

type Props = NativeStackScreenProps<RootStackParamList, 'Services'>

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

export default function ServicesScreen({ navigation }: Props) {
  const {
    selectedService,
    selectedDuration,
    scheduledDate,

    services,
    packages,

    catalogueLoading,
    catalogueError,

    setSelectedService,
    setSelectedDuration,
    setScheduledDate,

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

  const disabled =
    !selectedService ||
    !selectedDuration ||
    !scheduledDate.trim()

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.page}
        showsVerticalScrollIndicator={false}
      >
        <Header onBack={() => navigation.goBack()} />

        <Text style={styles.title}>Book Temporary Staff</Text>

        <Text style={styles.subtitle}>
          Choose the type of staff you need and how long you need them.
        </Text>

        <Text style={styles.section}>Choose staff</Text>

        {catalogueLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator
              size="small"
              color={COLORS.orange}
            />

            <Text style={styles.loadingText}>
              Loading available staff...
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
              No temporary staff services are currently available.
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
                    isSelected && styles.selected,
                  ]}
                  onPress={() =>
                    setSelectedService(service.name)
                  }
                >
                  <Text style={styles.icon}>
                    {iconForService(service.name)}
                  </Text>

                  <Text
                    style={[
                      styles.cardText,
                      isSelected && styles.selectedText,
                    ]}
                  >
                    {service.name}
                  </Text>

                  {service.description ? (
                    <Text
                      style={[
                        styles.serviceDescription,
                        isSelected &&
                          styles.selectedServiceDescription,
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

            {servicePackages.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>
                  No staffing packages are currently available
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
                        setSelectedDuration(pkg.name)
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
                              styles.selectedSubText,
                          ]}
                        >
                          {pkg.description || 'Temporary staffing package'}
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

        <Text style={styles.section}>
          When do you need the staff?
        </Text>

        <Text style={styles.helperText}>
          Enter the date and time when the temporary staff
          member should start.
        </Text>

        <TextInput
          style={styles.input}
          placeholder="e.g. 25 Aug, 10:00 AM"
          placeholderTextColor="#9CA3AF"
          value={scheduledDate}
          onChangeText={setScheduledDate}
        />

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>
            How TempStaff works
          </Text>

          <Text style={styles.infoText}>
            You choose the staff type and staffing period.
            TempStaff will assign an available verified worker
            for your booking.
          </Text>
        </View>

        <PrimaryButton
          title="Continue"
          disabled={disabled}
          onPress={() =>
            navigation.navigate('Location')
          }
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
    marginBottom: 8,
  },

  section: {
    color: COLORS.navy,
    fontSize: 20,
    fontWeight: '800',
    marginTop: 22,
    marginBottom: 14,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  service: {
    width: '48%',
    minHeight: 108,
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

  icon: {
    fontSize: 27,
    marginBottom: 7,
  },

  cardText: {
    color: COLORS.navy,
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },

  serviceDescription: {
    color: COLORS.gray,
    fontSize: 11,
    lineHeight: 15,
    textAlign: 'center',
    marginTop: 5,
  },

  selected: {
    backgroundColor: COLORS.orange,
    borderColor: COLORS.orange,
  },

  selectedText: {
    color: 'white',
  },

  selectedServiceDescription: {
    color: 'rgba(255,255,255,0.88)',
  },

  packageList: {
    gap: 10,
  },

  package: {
    minHeight: 76,
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

  selectedSubText: {
    color: 'rgba(255,255,255,0.88)',
  },

  price: {
    color: COLORS.navy,
    fontSize: 17,
    fontWeight: '900',
  },

  helperText: {
    color: COLORS.gray,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 10,
  },

  input: {
    width: '100%',
    height: 56,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    backgroundColor: 'white',
    paddingHorizontal: 16,
    fontSize: 15,
    color: COLORS.navy,
    marginBottom: 14,
  },

  infoBox: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 16,
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
    marginBottom: 12,
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
    marginBottom: 12,
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
    marginBottom: 12,
  },

  emptyText: {
    color: COLORS.gray,
    fontSize: 13,
    lineHeight: 19,
  },
})