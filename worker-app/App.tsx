import { useEffect, useState } from 'react'

import {
  ActivityIndicator,
  Alert,
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

          setLoggedIn(
            Boolean(session)
          )

          if (!session) {
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

  /*
   * REALTIME WORKER BOOKING LISTENER
   *
   * This works independently from push notifications.
   * It allows the worker app to react immediately while
   * the app is open.
   */
  useEffect(() => {
    if (!loggedIn) {
      return
    }

    let mounted = true

    let channel:
      ReturnType<
        typeof supabase.channel
      > | null = null

    const subscribeToWorkerBookings =
      async () => {
        const {
          data: { user },
        } =
          await supabase.auth.getUser()

        if (!mounted || !user) {
          return
        }

        channel =
          supabase
            .channel(
              `worker-bookings-${user.id}`
            )
            .on(
              'postgres_changes',
              {
                event: 'INSERT',
                schema: 'public',
                table: 'bookings',
                filter:
                  `worker_id=eq.${user.id}`,
              },
              payload => {
                if (!mounted) {
                  return
                }

                const booking =
                  payload.new as {
                    id?: string
                    status?: string
                    fulfillment_type?: string
                  }

                if (
                  booking.status !==
                  'assigned'
                ) {
                  return
                }

                const mode =
                  booking.fulfillment_type ===
                  'instant'
                    ? 'Instant'
                    : 'Scheduled'

                Alert.alert(
                  'New TempStaff booking',
                  `${mode} booking assigned to you.\n\n` +
                    `Booking #${(
                      booking.id ??
                      ''
                    ).slice(0, 8)}`,
                  [
                    {
                      text: 'View booking',
                      onPress: () => {
                        setActiveTab(
                          'bookings'
                        )
                      },
                    },
                    {
                      text: 'Later',
                      style: 'cancel',
                    },
                  ]
                )
              }
            )
            .on(
              'postgres_changes',
              {
                event: 'UPDATE',
                schema: 'public',
                table: 'bookings',
                filter:
                  `worker_id=eq.${user.id}`,
              },
              payload => {
                if (!mounted) {
                  return
                }

                const oldBooking =
                  payload.old as {
                    status?: string
                  }

                const booking =
                  payload.new as {
                    id?: string
                    status?: string
                  }

                if (
                  booking.status ===
                    'assigned' &&
                  oldBooking.status !==
                    'assigned'
                ) {
                  Alert.alert(
                    'New booking assigned',
                    `Booking #${(
                      booking.id ??
                      ''
                    ).slice(0, 8)} has been assigned to you.`,
                    [
                      {
                        text: 'View',
                        onPress: () =>
                          setActiveTab(
                            'bookings'
                          ),
                      },
                      {
                        text: 'Later',
                        style: 'cancel',
                      },
                    ]
                  )
                }
              }
            )
            .subscribe(status => {
              if (
                status ===
                'CHANNEL_ERROR'
              ) {
                console.warn(
                  '[TempStaff Worker] Booking realtime channel error'
                )
              }

              if (
                status ===
                'TIMED_OUT'
              ) {
                console.warn(
                  '[TempStaff Worker] Booking realtime channel timed out'
                )
              }
            })
      }

    subscribeToWorkerBookings()

    return () => {
      mounted = false

      if (channel) {
        supabase.removeChannel(
          channel
        )
      }
    }
  }, [loggedIn])

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

      <View
        style={{
          height: 76,
          backgroundColor: 'white',
          borderTopWidth: 1,
          borderTopColor: '#e5e7eb',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent:
            'space-around',
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