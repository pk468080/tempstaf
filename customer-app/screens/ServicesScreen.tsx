```tsx
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

const iconForService = (
  service: string
): string => {
  const normalized =
    service.trim().toLowerCase()

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

export default function ServicesScreen({
  navigation,
}: Props) {
  const {
    selectedService,
    selectedServiceId,
    selectedVariantId,
    selectedVariant,
    services,
    hourlyVariants,
    catalogueLoading,
    catalogueError,
    setSelectedService,
    setSelectedVariantId,
    refreshCatalogue,
  } = useBooking()

  const selectedServiceRecord =
    services.find(
      service =>
        service.id === selectedServiceId ||
        service.name === selectedService
    )

  const serviceHourlyVariants =
    hourlyVariants
      .filter(
        variant =>
          variant.service_id ===
            selectedServiceRecord?.id &&
          variant.is_active
      )
      .sort(
        (a, b) =>
          a.sort_order -
          b.sort_order
      )

  /*
   * The current backend catalogue is designed around
   * one active customer-facing Hourly variant per service.
   *
   * If there is exactly one, select it automatically.
   *
   * We still render the variant as a selectable item so
   * the screen remains compatible if admin later creates
   * more than one active Hourly variant.
   */
  const handleServiceSelect = (
    serviceName: string
  ) => {
    if (
      selectedService === serviceName
    ) {
      return
    }

    setSelectedService(serviceName)

    const service =
      services.find(
        item =>
          item.name === serviceName
      )

    if (!service) {
      return
    }

    const variants =
      hourlyVariants
        .filter(
          variant =>
            variant.service_id ===
              service.id &&
            variant.is_active
        )
        .sort(
          (a, b) =>
            a.sort_order -
            b.sort_order
        )

    /*
     * Automatically select the only active Hourly
     * customer-facing variant.
     */
    if (variants.length === 1) {
      setSelectedVariantId(
        variants[0].id
      )
    }
  }

  const handleVariantSelect = (
    variantId: string
  ) => {
    setSelectedVariantId(
      variantId
    )
  }

  const handleContinue = () => {
    if (
      !selectedServiceRecord ||
      !selectedVariantId ||
      !selectedVariant
    ) {
      return
    }

    navigation.navigate('Summary')
  }

  const hasVariant =
    Boolean(
      selectedVariantId &&
        selectedVariant
    )

  return (
    <SafeAreaView
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={
          styles.page
        }
        showsVerticalScrollIndicator={
          false
        }
      >
        <Header
          onBack={() =>
            navigation.goBack()
          }
        />

        {/* Header */}
        <View style={styles.header}>
          <View
            style={styles.stepBadge}
          >
            <Text
              style={
                styles.stepBadgeText
              }
            >
              STEP 1
            </Text>
          </View>

          <Text
            style={styles.title}
          >
            What do you need?
          </Text>

          <Text
            style={styles.subtitle}
          >
            Choose the type of staff you
            need. You will choose the
            booking time and duration next.
          </Text>
        </View>

        {/* Staff type */}
        <View
          style={styles.sectionHeader}
        >
          <Text
            style={styles.sectionTitle}
          >
            Staff type
          </Text>

          {selectedService ? (
            <Text
              style={
                styles.selectedHint
              }
            >
              Selected
            </Text>
          ) : null}
        </View>

        {catalogueLoading ? (
          <View
            style={styles.stateCard}
          >
            <ActivityIndicator
              size="small"
              color={COLORS.orange}
            />

            <Text
              style={styles.stateText}
            >
              Loading available
              services...
            </Text>
          </View>
        ) : catalogueError ? (
          <View
            style={styles.stateCard}
          >
            <View
              style={styles.stateIcon}
            >
              <Text
                style={
                  styles.stateIconText
                }
              >
                !
              </Text>
            </View>

            <Text
              style={styles.stateTitle}
            >
              Unable to load services
            </Text>

            <Text
              style={styles.stateText}
            >
              {catalogueError}
            </Text>

            <TouchableOpacity
              style={
                styles.retryButton
              }
              onPress={
                refreshCatalogue
              }
              activeOpacity={0.85}
            >
              <Text
                style={styles.retryText}
              >
                Try Again
              </Text>
            </TouchableOpacity>
          </View>
        ) : services.length === 0 ? (
          <View
            style={styles.stateCard}
          >
            <View
              style={styles.stateIcon}
            >
              <Text
                style={
                  styles.stateIconText
                }
              >
                i
              </Text>
            </View>

            <Text
              style={styles.stateTitle}
            >
              No services available
            </Text>

            <Text
              style={styles.stateText}
            >
              There are currently no
              active staffing services
              available.
            </Text>
          </View>
        ) : (
          <View
            style={styles.serviceList}
          >
            {services.map(service => {
              const isSelected =
                selectedService ===
                  service.name ||
                selectedServiceId ===
                  service.id

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
                >
                  <View
                    style={[
                      styles.serviceIcon,
                      isSelected &&
                        styles.serviceIconSelected,
                    ]}
                  >
                    <Text
                      style={
                        styles.serviceEmoji
                      }
                    >
                      {iconForService(
                        service.name
                      )}
                    </Text>
                  </View>

                  <View
                    style={
                      styles.serviceContent
                    }
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
                        style={
                          styles.radioInner
                        }
                      />
                    ) : null}
                  </View>
                </TouchableOpacity>
              )
            })}
          </View>
        )}

        {/* Hourly service variant */}
        {selectedServiceRecord &&
        !catalogueLoading ? (
          <>
            <View
              style={styles.sectionHeader}
            >
              <Text
                style={
                  styles.sectionTitle
                }
              >
                Booking type
              </Text>

              {hasVariant ? (
                <Text
                  style={
                    styles.selectedHint
                  }
                >
                  Hourly
                </Text>
              ) : (
                <Text
                  style={
                    styles.requiredHint
                  }
                >
                  Required
                </Text>
              )}
            </View>

            <Text
              style={styles.helper}
            >
              TempStaff bookings are charged
              by the number of working hours.
              Select your service below, then
              choose the required time range.
            </Text>

            {serviceHourlyVariants.length ===
            0 ? (
              <View
                style={styles.stateCard}
              >
                <Text
                  style={
                    styles.stateTitle
                  }
                >
                  Hourly booking unavailable
                </Text>

                <Text
                  style={styles.stateText}
                >
                  This service does not
                  currently have an active
                  customer-facing Hourly
                  variant.
                </Text>
              </View>
            ) : (
              <View
                style={
                  styles.variantList
                }
              >
                {serviceHourlyVariants.map(
                  variant => {
                    const isSelected =
                      selectedVariantId ===
                      variant.id

                    return (
                      <TouchableOpacity
                        key={variant.id}
                        activeOpacity={
                          0.88
                        }
                        style={[
                          styles.variantCard,
                          isSelected &&
                            styles.variantCardSelected,
                        ]}
                        onPress={() =>
                          handleVariantSelect(
                            variant.id
                          )
                        }
                      >
                        <View
                          style={[
                            styles.variantRadio,
                            isSelected &&
                              styles.variantRadioSelected,
                          ]}
                        >
                          {isSelected ? (
                            <View
                              style={
                                styles.variantRadioInner
                              }
                            />
                          ) : null}
                        </View>

                        <View
                          style={
                            styles.variantContent
                          }
                        >
                          <Text
                            style={[
                              styles.variantName,
                              isSelected &&
                                styles.selectedText,
                            ]}
                          >
                            {variant.name ||
                              'Hourly'}
                          </Text>

                          <Text
                            style={[
                              styles.variantDescription,
                              isSelected &&
                                styles.selectedDescription,
                            ]}
                            numberOfLines={2}
                          >
                            {variant.description ||
                              'Flexible hourly staffing'}
                          </Text>
                        </View>

                        <View
                          style={
                            styles.hourlyBadge
                          }
                        >
                          <Text
                            style={
                              styles.hourlyBadgeText
                            }
                          >
                            HOURLY
                          </Text>
                        </View>
                      </TouchableOpacity>
                    )
                  }
                )}
              </View>
            )}
          </>
        ) : null}

        {/* Selection summary */}
        {selectedServiceRecord &&
        selectedVariant ? (
          <View
            style={styles.summaryCard}
          >
            <View
              style={
                styles.summaryHeader
              }
            >
              <Text
                style={
                  styles.summaryTitle
                }
              >
                Your selection
              </Text>

              <View
                style={
                  styles.summaryCheck
                }
              >
                <Text
                  style={
                    styles.summaryCheckText
                  }
                >
                  ✓
                </Text>
              </View>
            </View>

            <View
              style={
                styles.summaryDivider
              }
            />

            <View
              style={styles.summaryRow}
            >
              <Text
                style={
                  styles.summaryLabel
                }
              >
                Staff
              </Text>

              <Text
                style={
                  styles.summaryValue
                }
                numberOfLines={1}
              >
                {selectedServiceRecord.name}
              </Text>
            </View>

            <View
              style={styles.summaryRow}
            >
              <Text
                style={
                  styles.summaryLabel
                }
              >
                Billing
              </Text>

              <Text
                style={
                  styles.summaryValue
                }
              >
                Hourly
              </Text>
            </View>

            <View
              style={styles.summaryDivider}
            />

            <View
              style={styles.summaryRow}
            >
              <Text
                style={
                  styles.summaryLabel
                }
              >
                Price
              </Text>

              <Text
                style={
                  styles.summaryValueMuted
                }
              >
                Calculated at checkout
              </Text>
            </View>
          </View>
        ) : null}

        {/* Pricing information */}
        <View
          style={styles.infoCard}
        >
          <View
            style={styles.infoIcon}
          >
            <Text
              style={
                styles.infoIconText
              }
            >
              ₹
            </Text>
          </View>

          <View
            style={styles.infoContent}
          >
            <Text
              style={styles.infoTitle}
            >
              Pricing is calculated by TempStaff
            </Text>

            <Text
              style={styles.infoText}
            >
              Your final amount is calculated
              using the current admin-configured
              hourly price and applicable
              discounts. The app does not
              hardcode pricing.
            </Text>
          </View>
        </View>

        {/* Assignment information */}
        <View
          style={styles.infoCard}
        >
          <View
            style={styles.infoIcon}
          >
            <Text
              style={
                styles.infoIconText
              }
            >
              ✓
            </Text>
          </View>

          <View
            style={styles.infoContent}
          >
            <Text
              style={styles.infoTitle}
            >
              Worker assignment is handled securely
            </Text>

            <Text
              style={styles.infoText}
            >
              Worker availability, location,
              service-area coverage, scheduling,
              distance and assignment are
              validated by the backend.
            </Text>
          </View>
        </View>

        {/* Continue */}
        <View
          style={styles.bottom}
        >
          <PrimaryButton
            title="Continue"
            disabled={
              !selectedServiceRecord ||
              !selectedVariant
            }
            onPress={
              handleContinue
            }
          />

          {!selectedServiceRecord ||
          !selectedVariant ? (
            <Text
              style={
                styles.bottomHint
              }
            >
              Select a staff type to
              continue.
            </Text>
          ) : (
            <Text
              style={
                styles.bottomHint
              }
            >
              Next: choose your booking
              method, location and time.
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

  requiredHint: {
    color: COLORS.orange,
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
    backgroundColor:
      'rgba(255,255,255,0.18)',
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

  variantList: {
    gap: 10,
  },

  variantCard: {
    width: '100%',
    minHeight: 78,
    backgroundColor: COLORS.white,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },

  variantCardSelected: {
    backgroundColor: COLORS.orange,
    borderColor: COLORS.orange,
  },

  variantRadio: {
    width: 21,
    height: 21,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#C9D0D8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },

  variantRadioSelected: {
    borderColor: COLORS.white,
  },

  variantRadioInner: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: COLORS.white,
  },

  variantContent: {
    flex: 1,
    paddingRight: 8,
  },

  variantName: {
    color: COLORS.navy,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800',
  },

  variantDescription: {
    color: COLORS.gray,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
  },

  hourlyBadge: {
    borderRadius: 10,
    backgroundColor: '#E8F6F6',
    paddingHorizontal: 8,
    paddingVertical: 5,
  },

  hourlyBadgeText: {
    color: COLORS.teal,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.5,
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
    backgroundColor:
      'rgba(255,255,255,0.13)',
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

  summaryValueMuted: {
    color: '#C8D5E1',
    fontSize: 12,
    fontWeight: '600',
    maxWidth: '68%',
    textAlign: 'right',
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
})
```
