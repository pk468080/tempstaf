import {
  NavigationContainer,
} from '@react-navigation/native'

import {
  createNativeStackNavigator,
} from '@react-navigation/native-stack'

import SplashScreen from '../screens/auth/SplashScreen'
import LoginScreen from '../screens/auth/LoginScreen'
import WorkerRegistrationScreen from '../screens/auth/WorkerRegistrationScreen'
import WorkerOnboardingScreen from '../screens/onboarding/WorkerOnboardingScreen'
import WorkerNavigator from './WorkerNavigator'

import type {
  RootStackParamList,
} from '../types/navigation'

const Stack =
  createNativeStackNavigator<
    RootStackParamList
  >()

export default function RootNavigator() {
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
                if (
                  !authState.authenticated
                ) {
                  navigation.replace(
                    'Login',
                  )
                  return
                }

                if (
                  authState.needsRegistration
                ) {
                  navigation.replace(
                    'WorkerOnboarding',
                  )
                  return
                }

                navigation.replace(
                  'Worker',
                )
              }}
            />
          )}
        </Stack.Screen>

        <Stack.Screen name="Login">
  {({ navigation }) => (
    <LoginScreen
      onAuthenticated={() => {
        navigation.replace(
          'Worker',
        )
      }}
      onOnboardingRequired={() => {
        navigation.replace(
          'WorkerOnboarding',
        )
      }}
      onRegister={() => {
        navigation.navigate(
          'WorkerRegistration',
        )
      }}
    />
  )}
</Stack.Screen>

        <Stack.Screen
          name="WorkerRegistration"
        >
          {({ navigation }) => (
            <WorkerRegistrationScreen
              onRegistered={() => {
                navigation.replace(
                  'WorkerOnboarding',
                )
              }}
              onEmailConfirmationRequired={() => {
                navigation.replace(
                  'Login',
                )
              }}
              onBackToLogin={() => {
                navigation.goBack()
              }}
            />
          )}
        </Stack.Screen>

        <Stack.Screen
          name="WorkerOnboarding"
        >
          {({ navigation }) => (
            <WorkerOnboardingScreen
              onCompleted={() => {
                navigation.replace(
                  'Worker',
                )
              }}
            />
          )}
        </Stack.Screen>

        <Stack.Screen name="Worker">
          {() => (
            <WorkerNavigator />
          )}
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  )
}