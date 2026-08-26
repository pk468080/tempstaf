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
import SettingsScreen from './screens/SettingsScreen'

type Tab =
  | 'home'
  | 'bookings'
  | 'earnings'
  | 'profile'

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

  const [showEditProfile, setShowEditProfile] =
    useState(false)

  const [showSettings, setShowSettings] =
    useState(false)

  useEffect(() => {
    let mounted = true

    const checkExistingSession =
      async () => {
        const { data } =
          await supabase.auth.getSession()

        if (!mounted) {
          return
        }

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
          if (!mounted) {
            return
          }

          if (!session) {
            setLoggedIn(false)
            setAuthScreen('login')
            setActiveTab('home')
            setShowEditProfile(false)
            setShowSettings(false)
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

  /*
   * ---------------------------------------------------------
   * AUTHENTICATION
   * ---------------------------------------------------------
   */

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
        onLogin={() => {
          setLoggedIn(true)
          setActiveTab('home')
          setShowSettings(false)
        }}
        onBecomeWorker={() =>
          setAuthScreen(
            'registration'
          )
        }
      />
    )
  }

  /*
   * ---------------------------------------------------------
   * SETTINGS
   * ---------------------------------------------------------
   */

  if (showSettings) {
    return (
      <SettingsScreen
        onBack={() =>
          setShowSettings(false)
        }
        onLogout={async () => {
          await supabase.auth.signOut()
        }}
      />
    )
  }

  /*
   * ---------------------------------------------------------
   * EDIT PROFILE
   * ---------------------------------------------------------
   */

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

  /*
   * ---------------------------------------------------------
   * MAIN APPLICATION
   * ---------------------------------------------------------
   */

  return (
    <View
      style={{
        flex: 1,
      }}
    >
      <View
        style={{
          flex: 1,
        }}
      >
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

        {activeTab === 'profile' && (
          <ProfileScreen
            onBack={() =>
              setActiveTab('home')
            }
            onEditProfile={() =>
              setShowEditProfile(true)
            }
            onSettings={() =>
              setShowSettings(true)
            }
          />
        )}
      </View>

      {/* ---------------------------------------------------
          WORKER FOOTER NAVIGATION
          --------------------------------------------------- */}

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
          onPress={() => {
            setShowEditProfile(false)
            setShowSettings(false)
            setActiveTab('home')
          }}
        />

        <TabButton
          label="My Bookings"
          icon="▣"
          active={
            activeTab === 'bookings'
          }
          onPress={() => {
            setShowEditProfile(false)
            setShowSettings(false)
            setActiveTab('bookings')
          }}
        />

        <TabButton
          label="Earnings"
          icon="₹"
          active={
            activeTab === 'earnings'
          }
          onPress={() => {
            setShowEditProfile(false)
            setShowSettings(false)
            setActiveTab('earnings')
          }}
        />

        <TabButton
          label="Profile"
          icon="●"
          active={
            activeTab === 'profile'
          }
          onPress={() => {
            setShowEditProfile(false)
            setShowSettings(false)
            setActiveTab('profile')
          }}
        />
      </View>
    </View>
  )
}

/*
 * ---------------------------------------------------------
 * FOOTER TAB BUTTON
 * ---------------------------------------------------------
 */

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
      activeOpacity={0.7}
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