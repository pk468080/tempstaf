import {
  NavigationContainer,
  useNavigationContainerRef,
} from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'

import { RootStackParamList } from '../types'

import ManualLocationScreen from '../screens/ManualLocationScreen'
import SplashScreen from '../screens/SplashScreen'
import LoginScreen from '../screens/LoginScreen'
import VerifyOtpScreen from '../screens/VerifyOtpScreen'
import CustomerDetailsScreen from '../screens/CustomerDetailsScreen'
import CustomerLocationScreen from '../screens/CustomerLocationScreen'
import HomeScreen from '../screens/HomeScreen'

import SummaryScreen from '../screens/SummaryScreen'
import PaymentScreen from '../screens/PaymentScreen'

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
  const navigationRef =
    useNavigationContainerRef<RootStackParamList>()

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
          name="VerifyOtp"
          component={VerifyOtpScreen}
        />

        <Stack.Screen
          name="CustomerDetails"
          component={CustomerDetailsScreen}
        />
        <Stack.Screen
  name="CustomerLocation"
  component={CustomerLocationScreen}
/>

        <Stack.Screen
          name="Home"
          component={HomeScreen}
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