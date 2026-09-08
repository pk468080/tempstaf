import { useEffect } from 'react'
import { Linking } from 'react-native'
import {
  NavigationContainer,
  useNavigationContainerRef,
} from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'

import { RootStackParamList } from '../types'
import { supabase } from '../lib/supabase'

import ManualLocationScreen from '../screens/ManualLocationScreen'
import SplashScreen from '../screens/SplashScreen'
import LoginScreen from '../screens/LoginScreen'
import CustomerDetailsScreen from '../screens/CustomerDetailsScreen'
import HomeScreen from '../screens/HomeScreen'
import ServicesScreen from '../screens/ServicesScreen'
import LocationScreen from '../screens/LocationScreen'
import WorkersScreen from '../screens/WorkersScreen'
import SummaryScreen from '../screens/SummaryScreen'
import PaymentScreen from '../screens/PaymentScreen'
import ScheduleScreen from '../screens/ScheduleScreen'
import CheckoutScreen from '../screens/CheckoutScreen'
import BookingConfirmedScreen from '../screens/BookingConfirmedScreen'
import TrackingScreen from '../screens/TrackingScreen'
import WorkerProfileScreen from '../screens/WorkerProfileScreen'
import MyBookingsScreen from '../screens/MyBookingsScreen'
import BookingDetailsScreen from '../screens/BookingDetailsScreen'
import ProfileScreen from '../screens/ProfileScreen'
import EditProfileScreen from '../screens/EditProfileScreen'
import SavedAddressesScreen from '../screens/SavedAddressesScreen'
import MoneyScreen from '../screens/MoneyScreen'
import HelpSupportScreen from '../screens/HelpSupportScreen'
import AboutUsScreen from '../screens/AboutUsScreen'
import PrivacyPolicyScreen from '../screens/PrivacyPolicyScreen'
import DeleteAccountScreen from '../screens/DeleteAccountScreen'

const Stack = createNativeStackNavigator<RootStackParamList>()

const AUTH_CALLBACK_URL = 'tempstaff://auth/callback'

export default function AppNavigator() {
  const navigationRef =
    useNavigationContainerRef<RootStackParamList>()

  useEffect(() => {
    let mounted = true

    const handleAuthUrl = async (url: string | null) => {
      if (!url || !url.startsWith(AUTH_CALLBACK_URL)) {
        return
      }

      try {
        const parsed = new URL(url)
        const code = parsed.searchParams.get('code')

        if (!code) {
          return
        }

        const { error } =
          await supabase.auth.exchangeCodeForSession(code)

        if (error) {
          console.error(
            '[TempStaff] Magic-link callback failed:',
            error.message
          )
          return
        }

        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user || !user.email_confirmed_at) {
          await supabase.auth.signOut()
          return
        }

        const { data: profile, error: profileError } =
          await supabase
            .from('profiles')
            .select('id, role, is_active')
            .eq('id', user.id)
            .maybeSingle()

        if (
          profileError ||
          !profile ||
          profile.role !== 'customer' ||
          profile.is_active !== true
        ) {
          await supabase.auth.signOut()
          return
        }

        if (mounted && navigationRef.isReady()) {
          navigationRef.reset({
            index: 0,
            routes: [{ name: 'Home' }],
          })
        }
      } catch (error: any) {
        console.error(
          '[TempStaff] Magic-link callback error:',
          error?.message || 'Unknown authentication error'
        )
      }
    }

    Linking.getInitialURL().then(handleAuthUrl)

    const subscription = Linking.addEventListener(
      'url',
      ({ url }) => {
        handleAuthUrl(url)
      }
    )

    return () => {
      mounted = false
      subscription.remove()
    }
  }, [navigationRef])

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen
          name="Splash"
          component={SplashScreen}
        />

        <Stack.Screen
          name="Login"
          component={LoginScreen}
        />

        <Stack.Screen
          name="CustomerDetails"
          component={CustomerDetailsScreen}
        />

        <Stack.Screen
          name="Home"
          component={HomeScreen}
        />

        <Stack.Screen
          name="Services"
          component={ServicesScreen}
        />

        <Stack.Screen
          name="Location"
          component={LocationScreen}
        />

        <Stack.Screen
          name="Workers"
          component={WorkersScreen}
        />

        <Stack.Screen
          name="WorkerProfile"
          component={WorkerProfileScreen}
        />

        <Stack.Screen
          name="Summary"
          component={SummaryScreen}
        />

        <Stack.Screen
          name="Payment"
          component={PaymentScreen}
        />

        <Stack.Screen
          name="Schedule"
          component={ScheduleScreen}
        />

        <Stack.Screen
          name="Checkout"
          component={CheckoutScreen}
        />

        <Stack.Screen
          name="BookingConfirmed"
          component={BookingConfirmedScreen}
        />

        <Stack.Screen
          name="Tracking"
          component={TrackingScreen}
        />

        <Stack.Screen
          name="MyBookings"
          component={MyBookingsScreen}
        />

        <Stack.Screen
          name="BookingDetails"
          component={BookingDetailsScreen}
        />

        <Stack.Screen
          name="Profile"
          component={ProfileScreen}
        />

        <Stack.Screen
          name="EditProfile"
          component={EditProfileScreen}
        />

        <Stack.Screen
          name="SavedAddresses"
          component={SavedAddressesScreen}
        />

        <Stack.Screen
          name="Money"
          component={MoneyScreen}
        />

        <Stack.Screen
          name="HelpSupport"
          component={HelpSupportScreen}
        />

        <Stack.Screen
          name="AboutUs"
          component={AboutUsScreen}
        />

        <Stack.Screen
          name="PrivacyPolicy"
          component={PrivacyPolicyScreen}
        />

        <Stack.Screen
          name="DeleteAccount"
          component={DeleteAccountScreen}
        />

        <Stack.Screen
          name="ManualLocation"
          component={ManualLocationScreen}
        />
      </Stack.Navigator>
    </NavigationContainer>
  )
}