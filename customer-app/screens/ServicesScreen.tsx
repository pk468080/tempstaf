import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'

import { useState } from 'react'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import * as Location from 'expo-location'
import {
  requestServiceAvailability,
} from '../services/availabilityRequests'
import { checkServiceAvailability } from '../services/availability'
import { COLORS } from '../constants/theme'
import { RootStackParamList } from '../types'
import { useBooking } from '../context/BookingContext'
import Header from '../components/Header'
import PrimaryButton from '../components/PrimaryButton'

type Props = NativeStackScreenProps<
  RootStackParamList,
  'Services'
>

const iconForService = (service: string): string => {
  const normalized = service.trim().toLowerCase()

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

  const [checkingAvailability, setCheckingAvailability] =
  useState(false)

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

  const handleServiceSelect = (
    serviceName: string
  ) => {
    if (selectedService === serviceName) {
      return
    }

    setSelectedService(serviceName)
    setSelectedDuration('')
  }

  const handlePackageSelect = (
    packageName: string
  ) => {
    setSelectedDuration(packageName)
  }
  const [notifyMeLoading, setNotifyMeLoading] =
    useState(false)

  const handleNotifyMe = async (
    serviceId: string,
    latitude: number,
    longitude: number,
    serviceName: string
  ) => {
    if (notifyMeLoading) {
      return
    }

    try {
      setNotifyMeLoading(true)

      await requestServiceAvailability({
        serviceId,
        latitude,
        longitude,
      })

      Alert.alert(
        'Notification Requested',
        `We will notify you when ${serviceName} becomes available in your area.`
      )
    } catch (error) {
      console.error(
        '[TempStaff] Failed to request availability:',
        error
      )

      Alert.alert(
        'Unable to Request Notification',
        'We could not save your notification request right now. Please try again.'
      )
    } finally {
      setNotifyMeLoading(false)
    }
  }

 const handleContinue = async () => {
  if (!selectedService || !selectedPackage) {
    return
  }

  if (!selectedServiceRecord) {
    Alert.alert(
      'Service unavailable',
      'This service could not be found. Please select it again.'
    )
    return
  }

  try {
    setCheckingAvailability(true)

    const permission =
      await Location.requestForegroundPermissionsAsync()

    if (permission.status !== 'granted') {
      Alert.alert(
        'Location Required',
        'Please allow location access so we can check your current service area.',
        [
          {
            text: 'Change Location',
            onPress: () => navigation.navigate('Summary'),
          },
          {
            text: 'Try Again',
            style: 'cancel',
          },
        ]
      )

      return
    }

    const current =
      await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      })

    const { latitude, longitude } =
      current.coords

    const availability =
      await checkServiceAvailability(
        selectedServiceRecord.id,
        latitude,
        longitude
      )

    if (!availability.available) {
      Alert.alert(
        'Not Available at Current Location',
        `${selectedServiceRecord.name} is not currently available at your current location.\n\nYou can choose another service location manually. Availability will be checked again for that exact location.`,
        [
          {
            text: 'Not Now',
            style: 'cancel',
          },
          {
            text: 'Notify Me',
            onPress: () =>
              handleNotifyMe(
                selectedServiceRecord.id,
                latitude,
                longitude,
                selectedServiceRecord.name
              ),
          },
          {
            text: 'Change Location',
            onPress: () =>
              navigation.navigate('Summary'),
          },
        ]
      )

      return
    }

    navigation.navigate('Summary')
  } catch (error) {
    console.error(
      '[TempStaff] Availability check failed:',
      error
    )

    Alert.alert(
      'Unable to Check Availability',
      'We could not check your current location right now. You can still choose the service location manually.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Choose Location',
          onPress: () =>
            navigation.navigate('Summary'),
        },
      ]
    )
  } finally {
    setCheckingAvailability(false)
  }
}

  const selectedPackagePrice =
    selectedPackage?.price ?? 0

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.page}
        showsVerticalScrollIndicator={false}
      >
        <Header
          onBack={() => navigation.goBack()}
        />

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.stepBadge}>
            <Text style={styles.stepBadgeText}>
              STEP 1
            </Text>
          </View>

          <Text style={styles.title}>
            What do you need?
          </Text>

          <Text style={styles.subtitle}>
            Choose the type of staff and how long
            you need them.
          </Text>
        </View>

        {/* Staff type */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Staff type
          </Text>

          {selectedService ? (
            <Text style={styles.selectedHint}>
              Selected
            </Text>
          ) : null}
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
              Unable to load services
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
              There are currently no active staffing
              services available.
            </Text>
          </View>
        ) : (
          <View style={styles.serviceList}>
            {services.map(service => {
              const isSelected =
                selectedService === service.name

              return (
                <TouchableOpacity
                  key={service.id}
                  activeOpacity={0.88}
                  style={[
                    styles.serviceCard,
                    isSelected &&
                      styles.serviceCardSelected,
                  ]}


                  onPress={() =>
                    handleServiceSelect(
                      service.name
                    )
                  }
                  disabled={checkingAvailability}
                >
                  <View
                    style={[
                      styles.serviceIcon,
                      isSelected &&
                        styles.serviceIconSelected,
                    ]}
                  >
                    <Text
                      style={styles.serviceEmoji}
                    >
                      {iconForService(
                        service.name
                      )}
                    </Text>
                  </View>

                  <View
                    style={styles.serviceContent}
                  >
                    <Text
                      style={[
                        styles.serviceName,
                        isSelected &&
                          styles.selectedText,
                      ]}
                      numberOfLines={1}
                    >
                      {service.name}
                    </Text>

                    <Text
                      style={[
                        styles.serviceDescription,
                        isSelected &&
                          styles.selectedDescription,
                      ]}
                      numberOfLines={2}
                    >
                      {service.description ||
                        'Temporary staffing service'}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.radio,
                      isSelected &&
                        styles.radioSelected,
                    ]}
                  >
                    {isSelected ? (
                      <View
                        style={styles.radioInner}
                      />
                    ) : null}
                  </View>
                </TouchableOpacity>
              )
            })}
          </View>
        )}

        {/* Duration */}
        {selectedService && !catalogueLoading ? (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                Staffing period
              </Text>

              <Text style={styles.selectedHint}>
                {selectedPackage
                  ? 'Selected'
                  : 'Required'}
              </Text>
            </View>

            <Text style={styles.helper}>
              Select how long you need the staff.
            </Text>

            {servicePackages.length === 0 ? (
              <View style={styles.stateCard}>
                <Text style={styles.stateTitle}>
                  No packages available
                </Text>

                <Text style={styles.stateText}>
                  No staffing periods are currently
                  available for {selectedService}.
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
                      activeOpacity={0.88}
                      style={[
                        styles.packageCard,
                        isSelected &&
                          styles.packageCardSelected,
                      ]}
                      onPress={() =>
                        handlePackageSelect(
                          pkg.name
                        )
                      }
                      disabled={checkingAvailability}
                    >
                      <View
                        style={[
                          styles.packageRadio,
                          isSelected &&
                            styles.packageRadioSelected,
                        ]}
                      >
                        {isSelected ? (
                          <View
                            style={
                              styles.packageRadioInner
                            }
                          />
                        ) : null}
                      </View>

                      <View
                        style={styles.packageContent}
                      >
                        <Text
                          style={[
                            styles.packageName,
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
                          numberOfLines={2}
                        >
                          {pkg.description ||
                            'Temporary staffing package'}
                        </Text>
                      </View>

                      <View
                        style={
                          styles.packagePriceContainer
                        }
                      >
                        <Text
                          style={[
                            styles.packagePrice,
                            isSelected &&
                              styles.selectedText,
                          ]}
                        >
                          {formatPrice(pkg.price)}
                        </Text>

                        <Text
                          style={[
                            styles.packagePriceLabel,
                            isSelected &&
                              styles.selectedDescription,
                          ]}
                        >
                          total
                        </Text>
                      </View>
                    </TouchableOpacity>
                  )
                })}
              </View>
            )}
          </>
        ) : null}

        {/* Selection summary */}
        {selectedService && selectedPackage ? (
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <Text style={styles.summaryTitle}>
                Your selection
              </Text>

              <View style={styles.summaryCheck}>
                <Text style={styles.summaryCheckText}>
                  ✓
                </Text>
              </View>
            </View>

            <View style={styles.summaryDivider} />

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>
                Staff
              </Text>

              <Text
                style={styles.summaryValue}
                numberOfLines={1}
              >
                {selectedService}
              </Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>
                Period
              </Text>

              <Text
                style={styles.summaryValue}
                numberOfLines={1}
              >
                {selectedPackage.name}
              </Text>
            </View>

            <View style={styles.summaryDivider} />

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>
                Estimated total
              </Text>

              <Text style={styles.totalValue}>
                {formatPrice(
                  selectedPackagePrice
                )}
              </Text>
            </View>
          </View>
        ) : null}

        {/* Assignment information */}
        <View style={styles.infoCard}>
          <View style={styles.infoIcon}>
            <Text style={styles.infoIconText}>
              ✓
            </Text>
          </View>

          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>
              We handle worker assignment
            </Text>

            <Text style={styles.infoText}>
              You choose the service and staffing
              period. TempStaff will find and assign
              a suitable worker.
            </Text>
          </View>
        </View>

        <View style={styles.bottom}>
          {checkingAvailability ? (
            <View style={styles.checkingButton}>
              <ActivityIndicator
                size="small"
                color={COLORS.white}
              />

              <Text style={styles.checkingButtonText}>
                Checking availability...
              </Text>
            </View>
          ) : (
            <PrimaryButton
              title="Continue"
              disabled={
                !selectedService ||
                !selectedPackage
              }
              onPress={handleContinue}
            />
          )}

          {!selectedService ||
          !selectedPackage ? (
            <Text style={styles.bottomHint}>
              Select a staff type and staffing period
              to continue.
            </Text>
          ) : checkingAvailability ? (
            <Text style={styles.bottomHint}>
              Checking for available staff near your
              current location.
            </Text>
          ) : (
            <Text style={styles.bottomHint}>
              Next: check staff availability in your
              area.
            </Text>
          )}
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
    paddingTop: 12,
    paddingBottom: 45,
  },

  header: {
    marginTop: 6,
  },

  stepBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#E8F6F6',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 11,
  },

  stepBadgeText: {
    color: COLORS.teal,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
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
    maxWidth: 340,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 27,
    marginBottom: 11,
  },

  sectionTitle: {
    color: COLORS.navy,
    fontSize: 19,
    lineHeight: 25,
    fontWeight: '800',
  },

  selectedHint: {
    color: COLORS.teal,
    fontSize: 10,
    lineHeight: 15,
    fontWeight: '800',
  },

  helper: {
    color: COLORS.gray,
    fontSize: 12,
    lineHeight: 18,
    marginTop: -4,
    marginBottom: 11,
  },

  serviceList: {
    gap: 10,
  },

  serviceCard: {
    width: '100%',
    minHeight: 83,
    backgroundColor: COLORS.white,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 13,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
  },

  serviceCardSelected: {
    backgroundColor: COLORS.orange,
    borderColor: COLORS.orange,
  },

  serviceIcon: {
    width: 51,
    height: 51,
    borderRadius: 15,
    backgroundColor: '#F2F6F8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  serviceIconSelected: {
    backgroundColor: 'rgba(255,255,255,0.18)',
  },

  serviceEmoji: {
    fontSize: 26,
  },

  serviceContent: {
    flex: 1,
    paddingRight: 9,
  },

  serviceName: {
    color: COLORS.navy,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800',
  },

  serviceDescription: {
    color: COLORS.gray,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
  },

  selectedText: {
    color: COLORS.white,
  },

  selectedDescription: {
    color: 'rgba(255,255,255,0.86)',
  },

  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#C9D0D8',
    alignItems: 'center',
    justifyContent: 'center',
  },

  radioSelected: {
    borderColor: COLORS.white,
  },

  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.white,
  },

  packageList: {
    gap: 10,
  },

  packageCard: {
    width: '100%',
    minHeight: 82,
    backgroundColor: COLORS.white,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },

  packageCardSelected: {
    backgroundColor: COLORS.orange,
    borderColor: COLORS.orange,
  },

  packageRadio: {
    width: 21,
    height: 21,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#C9D0D8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },

  packageRadioSelected: {
    borderColor: COLORS.white,
  },

  packageRadioInner: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: COLORS.white,
  },

  packageContent: {
    flex: 1,
    paddingRight: 8,
  },

  packageName: {
    color: COLORS.navy,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800',
  },

  packageDescription: {
    color: COLORS.gray,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
  },

  packagePriceContainer: {
    minWidth: 65,
    alignItems: 'flex-end',
  },

  packagePrice: {
    color: COLORS.navy,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '900',
  },

  packagePriceLabel: {
    color: COLORS.gray,
    fontSize: 9,
    lineHeight: 13,
    marginTop: 1,
  },

  summaryCard: {
    backgroundColor: COLORS.navy,
    borderRadius: 19,
    padding: 17,
    marginTop: 23,
  },

  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  summaryTitle: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '800',
  },

  summaryCheck: {
    width: 25,
    height: 25,
    borderRadius: 13,
    backgroundColor: COLORS.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },

  summaryCheckText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '900',
  },

  summaryDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.13)',
    marginVertical: 12,
  },

  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 3,
  },

  summaryLabel: {
    color: '#C8D5E1',
    fontSize: 12,
  },

  summaryValue: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '700',
    maxWidth: '68%',
    textAlign: 'right',
  },

  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  totalLabel: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '700',
  },

  totalValue: {
    color: COLORS.orange,
    fontSize: 19,
    fontWeight: '900',
  },

  infoCard: {
    width: '100%',
    backgroundColor: '#E8F6F6',
    borderRadius: 17,
    padding: 14,
    marginTop: 15,
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
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
  },

  infoText: {
    color: COLORS.gray,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
  },

  stateCard: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },

  stateIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFF4E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 9,
  },

  stateIconText: {
    color: COLORS.orange,
    fontSize: 17,
    fontWeight: '900',
  },

  stateTitle: {
    color: COLORS.navy,
    fontSize: 14,
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
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginTop: 13,
  },

  retryText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '800',
  },

  bottom: {
    marginTop: 22,
  },

  bottomHint: {
    color: COLORS.gray,
    fontSize: 10.5,
    lineHeight: 16,
    textAlign: 'center',
    marginTop: 10,
    paddingHorizontal: 12,
  },

  checkingButton: {
    minHeight: 50,
    borderRadius: 25,
    backgroundColor: COLORS.orange,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },

  checkingButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '800',
    marginLeft: 9,
  },
})