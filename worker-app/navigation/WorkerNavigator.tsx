import {
  StyleSheet,
  Text,
  View,
} from 'react-native'

import {
  createBottomTabNavigator,
} from '@react-navigation/bottom-tabs'

import {
  createNativeStackNavigator,
} from '@react-navigation/native-stack'

import {
  UI,
} from '../constants/ui'

import type {
  WorkerStackParamList,
  WorkerTabParamList,
} from '../types/navigation'

import WorkerHomeScreen from '../screens/home/WorkerHomeScreen'

import WorkerBookingsScreen from '../screens/bookings/WorkerBookingsScreen'

import BookingOfferScreen from '../screens/bookings/BookingOfferScreen'

import BookingDetailsScreen from '../screens/bookings/BookingDetailsScreen'

import BookingOccurrenceScreen from '../screens/bookings/BookingOccurrenceScreen'

import WorkerEarningsScreen from '../screens/earnings/WorkerEarningsScreen'

import EarningDetailsScreen from '../screens/earnings/EarningDetailsScreen'

import ProfileScreen from '../screens/profile/ProfileScreen'

import EditProfileScreen from '../screens/profile/EditProfileScreen'

import WorkerScheduleScreen from '../screens/schedule/WorkerScheduleScreen'

import NotificationsScreen from '../screens/notifications/NotificationsScreen'

import SupportScreen from '../screens/support/SupportScreen'

import SettingsScreen from '../screens/settings/SettingsScreen'

const Tab =
  createBottomTabNavigator<
    WorkerTabParamList
  >()

const Stack =
  createNativeStackNavigator<
    WorkerStackParamList
  >()

type PlaceholderScreenProps = {
  title: string
  message?: string
}

function PlaceholderScreen({
  title,
  message = 'This worker screen is being connected to the live worker services.',
}: PlaceholderScreenProps) {
  return (
    <View
      style={
        styles.container
      }
    >
      <View style={styles.icon}>
        <Text
          style={
            styles.iconText
          }
        >
          TS
        </Text>
      </View>

      <Text style={styles.title}>
        {title}
      </Text>

      <Text style={styles.message}>
        {message}
      </Text>
    </View>
  )
}

function WorkerTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle:
          styles.tabBar,
        tabBarLabelStyle:
          styles.tabBarLabel,
        tabBarActiveTintColor:
          UI.colors.secondary,
        tabBarInactiveTintColor:
          UI.colors.textMuted,
      }}
    >
      <Tab.Screen name="Home">
        {({ navigation }) => (
          <WorkerHomeScreen
            onBookings={() => {
              navigation.navigate(
                'Bookings',
              )
            }}
            onSchedule={() => {
              navigation
                .getParent()
                ?.navigate(
                  'Schedule',
                )
            }}
            onNotifications={() => {
              navigation
                .getParent()
                ?.navigate(
                  'Notifications',
                )
            }}
            onProfile={() => {
              navigation.navigate(
                'Profile',
              )
            }}
          />
        )}
      </Tab.Screen>

      <Tab.Screen name="Bookings">
        {({ navigation }) => (
          <WorkerBookingsScreen
            onBookingPress={(
              bookingId,
            ) => {
              navigation
                .getParent()
                ?.navigate(
                  'BookingDetails',
                  {
                    bookingId,
                  },
                )
            }}
          />
        )}
      </Tab.Screen>

      <Tab.Screen name="Earnings">
        {({ navigation }) => (
          <WorkerEarningsScreen
            onEarningPress={(
              earningId,
            ) => {
              navigation
                .getParent()
                ?.navigate(
                  'EarningDetails',
                  {
                    earningId,
                  },
                )
            }}
          />
        )}
      </Tab.Screen>

      <Tab.Screen name="Profile">
        {({ navigation }) => (
          <ProfileScreen
            onEditProfile={() => {
              navigation
                .getParent()
                ?.navigate(
                  'EditProfile',
                )
            }}
            onSettings={() => {
              navigation
                .getParent()
                ?.navigate(
                  'Settings',
                )
            }}
            onSignedOut={() => {
              navigation
                .getParent()
                ?.getParent()
                ?.reset({
                  index: 0,
                  routes: [
                    {
                      name: 'Login',
                    },
                  ],
                })
            }}
          />
        )}
      </Tab.Screen>
    </Tab.Navigator>
  )
}

