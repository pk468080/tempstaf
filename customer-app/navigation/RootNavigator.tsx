import { useState } from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'

import CustomerNavigator from './CustomerNavigator'

import SplashScreen from '../screens/auth/SplashScreen'
import LoginScreen from '../screens/auth/LoginScreen'
import OtpScreen from '../screens/auth/OtpScreen'
import RegistrationScreen from '../screens/auth/RegistrationScreen'
import LocationFetchingScreen from '../screens/location/LocationFetchingScreen'

import { sendOtp } from '../services/auth/auth.service'
import { RootStackParamList } from '../types/navigation'

const Stack =
  createNativeStackNavigator<RootStackParamList>()

export default function RootNavigator() {
  const [phone, setPhone] = useState('')

  const [registrationData, setRegistrationData] =
    useState({
      name: '',
      companyName: '',
    })

  const [customerLocation, setCustomerLocation] =
    useState<{
      latitude: number
      longitude: number
    } | null>(null)

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="Splash">
          {({ navigation }) => (
            <SplashScreen
              onFinished={() => {
                navigation.replace('Login')
              }}
            />
          )}
        </Stack.Screen>

        <Stack.Screen name="Login">
          {({ navigation }) => (
            <LoginScreen
              onContinue={async (mobile) => {
                await sendOtp(mobile)

                setPhone(mobile)

                navigation.navigate('Otp')
              }}
            />
          )}
        </Stack.Screen>

        <Stack.Screen name="Otp">
          {({ navigation }) => (
            <OtpScreen
              phone={phone}
              onVerified={(verifiedPhone) => {
                setPhone(verifiedPhone)

                navigation.navigate('Registration')
              }}
            />
          )}
        </Stack.Screen>

        <Stack.Screen name="Registration">
          {({ navigation }) => (
            <RegistrationScreen
              phone={phone}
              onContinue={(name, companyName) => {
                setRegistrationData({
                  name,
                  companyName,
                })

                navigation.navigate('Location')
              }}
            />
          )}
        </Stack.Screen>

        <Stack.Screen name="Location">
          {({ navigation }) => (
            <LocationFetchingScreen
              onLocationFetched={(
                latitude,
                longitude,
              ) => {
                setCustomerLocation({
                  latitude,
                  longitude,
                })

                navigation.replace('Customer')
              }}
            />
          )}
        </Stack.Screen>

        <Stack.Screen name="Customer">
          {() => (
            <CustomerNavigator
              location={customerLocation}
            />
          )}
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  )
}