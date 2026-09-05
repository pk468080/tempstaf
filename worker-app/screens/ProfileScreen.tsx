import { useCallback, useEffect, useRef, useState } from 'react'

import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import * as Location from 'expo-location'
import { supabase } from '../lib/supabase'

type ProfileScreenProps = {
  onBack: () => void
  onEditProfile: () => void
  onSettings: () => void
}

type WorkerStatus =
  | 'offline'
  | 'available'
  | 'busy'
  | 'suspended'

type Profile = {
  full_name: string | null
  phone: string | null
  email: string | null
  worker_status: WorkerStatus
}

export default function ProfileScreen({
  onBack,
  onEditProfile,
  onSettings,
}: ProfileScreenProps) {
  const [profile, setProfile] =
    useState<Profile | null>(null)

  const [loading, setLoading] =
    useState(true)

  const [loggingOut, setLoggingOut] =
    useState(false)

  const [updatingStatus, setUpdatingStatus] =
    useState(false)

  const locationSubscription =
    useRef<Location.LocationSubscription | null>(null)

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true)

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        throw new Error(
          'Worker is not authenticated.'
        )
      }

      const { data: profileData, error: profileError } =
        await supabase
          .from('profiles')
          .select('full_name, phone')
          .eq('id', user.id)
          .maybeSingle()

      if (profileError) {
        throw profileError
      }

      const {
        data: workerData,
        error: workerError,
      } = await supabase
        .from('worker_profiles')
        .select('worker_status')
        .eq('id', user.id)
        .maybeSingle()

      if (workerError) {
        throw workerError
      }

      const workerStatus: WorkerStatus =
        workerData?.worker_status ?? 'offline'

      setProfile({
        full_name:
          profileData?.full_name ??
          user.user_metadata?.full_name ??
          null,

        phone:
          profileData?.phone ??
          user.phone ??
          null,

        email:
          user.email ??
          null,

        worker_status: workerStatus,
      })
    } catch (error: any) {
      console.error(
        '[TempStaff Worker] Failed to load profile:',
        error
      )

      Alert.alert(
        'Unable to load profile',
        error?.message ||
          'Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  const updateWorkerStatus = async (
    enabled: boolean
  ) => {
    if (!profile) {
      return
    }

    if (
      profile.worker_status === 'busy' ||
      profile.worker_status === 'suspended'
    ) {
      Alert.alert(
        'Status cannot be changed',
        profile.worker_status === 'busy'
          ? 'You cannot change availability while you are busy.'
          : 'Your account is suspended.'
      )

      return
    }

    const newStatus = enabled
      ? 'available'
      : 'offline'

    try {
      setUpdatingStatus(true)

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError) {
        throw userError
      }

      if (!user) {
        throw new Error(
          'Worker is not authenticated.'
        )
      }

      if (enabled) {
        const { status } =
          await Location.requestForegroundPermissionsAsync()

        if (status !== 'granted') {
          Alert.alert(
            'Location permission required',
            'Location access is required while you are available for jobs.'
          )
          return
        }

        const currentLocation =
          await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          })

        const {
          data: presenceData,
          error: presenceError,
        } = await supabase.rpc('worker_set_presence', {
          p_available: true,
        })

        if (presenceError) {
          throw presenceError
        }

        if (!presenceData?.success) {
          throw new Error(
            presenceData?.error ||
              'Unable to become available.'
          )
        }

        const {
          error: locationError,
        } = await supabase.rpc('worker_update_location', {
          p_latitude:
            currentLocation.coords.latitude,
          p_longitude:
            currentLocation.coords.longitude,
          p_booking_id: null,
        })

        if (locationError) {
          throw locationError
        }

        locationSubscription.current?.remove()

        locationSubscription.current =
          await Location.watchPositionAsync(
            {
              accuracy: Location.Accuracy.High,
              timeInterval: 60_000,
              distanceInterval: 100,
            },
            async (newLocation) => {
              try {
                const {
                  error: updateError,
                } = await supabase.rpc(
                  'worker_update_location',
                  {
                    p_latitude:
                      newLocation.coords.latitude,
                    p_longitude:
                      newLocation.coords.longitude,
                    p_booking_id: null,
                  }
                )

                if (updateError) {
                  console.error(
                    '[TempStaff Worker] Location update failed:',
                    updateError
                  )
                }

                // Renew the 15-minute availability window.
                const {
                  error: presenceRenewError,
                } = await supabase.rpc(
                  'worker_set_presence',
                  {
                    p_available: true,
                  }
                )

                if (presenceRenewError) {
                  console.error(
                    '[TempStaff Worker] Availability renewal failed:',
                    presenceRenewError
                  )
                }
              } catch (watchError) {
                console.error(
                  '[TempStaff Worker] Presence watcher error:',
                  watchError
                )
              }
            }
          )

        setProfile(current =>
          current
            ? {
                ...current,
                worker_status: 'available',
              }
            : current
        )

        Alert.alert(
          'Availability updated',
          'You are now available for new bookings.'
        )
      } else {
        locationSubscription.current?.remove()
        locationSubscription.current = null

        const {
          data: presenceData,
          error: presenceError,
        } = await supabase.rpc('worker_set_presence', {
          p_available: false,
        })

        if (presenceError) {
          throw presenceError
        }

        if (!presenceData?.success) {
          throw new Error(
            presenceData?.error ||
              'Unable to go offline.'
          )
        }

        setProfile(current =>
          current
            ? {
                ...current,
                worker_status: 'offline',
              }
            : current
        )

        Alert.alert(
          'Availability updated',
          'You are now offline.'
        )
      }
    } catch (error: any) {
      console.error(
        '[TempStaff Worker] Failed to update worker status:',
        error
      )

      Alert.alert(
        'Unable to update availability',
        error?.message ||
          'Please try again.'
      )
    } finally {
      setUpdatingStatus(false)
    }
  }

  const logout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },

        {
          text: 'Logout',
          style: 'destructive',

          onPress: async () => {
            try {
              setLoggingOut(true)

              const { error } =
                await supabase.auth.signOut()

              if (error) {
                throw error
              }
            } catch (error: any) {
              setLoggingOut(false)

              Alert.alert(
                'Logout failed',
                error?.message ||
                  'Please try again.'
              )
            }
          },
        },
      ]
    )
  }

  const getStatusLabel = (
    status: WorkerStatus
  ) => {
    switch (status) {
      case 'available':
        return 'Available'

      case 'busy':
        return 'Busy'

      case 'suspended':
        return 'Suspended'

      case 'offline':
      default:
        return 'Offline'
    }
  }

  const getStatusDescription = (
    status: WorkerStatus
  ) => {
    switch (status) {
      case 'available':
        return 'You can receive new bookings.'

      case 'busy':
        return 'You are currently working on a booking.'

      case 'suspended':
        return 'Your account is currently suspended.'

      case 'offline':
      default:
        return 'You are currently unavailable for bookings.'
    }
  }

  const getStatusColor = (
    status: WorkerStatus
  ) => {
    switch (status) {
      case 'available':
        return '#0f766e'

      case 'busy':
        return '#d97706'

      case 'suspended':
        return '#dc2626'

      case 'offline':
      default:
        return '#6b7280'
    }
  }
  useEffect(() => {
  return () => {
    locationSubscription.current?.remove()
    locationSubscription.current = null
  }
}, [])

  const isAvailable =
    profile?.worker_status === 'available'

  const canChangeAvailability =
    profile?.worker_status === 'available' ||
    profile?.worker_status === 'offline'

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loading}>
          <ActivityIndicator size="large" />

          <Text style={styles.loadingText}>
            Loading profile...
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loading}>
          <Text style={styles.errorTitle}>
            Unable to load profile
          </Text>

          <TouchableOpacity
            style={styles.retryButton}
            onPress={loadProfile}
          >
            <Text style={styles.retryText}>
              Try Again
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  const statusColor = getStatusColor(
    profile.worker_status
  )

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.page}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
        >
          <Text style={styles.backText}>
            ← Back
          </Text>
        </TouchableOpacity>

        <Text style={styles.title}>
          Profile
        </Text>

        <Text style={styles.subtitle}>
          Manage your worker account.
        </Text>

        {/* PROFILE HEADER */}

        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {getInitials(
                profile.full_name
              )}
            </Text>
          </View>

          <Text style={styles.name}>
            {profile.full_name ||
              'Worker'}
          </Text>

          <Text style={styles.role}>
            TempStaff Worker
          </Text>

          <View
            style={[
              styles.profileStatusBadge,
              {
                backgroundColor:
                  statusColor + '20',
              },
            ]}
          >
            <View
              style={[
                styles.profileStatusDot,
                {
                  backgroundColor:
                    statusColor,
                },
              ]}
            />

            <Text
              style={[
                styles.profileStatusText,
                {
                  color: statusColor,
                },
              ]}
            >
              {getStatusLabel(
                profile.worker_status
              )}
            </Text>
          </View>
        </View>

        {/* PERSONAL INFORMATION */}

        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>
            Personal information
          </Text>

          <InfoRow
            label="Full name"
            value={
              profile.full_name ||
              'Not added'
            }
          />

          <InfoRow
            label="Phone"
            value={
              profile.phone ||
              'Not added'
            }
          />

          <InfoRow
            label="Email"
            value={
              profile.email ||
              'Not available'
            }
            last
          />
        </View>

        {/* AVAILABILITY */}

        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>
            Availability
          </Text>

          <View style={styles.availabilityRow}>
            <View
              style={[
                styles.availabilityIcon,
                {
                  backgroundColor:
                    statusColor + '18',
                },
              ]}
            >
              <View
                style={[
                  styles.availabilityDot,
                  {
                    backgroundColor:
                      statusColor,
                  },
                ]}
              />
            </View>

            <View
              style={
                styles.availabilityContent
              }
            >
              <Text
                style={styles.statusTitle}
              >
                {getStatusLabel(
                  profile.worker_status
                )}
              </Text>

              <Text
                style={styles.statusText}
              >
                {getStatusDescription(
                  profile.worker_status
                )}
              </Text>
            </View>

            <Switch
              value={isAvailable}
              onValueChange={
                updateWorkerStatus
              }
              disabled={
                updatingStatus ||
                !canChangeAvailability
              }
              trackColor={{
                false: '#d1d5db',
                true: '#99d5c9',
              }}
              thumbColor={
                isAvailable
                  ? '#0f766e'
                  : '#f4f4f5'
              }
            />
          </View>

          {updatingStatus && (
            <View
              style={styles.statusLoading}
            >
              <ActivityIndicator size="small" />

              <Text
                style={styles.statusLoadingText}
              >
                Updating availability...
              </Text>
            </View>
          )}

          {profile.worker_status ===
            'busy' && (
            <View
              style={styles.warningBox}
            >
              <Text
                style={styles.warningText}
              >
                Availability cannot be changed
                while you are busy.
              </Text>
            </View>
          )}

          {profile.worker_status ===
            'suspended' && (
            <View
              style={styles.dangerBox}
            >
              <Text
                style={styles.dangerText}
              >
                Your account is suspended.
                Please contact TempStaff
                support.
              </Text>
            </View>
          )}
        </View>

        {/* ACCOUNT */}

        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>
            Account
          </Text>

          <View style={styles.accountRow}>
            <View
              style={[
                styles.accountDot,
                {
                  backgroundColor:
                    profile.worker_status ===
                    'suspended'
                      ? '#dc2626'
                      : '#0f766e',
                },
              ]}
            />

            <View
              style={styles.accountContent}
            >
              <Text
                style={styles.statusTitle}
              >
                {profile.worker_status ===
                'suspended'
                  ? 'Account suspended'
                  : 'Account active'}
              </Text>

              <Text
                style={styles.statusText}
              >
                {profile.worker_status ===
                'suspended'
                  ? 'You cannot receive new bookings.'
                  : 'Your worker account is active.'}
              </Text>
            </View>
          </View>
        </View>

        {/* SETTINGS */}


        <TouchableOpacity
          style={styles.settingsButton}
          onPress={onSettings}
          disabled={loggingOut}
        >
          <Text style={styles.settingsButtonText}>
            Settings
          </Text>
        </TouchableOpacity>

      

        {/* EDIT PROFILE */}

        <TouchableOpacity
          style={styles.editButton}
          onPress={onEditProfile} 
          disabled={loggingOut}
        >
          <Text
            style={styles.editButtonText}
          >
            Edit Profile
          </Text>
        </TouchableOpacity>

        {/* LOGOUT */}

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={logout}
          disabled={loggingOut}
        >
          {loggingOut ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.logoutText}>
              Logout
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