export default function WorkerNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Tabs"
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Tabs">
        {() => <WorkerTabs />}
      </Stack.Screen>

      <Stack.Screen
        name="BookingOffer"
      >
        {({ navigation, route }) => (
          <BookingOfferScreen
            bookingId={
              route.params.bookingId
            }
            onBack={() => {
              navigation.goBack()
            }}
            onAccepted={bookingId => {
              navigation.replace(
                'BookingDetails',
                {
                  bookingId,
                },
              )
            }}
          />
        )}
      </Stack.Screen>

      <Stack.Screen
        name="BookingDetails"
      >
        {({ navigation, route }) => (
          <BookingDetailsScreen
            bookingId={
              route.params.bookingId
            }
            onBack={() => {
              navigation.goBack()
            }}
            onOccurrencePress={(
              occurrenceId,
            ) => {
              navigation.navigate(
                'BookingOccurrence',
                {
                  occurrenceId,
                },
              )
            }}
          />
        )}
      </Stack.Screen>

      <Stack.Screen
        name="BookingOccurrence"
      >
        {({ navigation, route }) => (
          <BookingOccurrenceScreen
            occurrenceId={
              route.params.occurrenceId
            }
            onBack={() => {
              navigation.goBack()
            }}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="Schedule">
        {({ navigation }) => (
          <WorkerScheduleScreen
            onBack={() => {
              navigation.goBack()
            }}
          />
        )}
      </Stack.Screen>

      <Stack.Screen
  name="Notifications"
>
  {({ navigation }) => (
    <NotificationsScreen
      onBack={() => {
        navigation.goBack()
      }}
      onBookingPress={(
        bookingId,
      ) => {
        navigation.navigate(
          'BookingDetails',
          {
            bookingId,
          },
        )
      }}
      onBookingOfferPress={(
        bookingId,
      ) => {
        navigation.navigate(
          'BookingOffer',
          {
            bookingId,
          },
        )
      }}
    />
  )}
</Stack.Screen>

      <Stack.Screen name="Support">
        {({ navigation }) => (
          <SupportScreen
            onBack={() => {
              navigation.goBack()
            }}
          />
        )}
      </Stack.Screen>

      <Stack.Screen
        name="EditProfile"
      >
        {({ navigation }) => (
          <EditProfileScreen
            onSaved={() => {
              navigation.goBack()
            }}
            onBack={() => {
              navigation.goBack()
            }}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="Settings">
        {({ navigation }) => (
          <SettingsScreen
            onBack={() => {
              navigation.goBack()
            }}
            onEditProfile={() => {
              navigation.navigate(
                'EditProfile',
              )
            }}
            onSchedule={() => {
              navigation.navigate(
                'Schedule',
              )
            }}
            onNotifications={() => {
              navigation.navigate(
                'Notifications',
              )
            }}
            onSupport={() => {
              navigation.navigate(
                'Support',
              )
            }}
            onSignedOut={() => {
              navigation
                .getParent()
                ?.reset({
                  index: 0,
                  routes: [
                    {
                      name: 'Login',
                    },
                  ],
                })
            }}
          />
        )}
      </Stack.Screen>

      <Stack.Screen
        name="EarningDetails"
      >
        {({ navigation, route }) => (
          <EarningDetailsScreen
            earningId={
              route.params.earningId
            }
            onBack={() => {
              navigation.goBack()
            }}
          />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal:
      UI.spacing.xxl,
    backgroundColor:
      UI.colors.background,
  },

  icon: {
    width: 56,
    height: 56,
    borderRadius:
      UI.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor:
      UI.colors.primary,
  },

  iconText: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
    color:
      UI.colors.surface,
  },

  title: {
    marginTop:
      UI.spacing.lg,
    fontSize:
      UI.typography.subtitle,
    lineHeight: 24,
    fontWeight: '800',
    color:
      UI.colors.text,
    textAlign: 'center',
  },

  message: {
    marginTop:
      UI.spacing.sm,
    fontSize:
      UI.typography.body,
    lineHeight: 21,
    color:
      UI.colors.textSecondary,
    textAlign: 'center',
  },

  tabBar: {
    height:
      UI.sizes.tabBarHeight,
    paddingTop:
      UI.spacing.sm,
    paddingBottom:
      UI.spacing.sm,
    borderTopWidth: 1,
    borderTopColor:
      UI.colors.border,
    backgroundColor:
      UI.colors.surface,
  },

  tabBarLabel: {
    fontSize:
      UI.typography.small,
    fontWeight: '600',
  },
})