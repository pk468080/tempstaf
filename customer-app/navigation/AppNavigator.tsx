import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { RootStackParamList } from '../types'
import LoginScreen from '../screens/LoginScreen'
import OtpScreen from '../screens/OtpScreen'
import HomeScreen from '../screens/HomeScreen'
import ServicesScreen from '../screens/ServicesScreen'
import LocationScreen from '../screens/LocationScreen'
import WorkersScreen from '../screens/WorkersScreen'
import SummaryScreen from '../screens/SummaryScreen'
import PaymentScreen from '../screens/PaymentScreen'
import BookingConfirmedScreen from '../screens/BookingConfirmedScreen'
import TrackingScreen from '../screens/TrackingScreen'

const Stack = createNativeStackNavigator<RootStackParamList>()

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="OTP" component={OtpScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Services" component={ServicesScreen} />
        <Stack.Screen name="Location" component={LocationScreen} />
        <Stack.Screen name="Workers" component={WorkersScreen} />
        <Stack.Screen name="Summary" component={SummaryScreen} />
        <Stack.Screen name="Payment" component={PaymentScreen} />
        <Stack.Screen name="BookingConfirmed" component={BookingConfirmedScreen} />
        <Stack.Screen name="Tracking" component={TrackingScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  )
}
