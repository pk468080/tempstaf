import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import EditProfileScreen from '../screens/EditProfileScreen'
import { RootStackParamList } from '../types'
import SavedAddressesScreen from '../screens/SavedAddressesScreen'
import CheckoutScreen from '../screens/CheckoutScreen'
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
import BookingConfirmedScreen from '../screens/BookingConfirmedScreen'
import TrackingScreen from '../screens/TrackingScreen'
import MyBookingsScreen from '../screens/MyBookingsScreen'
import BookingDetailsScreen from '../screens/BookingDetailsScreen'
import ScheduleScreen from '../screens/ScheduleScreen'
import ProfileScreen from '../screens/ProfileScreen'

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
         name="SavedAddresses"
     component={SavedAddressesScreen}
/>
        <Stack.Screen
         name="EditProfile"
     component={EditProfileScreen}
/>
      </Stack.Navigator>
    </NavigationContainer>
  )
}