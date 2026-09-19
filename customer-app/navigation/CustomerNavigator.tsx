import {
  createBottomTabNavigator,
} from '@react-navigation/bottom-tabs'
import {
  StyleSheet,
  Text,
  View,
} from 'react-native'

import HomeScreen from '../screens/home/HomeScreen'
import type { HomeService } from '../types/service'

type CustomerLocation = {
  latitude: number
  longitude: number
  address: string
}

type CustomerNavigatorProps = {
  location: CustomerLocation | null
  onLocationChange: (
    latitude: number,
    longitude: number,
    address: string,
  ) => void
}

const Tab =
  createBottomTabNavigator()

export default function CustomerNavigator({
  location,
  onLocationChange,
}: CustomerNavigatorProps) {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
      }}
    >
      <Tab.Screen name="Home">
        {() => (
          <HomeScreen
            location={location}
            onLocationChange={
              onLocationChange
            }
            onServicePress={(service) => {
              console.log(
                'Selected service:',
                service.id,
              )
            }}
          />
        )}
      </Tab.Screen>

      <Tab.Screen name="My Bookings">
        {() => (
          <Placeholder title="My Bookings" />
        )}
      </Tab.Screen>

      <Tab.Screen name="My Profile">
        {() => (
          <Placeholder title="My Profile" />
        )}
      </Tab.Screen>
    </Tab.Navigator>
  )
}

function Placeholder({
  title,
}: {
  title: string
}) {
  return (
    <View style={styles.placeholder}>
      <Text style={styles.placeholderText}>
        {title}
      </Text>

      <Text style={styles.placeholderSubtext}>
        This screen will be built separately.
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  tabBar: {
    height: 64,
    paddingBottom: 8,
    paddingTop: 8,
  },

  tabBarLabel: {
    fontSize: 12,
  },

  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  placeholderText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },

  placeholderSubtext: {
    marginTop: 8,
    color: '#6B7280',
  },
})