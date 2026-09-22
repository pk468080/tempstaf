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

import ProfileScreen from '../screens/profile/ProfileScreen'

import EditProfileScreen from '../screens/profile/EditProfileScreen'

import WorkerScheduleScreen from '../screens/schedule/WorkerScheduleScreen'

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
        {() => (
          <PlaceholderScreen
            title="My bookings"
            message="Your assigned and upcoming jobs will appear here."
          />
        )}
      </Tab.Screen>

      <Tab.Screen name="Earnings">
        {() => (
          <PlaceholderScreen
            title="Earnings"
            message="Your earnings and payout history will appear here."
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
        {({ route }) => (
          <PlaceholderScreen
            title="Booking offer"
            message={`Offer for booking ${route.params.bookingId}.`}
          />
        )}
      </Stack.Screen>

      <Stack.Screen
        name="BookingDetails"
      >
        {({ route }) => (
          <PlaceholderScreen
            title="Booking details"
            message={`Details for booking ${route.params.bookingId}.`}
          />
        )}
      </Stack.Screen>

      <Stack.Screen
        name="BookingOccurrence"
      >
        {({ route }) => (
          <PlaceholderScreen
            title="Booking occurrence"
            message={`Occurrence ${route.params.occurrenceId}.`}
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
        {() => (
          <PlaceholderScreen
            title="Notifications"
            message="Your worker notifications will appear here."
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="Support">
        {() => (
          <PlaceholderScreen
            title="Support"
            message="Create and track worker support requests."
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
        {() => (
          <PlaceholderScreen
            title="Settings"
            message="Manage worker app preferences and account settings."
          />
        )}
      </Stack.Screen>

      <Stack.Screen
        name="EarningDetails"
      >
        {({ route }) => (
          <PlaceholderScreen
            title="Earning details"
            message={`Earning ${route.params.earningId}.`}
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
    color: UI.colors.text,
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