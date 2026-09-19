import { useState } from 'react'
import {
  NavigationContainer,
} from '@react-navigation/native'
import {
  createNativeStackNavigator,
} from '@react-navigation/native-stack'

import CustomerNavigator from './CustomerNavigator'

import SplashScreen from '../screens/auth/SplashScreen'
import LoginScreen from '../screens/auth/LoginScreen'
import OtpScreen from '../screens/auth/OtpScreen'
import RegistrationScreen from '../screens/auth/RegistrationScreen'
import LocationFetchingScreen from '../screens/location/LocationFetchingScreen'

import {
  createCustomerProfile,
  sendOtp,
} from '../services/auth/auth.service'

import {
  CustomerAuthState,
} from '../services/auth/auth.service'

import {
  RootStackParamList,
} from '../types/navigation'

const Stack =
  createNativeStackNavigator<RootStackParamList>()

type CustomerLocation = {
  latitude: number
  longitude: number
  address: string
}

export default function RootNavigator() {
  const [phone, setPhone] = useState('')

  const [customerLocation, setCustomerLocation] =
    useState<CustomerLocation | null>(null)

  function handleSplashFinished(
    authState: CustomerAuthState,
    navigation: {
      replace: (
        screen: keyof RootStackParamList,
      ) => void
    },
  ) {
    if (!authState.authenticated) {
      navigation.replace('Login')
      return
    }

    if (authState.needsRegistration) {
      navigation.replace('Registration')
      return
    }

    navigation.replace('Location')
  }

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
              onFinished={authState => {
                handleSplashFinished(
                  authState,
                  navigation,
                )
              }}
            />
          )}
        </Stack.Screen>

        <Stack.Screen name="Login">
          {({ navigation }) => (
            <LoginScreen
              onContinue={async mobile => {
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
              onVerified={(
                verifiedPhone,
                needsRegistration,
              ) => {
                setPhone(verifiedPhone)

                if (needsRegistration) {
                  navigation.replace(
                    'Registration',
                  )
                  return
                }

                navigation.replace('Location')
              }}
            />
          )}
        </Stack.Screen>

        <Stack.Screen name="Registration">
          {({ navigation }) => (
            <RegistrationScreen
              phone={phone}
              onContinue={async (
                name,
                companyName,
              ) => {
                const result =
                  await createCustomerProfile(
                    phone,
                    name,
                    companyName,
                  )

                if (!result.success) {
                  console.error(
                    'Registration failed:',
                    result.error,
                  )
                  return
                }

                navigation.replace('Location')
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
                  address: '',
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
              onLocationChange={(
                latitude,
                longitude,
                address,
              ) => {
                setCustomerLocation({
                  latitude,
                  longitude,
                  address,
                })
              }}
            />
          )}
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  )
}