function InfoRow({
  label,
  value,
  last = false,
}: {
  label: string
  value: string
  last?: boolean
}) {
  return (
    <View
      style={[
        styles.infoRow,
        last && styles.lastInfoRow,
      ]}
    >
      <Text style={styles.infoLabel}>
        {label}
      </Text>

      <Text style={styles.infoValue}>
        {value}
      </Text>
    </View>
  )
}

function getInitials(
  name: string | null | undefined
) {
  if (!name) {
    return 'W'
  }

  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (parts.length === 1) {
    return parts[0]
      .charAt(0)
      .toUpperCase()
  }

  return (
    parts[0].charAt(0) +
    parts[parts.length - 1].charAt(0)
  ).toUpperCase()
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },

  page: {
    padding: 22,
    paddingBottom: 50,
  },

  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 25,
  },

  loadingText: {
    marginTop: 12,
    color: '#6b7280',
  },

  errorTitle: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 15,
  },

  retryButton: {
    backgroundColor: '#0f766e',
    borderRadius: 14,
    paddingHorizontal: 25,
    paddingVertical: 13,
  },

  retryText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '800',
  },

  backButton: {
    marginBottom: 18,
  },

  backText: {
    color: '#0f766e',
    fontSize: 16,
    fontWeight: '700',
  },

  title: {
    color: '#0b1f3a',
    fontSize: 31,
    fontWeight: '800',
    marginBottom: 7,
  },

  subtitle: {
    color: '#6b7280',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 22,
  },

  profileCard: {
    backgroundColor: '#0b1f3a',
    borderRadius: 22,
    padding: 25,
    alignItems: 'center',
    marginBottom: 16,
  },

  avatar: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: '#e8f7f1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },

  avatarText: {
    color: '#0f766e',
    fontSize: 30,
    fontWeight: '900',
  },

  name: {
    color: 'white',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 5,
  },

  role: {
    color: '#cbd5e1',
    fontSize: 13,
    marginBottom: 14,
  },

  profileStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },

  profileStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 7,
  },

  profileStatusText: {
    fontSize: 12,
    fontWeight: '800',
  },

  infoCard: {
    backgroundColor: 'white',
    borderRadius: 18,
    padding: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },

  sectionTitle: {
    color: '#111827',
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 16,
  },

  infoRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eef0f2',
  },

  lastInfoRow: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },

  infoLabel: {
    color: '#9ca3af',
    fontSize: 12,
    marginBottom: 5,
  },

  infoValue: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '600',
  },

  availabilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  availabilityIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  availabilityDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },

  availabilityContent: {
    flex: 1,
    paddingRight: 10,
  },

  statusTitle: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 3,
  },

  statusText: {
    color: '#6b7280',
    fontSize: 12,
    lineHeight: 18,
  },

  statusLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
  },

  statusLoadingText: {
    color: '#6b7280',
    fontSize: 12,
    marginLeft: 8,
  },

  warningBox: {
    backgroundColor: '#fff7ed',
    borderRadius: 12,
    padding: 11,
    marginTop: 14,
  },

  warningText: {
    color: '#9a3412',
    fontSize: 12,
    lineHeight: 17,
  },

  dangerBox: {
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    padding: 11,
    marginTop: 14,
  },

  dangerText: {
    color: '#b91c1c',
    fontSize: 12,
    lineHeight: 17,
  },

  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  accountDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    marginRight: 12,
  },

  accountContent: {
    flex: 1,
  },

  editButton: {
    backgroundColor: '#0f766e',
    borderRadius: 15,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 11,
  },

  editButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '800',
  },

  logoutButton: {
    backgroundColor: '#dc2626',
    borderRadius: 15,
    paddingVertical: 15,
    alignItems: 'center',
  },

  logoutText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '800',
  },
  settingsButton: {
  backgroundColor: '#ffffff',
  borderRadius: 15,
  paddingVertical: 15,
  alignItems: 'center',
  marginTop: 12,
  borderWidth: 1,
  borderColor: '#d1d5db',
},

settingsButtonText: {
  color: '#0b1f3a',
  fontSize: 15,
  fontWeight: '800',
},
})