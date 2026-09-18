import {
  NavigationContainer,
  useNavigationContainerRef,
} from '@react-navigation/native'

import {
  createNativeStackNavigator,
} from '@react-navigation/native-stack'

import {
  RootStackParamList,
} from '../types'

import SplashScreen from '../screens/SplashScreen'
import LoginScreen from '../screens/LoginScreen'
import VerifyOtpScreen from '../screens/VerifyOtpScreen'
import CustomerDetailsScreen from '../screens/CustomerDetailsScreen'
import CustomerLocationScreen from '../screens/CustomerLocationScreen'
import HomeScreen from '../screens/HomeScreen'

import BookingScreen from '../screens/BookingScreen'
import SummaryScreen from '../screens/SummaryScreen'
import PaymentScreen from '../screens/PaymentScreen'
import BookingConfirmedScreen from '../screens/BookingConfirmedScreen'

import MyBookingsScreen from '../screens/MyBookingsScreen'
import ProfileScreen from '../screens/ProfileScreen'

const Stack =
  createNativeStackNavigator<
    RootStackParamList
  >()

export default function AppNavigator() {
  const navigationRef =
    useNavigationContainerRef<
      RootStackParamList
    >()

  return (
    <NavigationContainer
      ref={navigationRef}
    >
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{
          headerShown: false,
          animation: 'fade',
        }}
      >
        {/* ==========================================
            AUTHENTICATION FLOW
           ========================================== */}

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
          component={
            CustomerDetailsScreen
          }
        />

        <Stack.Screen
          name="CustomerLocation"
          component={
            CustomerLocationScreen
          }
        />

        {/* ==========================================
            MAIN CUSTOMER APP
           ========================================== */}

        <Stack.Screen
          name="Home"
          component={HomeScreen}
        />

        {/* ==========================================
            BOOKING FLOW
           ========================================== */}

        <Stack.Screen
          name="Booking"
          component={BookingScreen}
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
          component={
            BookingConfirmedScreen
          }
        />

        {/* ==========================================
            CUSTOMER ACCOUNT
           ========================================== */}

        <Stack.Screen
          name="MyBookings"
          component={MyBookingsScreen}
        />

        <Stack.Screen
          name="Profile"
          component={ProfileScreen}
        />
      </Stack.Navigator>
    </NavigationContainer>
  )
}