import { useEffect, useState } from 'react'

import {
  ActivityIndicator,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'

import { supabase } from './lib/supabase'

import LoginScreen from './screens/LoginScreen'
import WorkerRegistrationScreen from './screens/WorkerRegistrationScreen'
import WorkerDashboard from './screens/WorkerDashboard'
import EarningsScreen from './screens/EarningsScreen'
import MyBookingsScreen from './screens/MyBookingsScreen'
import ProfileScreen from './screens/ProfileScreen'
import EditProfileScreen from './screens/EditProfileScreen'

type Tab =
  | 'home'
  | 'bookings'
  | 'earnings'

type AuthScreen =
  | 'login'
  | 'registration'

export default function App() {
  const [sessionReady, setSessionReady] =
    useState(false)

  const [loggedIn, setLoggedIn] =
    useState(false)

  const [authScreen, setAuthScreen] =
    useState<AuthScreen>('login')

  const [activeTab, setActiveTab] =
    useState<Tab>('home')

  const [showProfile, setShowProfile] =
    useState(false)

  const [showEditProfile, setShowEditProfile] =
    useState(false)

  useEffect(() => {
    let mounted = true

    const checkExistingSession =
      async () => {
        const { data } =
          await supabase.auth.getSession()

        if (!mounted) return

        setLoggedIn(
          Boolean(data.session)
        )

        setSessionReady(true)
      }

    checkExistingSession()

    const {
      data: { subscription },
    } =
      supabase.auth.onAuthStateChange(
        (_event, session) => {
          if (!mounted) return

          /*
           * Do not automatically set loggedIn=true
           * here. LoginScreen validates the worker
           * profile before opening the dashboard.
           */

          if (!session) {
            setLoggedIn(false)
            setAuthScreen('login')
          }
        }
      )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  if (!sessionReady) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator />
      </View>
    )
  }

  if (!loggedIn) {
    if (
      authScreen ===
      'registration'
    ) {
      return (
        <WorkerRegistrationScreen
          onBack={() =>
            setAuthScreen('login')
          }
          onRegistered={() =>
            setAuthScreen('login')
          }
        />
      )
    }

    return (
      <LoginScreen
        onLogin={() =>
          setLoggedIn(true)
        }
        onBecomeWorker={() =>
          setAuthScreen(
            'registration'
          )
        }
      />
    )
  }

  if (showEditProfile) {
    return (
      <EditProfileScreen
        onBack={() =>
          setShowEditProfile(false)
        }
        onSaved={() =>
          setShowEditProfile(false)
        }
      />
    )
  }

  if (showProfile) {
    return (
      <ProfileScreen
        onBack={() =>
          setShowProfile(false)
        }
        onEditProfile={() =>
          setShowEditProfile(true)
        }
      />
    )
  }

  return (
    <View style={{ flex: 1 }}>
      {activeTab === 'home' && (
        <WorkerDashboard
          onOpenEarnings={() =>
            setActiveTab('earnings')
          }
        />
      )}

      {activeTab === 'bookings' && (
        <MyBookingsScreen
          onBack={() =>
            setActiveTab('home')
          }
        />
      )}

      {activeTab === 'earnings' && (
        <EarningsScreen
          onBack={() =>
            setActiveTab('home')
          }
        />
      )}

      <View
        style={{
          height: 76,
          backgroundColor: 'white',
          borderTopWidth: 1,
          borderTopColor: '#e5e7eb',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-around',
          paddingBottom: 8,
        }}
      >
        <TabButton
          label="Home"
          icon="⌂"
          active={
            activeTab === 'home'
          }
          onPress={() =>
            setActiveTab('home')
          }
        />

        <TabButton
          label="My Bookings"
          icon="▣"
          active={
            activeTab === 'bookings'
          }
          onPress={() =>
            setActiveTab('bookings')
          }
        />

        <TabButton
          label="Earnings"
          icon="₹"
          active={
            activeTab === 'earnings'
          }
          onPress={() =>
            setActiveTab('earnings')
          }
        />

        <TabButton
          label="Profile"
          icon="●"
          active={false}
          onPress={() =>
            setShowProfile(true)
          }
        />
      </View>
    </View>
  )
}

function TabButton({
  label,
  icon,
  active,
  onPress,
}: {
  label: string
  icon: string
  active: boolean
  onPress: () => void
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 75,
        paddingVertical: 7,
      }}
    >
      <View
        style={{
          backgroundColor: active
            ? '#e8f7f1'
            : 'transparent',
          borderRadius: 14,
          paddingHorizontal: 15,
          paddingVertical: 5,
        }}
      >
        <Text
          style={{
            fontSize: 20,
            textAlign: 'center',
            color: active
              ? '#0f766e'
              : '#6b7280',
            fontWeight: '800',
          }}
        >
          {icon}
        </Text>
      </View>

      <Text
        style={{
          marginTop: 2,
          fontSize: 10,
          fontWeight: active
            ? '800'
            : '600',
          color: active
            ? '#0f766e'
            : '#6b7280',
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  )
}