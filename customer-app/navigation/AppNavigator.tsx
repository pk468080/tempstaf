import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'

import { RootStackParamList } from '../types'
import ManualLocationScreen from '../screens/ManualLocationScreen'
import SplashScreen from '../screens/SplashScreen'
import LoginScreen from '../screens/LoginScreen'
import OtpScreen from '../screens/OtpScreen'
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

const Stack =
  createNativeStackNavigator<RootStackParamList>()

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{
          headerShown: false,
        }}
      >
        {/* Authentication */}

        <Stack.Screen
          name="Splash"
          component={SplashScreen}
        />

        <Stack.Screen
          name="Login"
          component={LoginScreen}
        />

        <Stack.Screen
          name="OTP"
          component={OtpScreen}
        />

        <Stack.Screen
          name="CustomerDetails"
          component={CustomerDetailsScreen}
        />

        {/* Main customer flow */}

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

        {/* Bookings */}

        <Stack.Screen
          name="MyBookings"
          component={MyBookingsScreen}
        />

        <Stack.Screen
          name="BookingDetails"
          component={BookingDetailsScreen}
        />

        {/* Profile */}

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
      