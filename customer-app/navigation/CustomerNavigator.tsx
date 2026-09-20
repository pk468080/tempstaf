import {
  createBottomTabNavigator,
} from '@react-navigation/bottom-tabs'
import {
  StyleSheet,
  Text,
  View,
} from 'react-native'
import {
  createNativeStackNavigator,
} from '@react-navigation/native-stack'

import BookingDetailsScreen from '../screens/bookings/BookingDetailsScreen'
import BookingScreen from '../screens/bookings/BookingScreen'
import HomeScreen from '../screens/home/HomeScreen'
import PaymentScreen from '../screens/payment/PaymentScreen'
import ActiveBookingScreen from '../screens/bookings/ActiveBookingScreen'

import {
  getOrCreateCustomerAddress,
} from '../services/addresses/customerAddress.service'

import {
  createCustomerScheduledBooking,
} from '../services/booking/scheduledBooking.service'

import {
  createCustomerRecurringBooking,
} from '../services/booking/recurringBooking.service'
import {
  createCustomerInstantBooking,
} from '../services/booking/instantBooking.service'

import type { BookingDraft } from '../types/booking'
import type { HomeService } from '../types/service'

type CustomerLocation = {
  latitude: number
  longitude: number
  address: string
}

type CustomerNavigatorProps = {
  location: CustomerLocation | null
  onLocationChange: (
    latitude: number,
    longitude: number,
    address: string,
  ) => void
}

type CustomerStackParamList = {
  Tabs: undefined

  Booking: {
    service: HomeService
  }

  BookingDetails: {
    draft: BookingDraft
    service: HomeService
  }

  Payment: {
    bookingId: string
    finalAmount: number
    currency: string
    occurrenceCount: number
    totalWorkingHours: number
  }
  ActiveBooking: { bookingId: string }
}

const Tab =
  createBottomTabNavigator()

const Stack =
  createNativeStackNavigator<CustomerStackParamList>()
function toDateOnly(value: string) {
  const date = new Date(value)

  const year = date.getFullYear()
  const month = String(
    date.getMonth() + 1,
  ).padStart(2, '0')
  const day = String(
    date.getDate(),
  ).padStart(2, '0')

  return `${year}-${month}-${day}`
}
function toTimeOnly(
  value: string,
) {
  const date = new Date(value)

  const hours = String(
    date.getHours(),
  ).padStart(2, '0')

  const minutes = String(
    date.getMinutes(),
  ).padStart(2, '0')

  const seconds = String(
    date.getSeconds(),
  ).padStart(2, '0')

  return `${hours}:${minutes}:${seconds}`
}

const WEEKDAY_INDEX: Record<
  string,
  number
> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
}

function convertWeekdays(
  weekdays: string[],
) {
  return weekdays
    .map(
      weekday =>
        WEEKDAY_INDEX[weekday],
    )
    .filter(
      value =>
        value !== undefined,
    )
}

export default function CustomerNavigator({
  location,
  onLocationChange,
}: CustomerNavigatorProps) {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Tabs">
        {({ navigation }) => (
          <Tab.Navigator
            screenOptions={{
              headerShown: false,
              tabBarStyle:
                styles.tabBar,
              tabBarLabelStyle:
                styles.tabBarLabel,
            }}
          >
            <Tab.Screen name="Home">
              {() => (
                <HomeScreen
                  location={location}
                  onLocationChange={
                    onLocationChange
                  }
                  onServicePress={service => {
                    navigation.navigate(
                      'Booking',
                      {
                        service,
                      },
                    )
                  }}
                />
              )}
            </Tab.Screen>

            <Tab.Screen name="My Bookings">
              {() => (
                <Placeholder
                  title="My Bookings"
                />
              )}
            </Tab.Screen>

            <Tab.Screen name="My Profile">
              {() => (
                <Placeholder
                  title="My Profile"
                />
              )}
            </Tab.Screen>
          </Tab.Navigator>
        )}
      </Stack.Screen>

      <Stack.Screen name="Booking">
        {({ route, navigation }) => (
          <BookingScreen
            service={
              route.params.service
            }
            location={location}
            onContinue={draft => {
              navigation.navigate(
                'BookingDetails',
                {
                  draft,
                  service:
                    route.params
                      .service,
                },
              )
            }}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="BookingDetails">
        {({ route, navigation }) => {
          const {
            draft,
            service,
          } = route.params

          async function handleContinue() {
            if (!draft.location) {
              throw new Error('A booking location is required.')
            }

            if (draft.bookingType !== 'instant' && (!draft.startDate || !draft.endDate)) {
              throw new Error(
                'Booking dates are required.',
              )
            }

            const addressId = await getOrCreateCustomerAddress(
                draft.location,
              )

            if (draft.bookingType === 'instant') {
              const result = await createCustomerInstantBooking({
                serviceVariantId: service.serviceVariantId,
                addressId,
                startTime: draft.startTime,
                endTime: draft.endTime,
              })
              if (
                result.instant_available === false ||
                result.fallback_to_scheduled === true
              ) {
                navigation.navigate('Booking', { service })
                return
              }
              navigation.navigate('Payment', {
                bookingId: result.booking_id,
                finalAmount: result.final_amount,
                currency: result.currency,
                occurrenceCount: result.occurrence_count,
                totalWorkingHours: result.total_working_hours,
              })
              return
            }

            if (
              draft.bookingType ===
              'scheduled'
            ) {
              const result =
                await createCustomerScheduledBooking(
                  {
                    serviceVariantId:
                      service.serviceVariantId,

                    addressId,

                    startDate:
                      toDateOnly(
                        draft.startDate!,
                      ),

                    endDate:
                      toDateOnly(
                        draft.endDate!,
                      ),

                    startTime:
                      toTimeOnly(
                        draft.startTime,
                      ),

                    endTime:
                      toTimeOnly(
                        draft.endTime,
                      ),

                    selectedWeekdays:
                      [new Date(draft.startDate!).getDay()],

                    excludedDates:
                      draft.excludedDates,
                  },
                )

              navigation.navigate(
                'Payment',
                {
                  bookingId:
                    result.booking_id,

                  finalAmount:
                    result.final_amount,

                  currency:
                    result.currency,

                  occurrenceCount:
                    result.occurrence_count,

                  totalWorkingHours:
                    result.total_working_hours,
                },
              )

              return
            }

            const weekdayIndexes =
              convertWeekdays(
                draft.selectedWeekdays,
              )

            if (
              weekdayIndexes.length ===
              0
            ) {
              throw new Error(
                'At least one recurring weekday is required.',
              )
            }

            const result =
              await createCustomerRecurringBooking(
                {
                  serviceVariantId:
                    service.serviceVariantId,

                  addressId,

                  startDate:
                    toDateOnly(
                      draft.startDate!,
                    ),

                  endDate:
                    toDateOnly(
                      draft.endDate!,
                    ),

                  startTime:
                    toTimeOnly(
                      draft.startTime,
                    ),

                  endTime:
                    toTimeOnly(
                      draft.endTime,
                    ),

                  selectedWeekdays:
                    weekdayIndexes,

                  excludedDates:
                    draft.excludedDates,
                },
              )

            navigation.navigate(
              'Payment',
              {
                bookingId:
                  result.booking_id,

                finalAmount:
                  result.final_amount,

                currency:
                  result.currency,

                occurrenceCount:
                  result.occurrence_count,

                totalWorkingHours:
                  result.total_working_hours,
              },
            )
          }

          return (
            <BookingDetailsScreen
              service={service}
              bookingType={
                draft.bookingType
              }
              location={
                draft.location
              }
              startDate={
                draft.startDate
                  ? new Date(
                      draft.startDate,
                    )
                  : null
              }
              endDate={
                draft.endDate
                  ? new Date(
                      draft.endDate,
                    )
                  : null
              }
              startTime={
                new Date(
                  draft.startTime,
                )
              }
              endTime={
                new Date(
                  draft.endTime,
                )
              }
              selectedWeekdays={
                draft.selectedWeekdays
              }
              excludedDates={
                draft.excludedDates
              }
              onContinue={
                handleContinue
              }
            />
          )
        }}
      </Stack.Screen>

      <Stack.Screen name="Payment">
        {({ route, navigation }) => (
          <PaymentScreen
            bookingId={
              route.params.bookingId
            }
            finalAmount={
              route.params.finalAmount
            }
            currency={
              route.params.currency
            }
            occurrenceCount={
              route.params
                .occurrenceCount
            }
            totalWorkingHours={
              route.params
                .totalWorkingHours
            }
            onPaid={() => navigation.replace('ActiveBooking', {
              bookingId: route.params.bookingId,
            })}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="ActiveBooking">
        {({ route }) => <ActiveBookingScreen bookingId={route.params.bookingId} />}
      </Stack.Screen>
    </Stack.Navigator>
  )
}

function Placeholder({
  title,
}: {
  title: string
}) {
  return (
    <View
      style={styles.placeholder}
    >
      <Text
        style={
          styles.placeholderText
        }
      >
        {title}
      </Text>

      <Text
        style={
          styles.placeholderSubtext
        }
      >
        This screen will be built separately.
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  tabBar: {
    height: 64,
    paddingBottom: 8,
    paddingTop: 8,
  },

  tabBarLabel: {
    fontSize: 12,
  },

  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  placeholderText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },

  placeholderSubtext: {
    marginTop: 8,
    color: '#6B7280',
  },
})